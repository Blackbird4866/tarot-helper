@echo off
setlocal

set "ROOT_DIR=%~dp0..\.."
set "FRONTEND_DIR=%ROOT_DIR%\frontend\app"
set "WORKER_DIR=%ROOT_DIR%\worker"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required. It is normally installed with Node.js.
  pause
  exit /b 1
)

echo == Tarot Helper local deploy: Windows ==
echo.

echo Installing frontend dependencies...
pushd "%FRONTEND_DIR%"
call npm ci
if errorlevel 1 goto :failed

echo.
echo Running frontend tests...
call npm test
if errorlevel 1 goto :failed

echo.
echo Building frontend...
call npm run build
if errorlevel 1 goto :failed
popd

echo.
echo Installing Worker dependencies...
pushd "%WORKER_DIR%"
call npm ci
if errorlevel 1 goto :failed

if not exist "%WORKER_DIR%\.dev.vars" (
  copy "%WORKER_DIR%\.dev.vars.example" "%WORKER_DIR%\.dev.vars" >nul
  echo.
  echo Created worker\.dev.vars from template.
  echo Edit worker\.dev.vars and set DEEPSEEK_API_KEY for AI readings.
)

echo.
echo Starting local app:
echo   http://127.0.0.1:8788
echo.
echo Press Ctrl+C to stop.

start "" "http://127.0.0.1:8788"
call npx wrangler dev --ip 127.0.0.1 --port 8788
popd
exit /b 0

:failed
echo.
echo Local deploy failed. Check the error above.
popd
pause
exit /b 1
