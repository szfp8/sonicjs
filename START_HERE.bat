@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ===============================================
echo   SonicJS Cloudflare Production One-Click
echo ===============================================
echo.
echo This launcher keeps admin passwords out of the repository.
echo It will open Cloudflare login when needed.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 LTS or newer, then run this file again.
  pause
  exit /b 1
)

node scripts\cloudflare\setup.mjs
if errorlevel 1 (
  echo.
  echo Deployment stopped because an error occurred.
) else (
  echo.
  echo Deployment finished successfully.
)
pause
