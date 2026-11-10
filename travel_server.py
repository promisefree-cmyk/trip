#!/usr/bin/env python3
"""
Travel & Outing Master Server (Port 8790)
Completely separate from the video/blog production studio (~/douga:8765).
Serves ~/trip/travel-planner.html, synchronizes state across Mac & Smartphones,
and powers the Live Universal Keyword Search Engine (Yahoo Web + Yahoo Image CDN + Gemini Flash).
"""
import hashlib
import http.server
import json
import os
import re
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import parse_qs, urlparse

CACHE_LOCK = threading.Lock()
BASE_DIR = Path(__file__).resolve().parent
STATE_FILE = BASE_DIR / "travel_state.json"
SEARCH_CACHE_FILE = BASE_DIR / "search_cache.json"
TUNNEL_FILE = BASE_DIR / "tunnel_url.txt"
GIST_ID_FILE = BASE_DIR / "sync_gist_id.txt"
PERMANENT_URL = "https://promisefree-cmyk.github.io/trip/"
PORT = 8790

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def get_gemini_key() -> str:
    try:
        rc_path = os.path.expanduser("~/.zshrc")
        if os.path.exists(rc_path):
            rc = open(rc_path, "r", encoding="utf-8", errors="ignore").read()
            matches = re.findall(r"GEMINI_API_KEY=[\"\x27]?([^\"\x27\s\n]+)", rc)
            if matches:
                return matches[-1].strip()
    except Exception:
        pass
    return os.environ.get("GEMINI_API_KEY", "").strip()


GEMINI_API_KEY = get_gemini_key()


def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.10.111"


def load_json_file(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


def save_json_file(path: Path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _get_github_token() -> str:
    try:
        import subprocess
        p = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            timeout=4,
        )
        creds = dict(line.split("=", 1) for line in p.stdout.splitlines() if "=" in line)
        return creds.get("password", "").strip()
    except Exception:
        return ""


def sync_to_cloud_gist_async():
    def _worker():
        try:
            if not GIST_ID_FILE.exists():
                return
            gist_id = GIST_ID_FILE.read_text(encoding="utf-8").strip()
            token = _get_github_token()
            if not gist_id or not token:
                return
            tunnel_url = TUNNEL_FILE.read_text(encoding="utf-8").strip() if TUNNEL_FILE.exists() else ""
            if tunnel_url and not tunnel_url.endswith("/"):
                tunnel_url += "/"
            lan_url = f"http://{get_lan_ip()}:{PORT}/"
            ep_data = {
                "permanentUrl": PERMANENT_URL,
                "tunnelUrl": tunnel_url,
                "lanUrl": lan_url,
                "updatedAt": int(time.time() * 1000),
            }
            files_payload = {
                "endpoint.json": {"content": json.dumps(ep_data, ensure_ascii=False, indent=2)},
            }
            if STATE_FILE.exists():
                files_payload["travel_state.json"] = {"content": STATE_FILE.read_text(encoding="utf-8")}
            req = urllib.request.Request(
                f"https://api.github.com/gists/{gist_id}",
                data=json.dumps({"files": files_payload}).encode("utf-8"),
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Antigravity-TravelServer",
                    "Content-Type": "application/json",
                },
                method="PATCH",
            )
            with urllib.request.urlopen(req, timeout=8) as _:
                pass
        except Exception as e:
            print(f"[Gist Sync Error] {e}")

    threading.Thread(target=_worker, daemon=True).start()


def load_state() -> dict:
    return load_json_file(STATE_FILE, {})


def save_state(data: dict):
    save_json_file(STATE_FILE, data)
    sync_to_cloud_gist_async()


def load_search_cache() -> dict:
    return load_json_file(SEARCH_CACHE_FILE, {"universal": {}, "pinpoint": {}})


def save_search_cache(cache: dict):
    save_json_file(SEARCH_CACHE_FILE, cache)


def search_yahoo_images(query: str, limit: int = 5) -> list[str]:
    """
    Fetches real-world photos from Yahoo! Japan Image Search CDN (msp.c.yimg.jp).
    Fast, CORS-safe, and covers virtually every Japanese hotel, restaurant, spa, and spot.
    """
    try:
        url = (
            "https://search.yahoo.co.jp/image/search?p="
            + urllib.parse.quote(query)
            + "&ei=UTF-8"
        )
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=4.5) as r:
            html = r.read().decode("utf-8", errors="ignore")
            thumbs = re.findall(
                r"https://msp\.c\.yimg\.jp/images/v2/[^\x22\x27\s\\]+", html
            )
            seen = []
            for t in thumbs:
                if t not in seen:
                    seen.append(t)
                if len(seen) >= limit:
                    break
            return seen
    except Exception as e:
        print(f"[Yahoo Image Error] {query}: {e}")
        return []


