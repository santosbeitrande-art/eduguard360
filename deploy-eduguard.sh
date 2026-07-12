#!/usr/bin/env bash
set -euo pipefail

ROOT=/var/www/eduguard360
API_DIR="$ROOT/eduguard/verify-api"

mkdir -p "$ROOT"
cd "$ROOT"

if [ ! -d "$API_DIR" ]; then
  echo "Expected project directory at $API_DIR" >&2
  exit 1
fi

cd "$API_DIR"

echo "Installing dependencies..."
npm ci --no-audit --no-fund

echo "Building verify-api..."
npm run build

echo "Installing systemd service..."
sudo cp "$ROOT/deploy-eduguard.service" /etc/systemd/system/eduguard.service
sudo systemctl daemon-reload
sudo systemctl enable eduguard
sudo systemctl restart eduguard

echo "Service status:"
sudo systemctl --no-pager --full status eduguard | sed -n '1,30p'

echo "EduGuard API started in production mode. Logs: /var/log/eduguard-api.log"
