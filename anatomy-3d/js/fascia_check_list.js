import * as dataModule from './data.js?v=20261119a';
import { createFascia } from './fascia.js?v=20261119a';
import * as posture from './posture.js?v=20261119a';
import { createUnifiedFasciaSheets } from './unified_fascia_sheets.js?v=20261119a';
import { createViewer } from './viewer.js?v=20261119a';
const HABITS = dataModule.HABITS || [];
const LINES = dataModule.LINES || [];
const MUSCLE_LAYERS = dataModule.MUSCLE_LAYERS || {};
const lineById = new Map(LINES.map((l) => [l.id, l]));
const STORAGE_KEY = 'anatomy_unified_check_selected_v2';
const EDIT_STORAGE_KEY = 'anatomy_unified_check_edits_v1';
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
  'desk-round',
  'phone-neck',
  'laptop-low-screen',
  'nail-eye-fine',
  'hair-shampoo-bend',
  'vacuum-dish-bend',
  'care-lift-bend',
  'heavy-lift-dig',
  'therapist-press',
  'sofa-slouch',
  'drive-long',
  'kitchen-knife-chop',
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
  if (habit.id === 'leg-cross-r') return 'front-right';
  if (habit.id === 'floor-sit-cross') return 'front-left';
  if (habit.id === 'gym-bench-push') return 'right';
  if (habit.id === 'desk-round' || habit.id === 'kitchen-knife-chop' || habit.id === 'drive-long') return 'right';
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
    const res = await fetch('models/atlas_metadata.json?v=20261119a');
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
function loadEditsMap() {
  try {
    const raw = localStorage.getItem(EDIT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}
function saveEditsMap(obj) {
  try {
    localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(obj));
  } catch {
  }
}
let toastTimer = null;
function showCopyToast(message) {
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
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
  const btnCopyEdits = document.getElementById('btn-copy-edits');
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
  const editsStore = loadEditsMap();
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
  const cardMap = new Map();
  const snapCache = new Map(); // key: `${id}|${layer}|${dark}` -> { url0, url100 }
  const hasTextOverride = (entry, rec) => {
    if (!rec || typeof rec !== 'object') return false;
    const hasLabel = typeof rec.label === 'string' && rec.label.trim() !== '' && rec.label !== entry.origLabel;
    const hasOneLine = typeof rec.oneLine === 'string' && rec.oneLine.trim() !== '' && rec.oneLine !== entry.origOneLine;
    const hasFeel = typeof rec.feel === 'string' && rec.feel.trim() !== '' && rec.feel !== entry.origFeel;
    return hasLabel || hasOneLine || hasFeel;
  };
  const hasCardEdit = (entry) => {
    const rec = editsStore[entry.habit.id];
    if (!rec || typeof rec !== 'object') return false;
    const hasNote = typeof rec.note === 'string' && rec.note.trim().length > 0;
    return hasNote || hasTextOverride(entry, rec);
  };
  const cleanupEditRecord = (entry) => {
    const id = entry.habit.id;
    const rec = editsStore[id];
    if (!rec || typeof rec !== 'object') return;
    const next = {};
    if (typeof rec.note === 'string' && rec.note.trim().length > 0) {
      next.note = rec.note;
    }
    if (typeof rec.label === 'string' && rec.label.trim() !== '' && rec.label !== entry.origLabel) {
      next.label = rec.label;
    }
    if (typeof rec.oneLine === 'string' && rec.oneLine.trim() !== '' && rec.oneLine !== entry.origOneLine) {
      next.oneLine = rec.oneLine;
    }
    if (typeof rec.feel === 'string' && rec.feel.trim() !== '' && rec.feel !== entry.origFeel) {
      next.feel = rec.feel;
    }
    if (Object.keys(next).length > 0) {
      editsStore[id] = next;
    } else {
      delete editsStore[id];
    }
  };
  let applyFilterFn = () => {};
  const updateFilterTabLabels = (okCount, editCount) => {
    const labels = {
      all: `すべて（${catCounts.all}件）`,
      'needs-edit': `要修正メモ（${editCount}件）`,
      'ok-checked': `OK済み（${okCount}件）`,
      desk: `デスク・手作業（${catCounts.desk}件）`,
      work: `立ち仕事・重作業（${catCounts.work}件）`,
      daily: `家事・姿勢・カバン（${catCounts.daily}件）`,
      sport: `スポーツ・運動（${catCounts.sport}件）`,
    };
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      const f = btn.dataset.filter;
      if (labels[f]) btn.textContent = labels[f];
    });
  };
  const syncCardVisualState = (entry) => {
    const id = entry.habit.id;
    const picked = selectedSet.has(id);
    const rec = editsStore[id] || {};
    const edited = hasCardEdit(entry);
    const textChanged = hasTextOverride(entry, rec);
    entry.cardEl.classList.toggle('is-picked', picked);
    entry.cardEl.classList.toggle('has-edit', edited);
    entry.pickBtn.classList.toggle('is-picked', picked);
    entry.pickBtn.textContent = picked ? '✓ OK確認済み' : 'OK（確認済み）';
    entry.editBadgeEl.hidden = !edited;
    entry.okBadgeEl.hidden = !picked;
    entry.resetTextBtn.hidden = !textChanged;
    const dispLabel =
      typeof rec.label === 'string' && rec.label.trim() !== '' ? rec.label : entry.origLabel;
    const dispOneLine =
      typeof rec.oneLine === 'string' && rec.oneLine.trim() !== '' ? rec.oneLine : entry.origOneLine;
    const dispFeel =
      typeof rec.feel === 'string' && rec.feel.trim() !== '' ? rec.feel : entry.origFeel;
    entry.titleEl.textContent = dispLabel;
    entry.oneLineEl.textContent = dispOneLine;
    entry.feelEl.textContent = dispFeel;
  };
  const updateGlobalSummaryUI = () => {
    let editCount = 0;
    for (const entry of cardMap.values()) {
      syncCardVisualState(entry);
      if (hasCardEdit(entry)) editCount++;
    }
    const okCount = selectedSet.size;
    selectedCountLabel.textContent = `OK確認済み：${okCount} 件 ／ 要修正メモ・文章編集：${editCount} 件`;
    if (btnCopyEdits) {
      btnCopyEdits.disabled = editCount === 0;
      btnCopyEdits.textContent =
        editCount > 0
          ? `修正指示・編集内容をまとめてコピー（${editCount}件）`
          : '修正指示・編集内容をまとめてコピー';
    }
    btnCopySelected.disabled = okCount === 0;
    btnClearSelected.hidden = okCount === 0;
    updateFilterTabLabels(okCount, editCount);
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
    const origLabel = hb.label || '';
    const origOneLine =
      hb.oneLine ||
      tl.causalSummary ||
      `${origLabel}の姿勢が続くと、${shortList || '縮む側'}が固まって${longList || '反対側'}が引っぱられます。`;
    const origFeel = hb.feel || hb.symptom || '—';
    const card = document.createElement('article');
    card.className = 'check-card';
    card.dataset.habitId = hb.id;
    card.dataset.category = classifyHabitTab(hb);
    card.innerHTML = `
      <div class="card-top-row">
        <div class="card-title-group">
          <div class="card-title-line">
            <span class="code-badge is-new">${numStr}</span>
            <span class="edit-status-badge" hidden>要修正メモあり</span>
            <span class="ok-status-badge" hidden>✓ OK確認済み</span>
            <h2 class="card-title"></h2>
          </div>
          <p class="habit-line">分類：${hb.group || hb.occupation || ''} ｜ 関連ライン：${lineBadges || '全身連動'}</p>
        </div>
        <button type="button" class="pick-btn">OK（確認済み）</button>
      </div>
      <div class="card-body-split">
        <div class="anim-col">
          <div class="snap-pair-grid">
            <div class="snap-box">
              <div class="snap-head snap-head-0">最初（0%：開始姿勢）</div>
              <div class="snap-stage" data-stage="0">
                <span class="snap-placeholder">スクロールで自動描画…</span>
                <img class="snap-img" alt="" hidden />
              </div>
            </div>
            <div class="snap-box snap-box-100">
              <div class="snap-head snap-head-100">最後（100%：最大負荷）</div>
              <div class="snap-stage" data-stage="100">
                <span class="snap-placeholder">スクロールで自動描画…</span>
                <img class="snap-img" alt="" hidden />
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
            <p class="info-text js-oneline-text"></p>
          </div>
          <div class="info-block">
            <span class="info-label">縮む原因（赤） ／ 引っぱられて張る場所（青）</span>
            <p class="info-text"><strong>縮む側：</strong>${shortList || '—'}<br/><strong>張る側：</strong>${longList || hb.symptom || '—'}</p>
          </div>
          <div class="info-block">
            <span class="info-label">よくある違和感・お悩み</span>
            <p class="info-text js-feel-text"></p>
          </div>
          <div class="revision-box">
            <div class="revision-head">
              <label class="revision-label" for="memo-${hb.id}">直すところの指示メモ</label>
              <span class="revision-autosave-hint">入力すると自動保存されます</span>
            </div>
            <textarea
              id="memo-${hb.id}"
              class="memo-textarea"
              rows="2"
              placeholder="直すところの指示を入力（例：前かがみを減らす、もっと腕を下げる、説明をこう変える 等）"
            ></textarea>
            <div class="revision-btn-row">
              <button type="button" class="rev-btn js-toggle-inline-edit" aria-expanded="false">文章を直接編集</button>
              <button type="button" class="rev-btn rev-btn-reset js-reset-inline-edit" hidden>元の文に戻す</button>
            </div>
            <div class="inline-editor-panel" hidden>
              <div class="inline-field">
                <label class="inline-field-label" for="edit-label-${hb.id}">タイトル</label>
                <input id="edit-label-${hb.id}" type="text" class="inline-edit-input js-edit-label" />
              </div>
              <div class="inline-field">
                <label class="inline-field-label" for="edit-oneline-${hb.id}">動きと負担のしくみ</label>
                <textarea id="edit-oneline-${hb.id}" rows="3" class="inline-edit-textarea js-edit-oneline"></textarea>
              </div>
              <div class="inline-field">
                <label class="inline-field-label" for="edit-feel-${hb.id}">よくある違和感・お悩み</label>
                <input id="edit-feel-${hb.id}" type="text" class="inline-edit-input js-edit-feel" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const titleEl = card.querySelector('.card-title');
    const editBadgeEl = card.querySelector('.edit-status-badge');
    const okBadgeEl = card.querySelector('.ok-status-badge');
    const oneLineEl = card.querySelector('.js-oneline-text');
    const feelEl = card.querySelector('.js-feel-text');
    const pickBtn = card.querySelector('.pick-btn');
    const liveBtn = card.querySelector('.live-open-btn');
    const liveSlot = card.querySelector('.live-slot');
    const stage0 = card.querySelector('[data-stage="0"]');
    const stage100 = card.querySelector('[data-stage="100"]');
    const img0 = card.querySelector('[data-stage="0"] .snap-img');
    const ph0 = card.querySelector('[data-stage="0"] .snap-placeholder');
    const img100 = card.querySelector('[data-stage="100"] .snap-img');
    const ph100 = card.querySelector('[data-stage="100"] .snap-placeholder');
    const memoTextarea = card.querySelector('.memo-textarea');
    const toggleInlineBtn = card.querySelector('.js-toggle-inline-edit');
    const resetTextBtn = card.querySelector('.js-reset-inline-edit');
    const inlinePanel = card.querySelector('.inline-editor-panel');
    const inputLabel = card.querySelector('.js-edit-label');
    const inputOneLine = card.querySelector('.js-edit-oneline');
    const inputFeel = card.querySelector('.js-edit-feel');
    img0.alt = `${numStr} ${origLabel} 最初(0%)`;
    img100.alt = `${numStr} ${origLabel} 最後(100%)`;
    if (stage0) stage0.style.cursor = 'pointer';
    if (stage100) stage100.style.cursor = 'pointer';
    const saved = editsStore[hb.id] || {};
    memoTextarea.value = typeof saved.note === 'string' ? saved.note : '';
    inputLabel.value = typeof saved.label === 'string' && saved.label.trim() !== '' ? saved.label : origLabel;
    inputOneLine.value = typeof saved.oneLine === 'string' && saved.oneLine.trim() !== '' ? saved.oneLine : origOneLine;
    inputFeel.value = typeof saved.feel === 'string' && saved.feel.trim() !== '' ? saved.feel : origFeel;
    const entry = {
      idx,
      numStr,
      habit: hb,
      origLabel,
      origOneLine,
      origFeel,
      cardEl: card,
      titleEl,
      editBadgeEl,
      okBadgeEl,
      oneLineEl,
      feelEl,
      pickBtn,
      liveBtn,
      liveSlot,
      stage0,
      stage100,
      img0,
      ph0,
      img100,
      ph100,
      memoTextarea,
      toggleInlineBtn,
      resetTextBtn,
      inlinePanel,
      inputLabel,
      inputOneLine,
      inputFeel,
    };
    pickBtn.addEventListener('click', () => {
      if (selectedSet.has(hb.id)) selectedSet.delete(hb.id);
      else selectedSet.add(hb.id);
      saveSelectedSet(selectedSet);
      updateGlobalSummaryUI();
      if (currentFilter === 'ok-checked') applyFilterFn();
    });
    memoTextarea.addEventListener('input', () => {
      const rec = editsStore[hb.id] || {};
      rec.note = memoTextarea.value;
      editsStore[hb.id] = rec;
      cleanupEditRecord(entry);
      saveEditsMap(editsStore);
      updateGlobalSummaryUI();
    });
    toggleInlineBtn.addEventListener('click', () => {
      const willOpen = inlinePanel.hidden;
      inlinePanel.hidden = !willOpen;
      toggleInlineBtn.classList.toggle('is-open', willOpen);
      toggleInlineBtn.setAttribute('aria-expanded', String(willOpen));
      toggleInlineBtn.textContent = willOpen ? '文章の編集欄を閉じる' : '文章を直接編集';
    });
    const handleInlineFieldInput = () => {
      const rec = editsStore[hb.id] || {};
      rec.label = inputLabel.value;
      rec.oneLine = inputOneLine.value;
      rec.feel = inputFeel.value;
      editsStore[hb.id] = rec;
      cleanupEditRecord(entry);
      saveEditsMap(editsStore);
      updateGlobalSummaryUI();
    };
    inputLabel.addEventListener('input', handleInlineFieldInput);
    inputOneLine.addEventListener('input', handleInlineFieldInput);
    inputFeel.addEventListener('input', handleInlineFieldInput);
    resetTextBtn.addEventListener('click', () => {
      inputLabel.value = origLabel;
      inputOneLine.value = origOneLine;
      inputFeel.value = origFeel;
      const rec = editsStore[hb.id];
      if (rec) {
        delete rec.label;
        delete rec.oneLine;
        delete rec.feel;
      }
      cleanupEditRecord(entry);
      saveEditsMap(editsStore);
      updateGlobalSummaryUI();
      if (currentFilter === 'needs-edit') applyFilterFn();
      showCopyToast(`${numStr} の文章を元の文に戻しました`);
    });
    container.appendChild(card);
    cardMap.set(hb.id, entry);
  });
  updateGlobalSummaryUI();
  if (btnCopyEdits) {
    btnCopyEdits.addEventListener('click', async () => {
      const blocks = [];
      for (const [id, entry] of cardMap) {
        if (!hasCardEdit(entry)) continue;
        const rec = editsStore[id] || {};
        const lines = [];
        const curTitle =
          typeof rec.label === 'string' && rec.label.trim() !== '' ? rec.label.trim() : entry.origLabel;
        lines.push(`■ ${entry.numStr} ${curTitle} (${id})`);
        if (typeof rec.note === 'string' && rec.note.trim().length > 0) {
          lines.push(`・直すところの指示：${rec.note.trim()}`);
        }
        if (typeof rec.label === 'string' && rec.label.trim() !== '' && rec.label !== entry.origLabel) {
          lines.push(`・タイトル（変更後）：${rec.label.trim()}`);
        }
        if (typeof rec.oneLine === 'string' && rec.oneLine.trim() !== '' && rec.oneLine !== entry.origOneLine) {
          lines.push(`・動きと負担のしくみ（変更後）：${rec.oneLine.trim()}`);
        }
        if (typeof rec.feel === 'string' && rec.feel.trim() !== '' && rec.feel !== entry.origFeel) {
          lines.push(`・よくある違和感（変更後）：${rec.feel.trim()}`);
        }
        blocks.push(lines.join('\n'));
      }
      if (!blocks.length) {
        showCopyToast('まだ修正指示メモや文章編集が入力されていません');
        return;
      }
      const outText = `【全45アニメーション 修正指示・文章編集まとめ（${blocks.length}件）】\n\n${blocks.join('\n\n')}`;
      try {
        await navigator.clipboard.writeText(outText);
        showCopyToast(`✓ ${blocks.length}件の修正指示・編集内容をコピーしました！そのまま貼り付けられます`);
      } catch {
        window.prompt('以下をコピーしてください：', outText);
      }
    });
  }
  btnCopySelected.addEventListener('click', async () => {
    const linesOut = [];
    for (const [id, entry] of cardMap) {
      if (selectedSet.has(id)) {
        const rec = editsStore[id] || {};
        const curTitle =
          typeof rec.label === 'string' && rec.label.trim() !== '' ? rec.label.trim() : entry.origLabel;
        linesOut.push(`${entry.numStr} ${curTitle} (${id})`);
      }
    }
    if (!linesOut.length) return;
    const text = `【OK確認済みアニメーション一覧（${linesOut.length}件）】\n${linesOut.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      showCopyToast(`✓ OK確認済み ${linesOut.length}件をコピーしました`);
    } catch {
      window.prompt('以下をコピーしてください：', text);
    }
  });
  btnClearSelected.addEventListener('click', () => {
    selectedSet.clear();
    saveSelectedSet(selectedSet);
    updateGlobalSummaryUI();
    if (currentFilter === 'ok-checked') applyFilterFn();
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
  let liveCycleRad = 0.55;
  let didInitialAutoOpen = false;
  viewer.setKeepAwakePredicate?.(() => Boolean(activeLiveId));
  viewer.onFrame((time, delta) => {
    if (!activeLiveId) return;
    const entry = cardMap.get(activeLiveId);
    if (!entry) return;
    if (liveScrub01 !== null) {
      posture.setHabitPhasePose(entry.habit.id, entry.habit.pose || null, liveScrub01);
    } else if (livePlaying) {
      const dt = Math.min(Math.max(delta || 0.016, 0.001), 0.06);
      liveCycleRad += dt * 1.85;
      const wave01 = 0.5 - 0.5 * Math.cos(liveCycleRad);
      posture.setHabitPhasePose(entry.habit.id, entry.habit.pose || null, wave01);
      const cyc = Math.round(wave01 * 100);
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
    viewer.view(vDir, { immediate: immediateCam, resetFraming: true });
  };
  const bakeQueue = [];
  const queuedSet = new Set();
  let bakingActive = false;
  const enqueueBake = (habitId) => {
    const entry = cardMap.get(habitId);
    if (!entry || entry.cardEl.hidden) return;
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
        } else if (!didInitialAutoOpen && bakeQueue.length === 0 && activeLiveId === null) {
          didInitialAutoOpen = true;
          const firstVisible = HABITS.find((h) => {
            const e = cardMap.get(h.id);
            return e && !e.cardEl.hidden;
          });
          if (firstVisible) {
            openLiveDock(firstVisible.id);
          }
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
          if (activeLiveId === id) {
            closeLiveDock();
          }
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
    liveCycleRad = 0.55;
    btnLivePlay.textContent = '一時停止';
    entry.liveSlot.appendChild(liveDock);
    liveDock.hidden = false;
    liveStageWrap.appendChild(viewer.renderer.domElement);
    const rect = liveStageWrap.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width) || 440);
    const h = Math.max(260, Math.round(rect.height) || 340);
    viewer.renderer.setSize(w, h, false);
    viewer.renderer.domElement.style.width = '100%';
    viewer.renderer.domElement.style.height = '100%';
    viewer.camera.aspect = w / h;
    viewer.camera.updateProjectionMatrix();
    entry.liveBtn.classList.add('is-active');
    entry.liveBtn.textContent = '× 3Dライブ再生を閉じる';
    applyHabitToScene(entry.habit, true);
    posture.setPaused?.(false);
    posture.setPose(entry.habit.pose || null, 1.0, {
      habitId: entry.habit.id,
      immediate: true,
      cyclic: true,
    });
    viewer.wake?.();
  };
  for (const [id, entry] of cardMap) {
    entry.liveBtn.addEventListener('click', () => openLiveDock(id));
    entry.stage0?.addEventListener('click', () => {
      if (activeLiveId !== id) openLiveDock(id);
    });
    entry.stage100?.addEventListener('click', () => {
      if (activeLiveId !== id) openLiveDock(id);
    });
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
    if (liveScrub01 !== null || !livePlaying) {
      if (liveScrub01 !== null) {
        const clamped = Math.min(1, Math.max(0, liveScrub01));
        liveCycleRad = Math.acos(1 - 2 * clamped);
      }
      liveScrub01 = null;
      livePlaying = true;
      btnLivePlay.textContent = '一時停止';
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
      viewer.view(viewForHabit(entry.habit), { immediate: false, resetFraming: true });
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
  const matchesFilter = (entry, filterKey) => {
    if (filterKey === 'all') return true;
    if (filterKey === 'needs-edit') return hasCardEdit(entry);
    if (filterKey === 'ok-checked') return selectedSet.has(entry.habit.id);
    return entry.cardEl.dataset.category === filterKey;
  };
  applyFilterFn = () => {
    if (activeLiveId) {
      const liveEntry = cardMap.get(activeLiveId);
      if (liveEntry && !matchesFilter(liveEntry, currentFilter)) {
        closeLiveDock();
      }
    }
    for (const entry of cardMap.values()) {
      const show = matchesFilter(entry, currentFilter);
      entry.cardEl.hidden = !show;
    }
  };
  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentFilter = tab.dataset.filter || 'all';
      document.querySelectorAll('.filter-tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      applyFilterFn();
    });
  });
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    window.__checkListBridge = {
      viewer,
      fascia,
      unifiedSheets,
      cardMap,
      HABITS,
      captureSinglePhase,
      applyHabitToScene,
      closeLiveDock,
      openLiveDock,
    };
  }
}
initCheckListPage().catch((err) => {
  console.error('[fascia_check_list] 初期化エラー:', err);
});