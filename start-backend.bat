@echo off
title TwAItter - Backend Server
echo ===================================================
echo   Avvio TwAItter Backend Server (Porta 5000)
echo ===================================================

echo Liberazione porta 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%~dp0server"
npm run dev
pause
