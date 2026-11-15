/* ==========================================================================
   J.A.R.V.I.S. OS — Frontend Controller & WebCrypto Zero-Knowledge Client
   Works identically on `http://localhost:8788/` and
   `https://promisefree-cmyk.github.io/trip/jarvis/`
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEY_NAME = "jarvis_master_key";
  const POLL_INTERVAL_MS = 15000;

  const state = {
    apiBase: "",
    masterKey: "",
    isPureLocal: false,
    isWatchMode: false,
    overview: null,
    pollTimer: null,
    toastTimer: null,
    waveRafId: null,
    wavePhase: 0,
    busyAction: false,
  };

  // -------------------------------------------------------------------------
  // 1. Immediate Hash Key Capture & URL Bar Sanitization (#key=<64hex>)
  // -------------------------------------------------------------------------
  function captureKeyFromHashAndCleanUrl() {
    const rawHash = window.location.hash || "";
    if (!rawHash) return;
    const params = new URLSearchParams(rawHash.replace(/^#/, ""));
    const hashKey = (params.get("key") || "").trim().toLowerCase();
    if (/^[0-9a-f]{64}$/.test(hashKey)) {
      try {
        window.localStorage.setItem(STORAGE_KEY_NAME, hashKey);
      } catch (_err) {
        // Ignore private-mode storage error; keep in memory
      }
      state.masterKey = hashKey;
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", cleanUrl);
    }
  }

  function loadStoredMasterKey() {
    if (state.masterKey) return state.masterKey;
    try {
      const stored = (window.localStorage.getItem(STORAGE_KEY_NAME) || "").trim().toLowerCase();
      if (/^[0-9a-f]{64}$/.test(stored)) {
        state.masterKey = stored;
      }
    } catch (_err) {
      // Ignore storage error
    }
    return state.masterKey;
  }

  function detectLocalLoopbackHost() {
    const h = (window.location.hostname || "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  }

  function detectGatewayHost() {
    const h = (window.location.hostname || "").toLowerCase();
    return h.endsWith("github.io") || (!detectLocalLoopbackHost() && !h.endsWith("trycloudflare.com"));
  }

  // -------------------------------------------------------------------------
  // 2. WebCrypto API AES-256-GCM Decryption for `./beacon.json`
  // -------------------------------------------------------------------------
  function hexToBytes(hex) {
    const clean = (hex || "").trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      throw new Error("専用合言葉キーは64文字の英数字（0〜9, a〜f）で入力してください。");
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function base64ToBytes(b64) {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function decryptBeaconJson(beaconObj, masterKeyHex) {
    if (!beaconObj || beaconObj.v !== 1 || !beaconObj.iv || !beaconObj.ct) {
      throw new Error("暗号化ビーコンの形式が正しくありません。");
    }
    const keyBytes = hexToBytes(masterKeyHex);
    const ivBytes = base64ToBytes(beaconObj.iv);
    const ctBytes = base64ToBytes(beaconObj.ct);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      cryptoKey,
      ctBytes
    );

    const jsonText = new TextDecoder("utf-8").decode(plainBuffer);
    return JSON.parse(jsonText);
  }

  async function resolveGatewayTunnelBase() {
    const res = await window.fetch(`./beacon.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("接続案内ファイル（beacon.json）がまだ届いていません。");
    }
    const beaconObj = await res.json();
    const payload = await decryptBeaconJson(beaconObj, state.masterKey);
    if (!payload.jarvis_url) {
      throw new Error("自宅PCのトンネルURLが現在お休み中です。");
    }
    return payload.jarvis_url.replace(/\/+$/, "");
  }

  // -------------------------------------------------------------------------
  // 3. Authenticated API Fetch Wrapper
  // -------------------------------------------------------------------------
  async function apiRequest(path, options = {}) {
    if (!state.isPureLocal && detectGatewayHost() && !state.apiBase) {
      state.apiBase = await resolveGatewayTunnelBase();
    }

    const headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (state.masterKey) {
      headers["X-Jarvis-Key"] = state.masterKey;
    }

    const url = `${state.apiBase}${path}`;
    let resp;
    try {
      resp = await window.fetch(url, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      // If gateway cached tunnel rotated after PC reboot, re-read beacon.json once automatically
      if (!state.isPureLocal && detectGatewayHost()) {
        state.apiBase = await resolveGatewayTunnelBase();
        resp = await window.fetch(`${state.apiBase}${path}`, Object.assign({}, options, { headers }));
      } else {
        throw networkErr;
      }
    }

    if (resp.status === 401) {
      const err = new Error("認証キーの確認が必要です。");
      err.code = 401;
      throw err;
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || data.message || `通信エラー (${resp.status})`);
    }
    return data;
  }

  // -------------------------------------------------------------------------
  // 4. Watch Mode & UI Visibility Management
  // -------------------------------------------------------------------------
  function evaluateWatchMode() {
    const params = new URLSearchParams(window.location.search);
    const forcedWatch = params.get("mode") === "watch";
    const tinyScreen = window.innerWidth <= 305;
    state.isWatchMode = forcedWatch || tinyScreen;
    document.body.classList.toggle("watch-mode", state.isWatchMode);
  }

  function showPairingScreen(errorMessage = "") {
    document.getElementById("command-shell").hidden = true;
    document.getElementById("watch-shell").hidden = true;
    document.getElementById("top-bar").hidden = false;
    document.body.classList.remove("watch-mode");

    const screen = document.getElementById("pairing-screen");
    const errEl = document.getElementById("pairing-error");
    screen.hidden = false;
    if (errorMessage) {
      errEl.textContent = errorMessage;
      errEl.hidden = false;
    } else {
      errEl.hidden = true;
    }
  }

  function showActiveShell() {
    document.getElementById("pairing-screen").hidden = true;
    evaluateWatchMode();
    if (state.isWatchMode) {
      document.getElementById("watch-shell").hidden = false;
      document.getElementById("command-shell").hidden = true;
    } else {
      document.getElementById("watch-shell").hidden = true;
      document.getElementById("command-shell").hidden = false;
    }
  }

  function showToast(message) {
    const box = document.getElementById("toast-box");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      box.hidden = true;
    }, 4400);
  }

  // -------------------------------------------------------------------------
  // 5. Render Command Center & Watch 8 Interface
  // -------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatShortTime(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  function renderApprovals(approvals) {
    const emptyBar = document.getElementById("approval-empty-bar");
    const cardsList = document.getElementById("approval-cards-list");

    if (!approvals || approvals.length === 0) {
      emptyBar.hidden = false;
      cardsList.hidden = true;
      cardsList.innerHTML = "";
      return;
    }

    emptyBar.hidden = true;
    cardsList.hidden = false;
    cardsList.innerHTML = approvals
      .map(
        (item) => `
        <article class="approval-card" data-approval-id="${escapeHtml(item.id)}">
          <div class="approval-card-header">
            <span class="approval-category">${escapeHtml(item.category || "本人確認")}</span>
            <span class="panel-note">${escapeHtml(formatShortTime(item.created_at))}</span>
          </div>
          <h3 class="approval-title">${escapeHtml(item.title)}</h3>
          ${item.summary ? `<p class="approval-summary">${escapeHtml(item.summary)}</p>` : ""}
          <div class="approval-actions">
            <button type="button" class="cmd-btn emerald js-decide-btn" data-id="${escapeHtml(item.id)}" data-decision="approve">
              ✓ 承認して実行
            </button>
            <button type="button" class="cmd-btn js-decide-btn" data-id="${escapeHtml(item.id)}" data-decision="skip">
              ✕ 見送る
            </button>
          </div>
        </article>`
      )
      .join("");
  }

  function renderSystems(systems) {
    const stack = document.getElementById("systems-stack");
    stack.innerHTML = (systems || [])
      .map((sys) => {
        const actions = [];

        if (sys.primary_url && sys.primary_label) {
          const btnStyle = sys.id === "investment" ? "cmd-btn gold" : "cmd-btn";
          actions.push(
            `<a class="${btnStyle}" href="${escapeHtml(sys.primary_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sys.primary_label)}</a>`
          );
        }

        if (sys.secondary_url && sys.secondary_label) {
          actions.push(
            `<a class="cmd-btn" href="${escapeHtml(sys.secondary_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sys.secondary_label)}</a>`
          );
        }

        if (sys.controllable && sys.action_group === "sns") {
          if (sys.running) {
            actions.push(
              `<button type="button" class="cmd-btn danger-soft js-sys-action" data-endpoint="/api/actions/sns/stop">停止する</button>`
            );
          } else {
            actions.push(
              `<button type="button" class="cmd-btn emerald js-sys-action" data-endpoint="/api/actions/sns/start">⚡ 起動する</button>`
            );
          }
        }

        if (sys.controllable && sys.action_group === "investment") {
          if (sys.running) {
            actions.push(
              `<button type="button" class="cmd-btn danger-soft js-sys-action" data-endpoint="/api/actions/investment/stop">🛑 停止（PC静音化）</button>`
            );
          } else {
            actions.push(
              `<button type="button" class="cmd-btn gold js-sys-action" data-endpoint="/api/actions/investment/start">⚡ 起動（スマホ接続リンク発行）</button>`
            );
          }
        }

        return `
          <article class="sys-card" data-state="${escapeHtml(sys.state)}">
            <div class="sys-top">
              <div class="sys-info">
                <h3 class="sys-name">${escapeHtml(sys.name)}</h3>
                <p class="sys-sub">${escapeHtml(sys.subtitle)}</p>
              </div>
              <span class="status-badge ${escapeHtml(sys.state)}">
                <span class="status-badge-dot"></span>
                <span>${escapeHtml(sys.badge)}</span>
              </span>
            </div>
            <div class="sys-actions">${actions.join("")}</div>
          </article>`;
      })
      .join("");
  }

  function renderWarpDock(items) {
    const grid = document.getElementById("warp-grid");
    grid.innerHTML = (items || [])
      .map(
        (item) => `
        <a class="warp-tile" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          <span class="warp-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <span class="warp-meta">
            <span class="warp-name">${escapeHtml(item.name)}</span>
            <span class="warp-desc">${escapeHtml(item.desc)}</span>
          </span>
        </a>`
      )
      .join("");
  }

  function renderHealthAndBriefing(health, briefing) {
    if (health) {
      const qState = (health.quiet && health.quiet.state) || "quiet";
      const qBanner = document.getElementById("quiet-banner");
      qBanner.dataset.quiet = qState;
      document.getElementById("quiet-icon").textContent =
        qState === "quiet" ? "🟢" : qState === "active" ? "⚡" : "🟠";
      document.getElementById("quiet-label").textContent =
        (health.quiet && health.quiet.label) || "静音・省電力で稼働中";

      document.getElementById("cpu-val").textContent = `${health.cpu_percent}%`;
      document.getElementById("cpu-bar").style.width = `${Math.min(100, health.cpu_percent)}%`;

      document.getElementById("mem-val").textContent = `${health.memory_percent}%`;
      document.getElementById("mem-free-sub").textContent = `空き ${health.memory_free_gb} GB`;
      document.getElementById("mem-bar").style.width = `${Math.min(100, health.memory_percent)}%`;

      document.getElementById("disk-val").textContent = `${health.disk_free_gb} GB`;
      document.getElementById("disk-pct-sub").textContent = `使用 ${health.disk_percent}%`;
      document.getElementById("disk-bar").style.width = `${Math.min(100, health.disk_percent)}%`;
    }

    if (briefing) {
      const pill = document.getElementById("briefing-pill-desktop");
      pill.hidden = false;
      document.getElementById("briefing-desktop-text").textContent = briefing.short_label;
      document.getElementById("briefing-mobile-text").textContent = briefing.short_label;
      document.getElementById("briefing-detail-label").textContent = briefing.next_label;
      document.getElementById("briefing-rule-label").textContent = briefing.schedule_rule;
    }
  }

  function renderOrders(orders) {
    const container = document.getElementById("orders-history");
    if (!orders || orders.length === 0) {
      container.innerHTML = `<div class="panel-note">まだ送信されたオーダーはありません。音声または文字でいつでも記録できます。</div>`;
      return;
    }
    container.innerHTML = orders
      .slice(0, 5)
      .map(
        (ord) => `
        <div class="order-item">
          <span class="order-item-text">${escapeHtml(ord.text)}</span>
          <span class="order-item-meta">${escapeHtml(ord.status)} ${escapeHtml(formatShortTime(ord.created_at))}</span>
        </div>`
      )
      .join("");
  }

  function renderWatchView(data) {
    const quietText =
      (data.pc_health && data.pc_health.quiet && data.pc_health.quiet.state === "quiet")
        ? `🟢 静音稼働 (CPU ${data.pc_health.cpu_percent}%)`
        : `⚡ 稼働中 (CPU ${data.pc_health ? data.pc_health.cpu_percent : 0}%)`;
    document.getElementById("watch-quiet-sub").textContent = quietText;

    const byId = {};
    (data.systems || []).forEach((s) => {
      byId[s.id] = s;
    });

    const setDot = (elId, sys) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.className = `watch-mini-dot ${sys && sys.running ? "ok" : ""}`;
    };
    setDot("w-dot-hp", byId.rooton_hp);
    setDot("w-dot-sns", byId.sns_stealth);
    setDot("w-dot-inv", byId.investment);
    setDot("w-dot-3d", byId.anatomy_3d);

    const invBtn = document.getElementById("watch-inv-toggle-btn");
    const invUp = byId.investment && byId.investment.running;
    invBtn.textContent = invUp ? "🛑 投資 停止する" : "⚡ 投資 起動する";
    invBtn.dataset.endpoint = invUp ? "/api/actions/investment/stop" : "/api/actions/investment/start";

    const approvals = data.approvals || [];
    const watchAprBox = document.getElementById("watch-approval-box");
    if (approvals.length > 0) {
      const first = approvals[0];
      watchAprBox.hidden = false;
      document.getElementById("watch-approval-title").textContent = `承認待ち(${approvals.length})：${first.title}`;
      document.getElementById("watch-approve-btn").dataset.id = first.id;
      document.getElementById("watch-skip-btn").dataset.id = first.id;
    } else {
      watchAprBox.hidden = true;
    }
  }

  function renderOverview(data) {
    state.overview = data;
    showActiveShell();

    document.getElementById("header-live-dot").classList.remove("offline");
    document.getElementById("watch-live-dot").classList.remove("offline");
    document.getElementById("pairing-open-btn").hidden = false;
    document.getElementById("updated-time-label").textContent = `${formatShortTime(data.updated_at)} 更新`;

    renderApprovals(data.approvals);
    renderSystems(data.systems);
    renderWarpDock(data.warp_dock);
    renderHealthAndBriefing(data.pc_health, data.briefing);
    renderOrders(data.orders);
    renderWatchView(data);
  }

  // -------------------------------------------------------------------------
  // 6. Data Refresh & User Action Handlers
  // -------------------------------------------------------------------------
  async function refreshOverview(silent = false) {
    try {
      const data = await apiRequest("/api/overview");
      renderOverview(data);
      if (!silent) showToast("最新の状態に更新しました。");
    } catch (err) {
      document.getElementById("header-live-dot").classList.add("offline");
      document.getElementById("watch-live-dot").classList.add("offline");
      if (err && err.code === 401) {
        showPairingScreen("専用合言葉キーが未登録、または一致しません。再ペアリングしてください。");
        return;
      }
      if (!state.overview) {
        if (!state.isPureLocal && !state.masterKey) {
          showPairingScreen();
        } else {
          showPairingScreen(`自宅PCの司令塔と通信できません（${err.message}）。PCが起動しているか確認してください。`);
        }
      } else if (!silent) {
        showToast(`通信を確認してください：${err.message}`);
      }
    }
  }

  async function triggerPostAction(endpoint, buttonEl, loadingLabel = "実行中...") {
    if (state.busyAction) return;
    state.busyAction = true;
    const prevHtml = buttonEl ? buttonEl.innerHTML : "";
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = loadingLabel;
    }
    try {
      const res = await apiRequest(endpoint, { method: "POST" });
      showToast(res.message || "完了しました。");
      await refreshOverview(true);
    } catch (err) {
      showToast(`エラー：${err.message}`);
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = prevHtml;
      }
      state.busyAction = false;
    }
  }

  async function decideApproval(itemId, decision, buttonEl) {
    if (!itemId || state.busyAction) return;
    state.busyAction = true;
    if (buttonEl) buttonEl.disabled = true;
    try {
      const res = await apiRequest(`/api/approvals/${encodeURIComponent(itemId)}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      showToast(res.message || "反映しました。");
      await refreshOverview(true);
    } catch (err) {
      showToast(`エラー：${err.message}`);
    } finally {
      if (buttonEl) buttonEl.disabled = false;
      state.busyAction = false;
    }
  }

  // -------------------------------------------------------------------------
  // 7. Quiet Header Light Waveform (Zero CPU when tab hidden / reduced-motion)
  // -------------------------------------------------------------------------
  function initHeaderWaveform() {
    const canvas = document.getElementById("wave-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function drawStaticOrAnimatedFrame() {
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Primary whisper cyan acoustic line
      ctx.beginPath();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.72)";
      for (let x = 0; x <= w; x += 3) {
        const norm = x / w;
        const envelope = Math.sin(norm * Math.PI);
        const y =
          mid +
          Math.sin(norm * 10 + state.wavePhase) * 5.2 * envelope +
          Math.sin(norm * 23 - state.wavePhase * 1.4) * 2.1 * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary champagne gold harmonic whisper line
      ctx.beginPath();
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = "rgba(212, 175, 55, 0.36)";
      for (let x = 0; x <= w; x += 4) {
        const norm = x / w;
        const envelope = Math.sin(norm * Math.PI);
        const y = mid + Math.cos(norm * 8 - state.wavePhase * 0.8) * 3.4 * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    function step() {
      if (document.hidden || prefersReduced) {
        state.waveRafId = null;
        return;
      }
      state.wavePhase += 0.035;
      drawStaticOrAnimatedFrame();
      state.waveRafId = window.requestAnimationFrame(step);
    }

    drawStaticOrAnimatedFrame();
    if (!prefersReduced && !document.hidden) {
      state.waveRafId = window.requestAnimationFrame(step);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (state.waveRafId) {
          window.cancelAnimationFrame(state.waveRafId);
          state.waveRafId = null;
        }
      } else if (!prefersReduced && !state.waveRafId) {
        state.waveRafId = window.requestAnimationFrame(step);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 8. Web Speech API Voice Input Support
  // -------------------------------------------------------------------------
  function setupVoiceInput() {
    const voiceBtn = document.getElementById("voice-btn");
    const orderInput = document.getElementById("order-input");
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      voiceBtn.addEventListener("click", () => {
        orderInput.focus();
        showToast("キーボードのマイクボタン、または文字入力からオーダーできます。");
      });
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let listening = false;

    rec.onstart = () => {
      listening = true;
      voiceBtn.classList.add("listening");
      voiceBtn.innerHTML = "<span>🔴 聞いています</span>";
    };

    rec.onend = () => {
      listening = false;
      voiceBtn.classList.remove("listening");
      voiceBtn.innerHTML = "<span>🎙️ 音声</span>";
    };

    rec.onresult = (ev) => {
      const transcript =
        ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
      if (transcript) {
        orderInput.value = orderInput.value ? `${orderInput.value} ${transcript}` : transcript;
        orderInput.focus();
      }
    };

    rec.onerror = () => {
      showToast("音声の聞き取りを終了しました。もう一度押すか文字で入力できます。");
    };

    voiceBtn.addEventListener("click", () => {
      if (listening) {
        rec.stop();
      } else {
        try {
          rec.start();
        } catch (_e) {
          orderInput.focus();
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 9. Event Bindings & Bootstrap
  // -------------------------------------------------------------------------
  function bindEvents() {
    document.getElementById("refresh-btn").addEventListener("click", () => refreshOverview(false));
    document.getElementById("watch-refresh-btn").addEventListener("click", () => refreshOverview(false));

    // Pairing Form
    document.getElementById("pairing-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const val = (document.getElementById("pairing-key-input").value || "").trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(val)) {
        showPairingScreen("64文字の英数字（0〜9, a〜f）で入力してください。");
        return;
      }
      state.masterKey = val;
      state.apiBase = "";
      try {
        window.localStorage.setItem(STORAGE_KEY_NAME, val);
      } catch (_err) {
        // Ignore storage error
      }
      await refreshOverview(false);
    });

    // Dynamic System Buttons & Approval Buttons (Event Delegation)
    document.getElementById("systems-stack").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".js-sys-action");
      if (!btn) return;
      const endpoint = btn.dataset.endpoint;
      const isInvStart = endpoint.includes("investment/start");
      triggerPostAction(
        endpoint,
        btn,
        isInvStart ? "起動＆リンク発行中..." : "切り替え中..."
      );
    });

    document.getElementById("approval-cards-list").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".js-decide-btn");
      if (!btn) return;
      decideApproval(btn.dataset.id, btn.dataset.decision, btn);
    });

    document.getElementById("sample-approval-btn").addEventListener("click", (ev) => {
      triggerPostAction("/api/approvals/sample", ev.currentTarget, "追加中...");
    });

    // Maintenance Controls
    document.getElementById("btn-maintain").addEventListener("click", (ev) => {
      triggerPostAction("/api/actions/maintain", ev.currentTarget, "整理・同期を実行中...");
    });
    document.getElementById("btn-quiet-mode").addEventListener("click", (ev) => {
      triggerPostAction("/api/actions/quiet-mode", ev.currentTarget, "静音モードへ切替中...");
    });
    document.getElementById("btn-test-notify").addEventListener("click", (ev) => {
      triggerPostAction("/api/actions/test-notify", ev.currentTarget, "テスト通知を送信中...");
    });

    // Watch 8 Controls
    document.getElementById("watch-quiet-btn").addEventListener("click", (ev) => {
      triggerPostAction("/api/actions/quiet-mode", ev.currentTarget, "静音化中...");
    });
    document.getElementById("watch-maint-btn").addEventListener("click", (ev) => {
      triggerPostAction("/api/actions/maintain", ev.currentTarget, "お掃除中...");
    });
    document.getElementById("watch-inv-toggle-btn").addEventListener("click", (ev) => {
      const ep = ev.currentTarget.dataset.endpoint || "/api/actions/investment/start";
      triggerPostAction(ep, ev.currentTarget, "処理中...");
    });
    document.getElementById("watch-approve-btn").addEventListener("click", (ev) => {
      decideApproval(ev.currentTarget.dataset.id, "approve", ev.currentTarget);
    });
    document.getElementById("watch-skip-btn").addEventListener("click", (ev) => {
      decideApproval(ev.currentTarget.dataset.id, "skip", ev.currentTarget);
    });

    // Order Submission
    document.getElementById("order-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const input = document.getElementById("order-input");
      const text = (input.value || "").trim();
      if (!text) return;
      const sendBtn = document.getElementById("send-order-btn");
      sendBtn.disabled = true;
      try {
        const res = await apiRequest("/api/orders", {
          method: "POST",
          body: JSON.stringify({
            text,
            source: state.isWatchMode ? "watch" : "mobile_or_pc",
          }),
        });
        input.value = "";
        showToast(res.message || "オーダーを記録しました。");
        await refreshOverview(true);
      } catch (err) {
        showToast(`送信できませんでした：${err.message}`);
      } finally {
        sendBtn.disabled = false;
      }
    });

    // Pairing Modal (Owner Device Link Helper)
    const modal = document.getElementById("pairing-modal");
    document.getElementById("pairing-open-btn").addEventListener("click", async () => {
      modal.hidden = false;
      try {
        const info = await apiRequest("/api/pairing-info");
        document.getElementById("modal-phone-url").textContent = info.pairing_url;
        document.getElementById("modal-watch-url").textContent = info.watch_pairing_url;
        document.getElementById("modal-ntfy-topic").textContent = info.ntfy_topic;
      } catch (err) {
        document.getElementById("modal-phone-url").textContent = `取得エラー：${err.message}`;
      }
    });
    document.getElementById("close-pairing-modal-btn").addEventListener("click", () => {
      modal.hidden = true;
    });
    document.getElementById("copy-phone-url-btn").addEventListener("click", async () => {
      const txt = document.getElementById("modal-phone-url").textContent || "";
      if (txt.startsWith("https://") && navigator.clipboard) {
        await navigator.clipboard.writeText(txt);
        showToast("スマホ用ペアリングURLをコピーしました。");
      }
    });

    window.addEventListener("resize", () => {
      if (state.overview) showActiveShell();
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  async function init() {
    captureKeyFromHashAndCleanUrl();
    loadStoredMasterKey();
    state.isPureLocal = detectLocalLoopbackHost();

    initHeaderWaveform();
    setupVoiceInput();
    bindEvents();
    registerServiceWorker();

    if (!state.isPureLocal && !state.masterKey) {
      showPairingScreen();
      return;
    }

    await refreshOverview(true);

    state.pollTimer = window.setInterval(() => {
      if (!document.hidden && (state.isPureLocal || state.masterKey)) {
        refreshOverview(true);
      }
    }, POLL_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
