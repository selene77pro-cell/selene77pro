@echo off
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 goto missing
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 goto missing
if not exist "node_modules\ws\package.json" (
  call npm.cmd ci --omit=dev
  if errorlevel 1 goto failed
)
echo Starting LAST OUTPOST. Keep this window open.
start "" /b powershell -NoProfile -Command "$u='http://127.0.0.1:3000/health'; for($i=0;$i -lt 60;$i++){try{$r=Invoke-RestMethod -Uri $u -TimeoutSec 1;if($r.ok){Start-Process 'http://localhost:3000';exit}}catch{};Start-Sleep -Milliseconds 500}"
call npm.cmd start
if errorlevel 1 goto failed
exit /b 0
:missing
echo Install Node.js LTS version 24 or newer from https://nodejs.org/ and run this file again.
pause
exit /b 1
:failed
echo Game could not start. See the error above. Check whether another game server is already using port 3000.
pause
exit /b 1
