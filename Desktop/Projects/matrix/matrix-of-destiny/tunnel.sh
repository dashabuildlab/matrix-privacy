#!/bin/sh
KEY=/tmp/deploy_key_mod
CMDS=/tmp/mod_tunnel_cmds
cp /mnt/host/c/Users/dell/Desktop/Projects/matrix/matrix-of-destiny/deploy_key "$KEY"
chmod 600 "$KEY"
PORT=$(cat /mnt/host/c/Users/dell/Desktop/Projects/matrix/matrix-of-destiny/.port | tr -d '[:space:]')

printf '%s\n' \
  'pkill -f "expo start" 2>/dev/null || true' \
  'docker compose stop seo-website 2>&1' \
  "script -q -c 'npx expo start --tunnel --port $PORT' /dev/null </dev/null" \
  'exit' > "$CMDS"

ssh -i "$KEY" -o StrictHostKeyChecking=no deployer@89.167.40.15 shell < "$CMDS"

rm -f "$KEY" "$CMDS"
