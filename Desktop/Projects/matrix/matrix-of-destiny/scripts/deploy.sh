#!/bin/bash
# Deploy script — run from local machine after SSH access is established
# Usage: bash scripts/deploy.sh

set -e

SERVER="root@88.198.116.22"
KEY="./deploy_key"
APP_DIR="/var/www/matrixofdestinytarot"
API_DIR="/var/www/matrix-api"

echo "=== Building web app ==="
npx expo export --platform web

echo "=== Uploading web dist ==="
rsync -avz --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
    dist/ $SERVER:$APP_DIR/

echo "=== Uploading API ==="
rsync -avz --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
    --exclude node_modules \
    api/ $SERVER:$API_DIR/

echo "=== Restarting API ==="
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER \
    "cd $API_DIR && npm install --production && (pm2 restart matrix-api || pm2 start server.js --name matrix-api) && pm2 save"

echo "=== Verifying API health ==="
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER \
    "sleep 2 && curl -s http://127.0.0.1:3100/health && echo ' ← API OK'"

echo "=== Configuring nginx API proxy ==="
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER bash << 'ENDSSH'
# Write a dedicated nginx config for the API proxy on port 3101 exposed as /api/
# Using a separate server block on port 80 with a catch-all — idempotent.
cat > /etc/nginx/sites-available/matrix-api << 'EOF'
server {
    listen 80;
    server_name _;

    # Let the main site handle non-api traffic if this is a default catch-all
    # This block only handles /api, /health, /privacy explicitly

    location /api/ {
        proxy_pass         http://127.0.0.1:3100/api/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_connect_timeout 10s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
        add_header "Access-Control-Allow-Origin"  "*" always;
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS" always;
        add_header "Access-Control-Allow-Headers" "Content-Type" always;
        if ($request_method = OPTIONS) { return 204; }
    }

    location = /health {
        proxy_pass http://127.0.0.1:3100/health;
    }

    location = /privacy {
        proxy_pass http://127.0.0.1:3100/privacy;
    }
}
EOF

# Check if the main site config already has /api/ — if yes, add locations there instead
if grep -q "location /api/" /etc/nginx/sites-available/default 2>/dev/null; then
  # Update timeouts in existing config
  sed -i 's/proxy_read_timeout [0-9]*s;/proxy_read_timeout 300s;/g' /etc/nginx/sites-available/default
  sed -i 's/proxy_send_timeout [0-9]*s;/proxy_send_timeout 300s;/g' /etc/nginx/sites-available/default
  echo "Updated timeouts in existing default nginx config"
else
  # Enable our dedicated API proxy config
  ln -sf /etc/nginx/sites-available/matrix-api /etc/nginx/sites-enabled/matrix-api
  echo "Enabled matrix-api nginx site"
fi
ENDSSH

echo "=== Reloading nginx ==="
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER \
    "nginx -t && systemctl reload nginx"

echo ""
echo "=== Deployed successfully ==="
echo "https://yourmatrixofdestiny.com"
