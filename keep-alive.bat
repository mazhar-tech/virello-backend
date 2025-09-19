@echo off
REM Keep-Alive Service for Render Backend
REM This script runs the keep-alive service on Windows

echo ========================================
echo   Keep-Alive Service for Render Backend
echo ========================================
echo.

REM Check if BACKEND_URL is set
if "%BACKEND_URL%"=="" (
    echo ERROR: BACKEND_URL environment variable is not set!
    echo.
    echo Please set your Render backend URL:
    echo   set BACKEND_URL=https://your-render-backend-url.onrender.com
    echo.
    echo Or run this script with the URL:
    echo   BACKEND_URL=https://your-render-backend-url.onrender.com keep-alive.bat
    echo.
    pause
    exit /b 1
)

echo Backend URL: %BACKEND_URL%
echo Starting keep-alive service...
echo Press Ctrl+C to stop the service
echo.

REM Run the keep-alive service
node keep-alive.js

echo.
echo Keep-alive service stopped.
pause
