Param(
  [string]$HostName,
  [string]$Port,
  [string]$UserName,
  [string]$Password,
  [string]$Database,
  [string]$DatabaseUrl,
  [switch]$UseSsl,
  [switch]$NoPrompt
)

$ErrorActionPreference = 'Stop'

function Import-DotEnvIfAvailable {
  $envPath = Join-Path $PSScriptRoot '..\\.env'
  $resolvedPath = [System.IO.Path]::GetFullPath($envPath)
  if (-not (Test-Path $resolvedPath)) { return }

  Get-Content $resolvedPath | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith('#')) { return }
    $parts = $line.Split('=', 2)
    if ($parts.Count -ne 2) { return }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name)) -and -not [string]::IsNullOrWhiteSpace($value)) {
      [Environment]::SetEnvironmentVariable($name, $value)
      Set-Item -Path ("Env:" + $name) -Value $value
    }
  }
}

function Convert-SecureStringToPlainText([Security.SecureString]$secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

Import-DotEnvIfAvailable

if ($HostName) { $env:DATABASE_HOST = $HostName }
if ($Port) { $env:DATABASE_PORT = $Port }
if ($UserName) { $env:DATABASE_USER = $UserName }
if ($Password) { $env:DATABASE_PASSWORD = $Password }
if ($Database) { $env:DATABASE_NAME = $Database }
if ($DatabaseUrl) { $env:DATABASE_URL = $DatabaseUrl }
if ($UseSsl) { $env:DATABASE_SSL = 'true' }

if ($env:DATABASE_URL -and (-not $env:DATABASE_HOST -or -not $env:DATABASE_USER -or -not $env:DATABASE_NAME)) {
  $uri = [System.Uri]$env:DATABASE_URL
  $env:DATABASE_HOST = if ($env:DATABASE_HOST) { $env:DATABASE_HOST } else { $uri.Host }
  $env:DATABASE_PORT = if ($env:DATABASE_PORT) { $env:DATABASE_PORT } else { if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' } }
  $userInfo = $uri.UserInfo
  if ($userInfo) {
    $parts = $userInfo.Split(':', 2)
    if ($parts.Count -ge 1 -and -not $env:DATABASE_USER) { $env:DATABASE_USER = [System.Uri]::UnescapeDataString($parts[0]) }
    if ($parts.Count -eq 2 -and -not $env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD = [System.Uri]::UnescapeDataString($parts[1]) }
  }
  if (-not $env:DATABASE_NAME) {
    $env:DATABASE_NAME = $uri.AbsolutePath.TrimStart('/')
  }
  if (-not $env:DATABASE_SSL -and $env:DATABASE_URL -match 'sslmode=require') {
    $env:DATABASE_SSL = 'true'
  }
}

if (-not $NoPrompt) {
  if (-not $env:DATABASE_HOST) { $env:DATABASE_HOST = Read-Host 'DATABASE_HOST' }
  if (-not $env:DATABASE_PORT) {
    $inputPort = Read-Host 'DATABASE_PORT (default 5432)'
    $env:DATABASE_PORT = if ([string]::IsNullOrWhiteSpace($inputPort)) { '5432' } else { $inputPort }
  }
  if (-not $env:DATABASE_USER) { $env:DATABASE_USER = Read-Host 'DATABASE_USER' }
  if (-not $env:DATABASE_NAME) { $env:DATABASE_NAME = Read-Host 'DATABASE_NAME' }
  if (-not $env:DATABASE_PASSWORD) {
    $securePwd = Read-Host 'DATABASE_PASSWORD' -AsSecureString
    $env:DATABASE_PASSWORD = Convert-SecureStringToPlainText $securePwd
  }
}

$required = @('DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME')
$missing = @()
foreach ($name in $required) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) { $missing += $name }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required env vars: " + ($missing -join ', '))
}

Write-Host "Running migration with target: $($env:DATABASE_HOST):$($env:DATABASE_PORT)/$($env:DATABASE_NAME) as $($env:DATABASE_USER)"
npm run typeorm:run
if ($LASTEXITCODE -ne 0) {
  Write-Error "typeorm:run failed"
}

Write-Host "Checking ownerRole column"
node .\scripts\check-ownerRole-column.cjs
if ($LASTEXITCODE -ne 0) {
  Write-Error "ownerRole check failed"
}

Write-Host "Migration and ownerRole verification completed successfully."
