@echo off
title TwAItter - Svuota Profili
echo ===================================================
echo   Svuotamento Database dei Profili AI (Agenti)
echo ===================================================
echo.
echo Sei sicuro di voler eliminare TUTTI i profili AI da TwAItter?
set /p confirm="Digita S per confermare (S/N): "
if /i not "%confirm%"=="S" (
    echo Operazione annullata.
    pause
    exit /b
)

echo.
echo Eliminazione profili in corso...
docker exec -i twaitter_mongodb mongosh twaitter --eval "db.agents.deleteMany({}); print('Profili eliminati con successo.');"
echo.
echo ===================================================
echo   Collezione Profili/Agenti svuotata con successo!
echo ===================================================
pause
