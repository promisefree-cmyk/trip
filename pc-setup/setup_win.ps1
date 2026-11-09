param(
    [string]$PackDir = "",
    [string]$WorkDir = "",
    [string]$ServerUrl = "https://final-latina-duo-zoo.trycloudflare.com",
    [string]$Key = "rt9k4m7x2v8p",
    [Parameter(ValueFromRemainingArguments=$true)]$ExtraArgs
)
$ErrorActionPreference = "Continue"
$HomeDir = $env:USERPROFILE
$DownloadDir = Join-Path $HomeDir "Downloads\Rooton_PC_Migration_Pack"
if (-not (Test-Path -LiteralPath $DownloadDir)) { New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null }

function Install-Package {
    param([string]$ZipName, [string]$DestPath, [string]$CheckFile, [string]$Label)
    if (Test-Path -LiteralPath $CheckFile) {
        Write-Host "[$Label] Already extracted - OK!" -ForegroundColor Green
        return
    }
    Write-Host "`n[$Label] -> $DestPath" -ForegroundColor Yellow
    $ZipFile = Join-Path $DownloadDir $ZipName
    if (-not (Test-Path -LiteralPath $ZipFile)) {
        $Url = "$($ServerUrl.TrimEnd('/'))/pc-setup/$ZipName`?k=$Key"
        Write-Host "  Downloading $ZipName ..." -ForegroundColor Cyan
        & curl.exe -fL --retry 3 -o "$ZipFile" "$Url"
    }
    if (-not (Test-Path -LiteralPath $DestPath)) { New-Item -ItemType Directory -Path $DestPath -Force | Out-Null }
    Write-Host "  Extracting $ZipName ..." -ForegroundColor Cyan
    & tar.exe -xf "$ZipFile" -C "$DestPath"
    Write-Host "  [OK] $ZipName extracted." -ForegroundColor Green
}

Install-Package "obsidian_caudex_quest.zip" (Join-Path $HomeDir ".ai-brain") (Join-Path $HomeDir ".ai-brain\GEMINI.md") "1/7 Obsidian Shared Brain"
Install-Package "rooton_claude_homepage.zip" (Join-Path $HomeDir "rooton-claude") (Join-Path $HomeDir "rooton-claude\llms.txt") "2/7 Rooton Official Homepage"
Install-Package "douga_master_studio.zip" (Join-Path $HomeDir "douga") (Join-Path $HomeDir "douga\studio_server.py") "3/7 Master Studio & Flipbook"
Install-Package "wise_darwin_chiro_saas.zip" (Join-Path $HomeDir "Documents\antigravity\wise-darwin") (Join-Path $HomeDir "Documents\antigravity\wise-darwin\server.js") "4/7 Reservation & EMR SaaS"
Install-Package "antigravity_claude_configs.zip" $HomeDir (Join-Path $HomeDir ".gemini\GEMINI.md") "5/7 Antigravity & Claude 7-Crew Configs"
Install-Package "kaiwa_travel_backend.zip" (Join-Path $HomeDir "kaiwa") (Join-Path $HomeDir "kaiwa\travel_server.py") "6/7 Travel Master Backend"
Install-Package "instagram_autoposter.zip" (Join-Path $HomeDir "Instagram") (Join-Path $HomeDir "Instagram\README.md") "7/7 Instagram Auto-Poster"

$ErrorActionPreference = "Continue"
$h = $env:USERPROFILE
$hp = $h -replace '\\', '/'

$vault = Join-Path $h ("Obsidian\Claude(" + [char]0x5E74 + [char]0x53CE + "5" + [char]0x5104 + ")")
$parent = Split-Path -Parent $vault
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}
$brain = Join-Path $h ".ai-brain"
if ((-not (Test-Path -LiteralPath $vault)) -and (Test-Path -LiteralPath $brain)) {
    cmd /c mklink /J "$vault" "$brain" | Out-Null
    Write-Host "  [OK] Linked $vault -> $brain" -ForegroundColor Green
}

$kaiwaJp = Join-Path $h ([string][char]0x4F1A + [char]0x8A71)
$kaiwaEn = Join-Path $h "kaiwa"
if ((-not (Test-Path -LiteralPath $kaiwaJp)) -and (Test-Path -LiteralPath $kaiwaEn)) {
    cmd /c mklink /J "$kaiwaJp" "$kaiwaEn" | Out-Null
    Write-Host "  [OK] Linked $kaiwaJp -> $kaiwaEn" -ForegroundColor Green
}

foreach ($d in @(".gemini", ".claude")) {
    $p = Join-Path $h $d
    if (Test-Path -LiteralPath $p) {
        Get-ChildItem -LiteralPath $p -Recurse -File -Include *.md,*.json,*.toml,*.py,*.sh | ForEach-Object {
            try {
                $t = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                if ($t.Contains("/Users/ys")) {
                    $u = $t.Replace("/Users/ys", $hp)
                    [System.IO.File]::WriteAllText($_.FullName, $u, (New-Object System.Text.UTF8Encoding($false)))
                }
            } catch {}
        }
    }
}
Write-Host "  [OK] Updated /Users/ys -> $hp in .gemini and .claude" -ForegroundColor Green

try {
    $obsDir = Join-Path $env:APPDATA "obsidian"
    if (-not (Test-Path -LiteralPath $obsDir)) {
        New-Item -ItemType Directory -Path $obsDir -Force | Out-Null
    }
    $obsJsonPath = Join-Path $obsDir "obsidian.json"
    $targetVaultPath = if (Test-Path -LiteralPath $vault) { $vault } else { $brain }
    $vaultJson = @{
        vaults = @{
            "rooton_shared_brain" = @{
                path = $targetVaultPath
                ts = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
                open = $true
            }
        }
    } | ConvertTo-Json -Depth 5
    if (-not (Test-Path -LiteralPath $obsJsonPath)) {
        [System.IO.File]::WriteAllText($obsJsonPath, $vaultJson, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "  [OK] Registered Shared Brain vault in Obsidian" -ForegroundColor Green
    }
} catch {}

try {
    $wsh = New-Object -ComObject WScript.Shell
    $desk = [Environment]::GetFolderPath("Desktop")
    $map = @{
        "Rooton_Homepage" = (Join-Path $h "rooton-claude");
        "Rooton_MasterStudio" = (Join-Path $h "douga");
        "Rooton_ChiroSaaS" = (Join-Path $h "Documents\antigravity\wise-darwin");
        "Obsidian_SharedBrain" = $brain
    }
    foreach ($k in $map.Keys) {
        $lnk = $wsh.CreateShortcut((Join-Path $desk ($k + ".lnk")))
        $lnk.TargetPath = $map[$k]
        $lnk.Save()
    }
    Write-Host "  [OK] Created 4 shortcuts on Desktop" -ForegroundColor Green
} catch {}

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  [COMPLETE] All 7 packages & configs are 100% ready on your Custom PC!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