def search_yahoo_web_snippets(query: str) -> str:
    """
    Fetches live web search text snippets from Yahoo! Japan Search to ground AI results
    in real-world shops, recent openings, ratings, and access details.
    """
    try:
        url = (
            "https://search.yahoo.co.jp/search?p="
            + urllib.parse.quote(query)
            + "&ei=UTF-8"
        )
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=4.5) as r:
            html = r.read().decode("utf-8", errors="ignore")
            text = re.sub(r"<script[\s\S]*?</script>", " ", html)
            text = re.sub(r"<style[\s\S]*?</style>", " ", text)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text)
            return text[:3200]
    except Exception as e:
        print(f"[Yahoo Web Error] {query}: {e}")
        return ""


def call_gemini_json(prompt: str, timeout: int = 28) -> dict:
    """
    Calls Gemini Flash Lite / Flash with JSON response mime type for fast structured generation.
    Tries gemini-3.5-flash-lite -> gemini-3.1-flash-lite -> gemini-3-flash-preview.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not found")

    models_to_try = [
        ("gemini-3.5-flash-lite", False),
        ("gemini-3.1-flash-lite", False),
        ("gemini-3-flash-preview", True),
    ]
    last_err = None
    for model_name, use_thinking_cfg in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
            gen_cfg = {
                "temperature": 0.35,
                "responseMimeType": "application/json",
            }
            if use_thinking_cfg:
                gen_cfg["thinkingConfig"] = {"thinkingBudget": 0}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": gen_cfg,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:
                res = json.loads(r.read().decode("utf-8"))
                raw_text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
                raw_text = re.sub(r"^```json\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)
                return json.loads(raw_text)
        except Exception as e:
            print(f"[Gemini {model_name} Error] {e}")
            last_err = e
    raise RuntimeError(f"All Gemini models failed: {last_err}")


def build_google_maps_link(name: str, area: str = "") -> str:
    q = f"{name} {area}".strip()
    return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(q)}"


def build_tabelog_search_link(name: str, area: str = "", is_overseas: bool = False) -> str:
    suffix = "口コミ トリップアドバイザー 予約" if is_overseas else "食べログ"
    q = f"{name} {area} {suffix}".strip()
    return f"https://search.yahoo.co.jp/search?p={urllib.parse.quote(q)}"


def apply_origin_to_plan(result: dict, origin: str) -> dict:
    """
    Dynamically adapts cached or generated plan text to the user's selected departure station / current location.
    """
    import copy
    res = copy.deepcopy(result)
    orig = (origin or "出発地").strip()
    cat = res.get("catalog", {})
    tab = res.get("tab", {})

    def _clean_text(s: str) -> str:
        if not isinstance(s, str):
            return s
        s = s.replace("千駄木発・", "")
        s = s.replace("千駄木駅", orig)
        s = s.replace("文京区・千駄木", orig)
        s = s.replace("千駄木", orig)
        return s

    for field in ("tag", "title", "depMoveTitle", "depMoveDesc"):
        if field in cat and cat[field]:
            cat[field] = _clean_text(cat[field])
    if "tag" in tab and tab["tag"]:
        tab["tag"] = _clean_text(tab["tag"])
    if "title" in tab and tab["title"]:
        tab["title"] = _clean_text(tab["title"])
    om = cat.get("overseasMeta")
    if isinstance(om, dict) and om.get("airportRoute"):
        om["airportRoute"] = _clean_text(om["airportRoute"])
    return res


def generate_universal_plan(
    query: str,
    mode_hint: str = "auto",
    genre_hint: str = "all",
    origin: str = "現在地・出発地",
    force_refresh: bool = False,
) -> dict:
    """
    Generates a full destination/theme catalog entry (3 hotels/main spots, 3 sightseeing/walk spots,
    3 gourmet/cafe spots, departure route from user's origin, and overseasMeta when international) for ANY user keyword.
    """
    clean_q = query.strip()
    clean_origin = (origin or "現在地・出発地").strip()
    cache_key = f"{clean_q}__{mode_hint}__{genre_hint}".lower()
    cache = load_search_cache()
    if not force_refresh and cache_key in cache.get("universal", {}):
        return apply_origin_to_plan(cache["universal"][cache_key], clean_origin)

    # 1. Fetch live Yahoo web snippets in parallel
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_main = ex.submit(
            search_yahoo_web_snippets,
            f"{clean_q} 人気 おすすめ ホテル スパ 観光 ランキング 旅行",
        )
        f_food = ex.submit(
            search_yahoo_web_snippets,
            f"{clean_q} 人気 グルメ レストラン カフェ 名物 新オープン 口コミ",
        )
        web_main = f_main.result()
        web_food = f_food.result()

    if mode_hint == "outing":
        mode_instruction = 'ユーザーが『日帰り・お出かけ（outing）』を指定しています。primaryMode は必ず "outing" にしてください。'
    elif mode_hint == "travel":
        mode_instruction = 'ユーザーが『国内宿泊旅行（travel）』を指定しています。primaryMode は必ず "travel" にしてください。'
    elif mode_hint == "overseas":
        mode_instruction = 'ユーザーが『海外旅行（overseas）』を指定しています。primaryMode は必ず "overseas" にしてください。'
    else:
        mode_instruction = (
            'キーワードが日本国外（海外の国・都市・リゾート・海外ホテル・海外スポット）なら primaryMode は必ず "overseas"、'
            '日本国内の遠方・温泉・宿泊旅行地なら "travel"、'
            '日帰り向き・近郊お出かけ・国内の特定店舗なら "outing" を自動判定してください。'
        )

    genre_instruction = (
        f"特にジャンル「{genre_hint}」を重視して候補を選定してください。"
        if genre_hint and genre_hint != "all"
        else "宿泊/メイン温浴・周辺散歩/観光・人気グルメ/カフェをバランスよく選定してください。"
    )

    prompt = f"""あなたは一休.com・楽天トラベル・じゃらん・食べログ・サウナイキタイ・TripAdvisor・ミシュランガイド・世界の五つ星ホテル＆スパを完全網羅した、国内外すべてに対応する最高峰のトラベル＆お出かけマスタープランナーです。
「{clean_origin}」から出発するユーザーのために、検索キーワード「{clean_q}」に完全対応した候補カタログとスケジュール用データをJSON形式で作成してください。

【出発地（最寄駅・現在地）】: {clean_origin}
【検索キーワード】: {clean_q}
【モード指定】: {mode_instruction}
【ジャンル指定】: {genre_instruction}
【Web検索参考情報（観光・宿・スパ）】: {web_main[:1600]}
【Web検索参考情報（グルメ・新店・カフェ）】: {web_food[:1600]}

【厳守ルール】
1. 国内・海外を問わず、すべて実在する人気施設・ホテル・旅館・スパ・観光地・飲食店・カフェのみを厳選すること（架空の店名は絶対禁止）。
2. 特定の店名や施設名（例：「かるまる池袋」「ハレクラニ」「Löyly」「鼎泰豊」など）で検索された場合は、その施設を適切なカテゴリの1番目（主役）に必ず配置し、比較候補や周辺で組み合わせて回れる実在スポット・名店を揃えること。
3. 海外旅行（`primaryMode` が `"overseas"`）の場合は、出発地「{clean_origin}」から羽田空港・成田空港（または最寄り国際空港）への最適なアクセスルート＋直行便フライト目安を `depMoveTitle` / `depMoveDesc` / `overseasMeta.airportRoute` に明記し、時差・ビザ（ESTA/K-ETA/ETIAS/e-VOA/入国カード・Visit Japan Web等）・通貨＆チップ事情・現地配車アプリ（Uber/Grab/Kakao T等）＆eSIM情報を `overseasMeta` に具体的に記載すること。国内の場合は `overseasMeta` は `null` にすること。
4. 新しくオープンした話題店やリニューアル情報、サウナ・岩盤浴・スパ・散歩・サイクリング・自然リトリートの魅力があれば積極的に `buzzText` や `wellnessSpec` に記載すること。
5. `photoQuery` には、Yahoo画像検索でその施設・店舗・料理の本物の写真が1発でヒットする具体的な日本語ワード（「都市名＋施設名＋特徴（外観/プール/サウナ/看板料理名など）」）を入れること。
6. 【配列件数の絶対ルール】JSONの `"hotels"` 配列には必ず異なる3件、`"spots"` 配列には必ず異なる3件、`"foods"` 配列には必ず異なる3件（ランチ向き・カフェ/甘味・ディナー向きの計3店舗）を含めること（1件や2件への省略は絶対禁止）。

以下のJSON構造のみで出力してください（hotels, spots, foods は必ず各3要素の配列にすること）：
{{
  "primaryMode": "outing または travel または overseas",
  "tag": "{clean_origin}からの所要時間/フライト時間とキャッチ（例: ✈️ 羽田/成田発・極上海外リトリート）",
  "shortTitle": "タブ見出し（22文字以内。例: {clean_q} 厳選ホテル＆名店巡り）",
  "shortDesc": "タブサブ説明（30文字以内）",
  "title": "{clean_q} 厳選プラン",
  "depMoveTitle": "🌅 {clean_origin}からの具体的な出発・乗り換え・空港/新幹線ルート見出し",
  "depMoveDesc": "{clean_origin}からのスマートな移動手順（電車・新幹線・空港アクセス＋フライト時間や車窓・機内の過ごし方）",
  "overseasMeta": {{
    "countryArea": "国・地域・都市名（国内の場合は overseasMeta 全体を null にする）",
    "airportRoute": "✈️ 空港アクセス＆飛行時間（例: {clean_origin}→羽田/成田 ＋ 直行便 約3時間40分）",
    "timeDiff": "🕒 時差（例: 日本より -1時間 / 時差なし）",
    "visaEntry": "🛂 ビザ・入国手続き（例: 短期滞在ビザ免除・オンライン入国カード推奨・帰国時Visit Japan Web）",
    "currencyTip": "💳 通貨・決済・チップ（例: ニュー台湾ドル(NT$)・クレカ＆悠遊カード便利・チップ原則不要）",
    "localTransport": "🚕 現地移動＆通信（例: Uberタクシー＆MRT地下鉄が快適・事前eSIM設定推奨）"
  }},
  "hotelHeading": "🏨 ① メインの宿泊ホテル・スパ・主役スポットを選ぶ（1つ選択）",
  "spotHeading": "🌲🚲 ② 組み合わせる周辺観光・街歩き散歩・体験を選ぶ（複数ON/OFF可）",
  "foodHeading": "🍽️ ③ ランチ・カフェ・ディナーの人気名店を選ぶ（1つ選択）",
  "dayLabels": {{
    "day1": "☀️ 1日目：出発＆王道メインコース（海外は出国・到着＆初日ナイト）",
    "day2": "🌴 2日目：現地街歩き・絶景観光＆名店グルメ満喫コース",
    "day3": "🧖‍♀️ 3日目〜最終日：スパ・カフェ・お土産＆帰着コース"
  }},
  "hotels": [
    {{
      "name": "実在の施設名・五つ星ホテル・スパ・主役店舗名（計3件）",
      "photoQuery": "画像検索用の具体的な日本語キーワード（例: ハレクラニ ワイキキ プール 外観）",
      "area": "エリア名・空港や中心駅からのアクセス分数",
      "price": "料金・予算目安（例: 1泊1室 55,000円〜 / 1泊2食 28,000円〜 / 入館 2,800円〜）",
      "budget2p": 35000,
      "badges": [
        {{"text": "特徴バッジ1", "cls": "cb-buzz"}},
        {{"text": "特徴バッジ2", "cls": "cb-sauna"}}
      ],
      "tags": ["sauna", "stone", "walk", "cycle", "buzz"],
      "buzzText": "🔥 話題のポイント・リニューアル・人気の理由（60〜90文字）",
      "wellnessSpec": "🧖‍♀️ スパ・プール・温泉・サウナ・客室・空間等の詳細スペック",
      "why": "プロの推薦理由と旅の拠点としての魅力（80〜110文字）",
      "traps": [
        "予約タイミング・チェックイン・ドレスコード・混雑時間の注意点1",
        "見落としがちなプロのアドバイス2"
      ],
      "todo": "【事前チェック】予約・パスポート/チケット・持ち物のToDo"
    }}
  ],
  "spots": [
    {{
      "name": "実在の周辺観光・世界遺産・街歩き散歩・サイクリング・スパ体験スポット名（計3件）",
      "photoQuery": "画像検索用の具体的な日本語キーワード",
      "area": "エリア・メイン地点からの移動分数",
      "time": "10:00 - 12:00（約120分）",
      "slotOrder": 25,
      "day": "day1",
      "periodLabel": "☀️ 街歩き・絶景体験",
      "timeRange": "10:00 - 12:00",
      "badges": [
        {{"text": "周辺散策・絶景", "cls": "cb-walk"}},
        {{"text": "人気スポット", "cls": "cb-google"}}
      ],
      "tags": ["walk", "cycle", "buzz"],
      "buzzText": "✨ 見どころ・SNS話題ポイント",
      "wellnessSpec": "🌲 お散歩・サイクリング・スパ・リフレッシュ内容",
      "why": "おすすめの理由（70〜100文字）",
      "title": "🌲 タイムライン見出し（スポット名と体験内容）",
      "desc": "タイムライン用の詳しい過ごし方・ルート解説",
      "rainAltTitle": "☔ 雨天・猛暑時プランB：代替の屋内スポット見出し",
      "rainAltDesc": "天候が悪くても快適に楽しめる過ごし方（美術館・屋内スパ・百貨店・老舗カフェ等）",
      "trap": "混雑回避・事前予約・治安や移動の先回りアドバイス",
      "todo": "【立ち寄り準備】事前チケットや予約の確認事項"
    }}
  ],
  "foods": [
    {{
      "name": "実在の人気レストラン・名物料理店・ミシュラン掲載店・カフェ名（計3件）",
      "photoQuery": "画像検索用の店名＋看板料理名（例: 鼎泰豊 台北 小籠包）",
      "area": "エリア・中心部からのアクセス",
      "budget": "1人 約3,000〜8,000円",
      "budget2p": 10000,
      "timeRange": "12:15 - 13:45",
      "badges": [
        {{"text": "名店・高評価", "cls": "cb-tabelog"}},
        {{"text": "看板グルメ", "cls": "cb-buzz"}}
      ],
      "tags": ["buzz"],
      "buzzText": "🔥 看板メニュー・新オープン・口コミ高評価ポイント",
      "why": "おすすめ理由と絶対に頼むべき名物メニュー（80〜110文字）",
      "title": "🍽️ 食事：『店舗名』で看板メニューを堪能",
      "desc": "タイムライン用の食事解説",
      "lunchTitle": "🍽️ 昼食：『店舗名』で絶品ランチ",
      "lunchDesc": "ランチの魅力とおすすめメニュー",
      "dinnerTitle": "🥂 ディナー：『店舗名』で現地名物ディナー",
      "dinnerDesc": "夜の食事・雰囲気の魅力",
      "trap": "行列回避のベスト入店時間・予約方法・整理券等の注意点"
    }}
  ]
}}"""

    data = call_gemini_json(prompt)
    is_overseas = data.get("primaryMode") == "overseas"

    # Generate unique key & IDs
    slug = "custom_" + hashlib.md5(cache_key.encode("utf-8")).hexdigest()[:8]
    data["key"] = slug
    data["searchQuery"] = clean_q
    data["isCustomSearch"] = True

    hotels = data.get("hotels", [])
    spots = data.get("spots", [])
    foods = data.get("foods", [])

    for idx, h in enumerate(hotels):
        h["id"] = f"{slug}_hotel_{idx+1}"
        h["links"] = [
            {"label": "Googleマップ", "url": build_google_maps_link(h.get("name", ""), h.get("area", ""))},
            {"label": "口コミ・予約検索", "url": build_tabelog_search_link(h.get("name", ""), h.get("area", ""), is_overseas)},
        ]

    if is_overseas:
        slot_orders = [55, 24, 30, 52]
        days_cycle = ["day1", "day2", "day2", "day3"]
        periods_cycle = ["🌆 初日夕方散策・夜景", "☀️ 2日目午前・王道観光", "🌿 2日目午後・街歩き体験", "🧖‍♀️ 3日目午前・癒やし＆お土産"]
        times_cycle = ["16:30 - 18:15", "09:30 - 11:45", "14:30 - 17:00", "10:00 - 12:00"]
    else:
        slot_orders = [22, 52, 68, 30]
        days_cycle = ["day1", "day1", "day2", "day2"]
        periods_cycle = ["☀️ 午前お散歩・観光", "🌿 午後立ち寄り・体験", "☀️ 2日目午前スポット", "🌆 午後散策"]
        times_cycle = ["10:20 - 11:45", "14:00 - 15:20", "10:00 - 11:30", "14:00 - 15:30"]

    for idx, s in enumerate(spots):
        s["id"] = f"{slug}_spot_{idx+1}"
        s["slotOrder"] = slot_orders[idx % len(slot_orders)]
        s["day"] = days_cycle[idx % len(days_cycle)]
        s["periodLabel"] = periods_cycle[idx % len(periods_cycle)]
        s["timeRange"] = times_cycle[idx % len(times_cycle)]
        s["links"] = [
            {"label": "Googleマップ", "url": build_google_maps_link(s.get("name", ""), s.get("area", ""))},
        ]

    for idx, f in enumerate(foods):
        f["id"] = f"{slug}_food_{idx+1}"
        f["links"] = [
            {"label": "口コミ・詳細検索" if is_overseas else "食べログ・口コミ検索", "url": build_tabelog_search_link(f.get("name", ""), f.get("area", ""), is_overseas)},
            {"label": "Googleマップ", "url": build_google_maps_link(f.get("name", ""), f.get("area", ""))},
        ]

    # Parallel real photo fetch from Yahoo! Japan Image CDN
    all_items = hotels + spots + foods
    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [
            ex.submit(search_yahoo_images, it.get("photoQuery") or f"{clean_q} {it.get('name', '')}", 5)
            for it in all_items
        ]
        for it, fut in zip(all_items, futures):
            imgs = fut.result()
            it["img"] = imgs[0] if imgs else "assets/travel/sauna_retreat.jpg"
            it["altImgs"] = imgs if imgs else ["assets/travel/sauna_retreat.jpg"]

    tab_img = (
        hotels[0]["img"]
        if hotels and hotels[0].get("img")
        else "assets/travel/sauna_retreat.jpg"
    )
    tab_entry = {
        "key": slug,
        "tag": data.get("tag") or f"🔍 キーワード検索：{clean_q}",
        "title": data.get("shortTitle") or f"{clean_q} プラン",
        "desc": data.get("shortDesc") or "検索候補から自由にカスタマイズ",
        "img": tab_img,
        "isCustom": True,
    }

    result = {
        "ok": True,
        "key": slug,
        "query": clean_q,
        "tab": tab_entry,
        "catalog": data,
    }

    with CACHE_LOCK:
        latest_cache = load_search_cache()
        latest_cache.setdefault("universal", {})[cache_key] = result
        save_search_cache(latest_cache)
    return result


def generate_pinpoint_candidates(
    query: str,
    category_hint: str = "all",
    exclude_names=None,
    selected_context: str = "",
) -> dict:
    """
    Pinpoint & additional candidate generator for individual shops, restaurants, cafes, spas, hotels, or sightseeing spots
    so the user can keep their current selections and add new candidates directly into their active trip!
    """
    clean_q = query.strip()
    excl_list = [str(x).split("（")[0].strip() for x in (exclude_names or []) if x]
    excl_sig = hashlib.md5(",".join(sorted(excl_list)).encode("utf-8")).hexdigest()[:6] if excl_list else "0"
    cache_key = f"pin__{clean_q}__{category_hint}__{excl_sig}".lower()
    cache = load_search_cache()
    if cache_key in cache.get("pinpoint", {}):
        return cache["pinpoint"][cache_key]

    web_snippets = search_yahoo_web_snippets(f"{clean_q} 人気 おすすめ 観光 穴場 名所 口コミ 営業時間")

    role_instruction = {
        "spot": "すべて『観光・お散歩・体験・立ち寄りスポット（recommendedRole: spot）』として、現在選択中の予定と組み合わせて回りやすい魅力的な場所を4件提案してください。",
        "hotel": "すべて『メインの宿・ホテル・スパ・温浴施設（recommendedRole: hotel）』として、実在の人気施設を4件提案してください。",
        "food": "すべて『ランチ・ディナー・カフェ・甘味・名店グルメ（recommendedRole: food）』として、実在の人気店を4件提案してください。",
    }.get(
        category_hint,
        "『宿・スパ（hotel）』『観光・お散歩・体験（spot）』『グルメ・カフェ（food）』の中から、検索条件に合う実在の人気候補を4件厳選してください。",
    )

    excl_text = "、".join(excl_list[:25]) if excl_list else "なし"
    ctx_text = selected_context.strip() or "特になし"

    prompt = f"""あなたは日本国内・海外すべてのグルメ・観光・スパ・ホテル検索＆ツアープランナーAIです。
ユーザーが「現在選択している予定を維持したまま、さらに組み合わせる候補を追加したい」とリクエストしています。
キーワード・条件「{clean_q}」（カテゴリ指定：{category_hint}）に合致する、国内外の実在する人気スポット・店舗・施設を4件厳選してJSON形式で出力してください。

【カテゴリ指示】: {role_instruction}
【現在ユーザーが選択中の予定（これらと組み合わせて相性が良く、無理なく回れる候補を優先）】: {ctx_text}
【すでに一覧にある候補（これらは絶対に重複して出さず、別の新しい候補を出してください）】: {excl_text}
【最新Web検索参考情報】: {web_snippets[:2200]}

以下のJSON構造のみで出力してください：
{{
  "query": "{clean_q}",
  "items": [
    {{
      "name": "実在の店舗名・施設名・観光スポット名（正式名称＋一言特徴）",
      "recommendedRole": "hotel または spot または food",
      "photoQuery": "Yahoo画像検索で本物の風景・料理・施設写真が確実に出る日本語キーワード",
      "area": "エリア・最寄駅からのアクセスや現在選択中のスポットからの移動目安",
      "priceOrTime": "料金・予算または所要時間（例: 所要 60〜90分 / 入館 2,600円 / 1人 2,500〜4,000円）",
      "budget2p": 5000,
      "timeRange": "14:00 - 15:30",
      "periodLabel": "☀️ 追加お散歩・観光",
      "badges": [
        {{"text": "🆕 追加提案スポット", "cls": "cb-buzz"}},
        {{"text": "注目ポイント", "cls": "cb-walk"}}
      ],
      "tags": ["walk", "buzz", "sauna", "cycle", "stone"],
      "buzzText": "🔥 ここを組み合わせると最高な理由・話題のポイント（60文字程度）",
      "wellnessSpec": "🌲 見どころ・体験内容・看板メニューの特徴",
      "why": "現在選択中の予定とどう組み合わせると楽しいか・プロの推薦コメント（80文字程度）",
      "trap": "営業時間・定休日・予約・混雑回避のプロの先回り注意点",
      "todo": "【事前確認】営業時間や予約の確認"
    }}
  ]
}}"""

    data = call_gemini_json(prompt)
    items = data.get("items", [])
    slug = "pin_" + hashlib.md5(cache_key.encode("utf-8")).hexdigest()[:8]

    slot_cycle = [26, 54, 66, 34]
    period_cycle = ["☀️ 午前お散歩・観光", "🌿 午後立ち寄り・観光", "🌆 夕方散策・絶景", "🌲 立ち寄り体験"]
    time_cycle = ["10:15 - 11:30", "14:00 - 15:30", "15:45 - 17:00", "11:00 - 12:15"]

    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [
            ex.submit(search_yahoo_images, it.get("photoQuery") or f"{clean_q} {it.get('name', '')}", 5)
            for it in items
        ]
        for idx, (it, fut) in enumerate(zip(items, futures)):
            imgs = fut.result()
            it["id"] = f"{slug}_{idx+1}"
            if category_hint in ("hotel", "spot", "food"):
                it["recommendedRole"] = category_hint
            it["img"] = imgs[0] if imgs else "assets/travel/sauna_retreat.jpg"
            it["altImgs"] = imgs if imgs else ["assets/travel/sauna_retreat.jpg"]
            it["price"] = it.get("priceOrTime") or "人気スポット"
            it["budget"] = it.get("priceOrTime") or "1人 2,000〜4,000円"
            it["time"] = it.get("timeRange") or time_cycle[idx % len(time_cycle)]
            it["timeRange"] = it["time"]
            it["periodLabel"] = it.get("periodLabel") or period_cycle[idx % len(period_cycle)]
            it["slotOrder"] = slot_cycle[idx % len(slot_cycle)]
            it["day"] = "day1"
            it["isNewlyAdded"] = True
            it["title"] = f"✨ 『{it.get('name', '').split('（')[0]}』を満喫"
            it["desc"] = f"{it.get('why', '')} {it.get('wellnessSpec', '')}".strip()
            it["lunchTitle"] = f"🍽️ 昼食：『{it.get('name', '').split('（')[0]}』"
            it["lunchDesc"] = it.get("why", "")
            it["dinnerTitle"] = f"🥂 夕食・カフェ：『{it.get('name', '').split('（')[0]}』"
            it["dinnerDesc"] = it.get("why", "")
            it["traps"] = [it.get("trap")] if it.get("trap") else []
            it["links"] = [
                {"label": "Googleマップ", "url": build_google_maps_link(it.get("name", ""), it.get("area", ""))},
                {"label": "食べログ・詳細検索", "url": build_tabelog_search_link(it.get("name", ""), it.get("area", ""))},
            ]

    result = {"ok": True, "query": clean_q, "items": items}
    with CACHE_LOCK:
        latest_cache = load_search_cache()
        latest_cache.setdefault("pinpoint", {})[cache_key] = result
        save_search_cache(latest_cache)
    return result


class TravelMasterHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if self.path.startswith("/api/") or self.path.endswith(".html") or self.path == "/":
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.path = "/travel-planner.html"
        return super().do_HEAD()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.path = "/travel-planner.html"
            return super().do_GET()

        if parsed.path == "/api/state":
            return self._send_json(200, load_state())

        if parsed.path == "/api/network":
            lan_ip = get_lan_ip()
            lan_url = f"http://{lan_ip}:{PORT}/"
            tunnel_url = ""
            if TUNNEL_FILE.exists():
                try:
                    tunnel_url = TUNNEL_FILE.read_text(encoding="utf-8").strip()
                except Exception:
                    pass
            return self._send_json(
                200,
                {
                    "ok": True,
                    "permanentUrl": PERMANENT_URL,
                    "lanUrl": lan_url,
                    "tunnelUrl": tunnel_url,
                    "lan_url": lan_url,
                    "tunnel_url": tunnel_url,
                },
            )

        if parsed.path == "/api/photo_alternatives":
            qs = parse_qs(parsed.query)
            q = (qs.get("q") or [""])[0].strip()
            imgs = search_yahoo_images(q, limit=6) if q else []
            return self._send_json(200, {"ok": True, "query": q, "images": imgs})

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"

        if parsed.path == "/api/state":
            try:
                data = json.loads(raw)
                current = load_state()
                current.update(data)
                save_state(current)
                return self._send_json(200, {"ok": True, "state": current})
            except Exception as e:
                return self._send_json(400, {"ok": False, "error": str(e)})

        if parsed.path == "/api/universal_search":
            try:
                body = json.loads(raw)
                query = (body.get("query") or "").strip()
                mode_hint = body.get("mode") or "auto"
                genre_hint = body.get("genre") or "all"
                origin = (body.get("origin") or "現在地・出発地").strip()
                force = bool(body.get("force"))
                if not query:
                    if mode_hint == "overseas":
                        query = "ハワイ ソウル 人気海外リゾート"
                    elif mode_hint == "travel":
                        query = "箱根 軽井沢 人気温泉旅行"
                    else:
                        query = "日帰り人気スパ 食べログ名店 お出かけ"
                result = generate_universal_plan(query, mode_hint, genre_hint, origin=origin, force_refresh=force)
                return self._send_json(200, result)
            except Exception as e:
                return self._send_json(500, {"ok": False, "error": str(e)})

        if parsed.path == "/api/pinpoint_search":
            try:
                body = json.loads(raw)
                query = (body.get("query") or "").strip()
                category_hint = body.get("category") or "all"
                exclude_names = body.get("excludeNames") or []
                selected_context = (body.get("selectedContext") or "").strip()
                if not query:
                    query = "人気スパ 温泉 グルメ おすすめスポット"
                result = generate_pinpoint_candidates(
                    query,
                    category_hint,
                    exclude_names=exclude_names,
                    selected_context=selected_context,
                )
                return self._send_json(200, result)
            except Exception as e:
                return self._send_json(500, {"ok": False, "error": str(e)})

        return self._send_json(404, {"ok": False, "error": "Not found"})


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), TravelMasterHandler)
    print(
        f"Travel Master Server running on http://0.0.0.0:{PORT}/ (LAN: http://{get_lan_ip()}:{PORT}/)"
    )
    server.serve_forever()
