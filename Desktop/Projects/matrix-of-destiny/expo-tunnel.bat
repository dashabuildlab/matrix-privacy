@echo off
cd /d "%~dp0"
echo.
echo === Deploy + Tunnel (Matrix of Destiny) ===
echo.

echo [1/2] Deploying code...
wsl -e sh -c "cp /mnt/host/c/Users/dell/Desktop/Projects/matrix-of-destiny/deploy_key /tmp/deploy_key_mod && chmod 600 /tmp/deploy_key_mod && cd /mnt/host/c/Users/dell/Desktop/Projects/matrix-of-destiny && rsync -avz --delete --exclude node_modules --exclude .expo --exclude .git --exclude .claude --exclude dist --exclude '*.backup' --exclude 'seo-website/node_modules' --exclude 'seo-website/.next' -e 'ssh -i /tmp/deploy_key_mod -o StrictHostKeyChecking=no' ./ deployer@89.167.40.15:/srv/apps/matrix-of-destiny/ && rm -f /tmp/deploy_key_mod"

if %errorlevel% neq 0 (
    echo ERROR: Deploy failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting Expo Go tunnel...
wsl -e sh /mnt/host/c/Users/dell/Desktop/Projects/matrix-of-destiny/tunnel.sh

pause
