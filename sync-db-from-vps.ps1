param(
  [string]$VpsHost = "45.32.112.136",
  [string]$User = "root",
  [int]$Port = 22,
  [string]$Password = "",
  [string]$RemoteProjectPath = "/root/apps/nupital",
  [string]$LocalProjectPath = (Get-Location).Path,
  [switch]$SkipUploads
)

$scriptPath = Join-Path $PSScriptRoot "scripts/sync-db-from-vps.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

& $scriptPath `
  -VpsHost $VpsHost `
  -User $User `
  -Port $Port `
  -Password $Password `
  -RemoteProjectPath $RemoteProjectPath `
  -LocalProjectPath $LocalProjectPath `
  -SkipUploads:$SkipUploads
