#!/usr/bin/env bash
set -euo pipefail

# Idempotent server-side normalization for EduGuard Verify AI public access.
ROOT="/var/www/eduguard360"
API_DIR="$ROOT/eduguard/verify-api"
SERVICE_FILE="/etc/systemd/system/eduguard.service"
NGINX_TARGET="/etc/nginx/conf.d/eduguard.conf"
NGINX_SOURCE=""
DOMAIN="${1:-eduguard360.co.mz}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"

if [ -f "$ROOT/deploy-eduguard-nginx.conf" ]; then
  NGINX_SOURCE="$ROOT/deploy-eduguard-nginx.conf"
elif [ -f "$ROOT/nginx-eduguard.conf" ]; then
  NGINX_SOURCE="$ROOT/nginx-eduguard.conf"
else
  echo "ERROR: Nginx config source not found in $ROOT" >&2
  exit 1
fi

if [ ! -d "$API_DIR" ]; then
  echo "ERROR: verify-api directory not found at $API_DIR" >&2
  exit 1
fi

echo "[1/7] Installing runtime dependencies..."
sudo apt-get update
sudo apt-get install -y nginx nodejs npm certbot python3-certbot-nginx curl

echo "[2/7] Building verify-api..."
cd "$API_DIR"
npm ci --no-audit --no-fund
npm run build

echo "[3/7] Installing and restarting systemd service..."
if [ ! -f "$ROOT/deploy-eduguard.service" ]; then
  echo "ERROR: Missing $ROOT/deploy-eduguard.service" >&2
  exit 1
fi
sudo cp "$ROOT/deploy-eduguard.service" "$SERVICE_FILE"
sudo mkdir -p /etc/eduguard
if [ ! -f /etc/eduguard/verify-api.env ]; then
  cat <<EOF | sudo tee /etc/eduguard/verify-api.env >/dev/null
VERIFY_ADMIN_TOKEN=SET_STRONG_ADMIN_TOKEN
INTERNAL_ADMIN_PASSWORD=SET_STRONG_INTERNAL_ADMIN_PASSWORD
JWT_SECRET=change-me-jwt-secret
AUDIT_EXPORT_SECRET=change-me-audit-secret
PAYMENT_SUCCESS_URL=https://${DOMAIN}/public
PAYMENT_CANCEL_URL=https://${DOMAIN}/public/login
EOF
  sudo chmod 600 /etc/eduguard/verify-api.env
fi
sudo touch /var/log/eduguard-api.log
sudo chown -R www-data:www-data "$ROOT" /var/log/eduguard-api.log
sudo systemctl daemon-reload
sudo systemctl enable eduguard
sudo systemctl restart eduguard
sudo systemctl --no-pager --full status eduguard | sed -n '1,20p'

echo "[4/7] Applying canonical Nginx config..."
sudo cp "$NGINX_SOURCE" "$NGINX_TARGET"
sudo nginx -t
sudo systemctl reload nginx

echo "[5/7] Ensuring HTTPS certificate..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || true
sudo nginx -t
sudo systemctl reload nginx

echo "[6/7] Local health checks..."
curl -fsS "http://127.0.0.1:4000/health" >/dev/null
curl -fsS "http://127.0.0.1:4000/public/login" | grep -qi "EduGuard Verify AI"

echo "[7/7] Public URL checks..."
curl -fsSIL "https://${DOMAIN}/public" >/dev/null
curl -fsS "https://${DOMAIN}/public/login" | grep -qi "EduGuard Verify AI"

echo "Normalization complete."
echo "Portal URL: https://${DOMAIN}/public"
echo "Login URL:  https://${DOMAIN}/public/login"
