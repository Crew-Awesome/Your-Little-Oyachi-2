@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
cd /d "%REPO_ROOT%"

if "%PORT%"=="" set "PORT=8080"

where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  set "PY=python"
)

echo Starting local server at http://localhost:%PORT%/app/index.html
start "" http://localhost:%PORT%/app/index.html

%PY% -m http.server %PORT%

endlocal
