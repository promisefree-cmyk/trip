#!/usr/bin/env python3
"""
Synchronizes ~/trip/travel-planner.html, assets/travel/*, travel_state.json, and endpoint.json
to the permanent unified GitHub Pages URL: https://promisefree-cmyk.github.io/trip/
and updates the real-time secret Gist.
"""
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_DIR = BASE_DIR / ".trip_pages_repo"
TUNNEL_FILE = BASE_DIR / "tunnel_url.txt"
STUDIO_TUNNEL_FILE = Path.home() / "douga" / "studio_tunnel_url.txt"
CHIRO_TUNNEL_FILE = Path.home() / "Documents" / "antigravity" / "wise-darwin" / "chiro_tunnel_url.txt"
GIST_ID_FILE = BASE_DIR / "sync_gist_id.txt"
STATE_FILE = BASE_DIR / "travel_state.json"
PERMANENT_URL = "https://promisefree-cmyk.github.io/trip/"
STUDIO_PERMANENT_URL = "https://promisefree-cmyk.github.io/trip/studio/"
CHIRO_PERMANENT_URL = "https://promisefree-cmyk.github.io/trip/reserve/"


def get_github_token() -> str:
    try:
        p = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            timeout=5,
        )
        creds = dict(line.split("=", 1) for line in p.stdout.splitlines() if "=" in line)
        return creds.get("password", "").strip()
    except Exception:
        return ""


