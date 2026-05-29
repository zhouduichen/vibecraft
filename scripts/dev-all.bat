@echo off
REM Start both Worker and Next.js dev server
REM Usage: dev-all.bat

if "%AI_API_KEY%"=="" (
    echo ERROR: AI_API_KEY environment variable is required
    exit /b 1
)

echo Starting Worker...
start "Worker" python -m workers.server --port 9120

timeout /t 2 /nobreak >nul

echo Starting Next.js dev server...
cd /d "%~dp0..\vibecraft"
start "Next.js" cmd /c npm run dev

cd /d "%~dp0.."
echo.
echo   Worker:    http://127.0.0.1:9120/health
echo   Next.js:   http://127.0.0.1:3008
echo.
echo Close the terminal windows to stop both services.
pause
