// =============================================================================
// fascia_check_list.js — 3Dアニメーション＆文章 一覧チェック表 コントローラ
//
// 設計:
// 1. WebGLコンテキスト上限を回避するため、単一の共有WebGLRendererで全22アイテムの
//    「最初（0%）」と「最後（100%）」の高精細スナップショットを自動生成して横並び表示する。
// 2. 各カードの「この動きを3Dアニメーションで再生確認」を押すと、共有ライブ3Dドックが
//    そのカード内に展開し、0%・100%ワンタップ切替・連続再生・360度回転がその場で確認できる。
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  CHECKLIST_ITEMS,
  ALL_MOTION_PRESETS,
} from './fascia_only_clinical_data.js?v=20261117b';

import {
  SKELETON_SCALE,
  SKELETON_OFFSET,
  GROUND_Y,
  GLSL_BONE_UNIFORMS,
  getSkeletonMeshSkin,
  createBoneMatrixArray,
  computeMotionParams,
  solveRigMatrices,
} from './fascia_only_biomechanics.js?v=20261117b';

import {
  buildBodyEnvelope,
  createFasciaSheetsSystem,
} from './fascia_only_sheets.js?v=20261117b';

const MODEL_BASE = 'models/';
const ASSET_QUERY = '?v=20261117b';
const FALLBACK_BYTES = {
  'muscles.glb': 1543520,
  'skeleton.glb': 1497840,
};

const STORAGE_KEY = 'fascia_selected_candidates_v1';
const SNAP_W = 500;
const SNAP_H = 550;

// 関わるエリア全体が見渡せる引き画角プリセット
const CAMERA_VIEWS = {
  front: {
    dir: new THREE.Vector3(0.0, 0.03, 1.0).normalize(),
    target: new THREE.Vector3(0, -0.08, 0),
    halfH: 3.28,
    halfW: 1.18,
  },
  'right-tfl': {
    dir: new THREE.Vector3(-0.82, 0.05, 0.57).normalize(),
    target: new THREE.Vector3(-0.04, -0.08, 0),
    halfH: 3.26,
    halfW: 1.24,
  },
  'neck-shoulder': {
    dir: new THREE.Vector3(-0.28, 0.06, 0.96).normalize(),
    target: new THREE.Vector3(0.0, +1.40, 0.02),
    halfH: 1.90,
    halfW: 1.34,
  },
  'arm-hand': {
    dir: new THREE.Vector3(-0.50, 0.10, 0.86).normalize(),
    target: new THREE.Vector3(-0.22, +1.12, 0.04),
    halfH: 1.82,
    halfW: 1.38,
  },
  'pelvis-zoom': {
    dir: new THREE.Vector3(-0.58, 0.06, 0.81).normalize(),
    target: new THREE.Vector3(-0.05, +0.02, 0.0),
    halfH: 2.15,
    halfW: 1.36,
  },
  'leg-foot-zoom': {
    dir: new THREE.Vector3(-0.68, 0.05, 0.73).normalize(),
    target: new THREE.Vector3(-0.08, -1.25, 0.04),
    halfH: 2.28,
    halfW: 1.36,
  },
  'leg-back-zoom': {
    dir: new THREE.Vector3(-0.38, 0.04, -0.92).normalize(),
    target: new THREE.Vector3(-0.08, -1.42, -0.04),
    halfH: 2.08,
    halfW: 1.30,
  },
  'upper-torso-zoom': {
    dir: new THREE.Vector3(-0.20, 0.05, 0.98).normalize(),
    target: new THREE.Vector3(0.0, +0.98, 0.0),
    halfH: 2.25,
    halfW: 1.42,
  },
  'banzai-wide': {
    dir: new THREE.Vector3(-0.22, 0.04, 0.97).normalize(),
    target: new THREE.Vector3(0.0, +1.34, 0.0),
    halfH: 2.68,
    halfW: 1.66,
  },
  'sock-reach-wide': {
    dir: new THREE.Vector3(-0.64, 0.05, 0.77).normalize(),
    target: new THREE.Vector3(-0.04, -0.46, +0.08),
    halfH: 2.92,
    halfW: 1.56,
  },
  'seated-upper': {
    dir: new THREE.Vector3(-0.34, 0.08, 0.93).normalize(),
    target: new THREE.Vector3(0.0, +0.42, -0.18),
    halfH: 1.78,
    halfW: 1.34,
  },
  'seated-side': {
    dir: new THREE.Vector3(-0.78, 0.06, 0.62).normalize(),
    target: new THREE.Vector3(0.0, -0.45, -0.06),
    halfH: 2.42,
    halfW: 1.48,
  },
  'seated-lower': {
    dir: new THREE.Vector3(-0.32, 0.12, 0.94).normalize(),
    target: new THREE.Vector3(0.0, -0.86, -0.04),
    halfH: 2.38,
    halfW: 1.44,
  },
  'recline-side': {
    dir: new THREE.Vector3(-0.94, 0.09, 0.33).normalize(),
    target: new THREE.Vector3(0.0, -0.62, +0.18),
    halfH: 2.35,
    halfW: 2.76,
  },
};

