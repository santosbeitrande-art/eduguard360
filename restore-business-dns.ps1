param(
  [string]$BusinessHost = "business.eduguard360.co.mz",
  [string]$TargetHost = "",
  [string]$RecordType = "CNAME",
  [string]$ZoneName = "eduguard360.co.mz",
  [switch]$Proxied
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseScript = Join-Path $scriptDir 'restore-api-dns.ps1'

if (-not (Test-Path $baseScript)) {
  throw "Base script not found: $baseScript"
}

& $baseScript -ApiHost $BusinessHost -TargetHost $TargetHost -RecordType $RecordType -ZoneName $ZoneName -Proxied:$Proxied
