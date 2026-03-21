param(
  [switch]$SkipBuild,
  [int]$Port = 3000,
  [int]$StartupTimeoutSec = 30
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$logDir = Join-Path $repoRoot 'logs'
$pidFile = Join-Path $repoRoot '.dev-server.pid'

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

Push-Location $repoRoot
try {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $outLog = Join-Path $logDir "next-dev.$stamp.out.log"
  $errLog = Join-Path $logDir "next-dev.$stamp.err.log"

  if (-not $SkipBuild) {
    Write-Host '[1/4] Running build...'
    npm run build
    if ($LASTEXITCODE -ne 0) {
      throw 'Build failed. Dev server was not restarted.'
    }
  } else {
    Write-Host '[1/4] Skip build enabled.'
  }

  Write-Host '[2/4] Stopping old dev server...'
  if (Test-Path $pidFile) {
    $oldPidText = (Get-Content $pidFile -Raw).Trim()
    if ($oldPidText -match '^\d+$') {
      $oldPid = [int]$oldPidText
      if ($oldPid -ne $PID) {
        Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
      }
    }
  }

  $portListeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($listenerPid in $portListeners) {
    if ($listenerPid -ne $PID) {
      Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
    }
  }

  Write-Host "[3/4] Starting dev server on port $Port..."
  $env:PORT = "$Port"
  $proc = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev') -WorkingDirectory $repoRoot -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
  $proc.Id | Set-Content -Path $pidFile -Encoding ascii

  $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if ($proc.HasExited) {
      break
    }
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
      $ready = $true
      break
    }
  }

  Write-Host '[4/4] Probing localhost health...'
  if (-not $ready) {
    Write-Host 'Dev server did not open the expected port in time.'
    if (Test-Path $errLog) {
      Write-Host '--- STDERR (tail) ---'
      Get-Content $errLog -Tail 60
    }
    if (Test-Path $outLog) {
      Write-Host '--- STDOUT (tail) ---'
      Get-Content $outLog -Tail 60
    }
    exit 1
  }

  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 8
    Write-Host "Health check OK: HTTP $($resp.StatusCode)"
  } catch {
    Write-Host "Health check FAILED: $($_.Exception.Message)"
    if (Test-Path $errLog) {
      Write-Host '--- STDERR (tail) ---'
      Get-Content $errLog -Tail 60
    }
    if (Test-Path $outLog) {
      Write-Host '--- STDOUT (tail) ---'
      Get-Content $outLog -Tail 60
    }
    exit 1
  }

  Write-Host "Dev server PID: $($proc.Id)"
  Write-Host "Logs: $outLog"
}
finally {
  Pop-Location
}