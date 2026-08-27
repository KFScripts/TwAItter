@echo off
title TwAItter - Stop All
echo ===================================================
echo   Arresto TwAItter (Database Docker)
echo ===================================================
cd /d "%~dp0"
docker compose down
echo.
echo Database MongoDB arrestato.
echo (Puoi chiudere le finestre terminale di Backend e Frontend)
pause