function isGlb(buffer) {
  return buffer && buffer.byteLength >= 12 && new DataView(buffer).getUint32(0, true) === 0x46546c67;
}

async function fetchGlbWithProgress(url, fallbackTotal, onBytes) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, attempt > 0 ? { cache: 'default' } : {});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentLength = Number(res.headers.get('content-length')) || 0;
      const total = contentLength || fallbackTotal || 1500000;

      if (!res.body || !res.body.getReader) {
        const buf = await res.arrayBuffer();
        onBytes(buf.byteLength, buf.byteLength);
        if (!isGlb(buf)) throw new Error('GLBヘッダー不正');
        return buf;
      }

      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onBytes(received, Math.max(total, received));
      }
      const out = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
      }
      if (!isGlb(out.buffer)) throw new Error('GLBヘッダー不正');
      return out.buffer;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
  }
  throw lastErr || new Error('モデルの読み込みに失敗しました');
}

function conformMandibleRest(obj) {
  const pos = obj.geometry?.attributes?.position;
  if (!pos || pos.count === 0) return;
  obj.updateMatrixWorld(true);
  const invMat = obj.matrixWorld.clone().invert();
  const tmpV = new THREE.Vector3();
  const nextArr = new Float32Array(pos.count * 3);
  const pivY = 2.695;
  const pivZ = 0.025;
  const c = Math.cos(0.088);
  const s = Math.sin(0.088);
  for (let i = 0; i < pos.count; i++) {
    tmpV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
    const wy = tmpV.y;
    const wz = tmpV.z;
    const ny = pivY + (wy - pivY) * c + (wz - pivZ) * s;
    const nz = pivZ + (wz - pivZ) * c - (wy - pivY) * s;
    tmpV.set(tmpV.x, ny, nz).applyMatrix4(invMat);
    nextArr[i * 3] = tmpV.x;
    nextArr[i * 3 + 1] = tmpV.y;
    nextArr[i * 3 + 2] = tmpV.z;
  }
  obj.geometry = obj.geometry.clone();
  obj.geometry.setAttribute('position', new THREE.BufferAttribute(nextArr, 3));
  obj.geometry.deleteAttribute('normal');
  obj.geometry.computeVertexNormals();
}

function disposeGroupResources(rootObj) {
  if (!rootObj) return;
  rootObj.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m?.map) m.map.dispose();
        m?.dispose?.();
      }
    }
  });
}

function loadPickedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch (_) {
    return new Set();
  }
}

function savePickedSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch (_) {
    // ストレージ制限時はメモリ保持のみ
  }
}

