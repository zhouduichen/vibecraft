@echo off
REM Start the Python Worker pipeline server
REM Usage: start-worker.bat [--port 9120] [--dry-run]

if "%AI_API_KEY%"=="" (
    echo ERROR: AI_API_KEY environment variable is required
    exit /b 1
)
if "%AI_MODEL%"=="" (
    echo ERROR: AI_MODEL environment variable is required
    exit /b 1
)

set PORT=%1
if "%PORT%"=="" set PORT=9120

echo Starting Pipeline Worker on 127.0.0.1:%PORT%
python -m workers.server --port %PORT% %2 %3
