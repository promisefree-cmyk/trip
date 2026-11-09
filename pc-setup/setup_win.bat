@echo off
setlocal EnableDelayedExpansion
title Rooton Custom PC Full Auto-Setup (No PS1 Required)
echo ============================================================================
echo   [Straw Hat 7-Crew] Rooton Custom PC Auto-Migration (Windows)
echo   Zero-PS1 Direct Installer (curl.exe + tar.exe + mklink)
echo ============================================================================
echo.

set "SERVER_URL=https://final-latina-duo-zoo.trycloudflare.com"
set "STUDIO_KEY=rt9k4m7x2v8p"
set "DL_DIR=%USERPROFILE%\Downloads\Rooton_PC_Migration_Pack"
if not exist "%DL_DIR%" mkdir "%DL_DIR%"

call :download_and_extract "obsidian_caudex_quest.zip" "%USERPROFILE%\.ai-brain" "1/7 Obsidian Shared Brain (~/.ai-brain)"
call :download_and_extract "rooton_claude_homepage.zip" "%USERPROFILE%\rooton-claude" "2/7 Rooton Official Homepage (~/rooton-claude)"
call :download_and_extract "douga_master_studio.zip" "%USERPROFILE%\douga" "3/7 Master Studio & Flipbook (~/douga)"
call :download_and_extract "wise_darwin_chiro_saas.zip" "%USERPROFILE%\Documents\antigravity\wise-darwin" "4/7 Reservation & EMR SaaS (~/Documents/antigravity/wise-darwin)"
call :download_and_extract "antigravity_claude_configs.zip" "%USERPROFILE%" "5/7 Antigravity (.gemini) & Claude (.claude) 7-Crew Configs"
call :download_and_extract "kaiwa_travel_backend.zip" "%USERPROFILE%\kaiwa" "6/7 Travel Master Backend (~/kaiwa)"
call :download_and_extract "instagram_autoposter.zip" "%USERPROFILE%\Instagram" "7/7 Instagram Auto-Poster (~/Instagram)"

echo.
echo [Config] Updating Mac paths (/Users/ys) to Windows Home (%USERPROFILE%)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$h = $env:USERPROFILE; $hp = $h -replace '\\','/'; $vault = Join-Path $h ('Obsidian\Claude(' + [char]0x5E74 + [char]0x53CE + '5' + [char]0x5104 + ')'); $parent = Split-Path -Parent $vault; if (!(Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }; if (!(Test-Path -LiteralPath $vault) -and (Test-Path -LiteralPath (Join-Path $h '.ai-brain'))) { cmd /c mklink /J $vault $(Join-Path $h '.ai-brain') | Out-Null }; $kaiwaJp = Join-Path $h ([string][char]0x4F1A + [char]0x8A71); if (!(Test-Path -LiteralPath $kaiwaJp) -and (Test-Path -LiteralPath (Join-Path $h 'kaiwa'))) { cmd /c mklink /J $kaiwaJp $(Join-Path $h 'kaiwa') | Out-Null }; foreach ($d in @('.gemini','.claude')) { $p = Join-Path $h $d; if (Test-Path -LiteralPath $p) { Get-ChildItem -LiteralPath $p -Recurse -File -Include *.md,*.json,*.toml,*.py,*.sh | ForEach-Object { try { $t = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8); if ($t.Contains('/Users/ys')) { [IO.File]::WriteAllText($_.FullName, $t.Replace('/Users/ys', $hp), (New-Object Text.UTF8Encoding($false))) } } catch {} } } }; $wsh = New-Object -ComObject WScript.Shell; $desk = [Environment]::GetFolderPath('Desktop'); @{ 'Rooton_Homepage' = (Join-Path $h 'rooton-claude'); 'Rooton_MasterStudio' = (Join-Path $h 'douga'); 'Rooton_ChiroSaaS' = (Join-Path $h 'Documents\antigravity\wise-darwin'); 'Obsidian_SharedBrain' = (Join-Path $h '.ai-brain') }.GetEnumerator() | ForEach-Object { try { $s = $wsh.CreateShortcut((Join-Path $desk ($_.Key + '.lnk'))); $s.TargetPath = $_.Value; $s.Save() } catch {} }" 

echo.
echo ============================================================================
echo   [COMPLETE] All 7 packages installed & configured on your Custom PC!
echo   - Shared Brain : %USERPROFILE%\.ai-brain
echo   - Homepage     : %USERPROFILE%\rooton-claude
echo   - Master Studio: %USERPROFILE%\douga
echo   - Chiro SaaS   : %USERPROFILE%\Documents\antigravity\wise-darwin
echo   - Desktop shortcuts have been created!
echo ============================================================================
echo.
pause
exit /b 0

:download_and_extract
set "ZIP_NAME=%~1"
set "DEST_DIR=%~2"
set "LABEL=%~3"
echo.
echo ----------------------------------------------------------------------------
echo [%LABEL%]
set "ZIP_FILE=%~dp0%ZIP_NAME%"
if exist "%ZIP_FILE%" goto :do_extract
set "ZIP_FILE=%DL_DIR%\%ZIP_NAME%"
if exist "%ZIP_FILE%" goto :do_extract
echo   Downloading %ZIP_NAME% from MacBook Server...
curl.exe -fL --retry 3 -o "%ZIP_FILE%" "%SERVER_URL%/pc-setup/%ZIP_NAME%?k=%STUDIO_KEY%"
if not exist "%ZIP_FILE%" (
    echo   [ERROR] Could not download %ZIP_NAME%
    exit /b 1
)
:do_extract
if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
echo   Extracting %ZIP_NAME% to %DEST_DIR% ...
tar.exe -xf "%ZIP_FILE%" -C "%DEST_DIR%"
echo   [OK] %ZIP_NAME% installed.
exit /b 0
