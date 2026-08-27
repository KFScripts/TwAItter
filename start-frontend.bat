@echo off
title TwAItter - Frontend Client
echo ===================================================
echo   Avvio TwAItter Frontend Client (Porta 5173)
echo ===================================================

echo Liberazione porta 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%~dp0client"
npm run dev
pause
