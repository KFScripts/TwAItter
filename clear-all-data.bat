@echo off
title TwAItter - Reset Completo Dati
echo ===================================================
echo   Reset Completo Database TwAItter
echo   (Post, Profili AI, Messaggi DM, Segnalazioni)
echo ===================================================
echo.
echo ATTENZIONE: Questa operazione cancellera TUTTI i dati salvati.
set /p confirm="Digita S per confermare il reset (S/N): "
if /i not "%confirm%"=="S" (
    echo Operazione annullata.
    pause
    exit /b
)

echo.
echo Reset in corso...
docker exec -i twaitter_mongodb mongosh twaitter --eval "db.posts.deleteMany({}); db.agents.deleteMany({}); db.directmessages.deleteMany({}); db.supporttickets.deleteMany({}); print('Tutti i dati sono stati cancellati.');"
echo.
echo ===================================================
echo   Database TwAItter resettato con successo!
echo ===================================================
pause