def sync_all():
    tunnel_url = TUNNEL_FILE.read_text(encoding="utf-8").strip() if TUNNEL_FILE.exists() else ""
    if tunnel_url and not tunnel_url.endswith("/"):
        tunnel_url += "/"

    studio_tunnel_url = STUDIO_TUNNEL_FILE.read_text(encoding="utf-8").strip() if STUDIO_TUNNEL_FILE.exists() else ""
    if studio_tunnel_url and not studio_tunnel_url.endswith("/"):
        studio_tunnel_url += "/"

    chiro_tunnel_url = CHIRO_TUNNEL_FILE.read_text(encoding="utf-8").strip() if CHIRO_TUNNEL_FILE.exists() else ""
    if chiro_tunnel_url and not chiro_tunnel_url.endswith("/"):
        chiro_tunnel_url += "/"

    ep_data = {
        "permanentUrl": PERMANENT_URL,
        "tunnelUrl": tunnel_url,
        "lanUrl": "http://192.168.10.111:8790/",
        "studioPermanentUrl": STUDIO_PERMANENT_URL,
        "studioTunnelUrl": studio_tunnel_url,
        "studioLanUrl": "http://192.168.10.111:8765/blog-studio.html",
        "studioLocalUrl": "http://127.0.0.1:8765/blog-studio.html",
        "chiroPermanentUrl": CHIRO_PERMANENT_URL,
        "chiroTunnelUrl": chiro_tunnel_url,
        "updatedAt": int(time.time() * 1000),
    }

    # 1. Update real-time Gist
    token = get_github_token()
    if GIST_ID_FILE.exists() and token:
        gist_id = GIST_ID_FILE.read_text(encoding="utf-8").strip()
        files_payload = {
            "endpoint.json": {"content": json.dumps(ep_data, ensure_ascii=False, indent=2)},
        }
        if STATE_FILE.exists():
            files_payload["travel_state.json"] = {"content": STATE_FILE.read_text(encoding="utf-8")}
        try:
            req = urllib.request.Request(
                f"https://api.github.com/gists/{gist_id}",
                data=json.dumps({"files": files_payload}).encode("utf-8"),
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Antigravity-TripSync",
                    "Content-Type": "application/json",
                },
                method="PATCH",
            )
            with urllib.request.urlopen(req, timeout=10) as _:
                print("Updated real-time Gist:", gist_id)
        except Exception as e:
            print("Gist update warning:", e)

    # 2. Clone or update .trip_pages_repo
    if not (REPO_DIR / ".git").exists():
        if REPO_DIR.exists():
            shutil.rmtree(REPO_DIR)
        subprocess.run(
            ["git", "clone", "https://github.com/promisefree-cmyk/trip.git", str(REPO_DIR)],
            check=True,
        )
    else:
        subprocess.run(["git", "-C", str(REPO_DIR), "pull", "--rebase", "origin", "main"], check=False)

    # Copy travel-planner.html -> index.html & travel-planner.html
    html_src = BASE_DIR / "travel-planner.html"
    shutil.copy2(html_src, REPO_DIR / "index.html")
    shutil.copy2(html_src, REPO_DIR / "travel-planner.html")

    # Copy travel_state.json & endpoint.json & .nojekyll
    if STATE_FILE.exists():
        shutil.copy2(STATE_FILE, REPO_DIR / "travel_state.json")
    (REPO_DIR / "endpoint.json").write_text(json.dumps(ep_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (REPO_DIR / ".nojekyll").write_text("", encoding="utf-8")
    (REPO_DIR / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")

    # Create permanent Master Studio smart redirector at /studio/index.html
    studio_dir = REPO_DIR / "studio"
    studio_dir.mkdir(parents=True, exist_ok=True)
    gist_id_str = GIST_ID_FILE.read_text(encoding="utf-8").strip() if GIST_ID_FILE.exists() else ""
    studio_html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Rooton Master Studio — 自動接続ポータル</title>
<style>
  body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif; background:#141210; color:#f5f2eb; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; box-sizing:border-box; }}
  .card {{ max-width:480px; width:100%; background:#1f1c18; border:1px solid rgba(197,160,89,0.3); border-radius:16px; padding:28px; box-shadow:0 20px 50px rgba(0,0,0,0.5); text-align:center; }}
  h1 {{ font-size:20px; margin:0 0 8px; color:#c5a059; letter-spacing:0.04em; }}
  p {{ font-size:14px; color:#b8b2a6; line-height:1.6; margin:0 0 20px; }}
  .status {{ font-size:13px; color:#e6dcc8; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:8px; margin-bottom:20px; }}
  .links {{ display:flex; flex-direction:column; gap:10px; }}
  a.btn {{ display:block; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:600; font-size:14px; background:#c5a059; color:#141210; transition:opacity 0.2s; }}
  a.btn.sub {{ background:transparent; color:#e6dcc8; border:1px solid rgba(255,255,255,0.18); font-weight:500; }}
</style>
</head>
<body>
<div class="card">
  <h1>ROOTON MASTER STUDIO</h1>
  <p>5Gモバイル回線（Galaxy S26 Ultra）対応の最新トンネルへ自動接続しています…</p>
  <div id="status" class="status">接続先を確認中…</div>
  <div class="links">
    <a id="btn-tunnel" class="btn" href="{studio_tunnel_url}blog-studio.html?k=rt9k4m7x2v8p">📱 マスタースタジオを開く（5G対応・自動ロック解除）</a>
  </div>
</div>
<script>
(async function() {{
  const statusEl = document.getElementById('status');
  const btnTunnel = document.getElementById('btn-tunnel');
  let tunnelBase = {json.dumps(studio_tunnel_url)};
  try {{
    const gRes = await fetch('https://api.github.com/gists/{gist_id_str}?t=' + Date.now(), {{ cache: 'no-store' }});
    if (gRes.ok) {{
      const gJson = await gRes.json();
      if (gJson.files && gJson.files['endpoint.json']) {{
        const ep = JSON.parse(gJson.files['endpoint.json'].content);
        if (ep.studioTunnelUrl) tunnelBase = ep.studioTunnelUrl;
      }}
    }}
  }} catch (e) {{}}
  if (!tunnelBase) {{
    try {{
      const eRes = await fetch('../endpoint.json?t=' + Date.now(), {{ cache: 'no-store' }});
      if (eRes.ok) {{
        const ep = await eRes.json();
        if (ep.studioTunnelUrl) tunnelBase = ep.studioTunnelUrl;
      }}
    }} catch (e) {{}}
  }}
  if (tunnelBase) {{
    const target = tunnelBase.replace(/\\/+$/, '') + '/blog-studio.html?k=rt9k4m7x2v8p';
    btnTunnel.href = target;
    statusEl.textContent = '最新トンネルを確認しました。自動移動します…';
    window.location.replace(target);
  }} else {{
    statusEl.textContent = '上のボタンをタップして開いてください。';
  }}
}})();
</script>
</body>
</html>
"""
    (studio_dir / "index.html").write_text(studio_html, encoding="utf-8")

    # Create permanent Chiropractic Reservation System smart redirectors at /reserve/index.html, /reserve/admin.html, /reserve/sales.html, /reserve/customers.html & /reserve/book.html
    reserve_dir = REPO_DIR / "reserve"
    reserve_dir.mkdir(parents=True, exist_ok=True)
    for page_file, target_path, page_title in [
        ("index.html", "/admin.html?k=chiro9x4m2p7v", "予約管理カレンダー（先生・スタッフ用）"),
        ("admin.html", "/admin.html?k=chiro9x4m2p7v", "予約管理カレンダー・売上集計（先生・スタッフ用）"),
        ("sales.html", "/admin.html?k=chiro9x4m2p7v&view=sales", "売上集計システム（月別・担当者別）"),
        ("customers.html", "/customers.html?k=chiro9x4m2p7v", "顧客管理・カルテ"),
        ("book.html", "/book.html", "オンラインWeb予約（お客様用）"),
    ]:
        res_html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>{page_title} — 自動接続ポータル</title>
<style>
  body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif; background:#0c192c; color:#f5f2eb; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; box-sizing:border-box; }}
  .card {{ max-width:480px; width:100%; background:#132642; border:1px solid rgba(166,124,82,0.45); border-radius:16px; padding:28px; box-shadow:0 20px 50px rgba(0,0,0,0.5); text-align:center; }}
  h1 {{ font-size:19px; margin:0 0 8px; color:#e6d7c3; letter-spacing:0.04em; }}
  p {{ font-size:14px; color:#cbd5e1; line-height:1.6; margin:0 0 20px; }}
  .status {{ font-size:13px; color:#e6dcc8; background:rgba(255,255,255,0.06); padding:10px 14px; border-radius:8px; margin-bottom:20px; }}
  .links {{ display:flex; flex-direction:column; gap:10px; }}
  a.btn {{ display:block; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:700; font-size:14px; background:#a67c52; color:#fff; }}
</style>
</head>
<body>
<div class="card">
  <h1>{page_title}</h1>
  <p>5Gモバイル回線・iPad・PC対応の最新サーバーへ自動接続しています…</p>
  <div id="status" class="status">接続先を確認中…</div>
  <div class="links">
    <a id="btn-tunnel" class="btn" href="{chiro_tunnel_url}{target_path.lstrip('/')}">📱 画面を開く（5G / iPad / PC対応）</a>
  </div>
</div>
<script>
(async function() {{
  const statusEl = document.getElementById('status');
  const btnTunnel = document.getElementById('btn-tunnel');
  let tunnelBase = {json.dumps(chiro_tunnel_url)};
  try {{
    const gRes = await fetch('https://api.github.com/gists/{gist_id_str}?t=' + Date.now(), {{ cache: 'no-store' }});
    if (gRes.ok) {{
      const gJson = await gRes.json();
      if (gJson.files && gJson.files['endpoint.json']) {{
        const ep = JSON.parse(gJson.files['endpoint.json'].content);
        if (ep.chiroTunnelUrl) tunnelBase = ep.chiroTunnelUrl;
      }}
    }}
  }} catch (e) {{}}
  if (!tunnelBase) {{
    try {{
      const eRes = await fetch('../endpoint.json?t=' + Date.now(), {{ cache: 'no-store' }});
      if (eRes.ok) {{
        const ep = await eRes.json();
        if (ep.chiroTunnelUrl) tunnelBase = ep.chiroTunnelUrl;
      }}
    }} catch (e) {{}}
  }}
  if (tunnelBase) {{
    const target = tunnelBase.replace(/\\/+$/, '') + '{target_path}';
    btnTunnel.href = target;
    statusEl.textContent = '接続先を確認しました。自動移動します…';
    window.location.replace(target);
  }} else {{
    statusEl.textContent = '上のボタンをタップして開いてください。';
  }}
}})();
</script>
</body>
</html>
"""
        (reserve_dir / page_file).write_text(res_html, encoding="utf-8")

    # Copy assets/travel/
    assets_src = BASE_DIR / "assets" / "travel"
    assets_dst = REPO_DIR / "assets" / "travel"
    if assets_src.exists():
        assets_dst.mkdir(parents=True, exist_ok=True)
        for item in assets_src.iterdir():
            if item.is_file():
                shutil.copy2(item, assets_dst / item.name)

    subprocess.run(["git", "-C", str(REPO_DIR), "add", "-A"], check=True)
    status = subprocess.run(
        ["git", "-C", str(REPO_DIR), "status", "--porcelain"],
        capture_output=True,
        text=True,
    ).stdout.strip()
    if status:
        subprocess.run(
            ["git", "-C", str(REPO_DIR), "commit", "-m", "Sync latest travel planner & endpoint"],
            check=True,
        )
        subprocess.run(["git", "-C", str(REPO_DIR), "push", "origin", "main"], check=True)
        print("Pushed latest files to promisefree-cmyk/trip (main)")

    # 3. Ensure GitHub Pages is enabled on main branch root
    if token:
        try:
            req = urllib.request.Request(
                "https://api.github.com/repos/promisefree-cmyk/trip/pages",
                data=json.dumps({"source": {"branch": "main", "path": "/"}}).encode("utf-8"),
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Antigravity-TripSync",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as _:
                print("Enabled GitHub Pages for promisefree-cmyk/trip")
        except urllib.error.HTTPError as e:
            if e.code == 409:
                print("GitHub Pages already enabled:", PERMANENT_URL)
            else:
                print("Pages API status:", e.code)


if __name__ == "__main__":
    sync_all()
