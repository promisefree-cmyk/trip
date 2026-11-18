import * as dataModule from './data.js?v=20261118e';
import { createFascia } from './fascia.js?v=20261118e';
import * as posture from './posture.js?v=20261118e';
import { createUnifiedFasciaSheets } from './unified_fascia_sheets.js?v=20261118e';
import { createViewer } from './viewer.js?v=20261118e';
const HABITS = dataModule.HABITS || [];
const LINES = dataModule.LINES || [];
const MUSCLE_LAYERS = dataModule.MUSCLE_LAYERS || {};
const lineById = new Map(LINES.map((l) => [l.id, l]));
const STORAGE_KEY = 'anatomy_unified_check_selected_v2';
const LINE_VIEW = {
  SBL: 'back',
  SFL: 'front',
  LL: 'left',
  SPL: 'front',
  DFL: 'front',
  SFAL: 'front',
  DFAL: 'front',
  SBAL: 'back',
  DBAL: 'back',
  BFL: 'back',
  FFL: 'front',
};
const BEND_LOWBACK_HABIT_IDS = new Set([
  'phone-neck',
  'laptop-low-screen',
  'hair-shampoo-bend',
  'vacuum-dish-bend',
  'care-lift-bend',
  'heavy-lift-dig',
  'therapist-press',
  'sofa-slouch',
  'drive-long',
  'cycling-aero',
  'gym-squat-lift',
  'running-strike',
  'nurse-ward-walk',
  'stroller-cart-push',
  'heels-commute-walk',
  'hiking-mountain-walk',
  'sway-back',
  'gym-bench-push',
]);
function viewForHabit(habit) {
  if (!habit) return 'front';
  if (habit.id === 'volleyball-smash' || habit.id === 'tennis-baseball-arm') return 'right';
  if (habit.id === 'floor-sit-cross' || habit.id === 'leg-cross-r') return 'front';
  if (habit.id === 'gym-bench-push') return 'right';
  if (habit.id === 'sleep-side-curl' || habit.id === 'phone-bed-side') return 'front';
  if (habit.id === 'laundry-reach' || habit.id === 'overhead-tool') return 'left';
  if (habit.id === 'leg-cross-l') return 'left';
  if (habit.id === 'mouse-wrist-strain') return 'right';
  if (BEND_LOWBACK_HABIT_IDS.has(habit.id)) {
    return habit.side === 'R' ? 'right' : 'left';
  }
  if (habit.view) return habit.view;
  const firstLine = (habit.lines || [])[0];
  let v = (firstLine && LINE_VIEW[firstLine]) || 'front';
  if (v === 'left' || v === 'right') v = habit.side === 'R' ? 'right' : 'left';
  return v;
}
function getHabitRoleIds(habit) {
  if (!habit) return [];
  const tl = habit.triggerLine || habit.goldenLine;
  return [
    ...new Set(
      [
        ...(habit.shortenCore || []),
        ...(habit.shortenLinked || []),
        ...(habit.shorten || []),
        ...(habit.lengthenAntagonist || []),
        ...(habit.lengthenLinked || []),
        ...(habit.lengthen || []),
        ...(tl?.shortenCore || []),
        ...(tl?.lengthenAntagonist || []),
      ].filter(Boolean),
    ),
  ];
}
async function loadNames() {
  try {
    const res = await fetch('models/atlas_metadata.json?v=20261118e');
    if (!res.ok) throw new Error(String(res.status));
    const meta = await res.json();
    const names = {};
    for (const s of [...(meta.muscles || []), ...(meta.bones || [])]) {
      names[s.id] = s.nameJa;
    }
    return { meta, names };
  } catch {
    return { meta: null, names: {} };
  }
}
function shortJaName(id, names) {
  const raw = names[id] || id || '';
  return String(raw).replace(/[（(][^）)]*[）)]/gu, '').trim() || raw;
}
function loadSelectedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}
function saveSelectedSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
  }
}
async function initCheckListPage() {
  const container = document.getElementById('checklist-container');
  const bakeBanner = document.getElementById('bake-banner');
  const bakeStatusText = document.getElementById('bake-status-text');
  const bakePct = document.getElementById('bake-pct');
  const bakeFill = document.getElementById('bake-fill');
  const offscreenHost = document.getElementById('offscreen-bake-host');
  const liveDock = document.getElementById('shared-live-dock');
  const liveStageWrap = document.getElementById('live-stage-wrap');
  const btnLayerMode = document.getElementById('btnLayerMode');
  const btnTheme = document.getElementById('btnTheme');
  const selectedCountLabel = document.getElementById('selected-count-label');
  const btnCopySelected = document.getElementById('btn-copy-selected');
  const btnClearSelected = document.getElementById('btn-clear-selected');
  const btnLiveZero = document.getElementById('btn-live-zero');
  const btnLiveHundred = document.getElementById('btn-live-hundred');
  const btnLivePlay = document.getElementById('btn-live-play');
  const btnLiveResetCam = document.getElementById('btn-live-reset-cam');
  const liveSlider = document.getElementById('live-scrub-slider');
  const liveReadout = document.getElementById('live-scrub-readout');
  let currentLayer = 'fascia';
  let isDark = false;
  let currentFilter = 'all';
  const selectedSet = loadSelectedSet();
  const { meta, names } = await loadNames();
  const classifyHabitTab = (hb) => {
    if (!hb) return 'daily';
    if (hb.group === 'デスクワーク' || hb.category === 'desk') return 'desk';
    if (hb.category === 'sports' || hb.category === 'sport') return 'sport';
    if (hb.category === 'work') return 'work';
    return 'daily';
  };
  const catCounts = { all: HABITS.length, desk: 0, work: 0, daily: 0, sport: 0 };
  for (const hb of HABITS) {
    const tabKey = classifyHabitTab(hb);
    if (catCounts[tabKey] !== undefined) catCounts[tabKey]++;
  }
  const catLabels = {
    all: `すべて（${catCounts.all}件）`,
    desk: `デスク・手作業（${catCounts.desk}件）`,
    work: `立ち仕事・重作業（${catCounts.work}件）`,
    daily: `家事・姿勢・カバン（${catCounts.daily}件）`,
    sport: `スポーツ・運動（${catCounts.sport}件）`,
  };
  document.querySelectorAll('.filter-tab').forEach((btn) => {
    const f = btn.dataset.filter;
    if (catLabels[f]) btn.textContent = catLabels[f];
  });
  const cardMap = new Map();
  const snapCache = new Map(); // key: `${id}|${layer}|${dark}` -> { url0, url100 }
  const updateSelectionUI = () => {
    const n = selectedSet.size;
    selectedCountLabel.textContent = `修正・確認チェック中：${n} 件`;
    btnCopySelected.disabled = n === 0;
    btnClearSelected.hidden = n === 0;
    for (const [id, entry] of cardMap) {
      const picked = selectedSet.has(id);
      entry.cardEl.classList.toggle('is-picked', picked);
      entry.pickBtn.classList.toggle('is-picked', picked);
      entry.pickBtn.textContent = picked ? '✓ チェック済み' : '修正チェックする';
    }
  };
  HABITS.forEach((hb, idx) => {
    const numStr = `#${String(idx + 1).padStart(2, '0')}`;
    const tl = hb.triggerLine || hb.goldenLine || {};
    const shortList = (hb.shortenCore?.length ? hb.shortenCore : hb.shorten || [])
      .slice(0, 3)
      .map((m) => shortJaName(m, names))
      .join('・');
    const longList = (hb.lengthenAntagonist?.length ? hb.lengthenAntagonist : hb.lengthen || [])
      .slice(0, 3)
      .map((m) => shortJaName(m, names))
      .join('・');
    const lineBadges = (hb.lines || [])
      .map((lid) => {
        const lObj = lineById.get(lid);
        return lObj ? `${lid}（${lObj.tag || lObj.name}）` : lid;
      })
      .join(' ／ ');
    const card = document.createElement('article');
    card.className = 'check-card';
    card.dataset.habitId = hb.id;
    card.dataset.category = classifyHabitTab(hb);
    const causalText =
      tl.causalSummary ||
      hb.oneLine ||
      `${hb.label}の姿勢が続くと、${shortList || '縮む側'}が固まって${longList || '反対側'}が引っぱられます。`;
    card.innerHTML = `
      <div class="card-top-row">
        <div class="card-title-group">
          <div class="card-title-line">
            <span class="code-badge is-new">${numStr}</span>
            <h2 class="card-title">${hb.label}</h2>
          </div>
          <p class="habit-line">分類：${hb.group || hb.occupation || ''} ｜ 関連ライン：${lineBadges || '全身連動'}</p>
        </div>
        <button type="button" class="pick-btn">修正チェックする</button>
      </div>
      <div class="card-body-split">
        <div class="anim-col">
          <div class="snap-pair-grid">
            <div class="snap-box">
              <div class="snap-head snap-head-0">最初（0%：開始姿勢）</div>
              <div class="snap-stage" data-stage="0">
                <span class="snap-placeholder">スクロールで自動描画…</span>
                <img class="snap-img" alt="${numStr} ${hb.label} 最初(0%)" hidden />
              </div>
            </div>
            <div class="snap-box snap-box-100">
              <div class="snap-head snap-head-100">最後（100%：最大負荷）</div>
              <div class="snap-stage" data-stage="100">
                <span class="snap-placeholder">スクロールで自動描画…</span>
                <img class="snap-img" alt="${numStr} ${hb.label} 最後(100%)" hidden />
              </div>
            </div>
          </div>
          <div class="anim-action-row">
            <button type="button" class="live-open-btn">▶ 3Dで動きを再生・回転確認</button>
            <a class="open-main-link" href="index.html?habit=${encodeURIComponent(hb.id)}">本編で開く</a>
          </div>
          <div class="live-slot"></div>
        </div>
        <div class="text-col">
          <div class="info-block">
            <span class="info-label">動きと負担のしくみ</span>
            <p class="info-text">${causalText}</p>
          </div>
          <div class="info-block">
            <span class="info-label">縮む原因（赤） ／ 引っぱられて張る場所（青）</span>
            <p class="info-text"><strong>縮む側：</strong>${shortList || '—'}<br/><strong>張る側：</strong>${longList || hb.symptom || '—'}</p>
          </div>
          <div class="info-block">
            <span class="info-label">よくある違和感・お悩み</span>
            <p class="info-text">${hb.feel || hb.symptom || '—'}</p>
          </div>
        </div>
      </div>
    `;
    const pickBtn = card.querySelector('.pick-btn');
    const liveBtn = card.querySelector('.live-open-btn');
    const liveSlot = card.querySelector('.live-slot');
    const img0 = card.querySelector('[data-stage="0"] .snap-img');
    const ph0 = card.querySelector('[data-stage="0"] .snap-placeholder');
    const img100 = card.querySelector('[data-stage="100"] .snap-img');
    const ph100 = card.querySelector('[data-stage="100"] .snap-placeholder');
    pickBtn.addEventListener('click', () => {
      if (selectedSet.has(hb.id)) selectedSet.delete(hb.id);
      else selectedSet.add(hb.id);
      saveSelectedSet(selectedSet);
      updateSelectionUI();
    });
    container.appendChild(card);
    cardMap.set(hb.id, {
      idx,
      numStr,
      habit: hb,
      cardEl: card,
      pickBtn,
      liveBtn,
      liveSlot,
      img0,
      ph0,
      img100,
      ph100,
    });
  });
  updateSelectionUI();
  btnCopySelected.addEventListener('click', async () => {
    const linesOut = [];
    for (const [id, entry] of cardMap) {
      if (selectedSet.has(id)) {
        linesOut.push(`${entry.numStr} ${entry.habit.label} (${id})`);
      }
    }
    if (!linesOut.length) return;
    const text = `【アニメーション確認・修正リスト（${linesOut.length}件）】\n${linesOut.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      const prev = btnCopySelected.textContent;
      btnCopySelected.textContent = '✓ コピーしました！';
      setTimeout(() => {
        btnCopySelected.textContent = prev;
      }, 1800);
    } catch {
      window.prompt('以下をコピーしてください：', text);
    }
  });
  btnClearSelected.addEventListener('click', () => {
    selectedSet.clear();
    saveSelectedSet(selectedSet);
    updateSelectionUI();
  });
  const viewer = await createViewer(offscreenHost, {
    metadata: meta || undefined,
    onProgress: (pct, msg) => {
      bakePct.textContent = `${Math.round(pct)}%`;
      bakeFill.style.width = `${Math.round(pct)}%`;
      if (msg) bakeStatusText.textContent = msg;
    },
  });
  const fascia = createFascia({
    THREE: viewer.THREE,
    scene: viewer.scene,
    getMeshes: viewer.getMeshes,
    getCenter: viewer.getCenter,
  });
  const unifiedSheets = createUnifiedFasciaSheets({
    scene: viewer.scene,
    ...viewer.getRoots(),
  });
  viewer.setMuscleLayers?.(MUSCLE_LAYERS);
  viewer.setFasciaLayerMode?.('see-through');
  viewer.setLayer?.('bone', 'on');
  fascia.setLayerFilter?.('see-through', MUSCLE_LAYERS);
  const syncViewerLayerAndTheme = () => {
    const isFascia = currentLayer === 'fascia';
    viewer.setDarkTheme?.(isDark);
    unifiedSheets.setDarkTheme?.(isDark);
    viewer.setUnifiedLayerMode?.(currentLayer);
    unifiedSheets.setVisible(isFascia);
    fascia.setMuscleOverlayVisible?.(!isFascia);
  };
  syncViewerLayerAndTheme();
  bakeBanner.hidden = true;
  let activeLiveId = null;
  let livePlaying = true;
  let liveScrub01 = null;
  viewer.setKeepAwakePredicate?.(() => Boolean(activeLiveId && livePlaying && liveScrub01 === null));
  viewer.onFrame((time, delta) => {
    if (!activeLiveId) return;
    const entry = cardMap.get(activeLiveId);
    if (!entry) return;
    if (liveScrub01 !== null) {
      posture.setHabitPhasePose(entry.habit.id, entry.habit.pose || null, liveScrub01);
    } else if (livePlaying) {
      posture.updatePose(time, delta);
      const cyc = Math.round((posture.poseUniforms.uContractCycle.value || 0) * 100);
      liveSlider.value = String(cyc);
      liveReadout.textContent = `${cyc}%`;
    }
    fascia.update(time, delta);
    unifiedSheets.update(time, delta, viewer.camera?.quaternion || null);
  });
  const applyHabitToScene = (hb, immediateCam = true) => {
    const habitLines = (hb.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
    const roleIds = getHabitRoleIds(hb);
    viewer.setActiveRoleIds?.(roleIds);
    viewer.ghostOthers?.([...new Set([...roleIds, ...(hb.chain || [])])]);
    fascia.clear();
    fascia.showHabit(hb, habitLines);
    fascia.setProgress(0.85);
    unifiedSheets.showHabit(hb);
    syncViewerLayerAndTheme();
    const vDir = viewForHabit(hb);
    viewer.view(vDir, { immediate: immediateCam });
  };
  const bakeQueue = [];
  const queuedSet = new Set();
  let bakingActive = false;
  const enqueueBake = (habitId) => {
    const entry = cardMap.get(habitId);
    if (!entry) return;
    const cacheKey = `${habitId}|${currentLayer}|${isDark ? 1 : 0}`;
    const hit = snapCache.get(cacheKey);
    if (hit) {
      entry.img0.src = hit.url0;
      entry.img0.hidden = false;
      entry.ph0.hidden = true;
      entry.img100.src = hit.url100;
      entry.img100.hidden = false;
      entry.ph100.hidden = true;
      return;
    }
    if (queuedSet.has(cacheKey)) return;
    queuedSet.add(cacheKey);
    bakeQueue.push({ habitId, cacheKey });
    pumpBakeQueue();
  };
  const captureSinglePhase = (hb, phase01) => {
    posture.setHabitPhasePose(hb.id, hb.pose || null, phase01);
    fascia.update(phase01 * 2.0, 0);
    unifiedSheets.update(phase01 * 2.0, 0, viewer.camera?.quaternion || null);
    viewer.renderer.render(viewer.scene, viewer.camera);
    return viewer.renderer.domElement.toDataURL('image/webp', 0.86);
  };
  const pumpBakeQueue = () => {
    if (bakingActive || activeLiveId !== null || bakeQueue.length === 0) return;
    bakingActive = true;
    requestAnimationFrame(() => {
      try {
        const job = bakeQueue.shift();
        if (job) {
          queuedSet.delete(job.cacheKey);
          const entry = cardMap.get(job.habitId);
          if (entry && !entry.cardEl.hidden) {
            applyHabitToScene(entry.habit, true);
            const url0 = captureSinglePhase(entry.habit, 0.0);
            const url100 = captureSinglePhase(entry.habit, 1.0);
            snapCache.set(job.cacheKey, { url0, url100 });
            const expectedKey = `${entry.habit.id}|${currentLayer}|${isDark ? 1 : 0}`;
            if (job.cacheKey === expectedKey) {
              entry.img0.src = url0;
              entry.img0.hidden = false;
              entry.ph0.hidden = true;
              entry.img100.src = url100;
              entry.img100.hidden = false;
              entry.ph100.hidden = true;
            }
          }
        }
      } finally {
        bakingActive = false;
        if (bakeQueue.length > 0 && activeLiveId === null) {
          pumpBakeQueue();
        }
      }
    });
  };
  const visibleIds = new Set();
  const cardObserver = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        const id = ent.target.dataset.habitId;
        if (!id) continue;
        if (ent.isIntersecting) {
          visibleIds.add(id);
          enqueueBake(id);
        } else {
          visibleIds.delete(id);
        }
      }
    },
    { rootMargin: '520px 0px' },
  );
  for (const entry of cardMap.values()) {
    cardObserver.observe(entry.cardEl);
  }
  const closeLiveDock = () => {
    if (!activeLiveId) return;
    const prevEntry = cardMap.get(activeLiveId);
    if (prevEntry) {
      prevEntry.liveBtn.classList.remove('is-active');
      prevEntry.liveBtn.textContent = '▶ 3Dで動きを再生・回転確認';
    }
    activeLiveId = null;
    liveScrub01 = null;
    liveDock.hidden = true;
    offscreenHost.appendChild(viewer.renderer.domElement);
    viewer.renderer.setSize(440, 484, false);
    viewer.camera.aspect = 440 / 484;
    viewer.camera.updateProjectionMatrix();
    pumpBakeQueue();
  };
  const openLiveDock = (habitId) => {
    if (activeLiveId === habitId) {
      closeLiveDock();
      return;
    }
    if (activeLiveId) {
      const prev = cardMap.get(activeLiveId);
      if (prev) {
        prev.liveBtn.classList.remove('is-active');
        prev.liveBtn.textContent = '▶ 3Dで動きを再生・回転確認';
      }
    }
    const entry = cardMap.get(habitId);
    if (!entry) return;
    activeLiveId = habitId;
    livePlaying = true;
    liveScrub01 = null;
    btnLivePlay.textContent = '一時停止';
    entry.liveSlot.appendChild(liveDock);
    liveDock.hidden = false;
    liveStageWrap.appendChild(viewer.renderer.domElement);
    const rect = liveStageWrap.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width) || 440);
    const h = Math.max(260, Math.round(rect.height) || 340);
    viewer.renderer.setSize(w, h, false);
    viewer.camera.aspect = w / h;
    viewer.camera.updateProjectionMatrix();
    entry.liveBtn.classList.add('is-active');
    entry.liveBtn.textContent = '× 3Dライブ再生を閉じる';
    applyHabitToScene(entry.habit, true);
    posture.setPose(entry.habit.pose || null, 1.0, { habitId: entry.habit.id, immediate: true });
    viewer.wake?.();
  };
  for (const [id, entry] of cardMap) {
    entry.liveBtn.addEventListener('click', () => openLiveDock(id));
  }
  btnLiveZero.addEventListener('click', () => {
    liveScrub01 = 0.0;
    livePlaying = false;
    btnLivePlay.textContent = '▶ 連続再生';
    liveSlider.value = '0';
    liveReadout.textContent = '0%';
    viewer.wake?.();
  });
  btnLiveHundred.addEventListener('click', () => {
    liveScrub01 = 1.0;
    livePlaying = false;
    btnLivePlay.textContent = '▶ 連続再生';
    liveSlider.value = '100';
    liveReadout.textContent = '100%';
    viewer.wake?.();
  });
  btnLivePlay.addEventListener('click', () => {
    if (!activeLiveId) return;
    const entry = cardMap.get(activeLiveId);
    if (liveScrub01 !== null || !livePlaying) {
      liveScrub01 = null;
      livePlaying = true;
      btnLivePlay.textContent = '一時停止';
      if (entry) posture.setPose(entry.habit.pose || null, 1.0, { habitId: entry.habit.id });
    } else {
      livePlaying = false;
      btnLivePlay.textContent = '▶ 連続再生';
    }
    viewer.wake?.();
  });
  btnLiveResetCam.addEventListener('click', () => {
    if (!activeLiveId) return;
    const entry = cardMap.get(activeLiveId);
    if (entry) {
      viewer.view(viewForHabit(entry.habit), { immediate: false });
      viewer.wake?.();
    }
  });
  liveSlider.addEventListener('input', () => {
    const val = Number(liveSlider.value) || 0;
    liveScrub01 = Math.min(1, Math.max(0, val / 100));
    livePlaying = false;
    btnLivePlay.textContent = '▶ 連続再生';
    liveReadout.textContent = `${val}%`;
    viewer.wake?.();
  });
  const refreshVisibleSnapshots = () => {
    bakeQueue.length = 0;
    queuedSet.clear();
    for (const id of visibleIds) {
      enqueueBake(id);
    }
    if (activeLiveId) {
      const entry = cardMap.get(activeLiveId);
      if (entry) {
        syncViewerLayerAndTheme();
        viewer.wake?.();
      }
    }
  };
  btnLayerMode.addEventListener('click', () => {
    currentLayer = currentLayer === 'fascia' ? 'muscle' : 'fascia';
    btnLayerMode.querySelectorAll('[data-layer-pill]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.layerPill === currentLayer);
    });
    syncViewerLayerAndTheme();
    refreshVisibleSnapshots();
  });
  btnTheme.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('theme-dark', isDark);
    btnTheme.querySelectorAll('[data-theme-pill]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.themePill === (isDark ? 'dark' : 'light'));
    });
    syncViewerLayerAndTheme();
    refreshVisibleSnapshots();
  });
  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentFilter = tab.dataset.filter || 'all';
      document.querySelectorAll('.filter-tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      if (activeLiveId) {
        const liveEntry = cardMap.get(activeLiveId);
        if (liveEntry && currentFilter !== 'all' && liveEntry.habit.category !== currentFilter) {
          closeLiveDock();
        }
      }
      for (const entry of cardMap.values()) {
        const show = currentFilter === 'all' || entry.habit.category === currentFilter;
        entry.cardEl.hidden = !show;
      }
    });
  });
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    window.__checkListBridge = { viewer, fascia, unifiedSheets, cardMap, HABITS };
  }
}
initCheckListPage().catch((err) => {
  console.error('[fascia_check_list] 初期化エラー:', err);
});