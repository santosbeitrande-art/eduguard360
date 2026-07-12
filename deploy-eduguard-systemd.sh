#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /var/www/eduguard360 /var/log /etc/eduguard
sudo touch /var/log/eduguard-api.log
sudo chown -R www-data:www-data /var/www/eduguard360 /var/log/eduguard-api.log

DEPLOY_VERSION="$(date -u +%Y%m%d%H%M%S)"

if [ ! -f /etc/eduguard/verify-api.env ]; then
  cat <<'EOF' | sudo tee /etc/eduguard/verify-api.env >/dev/null
VERIFY_ADMIN_TOKEN=change-me-now
JWT_SECRET=change-me-jwt-secret
AUDIT_EXPORT_SECRET=change-me-audit-secret
PAYMENT_SUCCESS_URL=https://eduguard360.co.mz/public
PAYMENT_CANCEL_URL=https://eduguard360.co.mz/public/login
EOF
  sudo chmod 600 /etc/eduguard/verify-api.env
fi

sudo bash -c '
set -euo pipefail
env_file=/etc/eduguard/verify-api.env
deploy_version="$1"
tmp_file="$(mktemp)"
if [ -f "$env_file" ]; then
  grep -v "^EDUGUARD_DEPLOY_VERSION=" "$env_file" > "$tmp_file" || true
else
  : > "$tmp_file"
fi
printf "EDUGUARD_DEPLOY_VERSION=%s\n" "$deploy_version" >> "$tmp_file"
mv "$tmp_file" "$env_file"
chmod 600 "$env_file"
' _ "$DEPLOY_VERSION"

sudo cp deploy-eduguard.service /etc/systemd/system/eduguard.service
sudo systemctl daemon-reload
sudo systemctl enable eduguard
sudo systemctl restart eduguard
sudo systemctl status eduguard --no-pager