async function bootstrapCheckList() {
  const containerEl = document.getElementById('checklist-container');
  const bakeBannerEl = document.getElementById('bake-banner');
  const bakeStatusEl = document.getElementById('bake-status-text');
  const bakePctEl = document.getElementById('bake-pct');
  const bakeFillEl = document.getElementById('bake-fill');

  const themeBtn = document.getElementById('btnTheme');
  const metaThemeColor = document.getElementById('meta-theme-color');
  const filterTabBtns = document.querySelectorAll('.filter-tab[data-filter]');
  const selectedCountLabelEl = document.getElementById('selected-count-label');
  const copySelectedBtn = document.getElementById('btn-copy-selected');
  const clearSelectedBtn = document.getElementById('btn-clear-selected');

  const sharedLiveDockEl = document.getElementById('shared-live-dock');
  const liveStageWrapEl = document.getElementById('live-stage-wrap');
  const btnLiveZero = document.getElementById('btn-live-zero');
  const btnLiveHundred = document.getElementById('btn-live-hundred');
  const btnLivePlay = document.getElementById('btn-live-play');
  const btnLiveResetCam = document.getElementById('btn-live-reset-cam');
  const liveScrubSlider = document.getElementById('live-scrub-slider');
  const liveScrubReadout = document.getElementById('live-scrub-readout');

  const pickedSet = loadPickedSet();
  const cardRefs = new Map();

  const uiState = {
    filter: 'new', // 'new' | 'existing' | 'all'
    darkTheme: false,
    engineReady: false,
    bakeToken: 0,
    activeLiveUid: null,
    livePlaying: true,
    liveManualScrub: null,
    livePhase01: 0.25,
    lastTickMs: performance.now(),
  };

  const setBakeProgress = (pct, msg) => {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (bakeFillEl) bakeFillEl.style.width = `${p}%`;
    if (bakePctEl) bakePctEl.textContent = `${p}%`;
    if (bakeStatusEl && msg) bakeStatusEl.textContent = msg;
  };

  // ---------------------------------------------------------------------------
  // 1. 採用チェックUI更新
  // ---------------------------------------------------------------------------
  const syncPickedUI = () => {
    const count = pickedSet.size;
    if (selectedCountLabelEl) {
      selectedCountLabelEl.textContent = `採用チェック中：${count} 件`;
    }
    if (copySelectedBtn) {
      copySelectedBtn.disabled = count === 0;
    }
    if (clearSelectedBtn) {
      clearSelectedBtn.hidden = count === 0;
    }

    for (const [uid, ref] of cardRefs.entries()) {
      const on = pickedSet.has(uid);
      ref.cardEl.classList.toggle('is-picked', on);
      ref.pickBtn.classList.toggle('is-picked', on);
      ref.pickBtn.setAttribute('aria-pressed', String(on));
      ref.pickBtn.textContent = on ? '採用チェック済み' : '採用候補にチェック';
    }
  };

  copySelectedBtn?.addEventListener('click', async () => {
    const pickedItems = CHECKLIST_ITEMS.filter((it) => pickedSet.has(it.uid));
    if (pickedItems.length === 0) return;
    const lines = pickedItems.map((it) => `・[${it.code}] ${it.title}（preset: ${it.presetId}）`);
    const text = `採用チェックした3Dアニメーション（${pickedItems.length}件）\n` + lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      const orig = copySelectedBtn.textContent;
      copySelectedBtn.textContent = 'コピーしました';
      setTimeout(() => {
        copySelectedBtn.textContent = orig;
      }, 1600);
    } catch (_) {
      window.prompt('以下のリストをコピーしてください：', text);
    }
  });

  clearSelectedBtn?.addEventListener('click', () => {
    pickedSet.clear();
    savePickedSet(pickedSet);
    syncPickedUI();
  });

  // ---------------------------------------------------------------------------
  // 2. 全22カードのDOM即時構築（見出し重複ゼロ・端的な文章のみ）
  // ---------------------------------------------------------------------------
  let openLiveForCard = () => {};
  let closeLiveDock = () => {};

  const buildCardsDOM = () => {
    containerEl.innerHTML = '';
    for (const item of CHECKLIST_ITEMS) {
      const article = document.createElement('article');
      article.className = 'check-card';
      article.dataset.uid = item.uid;
      article.dataset.kind = item.kind;

      // 上部行：番号バッジ＋タイトル＋採用チェックボタン
      const topRow = document.createElement('div');
      topRow.className = 'card-top-row';

      const titleGroup = document.createElement('div');
      titleGroup.className = 'card-title-group';

      const titleLine = document.createElement('div');
      titleLine.className = 'card-title-line';

      const codeBadge = document.createElement('span');
      codeBadge.className = `code-badge ${item.kind === 'new' ? 'is-new' : 'is-existing'}`;
      codeBadge.textContent = item.code;

      const h2 = document.createElement('h2');
      h2.className = 'card-title';
      h2.textContent = item.title;

      titleLine.append(codeBadge, h2);

      const habitP = document.createElement('p');
      habitP.className = 'habit-line';
      habitP.textContent = `何気ない日常のクセ：${item.habit}`;

      titleGroup.append(titleLine, habitP);

      const pickBtn = document.createElement('button');
      pickBtn.type = 'button';
      pickBtn.className = 'pick-btn';
      pickBtn.setAttribute('aria-pressed', 'false');
      pickBtn.textContent = '採用候補にチェック';
      pickBtn.addEventListener('click', () => {
        if (pickedSet.has(item.uid)) pickedSet.delete(item.uid);
        else pickedSet.add(item.uid);
        savePickedSet(pickedSet);
        syncPickedUI();
      });

      topRow.append(titleGroup, pickBtn);

      // 本体2カラム：左＝0%/100%スナップショット＋ライブ再生 ／ 右＝対応する文章一覧
      const bodySplit = document.createElement('div');
      bodySplit.className = 'card-body-split';

      // [左カラム] アニメーション確認枠
      const animCol = document.createElement('div');
      animCol.className = 'anim-col';

      const snapPair = document.createElement('div');
      snapPair.className = 'snap-pair-grid';

      // 左枠: 0%
      const box0 = document.createElement('div');
      box0.className = 'snap-box snap-box-0';
      const head0 = document.createElement('div');
      head0.className = 'snap-head snap-head-0';
      head0.textContent = '最初（0%：負担の少ない姿勢）';
      const stage0 = document.createElement('div');
      stage0.className = 'snap-stage';
      const ph0 = document.createElement('span');
      ph0.className = 'snap-placeholder';
      ph0.textContent = '3D画像を生成中…';
      stage0.appendChild(ph0);
      const cap0 = document.createElement('p');
      cap0.className = 'snap-caption';
      cap0.textContent = item.pose0Label;
      box0.append(head0, stage0, cap0);

      // 右枠: 100%
      const box100 = document.createElement('div');
      box100.className = 'snap-box snap-box-100';
      const head100 = document.createElement('div');
      head100.className = 'snap-head snap-head-100';
      head100.textContent = '最後（100%：負担がかかるクセ）';
      const stage100 = document.createElement('div');
      stage100.className = 'snap-stage';
      const ph100 = document.createElement('span');
      ph100.className = 'snap-placeholder';
      ph100.textContent = '3D画像を生成中…';
      stage100.appendChild(ph100);
      const cap100 = document.createElement('p');
      cap100.className = 'snap-caption';
      cap100.textContent = item.pose100Label;
      box100.append(head100, stage100, cap100);

      snapPair.append(box0, box100);

      const actionRow = document.createElement('div');
      actionRow.className = 'anim-action-row';

      const liveBtn = document.createElement('button');
      liveBtn.type = 'button';
      liveBtn.className = 'live-open-btn';
      liveBtn.textContent = 'この動きを3Dアニメーションで再生確認';
      liveBtn.addEventListener('click', () => {
        if (uiState.activeLiveUid === item.uid) {
          closeLiveDock();
        } else {
          openLiveForCard(item.uid, 'play');
        }
      });

      const openMainLink = document.createElement('a');
      openMainLink.className = 'open-main-link';
      openMainLink.href = `fascia-only.html${item.deepLinkQuery}`;
      openMainLink.textContent = '本番画面で開く';

      actionRow.append(liveBtn, openMainLink);

      const liveSlot = document.createElement('div');
      liveSlot.className = 'card-live-slot';

      animCol.append(snapPair, actionRow, liveSlot);

      // [右カラム] 対応する文章一覧
      const textCol = document.createElement('div');
      textCol.className = 'text-col';

      // 出る症状
      const symBlock = document.createElement('div');
      symBlock.className = 'info-block';
      const symLabel = document.createElement('span');
      symLabel.className = 'info-label';
      symLabel.textContent = '出る症状';
      const symVal = document.createElement('p');
      symVal.className = 'info-text info-text-bold';
      symVal.textContent = item.symptom;
      symBlock.append(symLabel, symVal);

      // なぜストレスになるのか
      const whyBlock = document.createElement('div');
      whyBlock.className = 'info-block';
      const whyLabel = document.createElement('span');
      whyLabel.className = 'info-label';
      whyLabel.textContent = 'なぜこれがストレスになるのか';
      const whyVal = document.createElement('p');
      whyVal.className = 'info-text';
      whyVal.textContent = item.pitfall;
      whyBlock.append(whyLabel, whyVal);

      // 1.原因 / 2.ピン留め部 / 3.症状
      const triChain = document.createElement('div');
      triChain.className = 'tri-chain';

      const makeTriRow = (cls, num, role, val) => {
        const r = document.createElement('div');
        r.className = `tri-row ${cls}`;
        const hd = document.createElement('div');
        hd.className = 'tri-head';
        const nSpan = document.createElement('span');
        nSpan.className = 'tri-num';
        nSpan.textContent = num;
        const rSpan = document.createElement('span');
        rSpan.className = 'tri-role';
        rSpan.textContent = role;
        hd.append(nSpan, rSpan);
        const p = document.createElement('p');
        p.className = 'tri-val';
        p.textContent = val;
        r.append(hd, p);
        return r;
      };

      triChain.append(
        makeTriRow('tri-culprit', '1', '原因（赤：縮む筋膜）', item.chain.culprit),
        makeTriRow('tri-station', '2', 'ピン留め部（筋膜の癒着部）', item.chain.station),
        makeTriRow('tri-victim', '3', '症状（青：張る筋膜）', item.chain.victim),
      );

      // 疲れをためない日常の工夫
      const tipBox = document.createElement('div');
      tipBox.className = 'tip-box';
      const tipLabel = document.createElement('span');
      tipLabel.className = 'tip-label';
      tipLabel.textContent = '疲れをためない日常の工夫';
      const tipVal = document.createElement('p');
      tipVal.className = 'info-text';
      tipVal.textContent = item.dailyTip;
      tipBox.append(tipLabel, tipVal);

      // つながるホームページ（Rooton）コラム
      const hpBox = document.createElement('div');
      hpBox.className = 'hp-box';
      const hpLabel = document.createElement('span');
      hpLabel.className = 'info-label';
      hpLabel.textContent = 'つながるホームページ（Rooton）コラム';
      const hpUl = document.createElement('ul');
      hpUl.className = 'hp-list';

      for (const col of item.hpColumns || []) {
        const li = document.createElement('li');
        li.className = 'hp-item';
        const stBadge = document.createElement('span');
        const isPub = col.status === 'published';
        stBadge.className = `hp-status-badge ${isPub ? 'hp-status-published' : 'hp-status-proposal'}`;
        stBadge.textContent = isPub ? '公開中コラム' : '新規コラム案';

        const colTitle = document.createElement('span');
        colTitle.className = 'hp-col-title';
        colTitle.textContent = col.title;

        li.append(stBadge, colTitle);
        if (col.file) {
          const fileCode = document.createElement('code');
          fileCode.className = 'hp-file-code';
          fileCode.textContent = col.file;
          li.appendChild(fileCode);
        }
        hpUl.appendChild(li);
      }
      hpBox.append(hpLabel, hpUl);

      textCol.append(symBlock, whyBlock, triChain, tipBox, hpBox);
      bodySplit.append(animCol, textCol);
      article.append(topRow, bodySplit);
      containerEl.appendChild(article);

      cardRefs.set(item.uid, {
        item,
        cardEl: article,
        pickBtn,
        stage0,
        stage100,
        liveBtn,
        liveSlot,
      });
    }
  };

  const applyFilter = (filterKey) => {
    uiState.filter = filterKey;
    filterTabBtns.forEach((b) => {
      const on = b.dataset.filter === filterKey;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });

    for (const [uid, ref] of cardRefs.entries()) {
      const show = filterKey === 'all' || ref.item.kind === filterKey;
      ref.cardEl.hidden = !show;
      if (!show && uiState.activeLiveUid === uid) {
        closeLiveDock();
      }
    }
  };

  filterTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  buildCardsDOM();
  syncPickedUI();
  applyFilter('new');

  // ---------------------------------------------------------------------------
  // 3. 単一共有 WebGL シーン構築 ＆ スナップショット自動生成 ＆ ライブ再生制御
  // ---------------------------------------------------------------------------
  try {
    setBakeProgress(4, '骨格と全11本の筋膜シートを読み込んでいます…');

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setSize(SNAP_W, SNAP_H, false);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', '骨格と筋膜シートのライブ3Dプレビュー');

    const scene = new THREE.Scene();
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.28;
      pmrem.dispose();
    } catch (_) {
      // 非対応環境では3点ライトのみで描画
    }

    const camera = new THREE.PerspectiveCamera(30, SNAP_W / SNAP_H, 0.05, 60);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.92;
    controls.minDistance = 0.8;
    controls.maxDistance = 26;
    controls.enabled = false;

    const hemi = new THREE.HemisphereLight(0xfffdf8, 0xb8c2d0, 1.02);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.82);
    keyLight.position.set(-4.2, 6.8, 6.2);
    const fillLight = new THREE.DirectionalLight(0xeef3f9, 0.86);
    fillLight.position.set(4.8, 2.0, 4.2);
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.92);
    rimLight.position.set(0.8, 5.2, -6.8);
    const lightRig = new THREE.Group();
    lightRig.add(keyLight, fillLight, rimLight);
    for (const l of [keyLight, fillLight, rimLight]) {
      lightRig.add(l.target);
      l.target.position.set(0, 0, 0);
    }
    camera.add(lightRig);
    lightRig.position.set(0, 0, -8);
    scene.add(camera);

    // 接地基準リング
    const floorGroup = new THREE.Group();
    floorGroup.position.set(0, GROUND_Y - 0.004, -0.04);
    const ringGeo = new THREE.RingGeometry(0.58, 0.60, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    floorGroup.add(new THREE.Mesh(ringGeo, ringMat));
    scene.add(floorGroup);

    // GLBダウンロード
    const progState = {
      'skeleton.glb': { got: 0, total: FALLBACK_BYTES['skeleton.glb'] },
      'muscles.glb': { got: 0, total: FALLBACK_BYTES['muscles.glb'] },
    };
    const updateDl = () => {
      const got = progState['skeleton.glb'].got + progState['muscles.glb'].got;
      const tot = progState['skeleton.glb'].total + progState['muscles.glb'].total;
      setBakeProgress(5 + (got / Math.max(1, tot)) * 50, '骨格と体表データを読み込んでいます…');
    };

    const [skeletonBuf, muscleBuf] = await Promise.all([
      fetchGlbWithProgress(MODEL_BASE + 'skeleton.glb' + ASSET_QUERY, FALLBACK_BYTES['skeleton.glb'], (g, t) => {
        progState['skeleton.glb'].got = g;
        progState['skeleton.glb'].total = t;
        updateDl();
      }),
      fetchGlbWithProgress(MODEL_BASE + 'muscles.glb' + ASSET_QUERY, FALLBACK_BYTES['muscles.glb'], (g, t) => {
        progState['muscles.glb'].got = g;
        progState['muscles.glb'].total = t;
        updateDl();
      }),
    ]);

    setBakeProgress(58, '骨格と全11本の筋膜シートを展開しています…');
    const gltfLoader = new GLTFLoader();
    if (MeshoptDecoder) gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    const [parsedSkel, parsedMuscle] = await Promise.all([
      gltfLoader.parseAsync(skeletonBuf, MODEL_BASE),
      gltfLoader.parseAsync(muscleBuf, MODEL_BASE),
    ]);

    const skeletonRoot = parsedSkel.scene;
    skeletonRoot.scale.setScalar(SKELETON_SCALE);
    skeletonRoot.position.copy(SKELETON_OFFSET);
    skeletonRoot.updateMatrixWorld(true);

    const muscleOffscreenRoot = parsedMuscle.scene;
    muscleOffscreenRoot.updateMatrixWorld(true);
    const envelope = buildBodyEnvelope(muscleOffscreenRoot, skeletonRoot);
    disposeGroupResources(muscleOffscreenRoot);

    const boneMats = createBoneMatrixArray();
    const sharedUniforms = {
      uBoneMats: { value: boneMats },
      uDarkTheme: { value: 0.0 },
      uTime: { value: 0.0 },
    };

    skeletonRoot.traverse((obj) => {
      if (!obj.isMesh) return;
      const id = obj.userData?.structureId || obj.name || '';
      if (id === 'mandible') conformMandibleRest(obj);

      const skin = getSkeletonMeshSkin(id);
      obj.updateMatrixWorld(true);
      const invModelMat = obj.matrixWorld.clone().invert();
      const oldMats = Array.isArray(obj.material) ? obj.material : [obj.material];
      oldMats.forEach((m) => m?.dispose?.());

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FAF6EE'),
        roughness: 0.50,
        metalness: 0.0,
      });
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uBoneMats = sharedUniforms.uBoneMats;
        shader.uniforms.uDarkTheme = sharedUniforms.uDarkTheme;
        shader.uniforms.uInvModelMat = { value: invModelMat };
        shader.uniforms.uMeshBoneIdx = {
          value: new THREE.Vector4(skin.idx[0], skin.idx[1], skin.idx[2], skin.idx[3]),
        };
        shader.uniforms.uMeshBoneW = {
          value: new THREE.Vector4(skin.w[0], skin.w[1], skin.w[2], skin.w[3]),
        };

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            ${GLSL_BONE_UNIFORMS}
            uniform mat4 uInvModelMat;
            uniform vec4 uMeshBoneIdx;
            uniform vec4 uMeshBoneW;`,
          )
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
            mat4 boneWorldMat = getBlendedBoneMatrix(uMeshBoneIdx, uMeshBoneW);
            {
              vec3 wNorm0 = normalize(mat3(modelMatrix) * objectNormal);
              vec3 wNorm1 = normalize(mat3(boneWorldMat) * wNorm0);
              objectNormal = normalize(mat3(uInvModelMat) * wNorm1);
            }`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            {
              vec4 skWPos0 = modelMatrix * vec4(transformed, 1.0);
              vec4 skWPos1 = boneWorldMat * skWPos0;
              transformed = (uInvModelMat * skWPos1).xyz;
            }`,
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform float uDarkTheme;`,
          )
          .replace(
            '#include <opaque_fragment>',
            `{
              vec3 nB = normalize(normal);
              vec3 vB = normalize(vViewPosition);
              float facingB = clamp(abs(dot(nB, vB)), 0.0, 1.0);
              float rimB = pow(1.0 - facingB, 1.95);

              vec3 lightLit = vec3(0.995, 0.978, 0.942);
              vec3 lightShd = vec3(0.58, 0.50, 0.40);
              vec3 lightInk = vec3(0.14, 0.11, 0.08);

              vec3 darkLit  = vec3(0.92, 0.90, 0.85);
              vec3 darkShd  = vec3(0.42, 0.47, 0.55);
              vec3 darkInk  = vec3(0.12, 0.16, 0.24);

              float lum = clamp(dot(outgoingLight, vec3(0.333)), 0.0, 1.0);
              vec3 cLight = mix(lightShd, lightLit, smoothstep(0.05, 0.92, lum));
              cLight = mix(cLight, lightInk, rimB * 0.86);

              vec3 cDark = mix(darkShd, darkLit, smoothstep(0.05, 0.92, lum));
              cDark = mix(cDark, darkInk, rimB * 0.58);

              outgoingLight = mix(cLight, cDark, uDarkTheme);
            }
            #include <opaque_fragment>`,
          );
      };
      mat.customProgramCacheKey = () => 'fascia-check-bone-crisp-v1';
      obj.material = mat;
      obj.renderOrder = 1;
      obj.frustumCulled = false;
    });

    scene.add(skeletonRoot);
    const fasciaSystem = createFasciaSheetsSystem(envelope, sharedUniforms);
    scene.add(fasciaSystem.group);

    uiState.engineReady = true;

    const positionCameraImmediate = (viewKey, widthPx, heightPx) => {
      const vDef = CAMERA_VIEWS[viewKey] || CAMERA_VIEWS.front;
      const aspect = Math.max(0.25, widthPx / Math.max(1, heightPx));
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const tanHalfV = Math.tan(vFovRad * 0.5);
      const tanHalfH = tanHalfV * aspect;
      const distV = (vDef.halfH * 1.06) / tanHalfV;
      const distH = (vDef.halfW * 1.08) / Math.max(0.22, tanHalfH);
      const dist = Math.max(distV, distH);

      controls.target.copy(vDef.target);
      camera.position.copy(vDef.target).addScaledVector(vDef.dir, dist);
      controls.update();
    };

    // -------------------------------------------------------------------------
    // スナップショット一括生成（新候補10件を最優先で描画し、続けて既存12件を描画）
    // -------------------------------------------------------------------------
    const setStageImage = (stageEl, dataUrl, altText, onClick) => {
      stageEl.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'snap-img';
      img.src = dataUrl;
      img.alt = altText;
      stageEl.appendChild(img);
      stageEl.style.cursor = 'pointer';
      stageEl.onclick = onClick;
    };

    const bakeAllSnapshots = async () => {
      const myToken = ++uiState.bakeToken;
      const prevActiveUid = uiState.activeLiveUid;
      if (prevActiveUid) {
        closeLiveDock();
      }

      if (bakeBannerEl) bakeBannerEl.classList.remove('is-done');
      controls.enabled = false;
      renderer.setPixelRatio(1);
      renderer.setSize(SNAP_W, SNAP_H, false);

      // 現在表示中のタブに該当するアイテムを先に描画して体感待ち時間を最小化
      const ordered = [
        ...CHECKLIST_ITEMS.filter((it) => it.kind === 'new'),
        ...CHECKLIST_ITEMS.filter((it) => it.kind === 'existing'),
      ];

      for (let i = 0; i < ordered.length; i++) {
        if (myToken !== uiState.bakeToken) return;
        const item = ordered[i];
        const ref = cardRefs.get(item.uid);
        if (!ref) continue;

        setBakeProgress(
          62 + ((i + 1) / ordered.length) * 38,
          `最初（0%）と最後（100%）の3D画像を生成中（${i + 1} / ${ordered.length}）`,
        );

        fasciaSystem.setOnlyLines(item.lines);
        positionCameraImmediate(item.cameraView, SNAP_W, SNAP_H);
        floorGroup.visible = item.cameraView !== 'recline-side';

        // 1) 最初（0%）の描画
        const mp0 = computeMotionParams({
          presetId: item.presetId,
          manualScrub: 0.0,
          phase01: 0.0,
          intensity: 1.0,
        });
        solveRigMatrices(mp0, boneMats);
        fasciaSystem.update(boneMats, camera.quaternion, mp0);
        renderer.render(scene, camera);
        const url0 = canvas.toDataURL('image/webp', 0.90);

        // 2) 最後（100%）の描画
        const mp100 = computeMotionParams({
          presetId: item.presetId,
          manualScrub: 1.0,
          phase01: 0.5,
          intensity: 1.0,
        });
        solveRigMatrices(mp100, boneMats);
        fasciaSystem.update(boneMats, camera.quaternion, mp100);
        renderer.render(scene, camera);
        const url100 = canvas.toDataURL('image/webp', 0.90);

        setStageImage(ref.stage0, url0, `${item.title} 最初0%の姿勢`, () => openLiveForCard(item.uid, 'zero'));
        setStageImage(ref.stage100, url100, `${item.title} 最後100%の姿勢`, () => openLiveForCard(item.uid, 'hundred'));

        if (i % 2 === 1) {
          await new Promise((r) => requestAnimationFrame(r));
        }
      }

      if (myToken === uiState.bakeToken && bakeBannerEl) {
        bakeBannerEl.classList.add('is-done');
      }
    };

    // -------------------------------------------------------------------------
    // 共有ライブ3Dドック制御
    // -------------------------------------------------------------------------
    const syncLiveButtonsUI = () => {
      if (btnLivePlay) {
        btnLivePlay.textContent = uiState.livePlaying ? '一時停止' : '連続再生';
      }
      if (btnLiveZero) {
        btnLiveZero.classList.toggle('is-selected', !uiState.livePlaying && uiState.liveManualScrub === 0);
      }
      if (btnLiveHundred) {
        btnLiveHundred.classList.toggle('is-selected', !uiState.livePlaying && uiState.liveManualScrub === 1);
      }
    };

    const resizeLiveCanvas = () => {
      if (!uiState.activeLiveUid || !liveStageWrapEl) return;
      const w = Math.max(1, liveStageWrapEl.clientWidth || 480);
      const h = Math.max(1, liveStageWrapEl.clientHeight || 300);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    closeLiveDock = () => {
      if (!uiState.activeLiveUid) return;
      const prevRef = cardRefs.get(uiState.activeLiveUid);
      if (prevRef) {
        prevRef.liveBtn.classList.remove('is-active');
        prevRef.liveBtn.textContent = 'この動きを3Dアニメーションで再生確認';
      }
      uiState.activeLiveUid = null;
      controls.enabled = false;
      if (sharedLiveDockEl) {
        sharedLiveDockEl.hidden = true;
        document.body.appendChild(sharedLiveDockEl);
      }
    };

    openLiveForCard = (uid, mode = 'play') => {
      if (!uiState.engineReady) return;
      const ref = cardRefs.get(uid);
      if (!ref) return;

      // 既に別カードで開いていればボタン表示をリセット
      if (uiState.activeLiveUid && uiState.activeLiveUid !== uid) {
        const prevRef = cardRefs.get(uiState.activeLiveUid);
        if (prevRef) {
          prevRef.liveBtn.classList.remove('is-active');
          prevRef.liveBtn.textContent = 'この動きを3Dアニメーションで再生確認';
        }
      }

      uiState.activeLiveUid = uid;
      ref.liveBtn.classList.add('is-active');
      ref.liveBtn.textContent = 'ライブ3Dプレビューを閉じる';

      ref.liveSlot.appendChild(sharedLiveDockEl);
      sharedLiveDockEl.hidden = false;
      if (canvas.parentElement !== liveStageWrapEl) {
        liveStageWrapEl.appendChild(canvas);
      }

      const w = Math.max(1, liveStageWrapEl.clientWidth || 480);
      const h = Math.max(1, liveStageWrapEl.clientHeight || 300);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);

      fasciaSystem.setOnlyLines(ref.item.lines);
      floorGroup.visible = ref.item.cameraView !== 'recline-side';
      positionCameraImmediate(ref.item.cameraView, w, h);
      controls.enabled = true;

      if (mode === 'zero') {
        uiState.livePlaying = false;
        uiState.liveManualScrub = 0.0;
        if (liveScrubSlider) liveScrubSlider.value = '0';
      } else if (mode === 'hundred') {
        uiState.livePlaying = false;
        uiState.liveManualScrub = 1.0;
        if (liveScrubSlider) liveScrubSlider.value = '100';
      } else {
        uiState.livePlaying = true;
        uiState.liveManualScrub = null;
        uiState.livePhase01 = 0.15;
      }

      syncLiveButtonsUI();
      uiState.lastTickMs = performance.now();
    };

    btnLiveZero?.addEventListener('click', () => {
      uiState.livePlaying = false;
      uiState.liveManualScrub = 0.0;
      if (liveScrubSlider) liveScrubSlider.value = '0';
      syncLiveButtonsUI();
    });

    btnLiveHundred?.addEventListener('click', () => {
      uiState.livePlaying = false;
      uiState.liveManualScrub = 1.0;
      if (liveScrubSlider) liveScrubSlider.value = '100';
      syncLiveButtonsUI();
    });

    btnLivePlay?.addEventListener('click', () => {
      uiState.livePlaying = !uiState.livePlaying;
      if (uiState.livePlaying) {
        uiState.liveManualScrub = null;
      } else if (liveScrubSlider) {
        uiState.liveManualScrub = Number(liveScrubSlider.value) / 100;
      }
      syncLiveButtonsUI();
    });

    btnLiveResetCam?.addEventListener('click', () => {
      if (!uiState.activeLiveUid) return;
      const ref = cardRefs.get(uiState.activeLiveUid);
      if (!ref) return;
      const w = Math.max(1, liveStageWrapEl.clientWidth || 480);
      const h = Math.max(1, liveStageWrapEl.clientHeight || 300);
      positionCameraImmediate(ref.item.cameraView, w, h);
    });

    liveScrubSlider?.addEventListener('input', () => {
      uiState.livePlaying = false;
      uiState.liveManualScrub = Number(liveScrubSlider.value) / 100;
      syncLiveButtonsUI();
    });

    window.addEventListener('resize', resizeLiveCanvas);

    themeBtn?.addEventListener('click', () => {
      uiState.darkTheme = !uiState.darkTheme;
      document.body.classList.toggle('theme-dark', uiState.darkTheme);
      sharedUniforms.uDarkTheme.value = uiState.darkTheme ? 1.0 : 0.0;
      themeBtn.setAttribute('aria-pressed', String(uiState.darkTheme));
      themeBtn.querySelectorAll('[data-theme-pill]').forEach((el) => {
        const isDarkPill = el.dataset.themePill === 'dark';
        el.classList.toggle('is-active', isDarkPill === uiState.darkTheme);
      });
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', uiState.darkTheme ? '#0B1220' : '#EEF2F7');
      }
      bakeAllSnapshots();
    });

    await bakeAllSnapshots();

    // ライブドックが開いている時だけ3D描画を回す省電力ループ
    const liveLoop = (nowMs) => {
      requestAnimationFrame(liveLoop);
      if (!uiState.activeLiveUid) return;

      const ref = cardRefs.get(uiState.activeLiveUid);
      if (!ref) return;

      const dt = Math.min(0.05, Math.max(0, (nowMs - uiState.lastTickMs) / 1000));
      uiState.lastTickMs = nowMs;
      sharedUniforms.uTime.value = nowMs * 0.001;

      const preset = ALL_MOTION_PRESETS.find((p) => p.id === ref.item.presetId) || ALL_MOTION_PRESETS[0];
      if (uiState.livePlaying) {
        uiState.livePhase01 = (uiState.livePhase01 + dt / (preset.cycleSec || 5.8)) % 1.0;
      }

      const rawMp = computeMotionParams({
        presetId: ref.item.presetId,
        phase01: uiState.livePhase01,
        manualScrub: uiState.liveManualScrub,
        intensity: 1.0,
      });
      // 双方向プリセットの場合も 0%〜100% の変化として正方向で見やすく表示
      const mp = preset.bidirectional && uiState.liveManualScrub === null
        ? computeMotionParams({
            presetId: ref.item.presetId,
            phase01: uiState.livePhase01,
            manualScrub: Math.abs(rawMp.scrub),
            intensity: 1.0,
          })
        : rawMp;

      const pct = Math.round(Math.abs(mp.scrub || 0) * 100);
      if (uiState.livePlaying && liveScrubSlider) {
        liveScrubSlider.value = String(pct);
      }
      if (liveScrubReadout) {
        liveScrubReadout.textContent = pct <= 2 ? '0%（最初：ラクな姿勢）' : pct >= 98 ? '100%（最後：負担のクセ）' : `${pct}%`;
      }

      controls.update();
      solveRigMatrices(mp, boneMats);
      fasciaSystem.update(boneMats, camera.quaternion, mp);
      renderer.render(scene, camera);
    };

    requestAnimationFrame(liveLoop);
  } catch (err) {
    console.error('[fascia-check-list] 初期化エラー:', err);
    if (bakeStatusEl) {
      bakeStatusEl.textContent = '3Dデータの読み込みに失敗しました。ページを再読み込みしてください。';
    }
  }
}

bootstrapCheckList();
