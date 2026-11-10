import os
#!/usr/bin/env python3
"""
Persistent Cloudflare Tunnel Runner for Travel Master Server (Port 8790).
Automatically captures the assigned *.trycloudflare.com URL whenever cloudflared starts,
writes ~/trip/tunnel_url.txt, and syncs it to the unified permanent URL
(https://promisefree-cmyk.github.io/trip/) and real-time Gist so the user's URL never changes.
"""
import re
import subprocess
import sys
import time
from pathlib import Path

import shutil

BASE_DIR = Path(__file__).resolve().parent
TUNNEL_FILE = BASE_DIR / "tunnel_url.txt"
SYNC_SCRIPT = BASE_DIR / "sync_trip_pages.py"
CLOUDFLARED_BIN = str(
    next(
        (
            p
            for p in [
                Path.home() / ".local" / "bin" / "cloudflared",
                Path.home() / ".local" / "bin" / "cloudflared.exe",
                Path("C:/Program Files/cloudflared/cloudflared.exe"),
            ]
            if p.exists()
        ),
        shutil.which("cloudflared") or (Path.home() / ".local" / "bin" / "cloudflared"),
    )
)


def run_tunnel():
    cmd = [
        CLOUDFLARED_BIN,
        "tunnel",
        "--no-autoupdate",
        "--protocol",
        "http2",
        "--url",
        "http://127.0.0.1:8790",
    ]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    url_pattern = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
    last_url = ""
    if proc.stdout:
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            m = url_pattern.search(line)
            if m:
                found_url = m.group(0).strip()
                if found_url != last_url and "api.trycloudflare.com" not in found_url:
                    last_url = found_url
                    TUNNEL_FILE.write_text(found_url + "\n", encoding="utf-8")
                    print(f"[Tunnel Updated] {found_url} -> syncing to unified URL...")
                    subprocess.Popen([sys.executable, str(SYNC_SCRIPT)])
    return proc.wait()


if __name__ == "__main__":
    while True:
        try:
            run_tunnel()
        except Exception as e:
            print(f"[Tunnel Runner Error] {e}", file=sys.stderr)
        time.sleep(3)
