#!/usr/bin/env bash
set -euo pipefail
for f in /etc/letsencrypt/live/eduguard360.co.mz/fullchain.pem /etc/letsencrypt/live/eduguard360.co.mz/privkey.pem; do
  if [ ! -f "$f" ]; then
    echo "Missing: $f"
    exit 1
  fi
done
echo "SSL certificate files found for eduguard360.co.mz"
