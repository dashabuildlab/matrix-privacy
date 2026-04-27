"""Deploy merged site: Expo app + SEO website on port 3005."""
import paramiko, os, base64, time

KEY_PATH = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\deploy_key'
HOST = '89.167.40.15'
USER = 'deployer'

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, pkey=key)


def run_shell(commands):
    stdin, stdout, stderr = client.exec_command('shell')
    for cmd in commands:
        stdin.write(cmd + '\n')
    stdin.write('exit\n')
    stdin.flush()
    stdin.channel.shutdown_write()
    stdout.channel.recv_exit_status()
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    return out, err


def upload_file(local_path, remote_path):
    with open(local_path, 'rb') as f:
        data = f.read()
    b64 = base64.b64encode(data).decode()
    remote_dir = remote_path.rsplit('/', 1)[0]
    cmds = [f'mkdir -p {remote_dir}', f'rm -f {remote_path}.b64']
    LINE = 1000
    for i in range(0, len(b64), LINE):
        chunk = b64[i:i + LINE]
        cmds.append(f'printf "%s" "{chunk}" >> {remote_path}.b64')
    cmds.append(f'base64 -d {remote_path}.b64 > {remote_path} && rm -f {remote_path}.b64')
    cmds.append(f'echo "OK:{remote_path}"')
    out, err = run_shell(cmds)
    if f'OK:{remote_path}' not in out:
        print(f'  WARN: {err[:200]}')


def upload_dir(local_dir, remote_dir):
    count = 0
    for root, dirs, files in os.walk(local_dir):
        for fname in files:
            if fname.endswith('.b64'):
                continue
            local_path = os.path.join(root, fname)
            rel = os.path.relpath(local_path, local_dir).replace('\\', '/')
            remote_path = f'{remote_dir}/{rel}'
            size = os.path.getsize(local_path)
            print(f'  {rel} ({size:,} bytes)')
            upload_file(local_path, remote_path)
            count += 1
    return count


BASE = '/srv/apps/matrix-of-soul'
DIST_LOCAL = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\dist'
SEO_LOCAL = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\seo-website\out'

# ===== 1. Restore Expo app =====
print('=== 1. Restoring Expo app to dist/ ===')
run_shell([f'rm -rf {BASE}/dist/*'])
n = upload_dir(DIST_LOCAL, f'{BASE}/dist')
print(f'  -> {n} Expo files uploaded\n')

# ===== 2. Ensure SEO files exist =====
print('=== 2. Checking SEO files in seo-website/ ===')
out, _ = run_shell([f'ls {BASE}/seo-website/uk/index.html 2>/dev/null && echo OK || echo MISSING'])
if 'MISSING' in out:
    print('  Re-uploading SEO files...')
    n = upload_dir(SEO_LOCAL, f'{BASE}/seo-website')
    print(f'  -> {n} SEO files uploaded\n')
else:
    print('  SEO files already present\n')

# ===== 3. Write nginx config =====
print('=== 3. Writing nginx config ===')
NGINX_CONF = """server {
    listen 3005;
    index index.html;

    # Root -> /uk/
    location = / {
        return 301 /uk/;
    }

    # SEO pages
    location /uk/ {
        alias /usr/share/nginx/seo/uk/;
        try_files $uri $uri/ $uri/index.html index.html;
    }

    location /en/ {
        alias /usr/share/nginx/seo/en/;
        try_files $uri $uri/ $uri/index.html index.html;
    }

    location = /sitemap.xml {
        alias /usr/share/nginx/seo/sitemap.xml;
    }

    location = /robots.txt {
        alias /usr/share/nginx/seo/robots.txt;
    }

    # SEO static assets (_next/)
    location /_next/ {
        root /usr/share/nginx/seo;
        try_files $uri @expo_assets;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location @expo_assets {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API proxy
    location /api/ {
        proxy_pass http://host.docker.internal:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }

    location /health {
        proxy_pass http://host.docker.internal:3000/health;
    }

    # Expo web app — everything else
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|mp4|webp)$ {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml text/xml application/xml;
}
"""

# Write config via heredoc
run_shell([
    f"cat > {BASE}/nginx/app.conf << 'ENDNGINX'\n{NGINX_CONF}ENDNGINX",
])
print('  nginx config written\n')

# ===== 4. Update docker-compose =====
print('=== 4. Updating docker-compose.yml ===')
COMPOSE = """services:
  api:
    build: ./api
    network_mode: "host"
    env_file:
      - .env
    environment:
      PORT: "3000"
    restart: unless-stopped

  app:
    image: nginx:alpine
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "3005:3005"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./seo-website:/usr/share/nginx/seo:ro
      - ./nginx/app.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped

  landing:
    image: nginx:alpine
    ports:
      - "3015:3015"
    volumes:
      - ./website:/usr/share/nginx/html:ro
      - ./nginx/landing.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
"""

run_shell([
    f"cat > {BASE}/docker-compose.yml << 'ENDCOMPOSE'\n{COMPOSE}ENDCOMPOSE",
])
print('  docker-compose.yml written\n')

# ===== 5. Recreate app container =====
print('=== 5. Recreating app container ===')
out, err = run_shell([
    f'cd {BASE} && docker compose up -d app --force-recreate',
])
print(f'  {err.strip()[:500]}\n')

# ===== 6. Cleanup =====
print('=== 6. Cleanup ===')
run_shell([
    f'find {BASE}/dist -name "*.b64" -delete 2>/dev/null',
    f'find {BASE}/seo-website -name "*.b64" -delete 2>/dev/null',
    f'cd {BASE} && docker stop matrix-of-soul-seo-website-1 2>/dev/null',
    f'cd {BASE} && docker rm matrix-of-soul-seo-website-1 2>/dev/null',
])
print('  done\n')

# ===== 7. Verify =====
print('=== 7. Verifying ===')
time.sleep(3)
out, _ = run_shell([
    'echo -n "Root redirect: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/',
    'echo ""',
    'echo -n "SEO /uk/: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/uk/',
    'echo ""',
    'echo -n "SEO /en/: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/en/',
    'echo ""',
    'echo -n "SEO /uk/wiki/: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/uk/wiki/',
    'echo ""',
    'echo -n "SEO /uk/kalkulyator: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/uk/kalkulyator-matrytsi-doli/',
    'echo ""',
    'echo -n "Sitemap: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/sitemap.xml',
    'echo ""',
    'echo -n "Robots: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/robots.txt',
])
# Filter output
for line in out.split('\n'):
    line = line.strip()
    if line and ('Root' in line or 'SEO' in line or 'Sitemap' in line or 'Robots' in line):
        print(f'  {line}')

client.close()
print('\nDone! Site: http://89.167.40.15:3005/uk/')
