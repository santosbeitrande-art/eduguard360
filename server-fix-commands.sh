#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/eduguard360
sudo mkdir -p "$ROOT" /var/log
sudo cp deploy-eduguard.service /etc/systemd/system/eduguard.service
sudo cp deploy-eduguard-nginx.conf /etc/nginx/conf.d/eduguard.conf
sudo cp -r . "$ROOT"
sudo chown -R www-data:www-data "$ROOT" /var/log/eduguard-api.log 2>/dev/null || true
cd "$ROOT/eduguard/verify-api"
sudo -u www-data npm ci --no-audit --no-fund
sudo systemctl daemon-reload
sudo systemctl enable eduguard
sudo systemctl restart eduguard
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status eduguard --no-pager
