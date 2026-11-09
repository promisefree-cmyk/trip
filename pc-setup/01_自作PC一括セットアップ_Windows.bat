@echo off
chcp 65001 >nul 2>&1
title Rooton Custom PC Auto-Migration (Straw Hat 7-Crew)
echo ============================================================================
echo   Rooton Custom PC Auto-Migration (Windows)
echo   Downloading / Running PowerShell Installer...
echo ============================================================================
echo.

set "PS_SCRIPT=%~dp0setup_win.ps1"
if not exist "%PS_SCRIPT%" (
    set "PS_SCRIPT=%~dp001_自作PC一括セットアップ_Windows.ps1"
)
if not exist "%PS_SCRIPT%" (
    set "PS_SCRIPT=%TEMP%\rooton_setup_win.ps1"
    echo [Download] Fetching setup_win.ps1 ...
    curl.exe -L --fail --retry 3 -o "%PS_SCRIPT%" "https://promisefree-cmyk.github.io/trip/pc-setup/setup_win.ps1"
    if not exist "%PS_SCRIPT%" (
        curl.exe -L --fail --retry 3 -o "%PS_SCRIPT%" "https://final-latina-duo-zoo.trycloudflare.com/pc-setup/setup_win.ps1?k=rt9k4m7x2v8p"
    )
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -PackDir "%~dp0"
echo.
pause
