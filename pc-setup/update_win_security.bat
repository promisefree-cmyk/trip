@echo off
chcp 65001 >nul
title Rooton Custom PC - Fortress v9 Security & Full Sync Updater
echo ============================================================================
echo   [Straw Hat 7-Crew] Custom Windows PC Security ^& Latest Sync Updater
echo   - Pulls latest GitHub updates ^(.ai-brain ^& rooton-claude^)
echo   - Syncs all Rules, Skills, judge_rules.json, and 7-Crew Agents
echo   - Locks Windows NTFS ACLs ^(icacls^) on .env, WP Cookies ^& Master Key
echo ============================================================================
echo.

if exist "%USERPROFILE%\.ai-brain\.git" (
    echo [1/4] Updating Shared Brain ^(.ai-brain^) from GitHub...
    git -C "%USERPROFILE%\.ai-brain" pull --ff-only
) else (
    echo [WARN] %USERPROFILE%\.ai-brain not found yet. Run initial setup first!
)

if exist "%USERPROFILE%\rooton-claude\.git" (
    echo.
    echo [2/4] Updating Rooton Official Homepage ^(rooton-claude^) from GitHub...
    git -C "%USERPROFILE%\rooton-claude" pull --ff-only
)

echo.
echo [3/4] Running maintain_system.py ^(7-Crew SSOT + NTFS ACL Security Lockdown^)...
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python "%USERPROFILE%\.ai-brain\maintain_system.py"
) else (
    py "%USERPROFILE%\.ai-brain\maintain_system.py"
)

echo.
echo [4/4] Enforcing Windows NTFS ACL ^(icacls^) ^& scrubbing legacy TEMP cookies...
if exist "%TEMP%\wp_cookies_urllib.txt" del /f /q "%TEMP%\wp_cookies_urllib.txt" >nul 2>&1
set "RT_ACCT=%USERNAME%"
if defined USERDOMAIN set "RT_ACCT=%USERDOMAIN%\%USERNAME%"
for %%F in (
    "%USERPROFILE%\.gemini\rooton_wp_cookies.txt"
    "%USERPROFILE%\.gemini\.env"
    "%USERPROFILE%\.claude\.env"
    "%USERPROFILE%\rooton-claude\.env"
    "%USERPROFILE%\douga\.env"
    "%USERPROFILE%\Instagram\.env"
    "%USERPROFILE%\Documents\antigravity\wise-darwin\data\.master_key"
    "%USERPROFILE%\Documents\antigravity\wise-darwin\data\reservations.sqlite"
) do (
    if exist "%%~F" (
        icacls "%%~F" /inheritance:r /grant:r "*S-1-5-18:(F)" "*S-1-5-32-544:(F)" "%RT_ACCT%:(F)" >nul 2>&1
    )
)

echo.
echo ============================================================================
echo   [COMPLETE] Your Custom Windows PC now matches Mac 100%% ^(Fortress v9^)!
echo ============================================================================
echo.
pause
exit /b 0
