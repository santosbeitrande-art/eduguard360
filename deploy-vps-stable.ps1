param(
  [Parameter(Mandatory = $true)]
  [string]$SshUser,

  [Parameter(Mandatory = $true)]
  [string]$SshHost,

  [string]$Domain = "eduguard360.co.mz",
  [int]$SshPort = 22,
  [string]$Root = "/var/www/eduguard360"
)

$ErrorActionPreference = "Stop"
$sshTarget = "$SshUser@$SshHost"
$sshOptions = @(
  "-o", "ConnectTimeout=15",
  "-o", "StrictHostKeyChecking=accept-new",
  "-p", "$SshPort"
)

function Invoke-Remote {
  param([string]$Command)
  & ssh @sshOptions $sshTarget $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed with exit code $LASTEXITCODE"
  }
}

Write-Host "[0/5] Checking SSH connectivity..."
& ssh @sshOptions $sshTarget "echo connected >/dev/null"
if ($LASTEXITCODE -ne 0) {
  throw "Cannot reach $sshTarget on port $SshPort. Check firewall/security group and SSH daemon port."
}

Write-Host "[1/5] Creating target directory on server..."
Invoke-Remote ("sudo mkdir -p {0} && sudo chown -R `$USER:`$USER {0}" -f $Root)

Write-Host "[2/5] Uploading project files with tar+scp..."
$tempArchive = Join-Path $env:TEMP "eduguard360-deploy.tgz"
if (Test-Path $tempArchive) {
  Remove-Item -Force $tempArchive
}

# Create an archive without git metadata and local dependencies.
& tar -czf $tempArchive --exclude=.git --exclude=node_modules .
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create local archive"
}

& scp @sshOptions $tempArchive "${sshTarget}:/tmp/eduguard360-deploy.tgz"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upload archive to VPS"
}

Invoke-Remote "cd $Root && tar -xzf /tmp/eduguard360-deploy.tgz && rm -f /tmp/eduguard360-deploy.tgz"
Remove-Item -Force $tempArchive

Write-Host "[3/5] Installing system packages..."
Invoke-Remote "sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm"

Write-Host "[4/5] Deploying API and systemd service..."
Invoke-Remote "cd $Root && chmod +x deploy-eduguard.sh deploy-eduguard-systemd.sh && ./deploy-eduguard.sh && sudo ./deploy-eduguard-systemd.sh"

Write-Host "[5/5] Configuring Nginx + HTTPS..."
Invoke-Remote "cd $Root && sudo cp deploy-eduguard-nginx.conf /etc/nginx/conf.d/eduguard.conf && sudo nginx -t && sudo systemctl reload nginx"
Invoke-Remote "sudo certbot --nginx -d $Domain -d www.$Domain -d api.$Domain --non-interactive --agree-tos -m admin@$Domain || true"

Write-Host "Stable deployment finished."
Write-Host "Open: https://$Domain/public/login"
