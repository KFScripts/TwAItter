@echo off
title TwAItter - Full Stack Launcher
echo ===================================================
echo   Avvio Completo TwAItter (DB + Backend + Frontend)
echo ===================================================

echo Liberazione porte 5000 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%~dp0"
echo 1/3 Avvio Database MongoDB (Docker)...
docker compose up -d

echo 2/3 Avvio Backend Server...
start "TwAItter Backend" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo 3/3 Avvio Frontend Client...
start "TwAItter Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ===================================================
echo   Tutto avviato con successo!
echo   Frontend:      http://localhost:5173/
echo   Backend:       http://localhost:5000/
echo   Mongo Express: http://localhost:8081/
echo ===================================================
timeout /t 6
