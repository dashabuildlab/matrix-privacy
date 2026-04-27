"""Deploy SEO website (static export) to server using SSH + base64 encoding."""
import paramiko, os, base64

KEY_PATH = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\deploy_key'
LOCAL_PATH = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\seo-website\out'
HOST = '89.167.40.15'
USER = 'deployer'
REMOTE_BASE = '/srv/apps/matrix-of-soul/seo-website'

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
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    return exit_code, out, err

def upload_file(local_path, remote_path):
    with open(local_path, 'rb') as f:
        data = f.read()

    b64 = base64.b64encode(data).decode()
    remote_dir = remote_path.rsplit('/', 1)[0]

    cmds = [f'mkdir -p {remote_dir}', f'rm -f {remote_path}.b64']

    LINE = 1000
    for i in range(0, len(b64), LINE):
        chunk = b64[i:i+LINE]
        cmds.append(f'printf "%s" "{chunk}" >> {remote_path}.b64')

    cmds.append(f'base64 -d {remote_path}.b64 > {remote_path} && rm -f {remote_path}.b64')
    cmds.append(f'echo "OK:{remote_path}"')

    exit_code, out, err = run_shell(cmds)
    if f'OK:{remote_path}' not in out:
        print(f'  WARNING: possible issue. exit={exit_code} err={err[:200]}')

# Step 1: Build check
if not os.path.exists(LOCAL_PATH):
    print(f'ERROR: {LOCAL_PATH} not found. Run "npm run build" first.')
    exit(1)

# Step 2: Upload all files
count = 0
for root, dirs, files in os.walk(LOCAL_PATH):
    for fname in files:
        if fname.endswith('.b64'):
            continue
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, LOCAL_PATH).replace('\\', '/')
        remote_path = f'{REMOTE_BASE}/{rel}'
        size = os.path.getsize(local_path)
        print(f'Uploading {rel} ({size:,} bytes)...')
        upload_file(local_path, remote_path)
        count += 1

print(f'\n{count} files uploaded.')

# Step 3: Clean leftover .b64 files
print('Cleaning up...')
run_shell([f'find {REMOTE_BASE} -name "*.b64" -delete 2>/dev/null', 'echo cleaned'])

# Step 4: Create nginx config for seo-website if not exists
print('Setting up nginx for seo-website...')
nginx_conf = r"""server {
    listen 3020;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location = / {
        return 301 /uk/;
    }

    location /api/ {
        proxy_pass http://host.docker.internal:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }

    location /uk/ {
        try_files $uri $uri/ $uri/index.html /uk/index.html;
    }
    location /en/ {
        try_files $uri $uri/ $uri/index.html /en/index.html;
    }
    location / {
        try_files $uri $uri/ $uri/index.html /uk/index.html;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml text/xml application/xml;
}"""

# Write nginx conf
run_shell([
    f'mkdir -p /srv/apps/matrix-of-soul/nginx',
    f'cat > /srv/apps/matrix-of-soul/nginx/seo.conf << \'NGINXEOF\'\n{nginx_conf}\nNGINXEOF',
    'echo nginx-conf-written'
])

# Step 5: Check if seo-website service exists in docker-compose, if not add it
print('Checking docker-compose...')
_, compose_out, _ = run_shell(['cat /srv/apps/matrix-of-soul/docker-compose.yml'])

if 'seo-website' not in compose_out:
    print('Adding seo-website service to docker-compose.yml...')
    seo_service = """
  seo-website:
    image: nginx:alpine
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "3020:3020"
    volumes:
      - ./seo-website:/usr/share/nginx/html:ro
      - ./nginx/seo.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped"""

    run_shell([
        f'cat >> /srv/apps/matrix-of-soul/docker-compose.yml << \'COMPEOF\'\n{seo_service}\nCOMPEOF',
        'echo compose-updated'
    ])
else:
    print('seo-website service already in docker-compose.yml')

# Step 6: Restart/start seo-website container
print('Starting seo-website container...')
exit_code, out, err = run_shell([
    'cd /srv/apps/matrix-of-soul && docker compose up -d seo-website',
    'echo container-started'
])
print(f'Docker output: {out.strip()}')
if err.strip():
    print(f'Docker stderr: {err.strip()[:500]}')

# Step 7: Verify
print('\nVerifying...')
_, out, _ = run_shell([
    f'ls -la {REMOTE_BASE}/uk/index.html',
    f'ls -la {REMOTE_BASE}/sitemap.xml',
    f'ls -la {REMOTE_BASE}/robots.txt',
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3020/uk/',
])
print(out.strip())

client.close()
print('\nDeploy complete!')
