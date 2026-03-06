@echo off
setlocal

cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  set "PY=python"
)

echo Starting local server at http://localhost:8000
start "" http://localhost:8000

%PY% -m http.server 8000

endlocal
