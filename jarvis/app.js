/* ==========================================================================
   J.A.R.V.I.S. OS v2 — Cyber Arc-Ignition & Hybrid Multi-Monitor Controller
   Works identically on `http://localhost:8788/` and
   `https://promisefree-cmyk.github.io/trip/jarvis/`
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEY_NAME = "jarvis_master_key";
  const SOUND_PREF_KEY = "jarvis_sound_muted";
  const POLL_INTERVAL_MS = 15000;
  const ARC_RING_CIRC = 2 * Math.PI * 32; // r=32 in styles.css SVG

  const state = {
    apiBase: "",
    masterKey: "",
    isPureLocal: false,
    isWatchMode: false,
    overview: null,
    monitors: [],
    pollTimer: null,
    clockTimer: null,
    toastTimer: null,
    waveRafId: null,
    wavePhase: 0,
    waveEnergy: 1.0,
    arcRafId: null,
    arcPhase: 0,
    arcSpinBoost: 0,
    arcFlash: 0,
    bootState: "pending", // pending | standby | booting | ready
    bootTimers: [],
    soundMuted: false,
    audioCtx: null,
    activeVoiceAudio: null,
    busyAction: false,
    workspace: {
      mode: "bridge", // bridge | monitor
      split: false,
      slotA: "",
      slotB: "",
      forceEmbedA: false,
      forceEmbedB: false,
      activeSlot: "a",
    },
    grill: {
      active: false,
      completed: false,
      busy: false,
      topic: "",
      category: "",
      categoryLabel: "",
      questions: [],
      stepIndex: 0,
      answers: [],
      specSummary: "",
      promptText: "",
    },
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

  function loadSoundPreference() {
    try {
      state.soundMuted = window.localStorage.getItem(SOUND_PREF_KEY) === "1";
    } catch (_err) {
      state.soundMuted = false;
    }
    updateSoundToggleButton();
  }

  function updateSoundToggleButton() {
    const iconEl = document.getElementById("sound-toggle-icon");
    const btnEl = document.getElementById("sound-toggle-btn");
    if (iconEl) iconEl.textContent = state.soundMuted ? "🔇" : "🔊";
    if (btnEl) btnEl.title = state.soundMuted ? "音声オフ（タップでオン）" : "音声オン（タップで消音）";
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
  // 4. Cyber Sound Engine (Web Audio API + ./boot_voice.mp3 + Fallback TTS)
  // -------------------------------------------------------------------------
  function ensureAudioContext() {
    if (state.soundMuted) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!state.audioCtx) {
      try {
        state.audioCtx = new AudioCtx();
      } catch (_e) {
        return null;
      }
    }
    if (state.audioCtx.state === "suspended") {
      state.audioCtx.resume().catch(() => {});
    }
    return state.audioCtx;
  }

  function playToneStep(ctx, freqStart, freqEnd, startOffset, dur, gainPeak, oscType = "sine") {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.05, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function playBootIgnitionSound() {
    if (state.soundMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      // Deep arc reactor sub-bass power-up sweep + cyan chime sequence
      playToneStep(ctx, 48, 128, 0.0, 0.95, 0.14, "sine");
      playToneStep(ctx, 110, 220, 0.08, 0.75, 0.05, "triangle");
      playToneStep(ctx, 440, 440, 0.25, 0.24, 0.045, "triangle");
      playToneStep(ctx, 554.37, 554.37, 0.40, 0.24, 0.045, "triangle");
      playToneStep(ctx, 659.25, 659.25, 0.55, 0.28, 0.05, "triangle");
      playToneStep(ctx, 880, 880, 0.72, 0.42, 0.055, "sine");
    } catch (_e) {
      // Non-fatal audio safeguard
    }
  }

  function playHudClickSound() {
    if (state.soundMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      playToneStep(ctx, 980, 1420, 0, 0.055, 0.028, "sine");
      state.waveEnergy = Math.max(state.waveEnergy, 1.8);
    } catch (_e) {}
  }

  function playMonitorOpenSound() {
    if (state.soundMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      playToneStep(ctx, 320, 680, 0, 0.18, 0.04, "triangle");
      playToneStep(ctx, 880, 1180, 0.08, 0.14, 0.03, "sine");
      state.waveEnergy = Math.max(state.waveEnergy, 2.1);
    } catch (_e) {}
  }

  function speakJapaneseGreetingFallback() {
    if (state.soundMuted) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance("おかえりなさい、船長。全システム、正常に稼働しています。");
      utter.lang = "ja-JP";
      utter.rate = 0.94;
      utter.pitch = 0.96;
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const jpExact = voices.find((v) => v.lang && v.lang.toLowerCase() === "ja-jp");
      const jpAny = jpExact || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("ja"));
      if (jpAny) utter.voice = jpAny;
      state.waveEnergy = 2.6;
      utter.onend = () => {
        state.waveEnergy = 1.0;
      };
      window.speechSynthesis.speak(utter);
    } catch (_e) {}
  }

  function playBootVoiceGreeting() {
    if (state.soundMuted) return;
    stopBootVoiceGreeting();
    try {
      const audio = new Audio("./boot_voice.mp3?v=jp-concierge-1");
      audio.volume = 0.92;
      state.activeVoiceAudio = audio;
      audio.addEventListener("play", () => {
        state.waveEnergy = 2.8;
      });
      audio.addEventListener("ended", () => {
        state.waveEnergy = 1.0;
        if (state.activeVoiceAudio === audio) state.activeVoiceAudio = null;
      });
      audio.addEventListener("error", () => {
        state.waveEnergy = 1.0;
        speakJapaneseGreetingFallback();
      });
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          state.waveEnergy = 1.0;
          speakJapaneseGreetingFallback();
        });
      }
    } catch (_e) {
      speakJapaneseGreetingFallback();
    }
  }

  function stopBootVoiceGreeting() {
    if (state.activeVoiceAudio) {
      try {
        state.activeVoiceAudio.pause();
        state.activeVoiceAudio.currentTime = 0;
      } catch (_e) {}
      state.activeVoiceAudio = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_e) {}
    }
    state.waveEnergy = 1.0;
  }

  // -------------------------------------------------------------------------
  // 5. Heavy Arc-Ignition Boot Sequence Canvas & Choreography
  // -------------------------------------------------------------------------
  function stopArcCanvas() {
    if (state.arcRafId) {
      window.cancelAnimationFrame(state.arcRafId);
      state.arcRafId = null;
    }
  }

  function drawArcReactorFrame(canvas, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;

    const targetW = Math.floor(w * dpr);
    const targetH = Math.floor(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseR = Math.min(w, h) * 0.34;
    const p = state.arcPhase;
    const boost = state.arcSpinBoost;

    // Flash radial expansion on ignition start
    if (state.arcFlash > 0.01) {
      const gFlash = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseR * (2.6 - state.arcFlash * 0.9));
      gFlash.addColorStop(0, `rgba(224, 247, 255, ${0.85 * state.arcFlash})`);
      gFlash.addColorStop(0.35, `rgba(0, 229, 255, ${0.48 * state.arcFlash})`);
      gFlash.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = gFlash;
      ctx.fillRect(0, 0, w, h);
    }

    // Soft ambient core aura
    const gCore = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 1.45);
    gCore.addColorStop(0, `rgba(0, 229, 255, ${0.14 + boost * 0.14})`);
    gCore.addColorStop(0.55, "rgba(56, 189, 248, 0.05)");
    gCore.addColorStop(1, "rgba(5, 8, 13, 0)");
    ctx.fillStyle = gCore;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Outer dashed geometric precision ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * 0.35);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10, 4, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Middle champagne-gold counter-rotating calibration arcs
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-p * 0.58);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i += 1) {
      const startA = i * (Math.PI / 2) + 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.02, startA, startA + 0.85);
      ctx.stroke();
    }
    ctx.restore();

    // Inner bright cyan arc reactor ring with 10 energy blocks
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * 0.95);
    const coils = 10;
    for (let i = 0; i < coils; i += 1) {
      const a0 = (i / coils) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / coils * 0.62;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(0, 229, 255, 0.72)" : "rgba(56, 189, 248, 0.42)";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.86, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    // Fine compass tick marks
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-p * 0.18);
    const ticks = 36;
    for (let i = 0; i < ticks; i += 1) {
      const angle = (i / ticks) * Math.PI * 2;
      const rIn = baseR * (i % 3 === 0 ? 1.08 : 1.11);
      const rOut = baseR * 1.15;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(212, 175, 55, 0.55)" : "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = i % 3 === 0 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * rIn, Math.sin(angle) * rIn);
      ctx.lineTo(Math.cos(angle) * rOut, Math.sin(angle) * rOut);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  function startArcCanvasLoop() {
    stopArcCanvas();
    const canvas = document.getElementById("arc-boot-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      drawArcReactorFrame(canvas, ctx);
      return;
    }

    function step() {
      const overlay = document.getElementById("boot-overlay");
      if (!overlay || overlay.hidden) {
        state.arcRafId = null;
        return;
      }
      state.arcPhase += 0.014 + state.arcSpinBoost * 0.065;
      if (state.arcFlash > 0) state.arcFlash = Math.max(0, state.arcFlash - 0.025);
      drawArcReactorFrame(canvas, ctx);
      state.arcRafId = window.requestAnimationFrame(step);
    }

    state.arcRafId = window.requestAnimationFrame(step);
  }

  function clearBootTimers() {
    state.bootTimers.forEach((tid) => window.clearTimeout(tid));
    state.bootTimers = [];
  }

  function appendBootDiagLine(text, tone = "") {
    const logEl = document.getElementById("boot-diag-log");
    if (!logEl) return;
    const row = document.createElement("div");
    row.className = tone ? `boot-diag-line ${tone}` : "boot-diag-line";
    row.textContent = text;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function showBootStandbyOverlay() {
    if (state.isWatchMode) {
      completeBootIntoWorkspace(false);
      return;
    }
    clearBootTimers();
    stopBootVoiceGreeting();
    state.bootState = "standby";
    state.arcSpinBoost = 0;
    state.arcFlash = 0;

    const overlay = document.getElementById("boot-overlay");
    const standbyControls = document.getElementById("boot-standby-controls");
    const seqPanel = document.getElementById("boot-sequence-panel");
    const logEl = document.getElementById("boot-diag-log");
    const progFill = document.getElementById("boot-progress-fill");

    if (overlay) {
      overlay.classList.remove("is-exiting");
      overlay.hidden = false;
    }
    if (standbyControls) standbyControls.hidden = false;
    if (seqPanel) seqPanel.hidden = true;
    if (logEl) logEl.innerHTML = "";
    if (progFill) progFill.style.width = "0%";

    updateBootStandbyStatusText();
    startArcCanvasLoop();
  }

  function updateBootStandbyStatusText() {
    const el = document.getElementById("boot-standby-status");
    if (!el) return;
    if (!state.overview) {
      el.textContent = "待機中 — システム点検スタンバイ完了";
      return;
    }
    const pendingCount = (state.overview.approvals || []).length;
    const cpu = state.overview.pc_health ? state.overview.pc_health.cpu_percent : "--";
    el.textContent = `接続準備完了 — CPU ${cpu}% ／ 承認待ち ${pendingCount}件`;
  }

  function buildRealTelemetryLines() {
    const ov = state.overview;
    if (!ov) {
      return [
        "> ROOTON HOMEPAGE GATEWAY .......... STANDBY",
        "> DEEP SCIENCE STUDIO .............. READY",
        "> HYBRID WORKSPACE MONITORS ........ 9 SLOTS ONLINE",
      ];
    }
    const sysMap = {};
    (ov.systems || []).forEach((s) => {
      sysMap[s.id] = s;
    });
    const hpOk = sysMap.rooton_hp && sysMap.rooton_hp.running ? "ONLINE" : "CHECKING";
    const snsOk = sysMap.sns_stealth && sysMap.sns_stealth.running ? "ACTIVE (3850)" : "QUIET STANDBY";
    const invOk = sysMap.investment && sysMap.investment.running ? "ONLINE" : "SILENT ECO";
    const cpu = ov.pc_health ? `${ov.pc_health.cpu_percent}%` : "--%";
    const pending = (ov.approvals || []).length;
    return [
      `> ROOTON OFFICIAL HP ............... ${hpOk}`,
      `> STEALTHFLOW AI (:3850) ........... ${snsOk}`,
      `> ALPHA INVESTMENT ENGINE .......... ${invOk}`,
      `> DEEP SCIENCE THEATER (/apps) ..... ONLINE`,
      `> PC CORE TELEMETRY ................ CPU ${cpu} / PENDING ${pending}`,
    ];
  }

  function completeBootIntoWorkspace(withMaterialize = true) {
    clearBootTimers();
    state.bootState = "ready";
    state.arcSpinBoost = 0;

    const overlay = document.getElementById("boot-overlay");
    if (overlay && !overlay.hidden) {
      if (withMaterialize) {
        overlay.classList.add("is-exiting");
        window.setTimeout(() => {
          overlay.hidden = true;
          overlay.classList.remove("is-exiting");
          stopArcCanvas();
        }, 420);
      } else {
        overlay.hidden = true;
        overlay.classList.remove("is-exiting");
        stopArcCanvas();
      }
    } else {
      stopArcCanvas();
    }

    showActiveShell();

    const shell = document.getElementById("command-shell");
    if (shell && !state.isWatchMode && withMaterialize) {
      shell.classList.remove("hud-materialize");
      // Trigger reflow so replay also animates cleanly
      void shell.offsetWidth;
      shell.classList.add("hud-materialize");
    }
  }

  function triggerHeavyArcBootSequence() {
    if (state.bootState === "booting") return;
    clearBootTimers();
    state.bootState = "booting";
    state.arcFlash = 1.0;
    state.arcSpinBoost = 1.25;

    ensureAudioContext();
    playBootIgnitionSound();

    const standbyControls = document.getElementById("boot-standby-controls");
    const seqPanel = document.getElementById("boot-sequence-panel");
    const phaseLabel = document.getElementById("boot-phase-label");
    const phasePct = document.getElementById("boot-phase-pct");
    const progFill = document.getElementById("boot-progress-fill");
    const logEl = document.getElementById("boot-diag-log");

    if (standbyControls) standbyControls.hidden = true;
    if (seqPanel) seqPanel.hidden = false;
    if (logEl) logEl.innerHTML = "";

    // Phase 1 (0.0s): Ignition burst
    if (phaseLabel) phaseLabel.textContent = "01 // ARC CORE IGNITION";
    if (phasePct) phasePct.textContent = "24%";
    if (progFill) progFill.style.width = "24%";
    appendBootDiagLine("> INITIALIZING J.A.R.V.I.S. MARK VII CORE...", "gold");
    appendBootDiagLine("> CRYPTO BEACON & OWNER AUTH GATE ... VERIFIED", "ok");

    // Phase 2 (0.85s): Japanese cyber concierge greeting + live telemetry stream
    state.bootTimers.push(
      window.setTimeout(() => {
        playBootVoiceGreeting();
        state.arcSpinBoost = 0.7;
        if (phaseLabel) phaseLabel.textContent = "02 // TELEMETRY DIAGNOSTICS";
        if (phasePct) phasePct.textContent = "66%";
        if (progFill) progFill.style.width = "66%";
        const lines = buildRealTelemetryLines();
        lines.forEach((line, i) => {
          state.bootTimers.push(
            window.setTimeout(() => {
              appendBootDiagLine(line, i === lines.length - 1 ? "gold" : "ok");
            }, i * 170)
          );
        });
      }, 850)
    );

    // Phase 3 (2.15s): Hologram deck landing
    state.bootTimers.push(
      window.setTimeout(() => {
        state.arcSpinBoost = 0.3;
        if (phaseLabel) phaseLabel.textContent = "03 // WORKSPACE MONITORS ONLINE";
        if (phasePct) phasePct.textContent = "100%";
        if (progFill) progFill.style.width = "100%";
        appendBootDiagLine("> おかえりなさい、船長。全システム、正常に稼働しています。", "gold");
      }, 2150)
    );

    // Complete (~2.95s)
    state.bootTimers.push(
      window.setTimeout(() => {
        completeBootIntoWorkspace(true);
      }, 2950)
    );
  }

  function skipBootQuietly() {
    clearBootTimers();
    stopBootVoiceGreeting();
    completeBootIntoWorkspace(true);
  }

  // -------------------------------------------------------------------------
  // 6. Watch Mode, Clock, & UI Visibility Management
  // -------------------------------------------------------------------------
  function evaluateWatchMode() {
    const params = new URLSearchParams(window.location.search);
    const forcedWatch = params.get("mode") === "watch";
    const tinyScreen = window.innerWidth <= 305;
    state.isWatchMode = forcedWatch || tinyScreen;
    document.body.classList.toggle("watch-mode", state.isWatchMode);
    if (state.isWatchMode) {
      const overlay = document.getElementById("boot-overlay");
      if (overlay) overlay.hidden = true;
      stopArcCanvas();
    }
  }

  function showPairingScreen(errorMessage = "") {
    clearBootTimers();
    stopArcCanvas();
    stopBootVoiceGreeting();
    const overlay = document.getElementById("boot-overlay");
    if (overlay) overlay.hidden = true;
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
      return;
    }

    document.getElementById("watch-shell").hidden = true;
    const shell = document.getElementById("command-shell");
    if (state.bootState === "ready") {
      shell.hidden = false;
    } else {
      shell.hidden = true;
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

  function updateHudClock() {
    const clockEl = document.getElementById("hud-clock");
    if (!clockEl) return;
    const now = new Date();
    const text = now.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    clockEl.textContent = `${text} JST`;
  }

  function startHudClock() {
    updateHudClock();
    if (state.clockTimer) window.clearInterval(state.clockTimer);
    state.clockTimer = window.setInterval(() => {
      if (!document.hidden) updateHudClock();
    }, 1000);
  }

  // -------------------------------------------------------------------------
  // 7. Hybrid Monitor Catalog, Dock Pills, Split Screen & Iframe Workspace
  // -------------------------------------------------------------------------
  function buildMonitorCatalogFromOverview(data) {
    if (Array.isArray(data.monitors) && data.monitors.length > 0) {
      return data.monitors;
    }
    const items = [];
    (data.systems || []).forEach((s) => {
      items.push({
        id: s.id,
        icon: s.icon || "⚡",
        name: s.name,
        desc: s.subtitle,
        url: s.primary_url,
        secondary_url: s.secondary_url || "",
        secondary_label: s.secondary_label || "",
        running: s.running,
        state: s.state,
        badge: s.badge,
        embeddable: s.embeddable !== false,
        group: "system",
        controllable: Boolean(s.controllable),
        action_group: s.action_group || "",
        custom: false,
      });
    });
    (data.warp_dock || []).forEach((w) => {
      items.push({
        id: w.id,
        icon: w.icon || "🖥️",
        name: w.name,
        desc: w.desc,
        url: w.url,
        secondary_url: "",
        secondary_label: "",
        running: true,
        state: "ok",
        badge: "待機完了",
        embeddable: w.embeddable !== false,
        group: "studio",
        controllable: false,
        action_group: "",
        custom: false,
      });
    });
    (data.custom_monitors || []).forEach((cm) => {
      items.push({
        id: cm.id,
        icon: cm.icon || "🖥️",
        name: cm.name,
        desc: cm.desc || cm.url,
        url: cm.url,
        secondary_url: "",
        secondary_label: "",
        running: true,
        state: "ok",
        badge: "カスタム",
        embeddable: cm.embeddable !== false,
        group: "custom",
        controllable: false,
        action_group: "",
        custom: true,
      });
    });
    return items;
  }

  function findMonitorById(monitorId) {
    return state.monitors.find((m) => m.id === monitorId) || null;
  }

  function isSafeNavigationUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return false;
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith("/apps/")) return true;
    try {
      const parsed = new URL(trimmed, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_e) {
      return false;
    }
  }

  function renderMonitorDock() {
    const listEl = document.getElementById("monitor-dock-list");
    if (!listEl) return;

    const isBridge = state.workspace.mode === "bridge";
    const activeIds = new Set(
      state.workspace.mode === "monitor"
        ? state.workspace.split
          ? [state.workspace.slotA, state.workspace.slotB]
          : [state.workspace.slotA]
        : []
    );

    const bridgeBtnHtml = `
      <button type="button" class="dock-pill ${isBridge ? "active" : ""}" data-monitor-id="__bridge__">
        <span class="dock-pill-dot"></span>
        <span class="dock-pill-label">🏠 司令ブリッジ</span>
      </button>
    `;

    const monitorPillsHtml = state.monitors
      .map((m) => {
        const isActive = activeIds.has(m.id);
        const dotCls = m.state === "ok" ? "" : m.state === "warn" ? "warn" : "idle";
        return `
          <button type="button" class="dock-pill ${isActive ? "active" : ""}" data-monitor-id="${escapeHtml(m.id)}">
            <span class="dock-pill-dot ${dotCls}"></span>
            <span aria-hidden="true">${escapeHtml(m.icon)}</span>
            <span class="dock-pill-label">${escapeHtml(m.name)}</span>
          </button>
        `;
      })
      .join("");

    listEl.innerHTML = bridgeBtnHtml + monitorPillsHtml;

    const splitBtn = document.getElementById("split-toggle-btn");
    if (splitBtn) {
      splitBtn.classList.toggle("active", state.workspace.split);
      splitBtn.innerHTML = state.workspace.split ? "<span>◫ 単一画面へ</span>" : "<span>◫ 2画面分割</span>";
    }
  }

  function populatePaneSelect(selectId, selectedId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = "";
    state.monitors.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.icon || "🖥️"} ${m.name}`;
      if (m.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function triggerScanSweep(paneEl) {
    if (!paneEl) return;
    paneEl.classList.remove("powering-on");
    void paneEl.offsetWidth;
    paneEl.classList.add("powering-on");
  }

  function renderMonitorPane(slot, forceReload = false) {
    const isB = slot === "b";
    const paneEl = document.getElementById(isB ? "monitor-pane-b" : "monitor-pane-a");
    const bodyEl = document.getElementById(isB ? "pane-b-body" : "pane-a-body");
    const popEl = document.getElementById(isB ? "pane-b-popout" : "pane-a-popout");
    const selectId = isB ? "monitor-select-b" : "monitor-select-a";

    if (!paneEl || !bodyEl) return;

    const targetId = isB ? state.workspace.slotB : state.workspace.slotA;
    let monitor = findMonitorById(targetId);
    if (!monitor && state.monitors.length > 0) {
      monitor = state.monitors[0];
      if (isB) state.workspace.slotB = monitor.id;
      else state.workspace.slotA = monitor.id;
    }

    populatePaneSelect(selectId, monitor ? monitor.id : "");

    if (!monitor) {
      bodyEl.innerHTML = `<div class="monitor-fallback-card"><p class="monitor-fallback-desc">表示できるモニターがまだありません。</p></div>`;
      return;
    }

    const safeUrl = isSafeNavigationUrl(monitor.url) ? monitor.url : "";
    if (popEl) {
      if (safeUrl) {
        popEl.href = safeUrl;
        popEl.hidden = false;
      } else {
        popEl.href = "#";
        popEl.hidden = true;
      }
    }

    const forceEmbed = isB ? state.workspace.forceEmbedB : state.workspace.forceEmbedA;
    const renderKey = `${monitor.id}|${safeUrl}|${forceEmbed ? "1" : "0"}|${monitor.running ? "up" : "down"}`;
    if (!forceReload && bodyEl.dataset.loadedKey === renderKey) {
      return;
    }
    bodyEl.dataset.loadedKey = renderKey;
    triggerScanSweep(paneEl);

    // Case 1: Stopped controllable service with no live URL yet
    if (!safeUrl) {
      const startEndpoint =
        monitor.action_group === "sns"
          ? "/api/actions/sns/start"
          : monitor.action_group === "investment"
          ? "/api/actions/investment/start"
          : "";
      bodyEl.innerHTML = `
        <div class="monitor-fallback-card">
          <div class="monitor-fallback-icon">${escapeHtml(monitor.icon)}</div>
          <h3 class="monitor-fallback-title">${escapeHtml(monitor.name)}</h3>
          <p class="monitor-fallback-desc">${escapeHtml(monitor.desc || "現在停止しているためPCは静かな状態です。使う時だけこのモニターから起動できます。")}</p>
          <div class="monitor-fallback-actions">
            ${
              startEndpoint
                ? `<button type="button" class="cmd-btn gold js-pane-sys-start" data-endpoint="${escapeHtml(startEndpoint)}" data-slot="${slot}">⚡ 起動してモニター表示</button>`
                : ""
            }
            <button type="button" class="cmd-btn js-pane-to-bridge">🏠 司令ブリッジへ戻る</button>
          </div>
        </div>
      `;
      return;
    }

    // Case 2: External domain known to restrict embedding unless user requests override
    if (!monitor.embeddable && !forceEmbed) {
      const hasSec = isSafeNavigationUrl(monitor.secondary_url);
      bodyEl.innerHTML = `
        <div class="monitor-fallback-card">
          <div class="monitor-fallback-icon">${escapeHtml(monitor.icon)}</div>
          <h3 class="monitor-fallback-title">${escapeHtml(monitor.name)}</h3>
          <p class="monitor-fallback-desc">
            ${escapeHtml(monitor.desc)}<br />
            ※ 外部サイトのセキュリティ制限により、別ウィンドウでの表示を標準にしています。
          </p>
          <div class="monitor-fallback-actions">
            <a class="cmd-btn cyan" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">↗ 新しいタブで開く</a>
            ${
              hasSec
                ? `<a class="cmd-btn gold" href="${escapeHtml(monitor.secondary_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(monitor.secondary_label || "関連画面を開く")}</a>`
                : ""
            }
            <button type="button" class="cmd-btn js-pane-force-embed" data-slot="${slot}">試しに枠内で読み込む</button>
          </div>
        </div>
      `;
      return;
    }

    // Case 3: Embeddable interactive iframe workspace
    bodyEl.innerHTML = `
      <iframe
        class="monitor-iframe"
        src="${escapeHtml(safeUrl)}"
        title="${escapeHtml(monitor.name)}"
        allow="fullscreen; clipboard-write"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    `;
  }

  function renderWorkspaceBay() {
    const bayEl = document.getElementById("monitor-bay");
    const gridEl = document.getElementById("monitor-bay-grid");
    const paneB = document.getElementById("monitor-pane-b");
    const bridgeEl = document.getElementById("bridge-view");
    if (!bayEl || !gridEl || !paneB || !bridgeEl) return;

    const isMonitorMode = state.workspace.mode === "monitor";
    bayEl.hidden = !isMonitorMode;
    bridgeEl.hidden = isMonitorMode;

    if (!isMonitorMode) {
      renderMonitorDock();
      return;
    }

    const canSplit = state.workspace.split && window.innerWidth >= 960;
    gridEl.classList.toggle("is-split", canSplit);
    paneB.hidden = !canSplit;

    renderMonitorDock();
    renderMonitorPane("a", false);
    if (canSplit) {
      renderMonitorPane("b", false);
    }
  }

  function openMonitorInWorkspace(monitorId, preferredSlot = "") {
    if (monitorId === "__bridge__") {
      closeMonitorWorkspace();
      return;
    }
    const target = findMonitorById(monitorId);
    if (!target) return;

    const slot =
      preferredSlot ||
      (state.workspace.split && window.innerWidth >= 960 ? state.workspace.activeSlot : "a");

    state.workspace.mode = "monitor";
    if (slot === "b") {
      state.workspace.slotB = monitorId;
      state.workspace.forceEmbedB = false;
      state.workspace.activeSlot = "a";
    } else {
      state.workspace.slotA = monitorId;
      state.workspace.forceEmbedA = false;
      if (state.workspace.split && !state.workspace.slotB) {
        const second = state.monitors.find((m) => m.id !== monitorId) || target;
        state.workspace.slotB = second.id;
      }
      state.workspace.activeSlot = state.workspace.split ? "b" : "a";
    }

    playMonitorOpenSound();
    renderWorkspaceBay();
  }

  function closeMonitorWorkspace() {
    state.workspace.mode = "bridge";
    playHudClickSound();
    renderWorkspaceBay();
  }

  function toggleSplitWorkspace() {
    if (window.innerWidth < 960) {
      showToast("2画面分割はPC・タブレット横画面で利用できます。");
      return;
    }
    state.workspace.split = !state.workspace.split;
    if (state.workspace.split) {
      state.workspace.mode = "monitor";
      if (!state.workspace.slotA && state.monitors.length > 0) {
        state.workspace.slotA =
          findMonitorById("deep_science")?.id ||
          findMonitorById("studio")?.id ||
          state.monitors[0].id;
      }
      if (!state.workspace.slotB || state.workspace.slotB === state.workspace.slotA) {
        const alt = state.monitors.find((m) => m.id !== state.workspace.slotA && m.embeddable !== false);
        state.workspace.slotB = (alt || state.monitors[0] || { id: "" }).id;
      }
      playMonitorOpenSound();
    } else {
      playHudClickSound();
    }
    renderWorkspaceBay();
  }

  // -------------------------------------------------------------------------
  // 8. Render Command Bridge & Watch 8 Interface
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

        actions.push(
          `<button type="button" class="cmd-btn cyan js-open-monitor" data-monitor-id="${escapeHtml(sys.id)}">🖥️ モニターで開く</button>`
        );

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

  function renderWarpDock(items, customItems) {
    const grid = document.getElementById("warp-grid");
    const combined = [
      ...(items || []),
      ...(customItems || []).map((c) => ({
        id: c.id,
        icon: c.icon || "🖥️",
        name: c.name,
        desc: c.desc || c.url,
        url: c.url,
      })),
    ];

    grid.innerHTML = combined
      .map((item) => {
        const safeHref = isSafeNavigationUrl(item.url) ? item.url : "#";
        return `
        <div class="warp-tile-wrap">
          <button type="button" class="warp-tile js-open-monitor" data-monitor-id="${escapeHtml(item.id)}">
            <span class="warp-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
            <span class="warp-meta">
              <span class="warp-name">${escapeHtml(item.name)}</span>
              <span class="warp-desc">${escapeHtml(item.desc)}</span>
            </span>
          </button>
          <a class="warp-pop-btn" href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.name)}を新しいタブで開く" title="新しいタブで開く">↗</a>
        </div>`;
      })
      .join("");
  }

  function setArcRingPercent(ringId, pct) {
    const el = document.getElementById(ringId);
    if (!el) return;
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    const offset = ARC_RING_CIRC * (1 - clamped / 100);
    el.style.strokeDasharray = `${ARC_RING_CIRC.toFixed(2)}`;
    el.style.strokeDashoffset = `${offset.toFixed(2)}`;
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
      setArcRingPercent("cpu-ring", health.cpu_percent);

      document.getElementById("mem-val").textContent = `${health.memory_percent}%`;
      document.getElementById("mem-free-sub").textContent = `空き ${health.memory_free_gb} GB`;
      document.getElementById("mem-bar").style.width = `${Math.min(100, health.memory_percent)}%`;
      setArcRingPercent("mem-ring", health.memory_percent);

      document.getElementById("disk-val").textContent = `${health.disk_free_gb} GB`;
      document.getElementById("disk-pct-sub").textContent = `使用 ${health.disk_percent}%`;
      document.getElementById("disk-bar").style.width = `${Math.min(100, health.disk_percent)}%`;
      setArcRingPercent("disk-ring", health.disk_percent);
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
      .map((ord) => {
        const isGrill = ord.status === "壁打ち確定" || ord.mode === "grill-me";
        const metaCls = isGrill ? "order-item-meta grill-done" : "order-item-meta";
        return `
        <div class="order-item">
          <span class="order-item-text">${escapeHtml(ord.text)}</span>
          <span class="${metaCls}">${escapeHtml(ord.status)} ${escapeHtml(formatShortTime(ord.created_at))}</span>
        </div>`;
      })
      .join("");
  }

  function renderCustomMonitorListModal() {
    const listEl = document.getElementById("custom-monitor-list");
    if (!listEl) return;
    const customList = (state.overview && state.overview.custom_monitors) || [];
    if (customList.length === 0) {
      listEl.innerHTML = `<p class="panel-note">まだ登録されたカスタムモニターはありません。</p>`;
      return;
    }
    listEl.innerHTML = customList
      .map(
        (cm) => `
        <div class="cm-saved-item">
          <div class="cm-saved-info">
            <span class="cm-saved-name">${escapeHtml(cm.icon || "🖥️")} ${escapeHtml(cm.name)}</span>
            <span class="cm-saved-url">${escapeHtml(cm.url)}</span>
          </div>
          <button type="button" class="cmd-btn danger-soft js-cm-delete" data-id="${escapeHtml(cm.id)}" style="flex: 0 0 auto; min-height: 44px; padding: 0 12px;">
            削除
          </button>
        </div>
      `
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
    state.monitors = buildMonitorCatalogFromOverview(data);

    evaluateWatchMode();
    if (state.isWatchMode && state.bootState !== "ready") {
      state.bootState = "ready";
    }

    showActiveShell();
    updateBootStandbyStatusText();

    document.getElementById("header-live-dot").classList.remove("offline");
    document.getElementById("watch-live-dot").classList.remove("offline");
    document.getElementById("pairing-open-btn").hidden = false;
    const replayBtn = document.getElementById("replay-boot-btn");
    if (replayBtn) replayBtn.hidden = false;
    document.getElementById("updated-time-label").textContent = `${formatShortTime(data.updated_at)} 更新`;

    renderApprovals(data.approvals);
    renderSystems(data.systems);
    renderWarpDock(data.warp_dock, data.custom_monitors);
    renderWorkspaceBay();
    renderCustomMonitorListModal();
    renderHealthAndBriefing(data.pc_health, data.briefing);
    renderOrders(data.orders);
    renderWatchView(data);
  }

  // -------------------------------------------------------------------------
  // 9. Data Refresh & User Action Handlers
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
    playHudClickSound();
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
    playHudClickSound();
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
  // 10. Header Cyber Light Waveform (Responds smoothly to audio & clicks)
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
      const e = state.waveEnergy;
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.lineWidth = 1.35;
      ctx.strokeStyle = e > 1.3 ? "rgba(0, 229, 255, 0.92)" : "rgba(56, 189, 248, 0.72)";
      for (let x = 0; x <= w; x += 3) {
        const norm = x / w;
        const envelope = Math.sin(norm * Math.PI);
        const y =
          mid +
          Math.sin(norm * 10 + state.wavePhase) * 4.8 * e * envelope +
          Math.sin(norm * 23 - state.wavePhase * 1.4) * 2.0 * e * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = "rgba(212, 175, 55, 0.42)";
      for (let x = 0; x <= w; x += 4) {
        const norm = x / w;
        const envelope = Math.sin(norm * Math.PI);
        const y = mid + Math.cos(norm * 8 - state.wavePhase * 0.85) * 3.2 * e * envelope;
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
      state.wavePhase += 0.038 * Math.min(2.2, state.waveEnergy);
      if (state.waveEnergy > 1.01 && !state.activeVoiceAudio) {
        state.waveEnergy = Math.max(1.0, state.waveEnergy * 0.96);
      }
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
      } else {
        updateHudClock();
        if (!prefersReduced && !state.waveRafId) {
          state.waveRafId = window.requestAnimationFrame(step);
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 11. Web Speech API Voice Input Support
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
  // 12. Grill-Me (3-Step Tap Interview) Mode
  // -------------------------------------------------------------------------
  async function copyTextSafely(text) {
    if (!text) return false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_err) {}
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Boolean(ok);
    } catch (_err2) {
      return false;
    }
  }

  function closeGrillSession() {
    state.grill.active = false;
    state.grill.completed = false;
    state.grill.busy = false;
    const box = document.getElementById("grill-session-box");
    if (box) {
      box.hidden = true;
      box.innerHTML = "";
      box.removeAttribute("data-mode");
    }
  }

  function renderGrillSessionBox() {
    const box = document.getElementById("grill-session-box");
    if (!box) return;

    if (!state.grill.active) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.hidden = false;

    if (state.grill.completed) {
      box.dataset.mode = "done";
      box.innerHTML = `
        <div class="grill-head">
          <div class="grill-head-left">
            <span class="grill-step-title">✓ 壁打ち方針が確定しました</span>
            <span class="grill-cat-badge gold">承認センター＆実行キュー登録済</span>
          </div>
          <button type="button" class="grill-close-btn js-grill-close">閉じる</button>
        </div>
        <div class="grill-summary-box">${escapeHtml(state.grill.specSummary)}</div>
        <p class="grill-done-note">
          上の「承認センター」に確認カードを追加しました。AIへそのまま貼って作業させる場合は下のボタンで指示文をコピーできます。
        </p>
        <div class="grill-done-actions">
          <button type="button" class="cmd-btn gold" id="grill-copy-prompt-btn">
            <span>📋 AI指示文をコピー</span>
          </button>
          <button type="button" class="cmd-btn js-grill-close">
            <span>閉じる</span>
          </button>
        </div>
      `;
      return;
    }

    box.dataset.mode = "asking";
    const total = state.grill.questions.length || 3;
    const idx = Math.min(state.grill.stepIndex, total - 1);
    const stepNum = idx + 1;
    const currentQ = state.grill.questions[idx] || { question: "", options: [] };
    const isLast = stepNum >= total;
    const disabledAttr = state.grill.busy ? "disabled" : "";

    const segsHtml = Array.from({ length: total }, (_v, i) => {
      const cls = i < idx ? "done" : i === idx ? "current" : "";
      return `<span class="grill-progress-seg ${cls}"></span>`;
    }).join("");

    const optionsHtml = (currentQ.options || [])
      .map((opt, optIdx) => {
        const isRec = optIdx === 0 || String(opt).startsWith("（おすすめ）");
        const btnCls = isRec ? "grill-option-btn recommended js-grill-option" : "grill-option-btn js-grill-option";
        return `
          <button type="button" class="${btnCls}" data-option="${escapeHtml(opt)}" ${disabledAttr}>
            <span class="grill-option-label">${escapeHtml(opt)}</span>
            <span class="grill-option-arrow" aria-hidden="true">${isLast ? "確定 ➔" : "次へ ➔"}</span>
          </button>
        `;
      })
      .join("");

    const backBtnHtml =
      idx > 0
        ? `<button type="button" class="subtle-action-btn js-grill-back" ${disabledAttr}>← 前の質問へ戻る</button>`
        : "";

    box.innerHTML = `
      <div class="grill-head">
        <div class="grill-head-left">
          <span class="grill-step-title">🔥 壁打ち深掘り中（質問 ${stepNum} / ${total}）</span>
          <span class="grill-cat-badge">${escapeHtml(state.grill.categoryLabel || "企画整理")}</span>
        </div>
        <button type="button" class="grill-close-btn js-grill-close" ${disabledAttr}>閉じる</button>
      </div>
      <div class="grill-progress-track" aria-hidden="true">${segsHtml}</div>
      <p class="grill-topic-caption">テーマ：${escapeHtml(state.grill.topic)}</p>
      <h3 class="grill-question-text">${escapeHtml(currentQ.question)}</h3>
      <div class="grill-options-list">${optionsHtml}</div>
      <form class="grill-custom-form js-grill-custom-form">
        <input
          type="text"
          class="grill-custom-input js-grill-custom-input"
          placeholder="自分の言葉で答える場合はこちらに入力..."
          maxlength="300"
          aria-label="自分の言葉で回答を入力"
          ${disabledAttr}
        />
        <button type="submit" class="cmd-btn grill-custom-submit-btn" ${disabledAttr}>
          <span>${state.grill.busy ? "まとめ中..." : isLast ? "確定する" : "次へ"}</span>
        </button>
      </form>
      ${backBtnHtml ? `<div class="grill-foot-row">${backBtnHtml}</div>` : ""}
    `;
  }

  async function startGrillSession(overrideTopic = "") {
    if (state.grill.busy) return;
    playHudClickSound();
    const inputEl = document.getElementById("order-input");
    const examplesBar = document.getElementById("grill-examples-bar");
    const startBtn = document.getElementById("grill-start-btn");

    if (overrideTopic && inputEl) {
      inputEl.value = overrideTopic;
    }

    const topic = ((inputEl && inputEl.value) || "").trim();
    if (!topic) {
      if (examplesBar) examplesBar.hidden = false;
      if (inputEl) inputEl.focus();
      showToast("壁打ちしたいテーマを入力するか、下の例題をタップしてください。");
      return;
    }

    if (examplesBar) examplesBar.hidden = true;
    state.grill.busy = true;
    if (startBtn) startBtn.disabled = true;

    try {
      const res = await apiRequest("/api/grill/start", {
        method: "POST",
        body: JSON.stringify({ topic }),
      });

      state.grill.active = true;
      state.grill.completed = false;
      state.grill.topic = res.topic || topic;
      state.grill.category = res.category || "general";
      state.grill.categoryLabel = res.category_label || "企画・アイデア整理";
      state.grill.questions = Array.isArray(res.questions) ? res.questions : [];
      state.grill.stepIndex = 0;
      state.grill.answers = [];
      state.grill.specSummary = "";
      state.grill.promptText = "";

      renderGrillSessionBox();
    } catch (err) {
      showToast(`壁打ちを開始できませんでした：${err.message}`);
    } finally {
      state.grill.busy = false;
      if (startBtn) startBtn.disabled = false;
    }
  }

  async function completeGrillSession() {
    state.grill.busy = true;
    renderGrillSessionBox();

    try {
      const res = await apiRequest("/api/grill/complete", {
        method: "POST",
        body: JSON.stringify({
          topic: state.grill.topic,
          category: state.grill.category,
          category_label: state.grill.categoryLabel,
          answers: state.grill.answers,
          register_approval: true,
        }),
      });

      state.grill.completed = true;
      state.grill.specSummary = res.spec_summary || "";
      state.grill.promptText = res.prompt_text || "";
      state.grill.busy = false;

      const inputEl = document.getElementById("order-input");
      if (inputEl) inputEl.value = "";

      renderGrillSessionBox();
      showToast(res.message || "壁打ち方針を確定しました。");
      await refreshOverview(true);
    } catch (err) {
      state.grill.busy = false;
      renderGrillSessionBox();
      showToast(`確定処理でエラーが発生しました：${err.message}`);
    }
  }

  async function selectGrillAnswer(answerText) {
    if (state.grill.busy || !state.grill.active || state.grill.completed) return;
    const cleaned = String(answerText || "").trim();
    if (!cleaned) {
      showToast("回答を選択するか、言葉を入力してください。");
      return;
    }

    playHudClickSound();
    const idx = state.grill.stepIndex;
    const currentQ = state.grill.questions[idx];
    if (!currentQ) return;

    state.grill.answers[idx] = {
      question: currentQ.question,
      answer: cleaned,
    };

    if (idx + 1 < state.grill.questions.length) {
      state.grill.stepIndex = idx + 1;
      renderGrillSessionBox();
    } else {
      state.grill.answers = state.grill.answers.slice(0, state.grill.questions.length);
      await completeGrillSession();
    }
  }

  // -------------------------------------------------------------------------
  // 13. Event Bindings & Bootstrap
  // -------------------------------------------------------------------------
  function bindEvents() {
    // Boot Overlay Controls
    document.getElementById("boot-trigger-btn").addEventListener("click", () => {
      triggerHeavyArcBootSequence();
    });
    document.getElementById("boot-silent-skip-btn").addEventListener("click", () => {
      skipBootQuietly();
    });
    document.getElementById("boot-skip-inline-btn").addEventListener("click", () => {
      skipBootQuietly();
    });
    document.getElementById("boot-overlay").addEventListener("click", (ev) => {
      if (state.bootState === "booting" && !ev.target.closest("button")) {
        skipBootQuietly();
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        if (state.bootState === "booting") {
          skipBootQuietly();
          return;
        }
        const pairingModal = document.getElementById("pairing-modal");
        const cmModal = document.getElementById("custom-monitor-modal");
        if (pairingModal && !pairingModal.hidden) pairingModal.hidden = true;
        if (cmModal && !cmModal.hidden) cmModal.hidden = true;
      }
    });

    // Top HUD Controls
    document.getElementById("sound-toggle-btn").addEventListener("click", () => {
      state.soundMuted = !state.soundMuted;
      try {
        window.localStorage.setItem(SOUND_PREF_KEY, state.soundMuted ? "1" : "0");
      } catch (_e) {}
      if (state.soundMuted) stopBootVoiceGreeting();
      else playHudClickSound();
      updateSoundToggleButton();
      showToast(state.soundMuted ? "効果音・起動音をオフにしました。" : "効果音・起動音をオンにしました。");
    });

    document.getElementById("replay-boot-btn").addEventListener("click", () => {
      if (state.isWatchMode) return;
      showBootStandbyOverlay();
      triggerHeavyArcBootSequence();
    });

    document.getElementById("refresh-btn").addEventListener("click", () => refreshOverview(false));
    document.getElementById("watch-refresh-btn").addEventListener("click", () => refreshOverview(false));

    // Monitor Dock & Workspace Bay Controls
    document.getElementById("monitor-dock-list").addEventListener("click", (ev) => {
      const pill = ev.target.closest(".dock-pill");
      if (!pill) return;
      openMonitorInWorkspace(pill.dataset.monitorId || "");
    });

    document.getElementById("split-toggle-btn").addEventListener("click", () => {
      toggleSplitWorkspace();
    });

    document.getElementById("add-monitor-btn").addEventListener("click", () => {
      playHudClickSound();
      renderCustomMonitorListModal();
      document.getElementById("custom-monitor-modal").hidden = false;
    });

    document.getElementById("monitor-select-a").addEventListener("change", (ev) => {
      state.workspace.slotA = ev.target.value;
      state.workspace.forceEmbedA = false;
      playMonitorOpenSound();
      renderMonitorDock();
      renderMonitorPane("a", true);
    });

    document.getElementById("monitor-select-b").addEventListener("change", (ev) => {
      state.workspace.slotB = ev.target.value;
      state.workspace.forceEmbedB = false;
      playMonitorOpenSound();
      renderMonitorDock();
      renderMonitorPane("b", true);
    });

    document.getElementById("pane-a-reload").addEventListener("click", () => {
      playHudClickSound();
      renderMonitorPane("a", true);
    });
    document.getElementById("pane-b-reload").addEventListener("click", () => {
      playHudClickSound();
      renderMonitorPane("b", true);
    });
    document.getElementById("pane-a-close").addEventListener("click", () => {
      closeMonitorWorkspace();
    });
    document.getElementById("pane-b-close").addEventListener("click", () => {
      state.workspace.split = false;
      playHudClickSound();
      renderWorkspaceBay();
    });

    // Monitor Pane Body Delegation (Force Embed / Back to Bridge / Start Stopped Service)
    document.getElementById("monitor-bay-grid").addEventListener("click", (ev) => {
      const bridgeBtn = ev.target.closest(".js-pane-to-bridge");
      if (bridgeBtn) {
        closeMonitorWorkspace();
        return;
      }
      const forceBtn = ev.target.closest(".js-pane-force-embed");
      if (forceBtn) {
        const slot = forceBtn.dataset.slot === "b" ? "b" : "a";
        if (slot === "b") state.workspace.forceEmbedB = true;
        else state.workspace.forceEmbedA = true;
        playMonitorOpenSound();
        renderMonitorPane(slot, true);
        return;
      }
      const startBtn = ev.target.closest(".js-pane-sys-start");
      if (startBtn) {
        const endpoint = startBtn.dataset.endpoint;
        if (endpoint) {
          triggerPostAction(
            endpoint,
            startBtn,
            endpoint.includes("investment") ? "起動＆リンク発行中..." : "起動中..."
          );
        }
      }
    });

    // Custom Monitor Modal Controls
    document.getElementById("close-custom-modal-btn").addEventListener("click", () => {
      document.getElementById("custom-monitor-modal").hidden = true;
    });

    document.getElementById("custom-monitor-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nameEl = document.getElementById("cm-name");
      const iconEl = document.getElementById("cm-icon");
      const urlEl = document.getElementById("cm-url");
      const descEl = document.getElementById("cm-desc");
      const embedEl = document.getElementById("cm-embeddable");
      const btnEl = document.getElementById("cm-submit-btn");

      btnEl.disabled = true;
      try {
        const res = await apiRequest("/api/custom-monitors", {
          method: "POST",
          body: JSON.stringify({
            name: (nameEl.value || "").trim(),
            icon: (iconEl.value || "").trim() || "🖥️",
            url: (urlEl.value || "").trim(),
            desc: (descEl.value || "").trim(),
            embeddable: Boolean(embedEl.checked),
          }),
        });
        nameEl.value = "";
        urlEl.value = "";
        descEl.value = "";
        document.getElementById("custom-monitor-modal").hidden = true;
        showToast(res.message || "カスタムモニターを追加しました。");
        await refreshOverview(true);
      } catch (err) {
        showToast(`追加できませんでした：${err.message}`);
      } finally {
        btnEl.disabled = false;
      }
    });

    document.getElementById("custom-monitor-list").addEventListener("click", async (ev) => {
      const delBtn = ev.target.closest(".js-cm-delete");
      if (!delBtn) return;
      const monId = delBtn.dataset.id;
      if (!monId) return;
      delBtn.disabled = true;
      try {
        const res = await apiRequest(`/api/custom-monitors/${encodeURIComponent(monId)}`, {
          method: "DELETE",
        });
        if (state.workspace.slotA === monId || state.workspace.slotB === monId) {
          state.workspace.mode = "bridge";
        }
        showToast(res.message || "削除しました。");
        await refreshOverview(true);
      } catch (err) {
        showToast(`削除エラー：${err.message}`);
      } finally {
        delBtn.disabled = false;
      }
    });

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
      } catch (_err) {}
      await refreshOverview(false);
      if (state.overview && !state.isWatchMode && state.bootState === "pending") {
        showBootStandbyOverlay();
      }
    });

    // System Stack & Warp Grid Open-in-Monitor + System Actions
    document.getElementById("systems-stack").addEventListener("click", (ev) => {
      const monBtn = ev.target.closest(".js-open-monitor");
      if (monBtn) {
        openMonitorInWorkspace(monBtn.dataset.monitorId || "");
        return;
      }
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

    document.getElementById("warp-grid").addEventListener("click", (ev) => {
      const monBtn = ev.target.closest(".js-open-monitor");
      if (!monBtn) return;
      openMonitorInWorkspace(monBtn.dataset.monitorId || "");
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
      playHudClickSound();
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
        const examplesBar = document.getElementById("grill-examples-bar");
        if (examplesBar) examplesBar.hidden = true;
        showToast(res.message || "オーダーを記録しました。");
        await refreshOverview(true);
      } catch (err) {
        showToast(`送信できませんでした：${err.message}`);
      } finally {
        sendBtn.disabled = false;
      }
    });

    // Grill-Me Controls & Event Delegation
    document.getElementById("grill-start-btn").addEventListener("click", () => {
      startGrillSession();
    });

    document.getElementById("grill-examples-bar").addEventListener("click", (ev) => {
      const chip = ev.target.closest(".grill-example-chip");
      if (!chip) return;
      const sampleTopic = chip.dataset.topic || "";
      if (sampleTopic) {
        startGrillSession(sampleTopic);
      }
    });

    const grillBox = document.getElementById("grill-session-box");
    grillBox.addEventListener("click", async (ev) => {
      const optBtn = ev.target.closest(".js-grill-option");
      if (optBtn) {
        await selectGrillAnswer(optBtn.dataset.option || "");
        return;
      }

      const closeBtn = ev.target.closest(".js-grill-close");
      if (closeBtn) {
        closeGrillSession();
        return;
      }

      const backBtn = ev.target.closest(".js-grill-back");
      if (backBtn) {
        if (!state.grill.busy && state.grill.stepIndex > 0) {
          state.grill.stepIndex -= 1;
          renderGrillSessionBox();
        }
        return;
      }

      const copyBtn = ev.target.closest("#grill-copy-prompt-btn");
      if (copyBtn) {
        const ok = await copyTextSafely(state.grill.promptText);
        if (ok) {
          showToast("📋 AI指示文をコピーしました！そのまま貼り付けられます。");
          const prev = copyBtn.innerHTML;
          copyBtn.innerHTML = "<span>✓ コピーしました</span>";
          window.setTimeout(() => {
            if (copyBtn.isConnected) copyBtn.innerHTML = prev;
          }, 2200);
        } else {
          showToast("コピーできませんでした。もう一度お試しください。");
        }
      }
    });

    grillBox.addEventListener("submit", async (ev) => {
      const customForm = ev.target.closest(".js-grill-custom-form");
      if (!customForm) return;
      ev.preventDefault();
      const inputEl = customForm.querySelector(".js-grill-custom-input");
      const val = ((inputEl && inputEl.value) || "").trim();
      if (!val) {
        if (inputEl) inputEl.focus();
        showToast("自分の言葉で答える内容を入力するか、上の選択肢をタップしてください。");
        return;
      }
      await selectGrillAnswer(val);
    });

    // Pairing Modal (Owner Device Link Helper)
    const modal = document.getElementById("pairing-modal");
    document.getElementById("pairing-open-btn").addEventListener("click", async () => {
      playHudClickSound();
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
      if (txt.startsWith("https://")) {
        const ok = await copyTextSafely(txt);
        if (ok) showToast("スマホ用ペアリングURLをコピーしました。");
      }
    });

    window.addEventListener("resize", () => {
      if (state.overview) {
        showActiveShell();
        if (state.workspace.mode === "monitor") renderWorkspaceBay();
      }
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
    loadSoundPreference();
    state.isPureLocal = detectLocalLoopbackHost();
    evaluateWatchMode();

    initHeaderWaveform();
    startHudClock();
    setupVoiceInput();
    bindEvents();
    registerServiceWorker();

    if (!state.isPureLocal && !state.masterKey) {
      showPairingScreen();
      return;
    }

    if (!state.isWatchMode) {
      showBootStandbyOverlay();
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
