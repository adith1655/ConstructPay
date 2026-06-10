@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   ConstructPay - local launcher
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install the LTS version from https://nodejs.org/ and run this again.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Creating .env from .env.example ...
  copy ".env.example" ".env" >nul
)

if not exist "node_modules" (
  echo Installing dependencies ^(first run only - this can take a few minutes^) ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

if not exist "prisma\dev.db" (
  echo Setting up the local database and demo data ...
  call npm run setup
  if errorlevel 1 (
    echo [ERROR] Database setup failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting ConstructPay at http://localhost:3000
echo Demo login: owner@constructpay.in  /  Password123!
echo Press Ctrl+C to stop the server.
echo.

REM Open the browser a few seconds after the server starts.
start "" cmd /c "timeout /t 6 >nul & start "" http://localhost:3000"

call npm run dev

endlocal
