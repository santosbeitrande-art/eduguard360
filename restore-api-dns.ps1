param(
  [string]$ApiHost = "api.eduguard360.co.mz",
  [string]$TargetHost = "",
  [string]$RecordType = "CNAME",
  [string]$ZoneName = "eduguard360.co.mz",
  [switch]$Proxied
)

$ErrorActionPreference = "Stop"

$cfToken = $env:CLOUDFLARE_API_TOKEN
$cfEmail = $env:CF_EMAIL
$zoneId = $env:CF_ZONE_ID

function Read-SecretLine([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($cfToken)) {
  $cfToken = Read-SecretLine "Cloudflare API Token"
}

$cfToken = $cfToken.Trim()
$cfToken = $cfToken -replace '^token\s*:\s*', ''

if ([string]::IsNullOrWhiteSpace($zoneId)) {
  Write-Host "CF_ZONE_ID not set. Trying zone lookup by name: $ZoneName"
}

if ([string]::IsNullOrWhiteSpace($TargetHost)) {
  $TargetHost = Read-Host -Prompt "Backend target host for $ApiHost (example: api-backend.onrender.com or 203.0.113.10)"
}

if ([string]::IsNullOrWhiteSpace($TargetHost)) {
  throw "Missing target host."
}

# If user provides an IP but forgot to switch from CNAME, force A to avoid Cloudflare API rejection.
if ($RecordType -eq "CNAME" -and [System.Net.IPAddress]::TryParse($TargetHost, [ref]([System.Net.IPAddress]::Any))) {
  Write-Host "TargetHost is an IP. Switching RecordType from CNAME to A automatically."
  $RecordType = "A"
}

if ($RecordType -ne "A" -and $RecordType -ne "CNAME") {
  throw "RecordType must be A or CNAME."
}

$headersBearer = @{
  "Authorization" = "Bearer $cfToken"
  "Content-Type" = "application/json"
}

$headers = $headersBearer
$authMode = "API Token (Bearer)"
$usedGlobalKeyFallback = $false

function Set-GlobalKeyHeaders {
  if ([string]::IsNullOrWhiteSpace($script:cfEmail)) {
    $script:cfEmail = Read-Host -Prompt "Cloudflare account email (for Global API Key mode)"
  }

  if ([string]::IsNullOrWhiteSpace($script:cfEmail)) {
    throw "Missing Cloudflare email for Global API Key mode."
  }

  $script:headers = @{
    "X-Auth-Email" = $script:cfEmail
    "X-Auth-Key" = $script:cfToken
    "Content-Type" = "application/json"
  }
  $script:authMode = "Global API Key"
  $script:usedGlobalKeyFallback = $true
  Write-Host "Cloudflare auth mode: Global API Key"
}

function Invoke-CfRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [string]$Body
  )

  try {
    if ($PSBoundParameters.ContainsKey('Body')) {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:headers -Body $Body
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:headers
  } catch {
    $responseBody = ""
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
      }
    } catch {
      $responseBody = ""
    }

    if (-not $script:usedGlobalKeyFallback -and $script:authMode -eq "API Token (Bearer)") {
      if ($responseBody -match '"code"\s*:\s*9106' -or $responseBody -match 'Authentication failed') {
        Write-Host "Bearer token rejected by API. Trying Global API Key mode..."
        Set-GlobalKeyHeaders
        if ($PSBoundParameters.ContainsKey('Body')) {
          return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:headers -Body $Body
        }
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:headers
      }
    }

    throw
  }
}

Write-Host "Cloudflare auth mode: $authMode"

if ([string]::IsNullOrWhiteSpace($zoneId)) {
  $zoneLookupUrl = "https://api.cloudflare.com/client/v4/zones?name=$ZoneName&status=active"
  $zoneLookup = Invoke-CfRequest -Method GET -Uri $zoneLookupUrl
  if (-not $zoneLookup.success -or -not $zoneLookup.result -or $zoneLookup.result.Count -eq 0) {
    throw "Unable to resolve zone ID automatically for $ZoneName."
  }
  $zoneId = $zoneLookup.result[0].id
  Write-Host "Resolved zone ID: $zoneId"
}

Write-Host "[1/5] Looking up existing DNS record for $ApiHost..."
$searchUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$ApiHost"
$search = Invoke-CfRequest -Method GET -Uri $searchUrl
if (-not $search.success) {
  throw "Cloudflare DNS lookup failed."
}

$record = $null
if ($search.result -and $search.result.Count -gt 0) {
  $record = $search.result[0]
}

$payload = @{
  type = $RecordType
  name = $ApiHost
  content = $TargetHost
  ttl = 120
  proxied = [bool]$Proxied
} | ConvertTo-Json

if ($record -ne $null) {
  Write-Host "[2/5] Updating existing record $($record.id)..."
  $updateUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($record.id)"
  $update = Invoke-CfRequest -Method PUT -Uri $updateUrl -Body $payload
  if (-not $update.success) {
    throw "Failed to update DNS record."
  }
} else {
  Write-Host "[2/5] Creating new record..."
  $createUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"
  $create = Invoke-CfRequest -Method POST -Uri $createUrl -Body $payload
  if (-not $create.success) {
    throw "Failed to create DNS record."
  }
}

Write-Host "[3/5] Checking DNS from 1.1.1.1..."
$ns = nslookup $ApiHost 1.1.1.1 | Out-String
$ns

Write-Host "[4/5] Checking API health endpoint..."
try {
  $health = Invoke-WebRequest -Uri "https://$ApiHost/health" -Method GET -TimeoutSec 15
  Write-Host "Health status: $($health.StatusCode)"
} catch {
  Write-Host "Health probe failed: $($_.Exception.Message)"
  throw
}

Write-Host "[5/5] Completed"

Write-Host "DNS restore completed for $ApiHost -> $TargetHost"
