@echo off
REM Start script for Smart SIP Web Application
REM Double-click this file to start the web server

echo.
echo ============================================
echo   Smart SIP Platform - Web Application
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [2/3] Starting development server...
echo Please wait while the server starts...
echo.

REM Start server in background and wait for it to be ready
start /B node start-server.js

REM Wait a few seconds for server to start
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Opening browser...
echo Web UI: http://localhost:5173
echo.

start http://localhost:5173

echo.
echo ============================================
echo Server is running!
echo Press any key to stop the server
echo ============================================
pause > nul

REM Kill the node processes
taskkill /F /IM node.exe /T > nul 2>&1

echo Server stopped.
pause
