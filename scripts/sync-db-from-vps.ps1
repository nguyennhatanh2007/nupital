param(
  [string]$VpsHost = "45.32.112.136",
  [string]$User = "root",
  [int]$Port = 22,
  [string]$Password = "",
  [string]$RemoteProjectPath = "/root/apps/nupital",
  [string]$LocalProjectPath = (Get-Location).Path,
  [switch]$SkipUploads
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Warn([string]$Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Success([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Assert-Tool([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required tool: $Name. Install PuTTY tools (pscp/plink) or ensure '$Name' is available in PATH."
  }
}

function Resolve-TransferTool {
  if (Get-Command "pscp" -ErrorAction SilentlyContinue) {
    return "pscp"
  }

  throw "Missing transfer tool: install PuTTY pscp to use password-based sync."
}

function Resolve-RemoteTool {
  if (Get-Command "plink" -ErrorAction SilentlyContinue) {
    return "plink"
  }

  throw "Missing remote shell tool: install PuTTY plink to use password-based sync."
}

$transferTool = Resolve-TransferTool
$remoteTool = Resolve-RemoteTool

if (-not $Password.Trim()) {
  throw "Password is empty. Fill the Password variable in the script before running it."
}

if ($transferTool -ne "pscp" -or $remoteTool -ne "plink") {
  throw "This script is configured for password-based sync and requires PuTTY tools: pscp and plink."
}

if (-not (Test-Path $LocalProjectPath)) {
  throw "LocalProjectPath does not exist: $LocalProjectPath"
}

$localDbPath = Join-Path $LocalProjectPath "prisma/dev.db"
$localUploadsPath = Join-Path $LocalProjectPath "public/uploads"
$backupRoot = Join-Path $LocalProjectPath "backups/sync-from-vps"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupRoot $timestamp

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

function Get-SshArgs {
  param(
    [string]$RemoteCommand = ""
  )

  if ($remoteTool -eq "plink") {
    $args = @("-P", $Port.ToString(), "-pw", $Password, "-batch")
    $args += @("$User@$VpsHost")
    if ($RemoteCommand) {
      $args += $RemoteCommand
    }
    return $args
  }

  $args = @("-p", $Port.ToString(), "-o", "BatchMode=yes")
  if ($RemoteCommand) {
    $args += $RemoteCommand
  }
  return $args
}

function Get-ScpBaseArgs {
  if ($transferTool -eq "pscp") {
    return @("-P", $Port.ToString(), "-pw", $Password, "-batch")
  }

  return @("-P", $Port.ToString(), "-o", "BatchMode=yes")
}

Write-Info "Using VPS: ${User}@${VpsHost}:$Port"
Write-Info "Remote project: $RemoteProjectPath"
Write-Info "Local project: $LocalProjectPath"
Write-Info "Backup folder: $backupDir"
Write-Info "Transfer tool: $transferTool"
Write-Info "Remote shell tool: $remoteTool"

# 1) Backup current local DB/uploads first
if (Test-Path $localDbPath) {
  Copy-Item $localDbPath (Join-Path $backupDir "dev.db") -Force
  Write-Success "Backed up local database to $backupDir/dev.db"
} else {
  Write-Warn "Local database not found, skipping DB backup: $localDbPath"
}

if (-not $SkipUploads) {
  if (Test-Path $localUploadsPath) {
    $localUploadsBackup = Join-Path $backupDir "uploads"
    Copy-Item $localUploadsPath $localUploadsBackup -Recurse -Force
    Write-Success "Backed up local uploads to $localUploadsBackup"
  } else {
    Write-Warn "Local uploads folder not found, skipping uploads backup: $localUploadsPath"
  }
}

# 2) Pull SQLite DB from VPS
$remoteDbPath = "$RemoteProjectPath/prisma/dev.db"
Write-Info "Downloading remote database: $remoteDbPath"
$scpArgs = Get-ScpBaseArgs
$scpArgs += @("${User}@${VpsHost}:$remoteDbPath", $localDbPath)
& $transferTool @scpArgs
Write-Success "Database synced to $localDbPath"

# 3) Pull uploads folder from VPS
if (-not $SkipUploads) {
  $remoteUploadsPath = "$RemoteProjectPath/public/uploads"
  Write-Info "Downloading remote uploads folder: $remoteUploadsPath"

  if (Test-Path $localUploadsPath) {
    Remove-Item $localUploadsPath -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $localUploadsPath -Parent) | Out-Null

  $scpArgs = Get-ScpBaseArgs
  $scpArgs += @("-r", "${User}@${VpsHost}:$remoteUploadsPath", (Split-Path $localUploadsPath -Parent))
  & $transferTool @scpArgs
  Write-Success "Uploads synced to $localUploadsPath"
}

# Optional remote sanity check: ensure files exist on VPS before returning.
$checkCommand = "test -f '$remoteDbPath' && echo DB_OK || echo DB_MISSING"
if (-not $SkipUploads) {
  $checkCommand += "; test -d '$remoteUploadsPath' && echo UPLOADS_OK || echo UPLOADS_MISSING"
}

$sshArgs = Get-SshArgs -RemoteCommand $checkCommand
& $remoteTool @sshArgs | Out-Null

Write-Success "Sync completed successfully."
Write-Info "Backup copy saved at: $backupDir"
