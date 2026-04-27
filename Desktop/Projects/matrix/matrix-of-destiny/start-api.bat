@echo off
cd /d "%~dp0"

echo Starting API container...
wsl -e sh -c "echo 'cd /srv/apps/matrix-of-soul && docker compose up -d --build api' | ssh -i /mnt/host/c/Users/dell/Desktop/Projects/matrix/matrix-of-soul/deploy_key -o StrictHostKeyChecking=no deployer@89.167.40.15 shell"

echo.
echo Waiting for API to start...
timeout /t 5 /nobreak >nul
echo Testing connection...
curl -s --max-time 5 http://89.167.40.15:3000/health
echo.
pause
