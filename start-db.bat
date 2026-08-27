@echo off
title TwAItter - Database Launcher
echo ===================================================
echo   Avvio Container MongoDB in Docker
echo ===================================================
cd /d "%~dp0"
docker compose up -d
echo.
echo MongoDB avviato su localhost:27017
echo Mongo Express avviato su http://localhost:8081/
pause
