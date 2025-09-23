@echo off
REM Enhanced Keep-Alive Service Starter for Render Backend
REM This script runs the keep-alive service on Windows with proper error handling

echo ========================================
echo   Keep-Alive Service for Render Backend
echo ========================================
echo.

REM Set the backend URL
set BACKEND_URL=https://virello-backend.onrender.com

echo Backend URL: %BACKEND_URL%
echo.

REM Test the connection first
echo Testing connection to backend...
node test-keepalive.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Connection test failed!
    echo Please check:
    echo   1. Your internet connection
    echo   2. The backend URL is correct
    echo   3. The backend is running on Render
    echo.
    pause
    exit /b 1
)

echo.
echo Connection test passed! Starting keep-alive service...
echo Press Ctrl+C to stop the service
echo.

REM Run the keep-alive service
node keep-alive.js

echo.
echo Keep-alive service stopped.
pause
