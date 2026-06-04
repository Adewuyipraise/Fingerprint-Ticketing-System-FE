@echo off
chcp 65001 >nul
title CanteenTrack System

echo ========================================
echo   Starting CanteenTrack System...
echo ========================================
echo.

:: installer root
set ROOT=%~dp0

:: ===============================
:: BACKEND
:: ===============================
cd /d "%ROOT%backend"
if errorlevel 1 (
    echo Backend folder not found!
    pause
    exit /b 1
)

echo [1/5] Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo Backend dependency install failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Creating database...
call npm run create-db
if errorlevel 1 (
    echo Database creation failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Running migrations...
call npm run migrate
if errorlevel 1 (
    echo Migration failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building backend...
call npm run build
if errorlevel 1 (
    echo Backend build failed!
    pause
    exit /b 1
)

start "CanteenTrack Backend" cmd /k "cd /d %ROOT%backend && npm start"

timeout /t 8 >nul


:: ===============================
:: FRONTEND
:: ===============================
cd /d "%ROOT%frontend"
if errorlevel 1 (
    echo Frontend folder not found!
    pause
    exit /b 1
)

echo.
echo [5/5] Installing frontend dependencies...
call npm install -legacy-peer-deps
if errorlevel 1 (
    echo Frontend dependency install failed!
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)


start "CanteenTrack Frontend" cmd /k "cd /d %ROOT%frontend && npm run start"

echo.
echo ========================================
echo System Started Successfully
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause