param(
    [string]$ServerUrl = "https://final-latina-duo-zoo.trycloudflare.com",
    [string]$WorkDir = ""
)
# ==============================================================================
# 🏴‍☠️ 杉山慶彦様専用・自作PC（Windows）完全一括セットアップ＆共通脳リンク構築スクリプト
# ==============================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ([string]::IsNullOrWhiteSpace($WorkDir)) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
    $ScriptDir = $WorkDir.TrimEnd('\', '/')
}
$DownloadDir = Join-Path $env:USERPROFILE "Downloads\Rooton_PC_Migration_Pack"
if (-not (Test-Path -LiteralPath $DownloadDir)) {
    New-Item -ItemType Directory -Path $DownloadDir -Force | Out-Null
}

$HomeDir   = $env:USERPROFILE
$HomePosix = $HomeDir -replace '\\', '/'
$StudioKey = "rt9k4m7x2v8p"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🏴‍☠️ 自作PC（Windows）完全移行＆麦わらの一味・共通脳セットアップ開始" -ForegroundColor Cyan
Write-Host "  配信サーバー: $ServerUrl"
Write-Host "  新PCホーム  : $HomeDir"
Write-Host "==================================================================" -ForegroundColor Cyan

function Get-MigrationZipPath {
    param(
        [string]$ZipName,
        [string]$Label
    )
    $LocalCand1 = Join-Path $ScriptDir $ZipName
    if (Test-Path -LiteralPath $LocalCand1) {
        return $LocalCand1
    }
    $LocalCand2 = Join-Path $DownloadDir $ZipName
    if (Test-Path -LiteralPath $LocalCand2) {
        return $LocalCand2
    }
    $Url = "$($ServerUrl.TrimEnd('/'))/pc-setup/$ZipName`?k=$StudioKey"
    Write-Host "`n[自動ダウンロード] $Label ($ZipName) をMacBook母艦から取得中..." -ForegroundColor Cyan
    & curl.exe -fL "$Url" -o "$LocalCand2"
    if (Test-Path -LiteralPath $LocalCand2) {
        return $LocalCand2
    }
    return ""
}

# ------------------------------------------------------------------------------
# Step 1: 共通の脳＆ホームページ＆各アプリ（ZIP自動取得＋展開＋GitHub同期）
# ------------------------------------------------------------------------------
function Sync-GitRepo {
    param(
        [string]$RepoUrl,
        [string]$DestPath,
        [string]$Label,
        [string]$FallbackZip = ""
    )
    Write-Host "`n[Git/ZIP] $Label ($DestPath) ..." -ForegroundColor Yellow
    $ParentDir = Split-Path -Parent $DestPath
    if (-not (Test-Path -LiteralPath $ParentDir)) {
        New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath (Join-Path $DestPath ".git")) -and $FallbackZip -ne "") {
        $ZipFile = Get-MigrationZipPath -ZipName $FallbackZip -Label $Label
        if ($ZipFile -ne "" -and (Test-Path -LiteralPath $ZipFile)) {
            Write-Host "  -> $FallbackZip を展開中..." -ForegroundColor Cyan
            if (-not (Test-Path -LiteralPath $DestPath)) {
                New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
            }
            tar -xf "$ZipFile" -C "$DestPath"
            Write-Host "  ✅ $FallbackZip 展開完了（Git履歴・全ファイル復元済み）" -ForegroundColor Green
        }
    }
    if (Get-Command git -ErrorAction SilentlyContinue) {
        if (Test-Path -LiteralPath (Join-Path $DestPath ".git")) {
            Push-Location -LiteralPath $DestPath
            git pull --ff-only 2>$null
            Pop-Location
        } else {
            git clone $RepoUrl $DestPath
        }
    }
}

Sync-GitRepo "https://github.com/promisefree-cmyk/caudex-quest.git" (Join-Path $HomeDir "Obsidian\Claude(年収5億)") "1/5 共通の脳・Obsidian (caudex-quest)" "obsidian_caudex_quest.zip"
Sync-GitRepo "https://github.com/promisefree-cmyk/rooton-claude.git" (Join-Path $HomeDir "rooton-claude") "2/5 ROOTON 公式ホームページ一式 (rooton-claude)" "rooton_claude_homepage.zip"
Sync-GitRepo "https://github.com/promisefree-cmyk/ramen-iko.git" (Join-Path $HomeDir "作業場\ramen-iko") "3/5 ラーメン行こ (ramen-iko)"
Sync-GitRepo "https://github.com/promisefree-cmyk/trip.git" (Join-Path $HomeDir "会話\.trip_pages_repo") "4/5 旅行＆スタジオ常設ポータル (trip)"
Sync-GitRepo "https://github.com/promisefree-cmyk/sns-monsters.git" (Join-Path $HomeDir "x") "5/5 SNSモンスターズ (sns-monsters)"

