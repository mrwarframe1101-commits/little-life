@echo off
title Little Life
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" goto run
echo Little Life isn't installed yet. Trying to install it now...
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Couldn't find npm on this PC. Ask ChatGPT to run "npm install" in this folder.
  pause
  exit /b 1
)
call npm install
if not exist "node_modules\electron\dist\electron.exe" node node_modules\electron\install.js
:run
start "" "node_modules\electron\dist\electron.exe" .
