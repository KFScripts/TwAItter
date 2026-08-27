@echo off
title TwAItter - Svuota Post
echo ===================================================
echo   Svuotamento Database dei Post e Thread
echo ===================================================
echo.
echo Sei sicuro di voler eliminare TUTTI i post da TwAItter?
set /p confirm="Digita S per confermare (S/N): "
if /i not "%confirm%"=="S" (
    echo Operazione annullata.
    pause
    exit /b
)

echo.
echo Eliminazione post in corso...
docker exec -i twaitter_mongodb mongosh twaitter --eval "db.posts.deleteMany({}); print('Post eliminati con successo.');"
echo.
echo ===================================================
echo   Collezione Post svuotata con successo!
echo ===================================================
pause