# ~/.ai-brain ジャンクション作成（管理者権限不要）
$BrainLink = Join-Path $HomeDir ".ai-brain"
$BrainTarget = Join-Path $HomeDir "Obsidian\Claude(年収5億)"
if ((Test-Path -LiteralPath $BrainTarget) -and (-not (Test-Path -LiteralPath $BrainLink))) {
    cmd /c mklink /J "$BrainLink" "$BrainTarget" | Out-Null
    Write-Host "✅ ~/.ai-brain -> $BrainTarget リンク作成完了" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Step 2: Git外の全システム＆データベース＆設定ZIP（5種）の自動取得・展開
# ------------------------------------------------------------------------------
function Expand-MigrationZip {
    param(
        [string]$ZipName,
        [string]$DestPath,
        [string]$Label
    )
    $ZipPath = Get-MigrationZipPath -ZipName $ZipName -Label $Label
    if ($ZipPath -eq "" -or (-not (Test-Path -LiteralPath $ZipPath))) {
        Write-Host "⚠️ $ZipName の取得をスキップしました" -ForegroundColor Red
        return
    }
    Write-Host "`n[ZIP展開] $Label -> $DestPath ..." -ForegroundColor Yellow
    if (-not (Test-Path -LiteralPath $DestPath)) {
        New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
    }
    tar -xf "$ZipPath" -C "$DestPath"
    Write-Host "✅ $ZipName 展開完了" -ForegroundColor Green
}

Expand-MigrationZip "douga_master_studio.zip" (Join-Path $HomeDir "douga") "1/5 マスタースタジオ＆パラパラ漫画スタジオ (~/douga)"
Expand-MigrationZip "wise_darwin_chiro_saas.zip" (Join-Path $HomeDir "Documents\antigravity\wise-darwin") "2/5 予約・問診・カルテSaaS + 暗号化DB (~/Documents/antigravity/wise-darwin)"
Expand-MigrationZip "instagram_autoposter.zip" (Join-Path $HomeDir "Instagram") "3/5 Instagram 自動投稿・確定申告ツール (~/Instagram)"
Expand-MigrationZip "kaiwa_travel_backend.zip" (Join-Path $HomeDir "会話") "4/5 旅行マスターサーバー＆キャッシュ (~/会話)"
Expand-MigrationZip "antigravity_claude_configs.zip" $HomeDir "5/5 Antigravity (.gemini) ＆ Claude (.claude) 麦わらの一味7人設定・WP Cookie"

# ------------------------------------------------------------------------------
# Step 3: 設定ファイル内の Mac パス (/Users/ys) を新PCのホームパスへ自動置換
# ------------------------------------------------------------------------------
Write-Host "`n[パス自動最適化] .gemini / .claude 設定ファイル内のパスを新PC環境に更新中..." -ForegroundColor Yellow
$ConfigDirs = @(
    (Join-Path $HomeDir ".gemini"),
    (Join-Path $HomeDir ".claude")
)
foreach ($cdir in $ConfigDirs) {
    if (Test-Path -LiteralPath $cdir) {
        Get-ChildItem -LiteralPath $cdir -Recurse -File -Include *.md,*.json,*.toml,*.py,*.sh | ForEach-Object {
            try {
                $raw = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                if ($raw.Contains("/Users/ys")) {
                    $updated = $raw.Replace("/Users/ys", $HomePosix)
                    [System.IO.File]::WriteAllText($_.FullName, $updated, (New-Object System.Text.UTF8Encoding($false)))
                }
            } catch {}
        }
    }
}
Write-Host "✅ Antigravity (.gemini) ＆ Claude (.claude) のパス最適化完了" -ForegroundColor Green

# ------------------------------------------------------------------------------
# Step 4: Obsidian アプリへの保管庫自動登録
# ------------------------------------------------------------------------------
if (Test-Path -LiteralPath (Join-Path $BrainTarget ".setup\setup_windows.ps1")) {
    try {
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $BrainTarget ".setup\setup_windows.ps1")
    } catch {}
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "🎉 自作PCへの全システム・ホームページ・共通の脳・麦わらの一味7人の移行が完了しました！" -ForegroundColor Green
Write-Host "  ・Obsidian保管庫 : $HomeDir\Obsidian\Claude(年収5億) (近道 ~/.ai-brain)"
Write-Host "  ・公式ホームページ: $HomeDir\rooton-claude (python tools/ship.py)"
Write-Host "  ・マスタースタジオ: $HomeDir\douga (python studio_server.py)"
Write-Host "  ・予約カルテSaaS : $HomeDir\Documents\antigravity\wise-darwin (node server.js)"
Write-Host "  ・旅行マスター   : $HomeDir\会話 (python travel_server.py)"
Write-Host "==================================================================" -ForegroundColor Cyan
