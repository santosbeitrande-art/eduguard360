#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <ssh_user> <ssh_host> [domain] [ssh_port]"
  echo "Example: $0 ubuntu 203.0.113.10 eduguard360.co.mz 22"
  exit 1
fi

SSH_USER="$1"
SSH_HOST="$2"
RAW_DOMAIN="${3:-eduguard360.co.mz}"
SSH_PORT="${4:-22}"
ROOT="/var/www/eduguard360"
DOMAIN="${RAW_DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="${DOMAIN#www.}"
DOMAIN="${DOMAIN#api.}"
WWW_DOMAIN="www.${DOMAIN}"
API_DOMAIN="api.${DOMAIN}"

SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SSH_BASE=(ssh -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SSH_TARGET")

echo "[0/5] Checking SSH connectivity..."
"${SSH_BASE[@]}" "echo connected >/dev/null" || {
  echo "ERROR: Cannot reach $SSH_TARGET on port $SSH_PORT."
  echo "Check VPS firewall/security group, cloud provider inbound rules, and SSH daemon port."
  exit 1
}

echo "[1/5] Creating target directory on server..."
"${SSH_BASE[@]}" "sudo mkdir -p $ROOT && sudo chown -R \$USER:\$USER $ROOT"

echo "[2/5] Uploading project files..."
if command -v rsync >/dev/null 2>&1; then
  rsync -av --delete \
    -e "ssh -o StrictHostKeyChecking=accept-new -p $SSH_PORT" \
    --exclude '.git' \
    --exclude 'node_modules' \
    ./ "$SSH_TARGET:$ROOT/"
else
  echo "rsync not found. Using tar-over-ssh fallback..."
  tar --exclude='.git' --exclude='node_modules' -czf - . \
    | "${SSH_BASE[@]}" "cd $ROOT && tar -xzf -"
fi

echo "[2.1/5] Marking scripts as executable on remote host..."
"${SSH_BASE[@]}" "cd $ROOT && chmod +x deploy-eduguard.sh deploy-eduguard-systemd.sh normalize-access-permanente.sh"

echo "[3/5] Installing system packages..."
"${SSH_BASE[@]}" "sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm"

echo "[4/5] Deploying API and systemd service..."
"${SSH_BASE[@]}" "cd $ROOT && chmod +x deploy-eduguard.sh deploy-eduguard-systemd.sh && ./deploy-eduguard.sh && sudo ./deploy-eduguard-systemd.sh"

echo "[5/5] Configuring Nginx + HTTPS..."
"${SSH_BASE[@]}" "cd $ROOT && sudo cp deploy-eduguard-nginx.conf /etc/nginx/conf.d/eduguard.conf && sudo nginx -t && sudo systemctl reload nginx"
"${SSH_BASE[@]}" "sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN -d $API_DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || true"
"${SSH_BASE[@]}" "cd $ROOT && ./normalize-access-permanente.sh $DOMAIN"

echo "Stable deployment finished."
echo "Portal URL: https://$DOMAIN/public"
echo "Login URL:  https://$DOMAIN/public/login"
echo "API URL:    https://$API_DOMAIN/health"
