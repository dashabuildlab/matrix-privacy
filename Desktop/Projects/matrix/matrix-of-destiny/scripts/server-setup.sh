#!/bin/bash
# Server setup script for yourmatrixofdestiny.com
# Run as root on 88.198.116.22
# Usage: bash server-setup.sh

set -e

DOMAIN="yourmatrixofdestiny.com"
EMAIL="admin@yourmatrixofdestiny.com"
APP_DIR="/var/www/matrixofdestinytarot"
API_DIR="/var/www/matrix-api"

echo "=== Installing dependencies ==="
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx nodejs npm git curl

# Install PM2
npm install -g pm2

echo "=== Creating directories ==="
mkdir -p $APP_DIR
mkdir -p $API_DIR

echo "=== Configuring nginx (HTTP first) ==="
cat > /etc/nginx/sites-available/matrixofdestinytarot << 'NGINX'
server {
    listen 80;
    server_name yourmatrixofdestiny.com www.yourmatrixofdestiny.com;

    root /var/www/matrixofdestinytarot;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
NGINX

ln -sf /etc/nginx/sites-available/matrixofdestinytarot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Getting SSL certificate ==="
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "=== Setting up API ==="
# Copy API files (done via rsync separately)
cd $API_DIR
npm install --production 2>/dev/null || true

# Start API with PM2
pm2 delete matrix-api 2>/dev/null || true
pm2 start server.js --name matrix-api --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "=== Adding deploy SSH key ==="
mkdir -p /root/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAi+9Ypuinox6R/QQW1NA3w5u9KXllUc48+UibDrxwdx buildlab-matrix-of-soul" >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

echo ""
echo "=== DONE ==="
echo "Site:  https://$DOMAIN"
echo "API:   pm2 status"
echo "Nginx: nginx -t && systemctl reload nginx"
