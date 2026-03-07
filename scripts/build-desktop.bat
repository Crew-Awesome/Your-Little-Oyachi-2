@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."

call :require_bun
if errorlevel 1 exit /b 1

call :require_cargo
if errorlevel 1 exit /b 1

if "%~1"=="" goto :menu
if /I "%~1"=="menu" goto :menu

if /I "%~1"=="dev" call :run_dev & goto :end
if /I "%~1"=="release" call :run_build_release & goto :end
if /I "%~1"=="debug" call :run_build_debug & goto :end

echo Usage: %~nx0 [menu^|dev^|release^|debug]
exit /b 1

:menu
cls
echo =========================================
echo    Your Little Oyachi 2 Desktop Builder
echo =========================================
echo 1^) Run Desktop DEV
echo 2^) Build RELEASE
echo 3^) Build DEBUG
echo 4^) Open output folder
echo 5^) Exit
echo.
set "CHOICE="
set /p CHOICE=Select an option [1-5]: 

if "%CHOICE%"=="1" call :run_dev & goto :end
if "%CHOICE%"=="2" call :run_build_release & goto :wait_and_menu
if "%CHOICE%"=="3" call :run_build_debug & goto :wait_and_menu
if "%CHOICE%"=="4" call :open_output_folder & goto :wait_and_menu
if "%CHOICE%"=="5" goto :end

echo Invalid option: %CHOICE%
goto :wait_and_menu

:wait_and_menu
echo.
pause
goto :menu

:require_bun
where bun >nul 2>&1
if errorlevel 1 (
  echo bun is required but was not found. Install Bun from https://bun.sh
  exit /b 1
)
exit /b 0

:require_cargo
where cargo >nul 2>&1
if errorlevel 1 (
  echo cargo is required but was not found. Install Rust from https://rustup.rs
  exit /b 1
)
exit /b 0

:run_dev
cd /d "%REPO_ROOT%"
bun install
if errorlevel 1 exit /b 1
bun run dev
if errorlevel 1 exit /b 1
exit /b 0

:run_build_release
cd /d "%REPO_ROOT%"
bun install
if errorlevel 1 exit /b 1
bun run build
if errorlevel 1 exit /b 1
echo Build output: %REPO_ROOT%\src-tauri\target\release\bundle
exit /b 0

:run_build_debug
cd /d "%REPO_ROOT%"
bun install
if errorlevel 1 exit /b 1
bun run build:debug
if errorlevel 1 exit /b 1
echo Build output: %REPO_ROOT%\src-tauri\target\debug
exit /b 0

:open_output_folder
start "" "%REPO_ROOT%\src-tauri\target\release\bundle"
exit /b 0

:end
endlocal
