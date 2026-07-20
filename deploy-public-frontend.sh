#!/usr/bin/env bash
set -euo pipefail

# Deployment script for the public frontend on the EduGuard360 server.
# Run this on the server where /var/www/eduguard360 is mounted.

ROOT="/var/www/eduguard360"
NGINX_CONF_SOURCE="$ROOT/deploy-eduguard-nginx.conf"
NGINX_CONF_TARGET="/etc/nginx/conf.d/eduguard.conf"
FRONTEND_DIR="$ROOT"
BUILD_DIR="$FRONTEND_DIR/dist"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "Error: package.json not found in $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"

echo "Installing dependencies..."
npm install --no-audit --no-fund

echo "Building frontend..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: build output not found at $BUILD_DIR"
  exit 1
fi

if [ ! -f "$NGINX_CONF_SOURCE" ]; then
  echo "Error: Nginx config source not found at $NGINX_CONF_SOURCE"
  exit 1
fi

echo "Copying Nginx config to $NGINX_CONF_TARGET"
sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"

echo "Testing Nginx config..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Deployment complete. Public landing page should now be served at /public."
