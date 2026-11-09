param(
    [string]$PackDir = "",
    [string]$WorkDir = "",
    [string]$ServerUrl = "https://final-latina-duo-zoo.trycloudflare.com",
    [string]$Key = "rt9k4m7x2v8p",
    [Parameter(ValueFromRemainingArguments=$true)]$ExtraArgs
)
$ErrorActionPreference = "Continue"

$HomeDir = $env:USERPROFILE
$HomePosix = $HomeDir -replace '\\', '/'
$DownloadDir = Join-Path $HomeDir "Downloads\Rooton_PC_Migration_Pack"
if (-not (Test-Path -LiteralPath $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  [Straw Hat 7-Crew] Rooton Custom PC Auto-Migration (Windows)" -ForegroundColor Cyan
Write-Host "  Home Dir  : $HomeDir" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

function Install-Package {
    param([string]$ZipName, [string]$DestPath, [string]$Label)
    Write-Host "`n[$Label] -> $DestPath" -ForegroundColor Yellow
    $ZipFile = Join-Path $DownloadDir $ZipName
    if (-not (Test-Path -LiteralPath $ZipFile)) {
        $Url = "$($ServerUrl.TrimEnd('/'))/pc-setup/$ZipName`?k=$Key"
        Write-Host "  Downloading $ZipName ..." -ForegroundColor Cyan
        & curl.exe -fL --retry 3 -o "$ZipFile" "$Url"
    }
    if (-not (Test-Path -LiteralPath $ZipFile)) {
        Write-Host "  [WARN] Failed to download $ZipName" -ForegroundColor Red
        return
    }
    if (-not (Test-Path -LiteralPath $DestPath)) {
        New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
    }
    Write-Host "  Extracting $ZipName ..." -ForegroundColor Cyan
    & tar.exe -xf "$ZipFile" -C "$DestPath"
    Write-Host "  [OK] $ZipName extracted." -ForegroundColor Green
}

Install-Package "obsidian_caudex_quest.zip" (Join-Path $HomeDir ".ai-brain") "1/7 Obsidian Shared Brain (~/.ai-brain)"
Install-Package "rooton_claude_homepage.zip" (Join-Path $HomeDir "rooton-claude") "2/7 Rooton Official Homepage (~/rooton-claude)"
Install-Package "douga_master_studio.zip" (Join-Path $HomeDir "douga") "3/7 Master Studio & Flipbook (~/douga)"
Install-Package "wise_darwin_chiro_saas.zip" (Join-Path $HomeDir "Documents\antigravity\wise-darwin") "4/7 Reservation & EMR SaaS (~/Documents/antigravity/wise-darwin)"
Install-Package "antigravity_claude_configs.zip" $HomeDir "5/7 Antigravity (.gemini) & Claude (.claude) 7-Crew Configs"
Install-Package "kaiwa_travel_backend.zip" (Join-Path $HomeDir "kaiwa") "6/7 Travel Master Backend (~/kaiwa)"
Install-Package "instagram_autoposter.zip" (Join-Path $HomeDir "Instagram") "7/7 Instagram Auto-Poster (~/Instagram)"

# Create Japanese folder junctions using Unicode codepoints (100% pure ASCII script)
$VaultJp = Join-Path $HomeDir ("Obsidian\Claude(" + [char]0x5E74 + [char]0x53CE + "5" + [char]0x5104 + ")")
$VaultParent = Split-Path -Parent $VaultJp
if (-not (Test-Path -LiteralPath $VaultParent)) { New-Item -ItemType Directory -Path $VaultParent -Force | Out-Null }
if ((-not (Test-Path -LiteralPath $VaultJp)) -and (Test-Path -LiteralPath (Join-Path $HomeDir ".ai-brain"))) {
    cmd /c mklink /J "$VaultJp" "$(Join-Path $HomeDir '.ai-brain')" | Out-Null
}
$KaiwaJp = Join-Path $HomeDir ([string][char]0x4F1A + [char]0x8A71)
if ((-not (Test-Path -LiteralPath $KaiwaJp)) -and (Test-Path -LiteralPath (Join-Path $HomeDir "kaiwa"))) {
    cmd /c mklink /J "$KaiwaJp" "$(Join-Path $HomeDir 'kaiwa')" | Out-Null
}

# Replace /Users/ys with Windows Home in .gemini and .claude config files
foreach ($d in @(".gemini", ".claude")) {
    $p = Join-Path $HomeDir $d
    if (Test-Path -LiteralPath $p) {
        Get-ChildItem -LiteralPath $p -Recurse -File -Include *.md,*.json,*.toml,*.py,*.sh | ForEach-Object {
            try {
                $raw = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                if ($raw.Contains("/Users/ys")) {
                    [System.IO.File]::WriteAllText($_.FullName, $raw.Replace("/Users/ys", $HomePosix), (New-Object System.Text.UTF8Encoding($false)))
                }
            } catch {}
        }
    }
}

# Create Desktop Shortcuts
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $Shortcuts = @{
        "Rooton_Homepage" = (Join-Path $HomeDir "rooton-claude");
        "Rooton_MasterStudio" = (Join-Path $HomeDir "douga");
        "Rooton_ChiroSaaS" = (Join-Path $HomeDir "Documents\antigravity\wise-darwin");
        "Obsidian_SharedBrain" = (Join-Path $HomeDir ".ai-brain")
    }
    foreach ($k in $Shortcuts.Keys) {
        $lnk = $WshShell.CreateShortcut((Join-Path $Desktop ($k + ".lnk")))
        $lnk.TargetPath = $Shortcuts[$k]
        $lnk.Save()
    }
} catch {}

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  [COMPLETE] All 7 packages installed on your Custom PC!" -ForegroundColor Green
Write-Host "  - Shared Brain : $HomeDir\.ai-brain" -ForegroundColor Green
Write-Host "  - Homepage     : $HomeDir\rooton-claude" -ForegroundColor Green
Write-Host "  - Master Studio: $HomeDir\douga" -ForegroundColor Green
Write-Host "  - Chiro SaaS   : $HomeDir\Documents\antigravity\wise-darwin" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
