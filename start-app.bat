@echo off
title TwAItter - App Launcher
echo ===================================================
echo   Avvio TwAItter (Backend + Frontend)
echo ===================================================

echo Liberazione porte 5000 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

start "TwAItter Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 2 /nobreak >nul
start "TwAItter Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Applicazione avviata in finestre separate!
echo Frontend: http://localhost:5173/
echo Backend:  http://localhost:5000/
timeout /t 5
