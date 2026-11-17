// =============================================================================
// main.js — viewer / fascia / ui の結線（赤・青濃淡2系統 × 3D筋膜シート面 × 2層透視 × 控えめ骨格統合）
// index.html は <script type="module" src="js/main.js"> のみを読み込む。
// =============================================================================

import * as dataModule from './data.js?v=20261117b';
import * as anatomyDetails from './anatomy_details.js?v=20261117b';
import { createFascia } from './fascia.js?v=20261117b';
import * as posture from './posture.js?v=20261117b';
import { resolveCareProfile } from './selfcare_guide3d.js?v=20261117b';
import { createUI } from './ui.js?v=20261117b';
import { createViewer } from './viewer.js?v=20261117b';

const TRIGGER_LINES = dataModule.TRIGGER_LINES || dataModule.GOLDEN_LINES || [];
const LINES = dataModule.LINES || [];
const HABITS = dataModule.HABITS || [];
const FEELINGS = dataModule.FEELINGS || [];
const STORIES = dataModule.STORIES || [];
const OCCUPATIONS = dataModule.OCCUPATIONS || [];
const MUSCLE_LAYERS = dataModule.MUSCLE_LAYERS || {};

const getMuscleLayer =
  typeof dataModule.getMuscleLayer === 'function'
    ? dataModule.getMuscleLayer
    : (id) => MUSCLE_LAYERS[id] || 'surface';
const computeMyofascialChain =
  typeof dataModule.computeMyofascialChain === 'function'
    ? dataModule.computeMyofascialChain
    : null;

const setPose = typeof posture.setPose === 'function' ? posture.setPose : () => {};
const setHabitPhasePose = typeof posture.setHabitPhasePose === 'function' ? posture.setHabitPhasePose : () => {};
const updatePose = typeof posture.update === 'function' ? posture.update : () => {};
const setSelfCarePose = typeof posture.setSelfCarePose === 'function' ? posture.setSelfCarePose : () => {};
const clearSelfCarePose = typeof posture.clearSelfCarePose === 'function' ? posture.clearSelfCarePose : () => {};
const isPoseAnimating = typeof posture.isPoseAnimating === 'function' ? posture.isPoseAnimating : () => false;
const getAnatomyDetail =
  typeof anatomyDetails.getAnatomyDetail === 'function'
    ? anatomyDetails.getAnatomyDetail
    : (id) => anatomyDetails.ANATOMY_DETAILS?.[id] || null;

// ライン選択時に寄る向き（そのラインが一番よく見える側）
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

const lineById = new Map(LINES.map((l) => [l.id, l]));
const habitById = new Map(HABITS.map((h) => [h.id, h]));
const storyById = new Map((STORIES || []).map((s) => [s.id, s]));

/** 失敗しても他の操作を止めないためのラッパー */
const safe = (fn, label) => (...args) => {
  try {
    return fn(...args);
  } catch (err) {
    console.error(`[main] ${label} でエラー`, err);
  }
};

/** 画面に出すのは日本語のみ（viewer が投げる err.ja 付きのメッセージだけを採用） */
const jaMessage = (err) =>
  err && err.ja && err.message ? err.message : '読み込みに失敗しました。ページを再読み込みしてください。';

async function loadNames() {
  try {
    const res = await fetch('models/atlas_metadata.json?v=20261117b');
    if (!res.ok) throw new Error(String(res.status));
    const meta = await res.json();
    const names = {};
    for (const s of [...(meta.muscles || []), ...(meta.bones || [])]) names[s.id] = s.nameJa;
    return { meta, names };
  } catch (err) {
    console.warn('[main] atlas_metadata.json を読めませんでした', err);
    return { meta: null, names: {} };
  }
}

// 顔・顎・頭部の筋（ステップの focus に含まれる場合は首〜顔・顎に大きくズームインさせる）
const HEAD_FACE_JAW_IDS = new Set([
  'masseter',
  'temporalis',
  'depressor-anguli-oris',
  'depressor-labii-inferioris',
  'zygomaticus-major',
  'zygomaticus-minor',
  'mylohyoid',
  'digastric',
  'mentalis',
  'orbicularis-oris',
  'buccinator',
  'frontalis',
  'occipitalis',
]);

// 上肢・肩こり系の職業動作（腕・胸・肩甲骨がしっかり画角に入るようにする）
const UPPER_ARM_SHOULDER_HABIT_IDS = new Set([
  'hair-cut-arm',
  'laundry-reach',
  'overhead-tool',
  'cook-pan-hold',
  'therapist-press',
]);

// 前かがみ・中腰・歩行・スクワット等の動作（斜め横から前傾角度・手元作業・脚の動き・前後の引っ張り合いが一目でわかるようにする）
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

/** クセ・職業動作のトリガーポイント（セルフケア対象筋）リストを安全に取得 */
function getSelfCareMuscles(habit) {
  if (!habit) return [];
  const tl = habit.triggerLine || habit.goldenLine;
  if (Array.isArray(tl?.triggerPoints) && tl.triggerPoints.length) {
    const fromTp = tl.triggerPoints.map((tp) => (typeof tp === 'string' ? tp : tp?.muscleId || tp?.id)).filter(Boolean);
    if (fromTp.length) return fromTp;
  }
  const sc = habit.selfCare;
  if (Array.isArray(sc?.targetMuscles) && sc.targetMuscles.length) {
    return sc.targetMuscles.filter(Boolean);
  }
  if (Array.isArray(tl?.rootMuscles) && tl.rootMuscles.length) {
    return tl.rootMuscles.filter(Boolean);
  }
  if (Array.isArray(sc?.steps) && sc.steps.length) {
    const fromSteps = sc.steps.map((s) => (typeof s === 'string' ? s : s?.muscleId || s?.muscle || s?.id)).filter(Boolean);
    if (fromSteps.length) return fromSteps;
  }
  return Array.isArray(habit.shortenCore) && habit.shortenCore.length
    ? habit.shortenCore.filter(Boolean)
    : Array.isArray(habit.shorten)
      ? habit.shorten.filter(Boolean)
      : [];
}

/** ライン・クセで見せたい向き */
function viewForHabit(habit, lines) {
  if (!habit) return 'front';
  if (habit.id === 'volleyball-smash' || habit.id === 'tennis-baseball-arm') return 'right';
  if (habit.id === 'floor-sit-cross' || habit.id === 'leg-cross-r') return 'front';
  if (habit.id === 'gym-bench-push') return 'side';
  if (habit.id === 'sleep-side-curl' || habit.id === 'phone-bed-side') return 'front';
  if (habit.id === 'laundry-reach' || habit.id === 'overhead-tool') return 'left';
  if (habit.id === 'leg-cross-l') return 'left';
  if (habit.id === 'mouse-wrist-strain') return 'right';
  if (BEND_LOWBACK_HABIT_IDS.has(habit.id) || habit.id === 'drive-long') {
    return habit.side === 'R' ? 'right' : 'left';
  }
  if (UPPER_ARM_SHOULDER_HABIT_IDS.has(habit.id)) {
    return habit.view || 'front';
  }
  if (habit.view) return habit.view;
  const main = lines[0];
  let view = (main && LINE_VIEW[main.id]) || 'front';
  if (view === 'left' || view === 'right') view = habit.side === 'R' ? 'right' : 'left';
  return view;
}

async function start() {
  let ui = null;
  try {
    const { meta, names } = await loadNames();

    for (const occ of OCCUPATIONS) {
      for (const hItem of occ?.habits || occ?.actions || []) {
        if (hItem && typeof hItem === 'object' && hItem.id && !habitById.has(hItem.id)) {
          habitById.set(hItem.id, hItem);
        }
      }
    }

    ui = createUI({
      lines: LINES,
      triggerLines: TRIGGER_LINES,
      habits: HABITS,
      feelings: FEELINGS,
      stories: STORIES,
      occupations: OCCUPATIONS,
      names,
      muscleLayers: MUSCLE_LAYERS,
    });
    ui.setLoading(0, '準備しています…');

    const stage = document.getElementById('stage') || document.body;
    const viewer = await createViewer(stage, {
      metadata: meta || undefined,
      onProgress: (pct, text) => ui.setLoading(pct, text),
    });

    const fascia = createFascia({
      THREE: viewer.THREE,
      scene: viewer.scene,
      getMeshes: viewer.getMeshes,
      getCenter: viewer.getCenter,
    });

    // 2層（表層 / 深層）マップ ＆ 控えめ骨格モード（骨の光り防止）を同期
    viewer.setMuscleLayers?.(MUSCLE_LAYERS);
    viewer.setFasciaLayerMode?.('see-through');
    viewer.setLayer?.('bone', 'on');
    fascia.setLayerFilter?.('see-through', MUSCLE_LAYERS);
    ui.setFasciaLayerMode?.('see-through');

    viewer.setKeepAwakePredicate?.(() => Boolean(fascia.isBusy?.() || isPoseAnimating()));

    viewer.onFrame((time, delta) => {
      updatePose(time, delta);
      fascia.update(time, delta);
    });

    viewer.onViewChange((v) => {
      if (typeof ui.setViewBadge === 'function') {
        ui.setViewBadge(v);
      }
    });

    /**
     * 現在注目している赤・青ロール筋肉群を viewer に通知して無関係筋を無彩色スレート化し、
     * 深層筋（'deep'）が含まれる場合は表層筋を自動ベール透視させる
     */
    const syncDeepContext = (ids = []) => {
      const cleanIds = [...new Set((ids || []).filter(Boolean))];
      viewer.setActiveRoleIds?.(cleanIds);
      const deepIds = [];
      for (const id of cleanIds) {
        if (getMuscleLayer(id) === 'deep') deepIds.push(id);
      }
      viewer.setActiveDeepContext?.(deepIds);
    };

    // ----- 状態 -----------------------------------------------------------
    let mode = null; // 'line' | 'habit' | 'story' | 'part' | null
    let currentHabit = null;
    let currentStory = null;
    let currentStepIdx = -1;
    let lastPart = null;
    let closing = false; // ui.closeCard → 'close' の再入を防ぐ

    const clearAll = ({ camera = true, resetLayerMode = false } = {}) => {
      setPose(null, 0);
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      viewer.setXRayMode?.(false);
      viewer.setActiveRoleIds?.([]);
      viewer.setActiveDeepContext?.([]);
      if (resetLayerMode) {
        viewer.setFasciaLayerMode?.('see-through');
        viewer.setLayer?.('bone', 'on');
        fascia.setLayerFilter?.('see-through', MUSCLE_LAYERS);
        ui.setFasciaLayerMode?.('see-through');
      }
      viewer.resetLook({ camera });
      mode = null;
      currentHabit = null;
      currentStory = null;
      currentStepIdx = -1;
      clearSelfCarePose();
      lastPart = null;
    };

    // ----- ライン ---------------------------------------------------------
    const selectLine = (id) => {
      const line = lineById.get(id);
      if (!line) return;
      setPose(null, 0);
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      viewer.setXRayMode?.(false);
      viewer.highlight([]);
      syncDeepContext(line.track || []);
      viewer.ghostOthers(line.track);
      fascia.showLine(line, { side: 'both' });
      viewer.focus(line.track, { view: LINE_VIEW[line.id] });
      ui.showLine(line);
      mode = 'line';
      currentHabit = null;
      currentStory = null;
      currentStepIdx = -1;
      lastPart = null;
    };

    // ----- クセ・職業動作（4段階温度濃淡 × 2層透視 × 骨駅シルク糸ブリッジ） -----
    const ACTION_BODY_CONTEXT_IDS = [
      'deltoid',
      'biceps-brachii',
      'triceps-brachii',
      'brachioradialis',
      'flexor-carpi-radialis',
      'flexor-digitorum-superficialis',
      'extensor-digitorum',
      'pectoralis-major',
      'latissimus-dorsi',
      'trapezius',
      'sternocleidomastoid',
      'rectus-abdominis',
      'external-oblique',
      'gluteus-maximus',
      'gluteus-medius',
      'rectus-femoris',
      'vastus-lateralis',
      'biceps-femoris',
      'gastrocnemius',
      'tibialis-anterior',
    ];

    /** 実際に赤（縮み）・青（伸び）の筋膜シートが被さる関連筋肉ID群のみを厳密抽出 */
    const getHabitColoredRoleIds = (habit) => {
      if (!habit) return [];
      const tl = habit.triggerLine || habit.goldenLine;
      const sCore = habit.shortenCore?.length
        ? habit.shortenCore
        : tl?.shortenCore?.length
          ? tl.shortenCore
          : habit.shorten || [];
      const sLink = habit.shortenLinked?.length ? habit.shortenLinked : tl?.shortenLinked || [];
      const lAnt = habit.lengthenAntagonist?.length
        ? habit.lengthenAntagonist
        : tl?.lengthenAntagonist?.length
          ? tl.lengthenAntagonist
          : habit.lengthen || [];
      const lLink = habit.lengthenLinked?.length ? habit.lengthenLinked : tl?.lengthenLinked || [];
      return [...new Set([...sCore, ...sLink, ...lAnt, ...lLink].filter(Boolean))];
    };

    const getHabitActiveRoleIds = (habit) => {
      if (!habit) return [];
      const tl = habit.triggerLine || habit.goldenLine;
      return [
        ...new Set([
          ...getHabitColoredRoleIds(habit),
          ...(habit.yore || []),
          ...(tl?.fasciaChain || tl?.arrowPath || []),
          ...getSelfCareMuscles(habit),
        ]),
      ];
    };

    const buildHabitKeepIds = (habit) => {
      if (!habit) return new Set();
      const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      const allLineTracks = lines.flatMap((l) => l.track || []);
      return new Set([
        ...allLineTracks,
        ...ACTION_BODY_CONTEXT_IDS,
        ...getHabitActiveRoleIds(habit),
        ...(habit.chain || []),
      ]);
    };

    const getHabitFocusIds = (habit) => {
      if (!habit) return [];
      const colored = getHabitColoredRoleIds(habit);
      const base = colored.length ? [...colored] : [...getHabitActiveRoleIds(habit)];
      // 手首・前腕が色づく動作では、手のひらの向き（回内・背屈）が見切れないよう隣接する手掌骨のみ添える（全身には広げない）
      if (base.some((m) => /carpi|brachioradialis|pronator|supinator|digitorum|pollicis|palmaris/.test(m))) {
        if (habit.side === 'L') base.push('left-third-metacarpal-bone');
        else if (habit.side === 'R') base.push('right-third-metacarpal-bone');
        else base.push('right-third-metacarpal-bone', 'left-third-metacarpal-bone');
      }
      // バンザイ・頭上リーチ・サーブ動作で肩周囲が色づく場合は、頭上まで伸びた腕〜体幹が見切れないよう補助骨格・体幹筋を添える
      const maxRaise = Math.max(Number(habit.pose?.armRaiseL || 0), Number(habit.pose?.armRaiseR || 0));
      if (maxRaise >= 0.55 && base.some((m) => /deltoid|supraspinatus|infraspinatus|subscapularis|pectoralis|latissimus|serratus/.test(m))) {
        base.push('biceps-brachii');
      }
      if (
        [
          'volleyball-smash',
          'tennis-baseball-arm',
          'laundry-reach',
          'overhead-tool',
          'swim-crawl-yoga',
          'yoga-pilates-open',
          'court-step-jump',
        ].includes(habit.id)
      ) {
        base.push(
          'biceps-brachii',
          'right-third-metacarpal-bone',
          'left-third-metacarpal-bone',
          'frontal-bone',
          'external-oblique'
        );
      }
      // 脚組み・あぐら動作では左右の大腿骨・脛骨を添えて、組んだ両脚と股関節が必ず画角に収まるようにする
      if (habit.id === 'leg-cross-r' || habit.id === 'floor-sit-cross') {
        base.push('right-femur', 'left-femur', 'right-tibia', 'left-tibia');
      }
      // 首・顎が色づく頭前傾動作では、顎〜頭の位置関係が見切れないよう下顎骨（後頭・側頭筋を含む場合は前頭骨も）を添える
      if (
        (Number(habit.pose?.headForward || 0) >= 0.35 || Math.abs(Number(habit.pose?.headPitch || 0)) >= 0.30) &&
        base.some((m) => /capitis|colli|cervicis|sternocleidomastoid|scalene|masseter|temporalis|platysma|occipital|splenius|semispinalis/.test(m))
      ) {
        base.push('mandible');
        if (base.some((m) => /capitis|occipital|temporalis|masseter|frontalis/.test(m))) {
          base.push('frontal-bone');
        }
      }
      return [...new Set(base)];
    };

    const focusSideForHabit = (habit) => {
      if (!habit) return 'both';
      if (
        habit.id === 'leg-cross-r' ||
        habit.id === 'floor-sit-cross' ||
        habit.id === 'volleyball-smash' ||
        habit.id === 'tennis-baseball-arm' ||
        habit.id === 'golf-swing-rot'
      ) {
        return 'both';
      }
      return habit.side || 'both';
    };

    /** 動作選択時の初期進行度（68%：4段階の縮み・連動・対側伸張バランスが最も鮮明に見える基準値） */
    const DEFAULT_HABIT_PROGRESS = 0.68;

    const selectHabit = (id) => {
      const habit = typeof id === 'object' && id ? id : habitById.get(id);
      if (!habit) return;
      const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      const ids = buildHabitKeepIds(habit);
      currentHabit = habit;
      currentStory = null;
      currentStepIdx = -1;
      setPose(habit.pose || null, 0.12 + 0.98 * DEFAULT_HABIT_PROGRESS, { habitId: habit.id });
      fascia.clearReleaseTool?.();
      fascia.clear();
      fascia.clearTriggerPoint?.();
      viewer.setXRayMode?.(false);
      viewer.highlight([]);
      syncDeepContext(getHabitColoredRoleIds(habit));
      viewer.ghostOthers([...ids]);
      fascia.showHabit(habit, lines);
      fascia.setProgress(DEFAULT_HABIT_PROGRESS);
      ui.showHabit(habit);
      ui.setProgress?.(DEFAULT_HABIT_PROGRESS);
      viewer.syncUiClearanceNow?.();
      const focusIds = getHabitFocusIds(habit);
      viewer.focus(focusIds.length ? focusIds : [...ids], {
        view: viewForHabit(habit, lines),
        side: focusSideForHabit(habit),
      });
      mode = 'habit';
      lastPart = null;
    };

    /** トリガーライン全体へカメラと表示をスムーズに戻す */
    const returnToTriggerLine = (habit = currentHabit) => {
      clearSelfCarePose();
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      viewer.setXRayMode?.(false);
      viewer.highlight([]);
      if (!habit) return;
      if (currentHabit !== habit || mode !== 'habit') {
        selectHabit(habit);
        return;
      }
      setPose(habit.pose || null, 0.12 + 0.98 * DEFAULT_HABIT_PROGRESS, { habitId: habit.id });
      const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      const ids = buildHabitKeepIds(habit);
      syncDeepContext(getHabitColoredRoleIds(habit));
      viewer.ghostOthers([...ids]);
      fascia.showHabit(habit, lines);
      fascia.setProgress(DEFAULT_HABIT_PROGRESS);
      viewer.syncUiClearanceNow?.();
      const focusIds = getHabitFocusIds(habit);
      viewer.focus(focusIds.length ? focusIds : [...ids], {
        view: viewForHabit(habit, lines),
        side: focusSideForHabit(habit),
      });
    };

    /**
     * トリガーポイントの筋肉ID・habit・payloadから、3Dリリース器具（🤲指・🎾ボール・🛞ローラー）と
     * 軌道（stroke / circle / roll / glide）・床壁パネル設定を安全ルール込みで解決する
     */
    const resolveReleaseConfig = (habit, muscleId, payload = null) => {
      const pObj = payload && typeof payload === 'object' ? payload : {};
      const tl = habit?.triggerLine || habit?.goldenLine;
      const tpList = tl?.triggerPoints || habit?.triggerPoints || habit?.selfCare?.triggerPoints || [];
      const tpEntry = tpList.find((tp) => (typeof tp === 'object' ? (tp.id || tp.muscleId) === muscleId : false)) || {};

      let strokeTarget = pObj.strokeTarget || tpEntry.strokeTarget || null;
      if (!strokeTarget && habit) {
        const pathSeq = tl?.fasciaChain || tl?.arrowPath || getSelfCareMuscles(habit) || habit.chain || [];
        const idx = pathSeq.indexOf(muscleId);
        if (idx >= 0 && idx < pathSeq.length - 1) {
          strokeTarget = pathSeq[idx + 1];
        } else if (idx > 0) {
          strokeTarget = pathSeq[idx - 1];
        }
      }

      const requestedTool = String(pObj.tool || tpEntry.tool || '').toLowerCase();
      const profile = resolveCareProfile(muscleId, requestedTool || null);
      const tool = profile.tool;
      const motion =
        (pObj.toolSwitchOnly ? null : pObj.motion || tpEntry.motion) ||
        profile.motion ||
        (tool === 'hand' ? 'stroke' : 'roll');

      const speed = Number.isFinite(Number(pObj.speed ?? tpEntry.speed)) ? Number(pObj.speed ?? tpEntry.speed) : 1.0;
      const scale = Number.isFinite(Number(pObj.scale ?? tpEntry.scale))
        ? Number(pObj.scale ?? tpEntry.scale)
        : profile.scale || 1.0;
      const strokeSpan = Number.isFinite(Number(pObj.strokeSpan ?? tpEntry.strokeSpan))
        ? Number(pObj.strokeSpan ?? tpEntry.strokeSpan)
        : 1.0;

      return {
        muscleId,
        strokeTarget,
        side: pObj.side || habit?.side || 'both',
        view: pObj.view || tpEntry.view || null,
        tool,
        motion,
        handPose: pObj.handPose || tpEntry.handPose || profile.handPose || 'thumb',
        supportSurface: pObj.supportSurface || tpEntry.supportSurface || profile.supportSurface || 'none',
        speed,
        scale,
        strokeSpan,
      };
    };

    /** トリガーポイント・セルフケア・単体筋肉が最も見やすいカメラアングルを解決 */
    const viewForReleaseTarget = (muscleId, habit = currentHabit, relCfg = null) => {
      if (relCfg?.view) return relCfg.view;
      const id = muscleId || '';
      const s = relCfg?.side || habit?.side;
      // P4: 足裏（足裏アーチ＋テニスボール＋床マットが斜め横下からくっきり見える角度）
      if (/plantar|flexor-digitorum-brevis|abductor-hallucis|quadratus-plantae/.test(id)) {
        return s === 'L' ? 'sole-left' : 'sole-right';
      }
      // P3: 肩甲骨の間（背中＋ボール＋壁パネルの3層が立体的に見える斜め後ろ角度）
      if (/rhomboid/.test(id)) {
        return s === 'L' ? 'back-left' : 'back-right';
      }
      // P1・P2: 前腕・親指の付け根・鎖骨の下（指先の接地と手首の動きが立体的に見える斜め前角度）
      if (
        /abductor-pollicis|opponens-pollicis|flexor-pollicis|brachioradialis|flexor-carpi|extensor-carpi|pronator|supinator|pectoralis-minor|subclavius/.test(
          id,
        )
      ) {
        return s === 'L' ? 'front-left' : 'front-right';
      }
      // P5: 太もも前（ローラー・ボールうつ伏せ時は斜め横から床マット＋ローラー＋大腿が見える角度）
      if (/rectus-femoris|vastus-intermedius|vastus-medialis|sartorius|tibialis-anterior/.test(id) && (relCfg?.tool === 'roller' || relCfg?.tool === 'ball')) {
        return 'prone-side';
      }
      if (
        /gastrocnemius|soleus|biceps-femoris|semitendinosus|semimembranosus|gluteus-maximus|piriformis|latissimus-dorsi|longissimus|iliocostalis|multifidus|spinalis|quadratus-lumborum|trapezius|levator-scapulae|infraspinatus|supraspinatus|teres|subscapularis|splenius|semispinalis|occipitalis|calcaneal|popliteus|tibialis-posterior|triceps/.test(
          id,
        )
      ) {
        return 'back';
      }
      if (
        /tensor-fasciae-latae|gluteus-medius|gluteus-minimus|external-oblique|internal-oblique|serratus-anterior|deltoid|vastus-lateralis|fibularis/.test(
          id,
        )
      ) {
        return s === 'L' ? 'left' : 'right';
      }
      if (
        /biceps-brachii|pectoralis|sternocleidomastoid|scalene|scalenus|platysma|masseter|temporalis|diaphragm|rectus-abdominis|psoas|iliacus|tibialis-anterior|rectus-femoris|vastus-medialis|adductor|gracilis|sartorius/.test(
          id,
        )
      ) {
        return 'front';
      }
      const lines = (habit?.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      return viewForHabit(habit, lines);
    };

    /** トリガーポイント（点：①・②・③）選択時 ＝「1点集中スポットライトモード」 */
    const focusTriggerPoint = (muscleId, habit = currentHabit, releaseCfg = null) => {
      if (!muscleId) {
        returnToTriggerLine(habit);
        return;
      }
      if (habit && currentHabit !== habit) {
        currentHabit = habit;
        mode = 'habit';
        const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
        setPose(habit.pose || null, 0.12 + 0.98 * DEFAULT_HABIT_PROGRESS, { habitId: habit.id });
        fascia.clearReleaseTool?.();
        fascia.clearTriggerPoint?.();
        fascia.clear();
        fascia.showHabit(habit, lines);
        fascia.setProgress(DEFAULT_HABIT_PROGRESS);
        ui.setProgress?.(DEFAULT_HABIT_PROGRESS);
      }
      const relCfg = releaseCfg || resolveReleaseConfig(currentHabit, muscleId);
      const strokeTarget = relCfg?.strokeTarget || null;
      if (currentHabit) {
        const keepIds = buildHabitKeepIds(currentHabit);
        keepIds.add(muscleId);
        if (strokeTarget) keepIds.add(strokeTarget);
        syncDeepContext([...getHabitColoredRoleIds(currentHabit), muscleId, strokeTarget].filter(Boolean));
        viewer.ghostOthers([...keepIds]);
      } else {
        syncDeepContext([muscleId, strokeTarget].filter(Boolean));
      }
      const targetSide = relCfg?.side || currentHabit?.side || 'both';
      const focusSide = targetSide === 'both' ? 'R' : targetSide;
      fascia.showTriggerPoint?.(muscleId, focusSide);
      viewer.highlight([muscleId], '#BF6450', { side: focusSide });
      const view = viewForReleaseTarget(muscleId, currentHabit, { ...relCfg, side: focusSide });
      viewer.syncUiClearanceNow?.();
      viewer.focus([muscleId], { view, side: focusSide, inspectorOpen: true });
      lastPart = muscleId;
    };

    /** セルフケア指導モーダル表示時 ＝「体のどの部位をどんな姿勢でケアしているかが一目でわかる心地よい距離感フレーミング」 */
    const syncSelfCareHabitBase = (habit) => {
      if (!habit || currentHabit === habit) return;
      currentHabit = habit;
      mode = 'habit';
      const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      setPose(habit.pose || null, 0.12 + 0.98 * DEFAULT_HABIT_PROGRESS, { habitId: habit.id });
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      fascia.showHabit(habit, lines);
      fascia.setProgress(DEFAULT_HABIT_PROGRESS);
      ui.setProgress?.(DEFAULT_HABIT_PROGRESS);
    };

    const focusSelfCareView = (muscleId, habit = currentHabit, releaseCfg = null) => {
      if (!muscleId) {
        returnToTriggerLine(habit);
        return;
      }
      syncSelfCareHabitBase(habit);
      const relCfg = releaseCfg || resolveReleaseConfig(currentHabit, muscleId);
      const strokeTarget = relCfg?.strokeTarget || null;
      if (currentHabit) {
        const keepIds = buildHabitKeepIds(currentHabit);
        keepIds.add(muscleId);
        if (strokeTarget) keepIds.add(strokeTarget);
        syncDeepContext([...getHabitColoredRoleIds(currentHabit), muscleId, strokeTarget].filter(Boolean));
        viewer.ghostOthers([...keepIds]);
      } else {
        syncDeepContext([muscleId, strokeTarget].filter(Boolean));
      }
      const targetSide = relCfg?.side || currentHabit?.side || 'both';
      const focusSide = targetSide === 'both' ? 'R' : targetSide;
      fascia.showTriggerPoint?.(muscleId, focusSide);
      viewer.highlight([muscleId], '#BF6450', { side: focusSide });

      const baseFocusIds = [muscleId, strokeTarget].filter(Boolean);
      let landmarkIds;
      let closeSelfCare = false;
      let focusBoxSide = 'both';
      if (/plantar|flexor-digitorum-brevis|abductor-hallucis|quadratus-plantae/.test(muscleId)) {
        landmarkIds = [
          focusSide === 'L' ? 'left-calcaneus' : 'right-calcaneus',
          focusSide === 'L' ? 'left-first-metatarsal-bone' : 'right-first-metatarsal-bone',
          focusSide === 'L' ? 'left-fifth-metatarsal-bone' : 'right-fifth-metatarsal-bone',
        ];
        closeSelfCare = true;
        focusBoxSide = focusSide;
      } else if (
        /pollicis|carpi|palmaris|brachioradialis|pronator|supinator|flexor-digitorum-(superficialis|profundus)|extensor-digitorum$|extensor-indicis|-hand$/.test(
          muscleId,
        )
      ) {
        landmarkIds = [
          'brachioradialis',
          'flexor-carpi-radialis',
          focusSide === 'L' ? 'left-middle-finger-distal-phalanx' : 'right-middle-finger-distal-phalanx',
        ];
        closeSelfCare = true;
        focusBoxSide = focusSide;
      } else if (/pectoralis-minor|subclavius|sternocleidomastoid|scalenus|scalene|platysma|masseter|temporalis/.test(muscleId)) {
        landmarkIds = [
          'mandible',
          'sternocleidomastoid',
          'pectoralis-major',
          'deltoid',
        ];
        closeSelfCare = true;
      } else if (/rhomboid/.test(muscleId)) {
        landmarkIds = [
          'trapezius',
          'rhomboid-major',
          'infraspinatus',
          'latissimus-dorsi',
        ];
        closeSelfCare = true;
      } else if (
        /hallucis|toe|calcane|tibia|fibula|gastrocnemius|soleus|popliteus|femoris|vastus|sartorius|gracilis|adductor|pectineus|patella/.test(
          muscleId,
        )
      ) {
        landmarkIds = [
          'iliacus',
          'gluteus-maximus',
          'rectus-femoris',
          'biceps-femoris',
          'gastrocnemius',
          'tibialis-anterior',
          'right-calcaneus',
          'left-calcaneus',
        ];
      } else if (
        /psoas|iliacus|gluteus|piriformis|tensor-fasciae|quadratus-lumborum|multifidus|longissimus|iliocostalis|rectus-abdominis|oblique|diaphragm|pelvic/.test(
          muscleId,
        )
      ) {
        landmarkIds = [
          'pectoralis-major',
          'latissimus-dorsi',
          'rectus-abdominis',
          'gluteus-maximus',
          'rectus-femoris',
        ];
      } else {
        landmarkIds = [
          'frontal-bone',
          'mandible',
          'sternocleidomastoid',
          'pectoralis-major',
          'trapezius',
          'deltoid',
          'biceps-brachii',
          'rectus-abdominis',
        ];
      }
      const focusIds = closeSelfCare
        ? [...new Set([muscleId, ...landmarkIds])]
        : [...new Set([...baseFocusIds, ...landmarkIds])];
      const view = viewForReleaseTarget(muscleId, currentHabit, { ...relCfg, side: focusSide });
      viewer.syncUiClearanceNow?.();
      viewer.focus(focusIds, { view, side: focusBoxSide, selfCareModal: true, closeSelfCare });
      lastPart = muscleId;
    };

    /** イベント payload から対象の habit と muscleId を解決 */
    const resolveTriggerPointPayload = (payload, defaultFirst = false) => {
      if (payload === null) {
        return { habit: currentHabit, muscleId: null };
      }
      if (typeof payload === 'string') {
        if (habitById.has(payload)) {
          const habit = habitById.get(payload);
          const muscleId = defaultFirst ? getSelfCareMuscles(habit)[0] || null : null;
          return { habit, muscleId };
        }
        return { habit: currentHabit, muscleId: payload };
      }
      if (typeof payload === 'number') {
        const muscleId = currentHabit ? getSelfCareMuscles(currentHabit)[payload] || null : null;
        return { habit: currentHabit, muscleId };
      }
      if (payload && typeof payload === 'object') {
        const habit =
          (payload.habitId && habitById.get(payload.habitId)) ||
          (payload.habit && typeof payload.habit === 'object' ? payload.habit : null) ||
          (payload.id && habitById.get(payload.id)) ||
          (payload.selfCare || payload.shorten ? payload : currentHabit);
        if ('muscleId' in payload && payload.muscleId === null) {
          return { habit, muscleId: null };
        }
        let muscleId =
          payload.muscleId ||
          payload.muscle ||
          payload.targetMuscle ||
          (payload.id && !habitById.has(payload.id) ? payload.id : null) ||
          null;
        if (!muscleId && Number.isFinite(Number(payload.stepIndex ?? payload.index))) {
          muscleId = getSelfCareMuscles(habit)[Number(payload.stepIndex ?? payload.index)] || null;
        }
        if (!muscleId && defaultFirst) {
          muscleId = getSelfCareMuscles(habit)[0] || null;
        }
        return { habit, muscleId };
      }
      return { habit: currentHabit, muscleId: null };
    };

    // ----- 説明（ストーリー） ---------------------------------------------
    const applyStep = (story, index) => {
      if (!story || !Array.isArray(story.steps) || !story.steps.length) return;
      const idx = Math.max(0, Math.min(story.steps.length - 1, Number(index) || 0));
      if (currentStory === story && currentStepIdx === idx) return;
      const step = story.steps[idx];
      if (!step) return;
      currentStepIdx = idx;
      const line = step.line ? lineById.get(step.line) : null;
      const activeStepIds = [
        ...(step.focus || []),
        ...(step.shortenCore || []),
        ...(step.shortenLinked || []),
        ...(step.lengthenAntagonist || []),
        ...(step.lengthenLinked || []),
        ...(step.shorten || []),
        ...(step.lengthen || []),
        ...(step.yore || []),
      ];
      const ids = new Set([...(line?.track || []), ...activeStepIds]);
      if (step.pose?.armsFold >= 0.7) {
        for (const armId of [
          'biceps-brachii',
          'brachioradialis',
          'flexor-carpi-radialis',
          'flexor-digitorum-superficialis',
          'deltoid',
        ]) {
          ids.add(armId);
        }
      }
      if (story.id === 'biceps-face-sag') {
        for (const chainId of [
          'biceps-brachii',
          'pectoralis-minor',
          'platysma',
          'sternocleidomastoid',
          'depressor-anguli-oris',
          'zygomaticus-major',
          'masseter',
        ]) {
          ids.add(chainId);
        }
      }
      if (story.id === 'pelvis-tug-lowback') {
        for (const chainId of [
          'psoas-major',
          'iliacus',
          'biceps-femoris',
          'semitendinosus',
          'gluteus-maximus',
          'multifidus',
          'longissimus',
        ]) {
          ids.add(chainId);
        }
      }
      setPose(step.pose || null, 1, { cyclic: false });
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      viewer.setXRayMode?.(false);
      syncDeepContext(activeStepIds);
      viewer.highlight(step.focus || []);
      viewer.ghostOthers([...ids]);
      fascia.showStep(step, LINES);
      const isHeadFaceStep = (step.focus || []).some((id) => HEAD_FACE_JAW_IDS.has(id));
      const contextIds = isHeadFaceStep
        ? ['platysma', 'sternocleidomastoid', 'masseter', 'temporalis']
        : story.id === 'sofa'
          ? ['rectus-femoris', 'gluteus-maximus', 'rectus-abdominis', 'sternocleidomastoid']
          : story.id === 'biceps-face-sag'
            ? ['biceps-brachii', 'pectoralis-minor', 'platysma', 'sternocleidomastoid']
            : story.id === 'pelvis-tug-lowback'
              ? ['psoas-major', 'iliacus', 'biceps-femoris', 'gluteus-maximus']
              : story.id === 'daily-strain' || story.id === 'childcare-housework' || story.id === 'occupational-strain' || story.id === 'sports-chain'
                ? ['biceps-brachii', 'external-oblique', 'gluteus-medius', 'sternocleidomastoid']
                : step.pose?.armsFold >= 0.7
                  ? ['flexor-carpi-radialis', 'biceps-brachii', 'pectoralis-major', 'sternocleidomastoid']
                  : ['pectoralis-major', 'sternocleidomastoid'];
      const focusIds = isHeadFaceStep
        ? [...new Set([...(step.focus || []), ...contextIds])]
        : [...new Set([...activeStepIds, ...contextIds])];
      viewer.focus(focusIds.length ? focusIds : [...ids], { view: step.view || (line && LINE_VIEW[line.id]) || 'front' });
    };

    const selectStory = (id) => {
      const story = storyById.get(id);
      if (!story) return;
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      viewer.setXRayMode?.(false);
      currentStory = story;
      currentStepIdx = -1;
      currentHabit = null;
      mode = 'story';
      lastPart = null;
      ui.showStory(story, 0);
      applyStep(story, 0);
    };

    /** 配列（文字列またはオブジェクト要素）に対象の筋肉IDが含まれるか判定 */
    const hasMuscleInList = (list, targetId) =>
      Array.isArray(list) &&
      list.some((item) =>
        typeof item === 'string'
          ? item === targetId
          : Boolean(item && (item.id === targetId || item.muscleId === targetId || item.muscle === targetId)),
      );

    /** タップされた筋肉IDから最も関連の深いクセ・動作（bestHabit）を優先度順で1つ検索 */
    const findBestHabitForMuscle = (muscleId) => {
      if (!muscleId) return null;
      const candidates = [...habitById.values()];
      // 優先度1: hb.shortenCore（および triggerLine.shortenCore）に id を含む
      for (const hb of candidates) {
        if (hasMuscleInList(hb?.shortenCore, muscleId)) return hb;
      }
      for (const hb of candidates) {
        const tl = hb?.triggerLine || hb?.goldenLine;
        if (hasMuscleInList(tl?.shortenCore, muscleId)) return hb;
      }
      // 優先度2: hb.triggerLine?.triggerPoints または hb.selfCare?.triggerPoints（および selfCare.steps）に id を含む
      for (const hb of candidates) {
        const tl = hb?.triggerLine || hb?.goldenLine;
        if (
          hasMuscleInList(tl?.triggerPoints, muscleId) ||
          hasMuscleInList(hb?.selfCare?.triggerPoints, muscleId)
        ) {
          return hb;
        }
      }
      for (const hb of candidates) {
        if (
          hasMuscleInList(hb?.selfCare?.steps, muscleId) ||
          hasMuscleInList(hb?.selfCare?.targetMuscles, muscleId)
        ) {
          return hb;
        }
      }
      // 優先度3: hb.shorten または hb.shortenLinked（および triggerLine.shortenLinked）に id を含む
      for (const hb of candidates) {
        if (hasMuscleInList(hb?.shorten, muscleId) || hasMuscleInList(hb?.shortenLinked, muscleId)) {
          return hb;
        }
      }
      for (const hb of candidates) {
        const tl = hb?.triggerLine || hb?.goldenLine;
        if (hasMuscleInList(tl?.shortenLinked, muscleId)) return hb;
      }
      // 優先度4: hb.lengthen または hb.lengthenAntagonist または hb.chain（および triggerLine 連鎖）に id を含む
      for (const hb of candidates) {
        if (
          hasMuscleInList(hb?.lengthen, muscleId) ||
          hasMuscleInList(hb?.lengthenAntagonist, muscleId) ||
          hasMuscleInList(hb?.lengthenLinked, muscleId) ||
          hasMuscleInList(hb?.chain, muscleId)
        ) {
          return hb;
        }
      }
      for (const hb of candidates) {
        const tl = hb?.triggerLine || hb?.goldenLine;
        if (
          hasMuscleInList(tl?.lengthenAntagonist, muscleId) ||
          hasMuscleInList(tl?.lengthenLinked, muscleId) ||
          hasMuscleInList(tl?.fasciaChain, muscleId) ||
          hasMuscleInList(tl?.arrowPath, muscleId)
        ) {
          return hb;
        }
      }
      return null;
    };

    // ----- 3D筋肉タップ・ピル選択 ➔「タップした筋肉を縮みの中心（100%）」とする4段階連鎖シミュレーション -----
    const inspectStructure = (id, { focusCamera = false, side = null, preserveHabitOverlay = false } = {}) => {
      if (!id) return;
      const lines = LINES.filter((l) => (l.track || []).includes(id));
      const metaInfo = viewer.info?.(id);
      const name = names[id] || metaInfo?.nameJa || '';
      const nameEn = metaInfo?.nameEn || '';
      const groupJa = metaInfo?.groupJa || '';
      const kind = metaInfo?.kind || viewer.kindOf?.(id) || 'muscle';
      const detail = kind === 'muscle' ? getAnatomyDetail(id) : null;
      const bestHabit = kind === 'muscle' ? findBestHabitForMuscle(id) : null;

      const explicitSide = side === 'L' || side === 'R' ? side : null;
      const isDistalUnilateralDefault =
        /pollicis|digiti|digitorum|lumbrical|interosse|palmaris|carpi|thenar|hypothenar|brachioradialis|pronator|supinator|hallucis|plantar/.test(
          id,
        );
      const resolvedSide =
        explicitSide ||
        (currentHabit?.side === 'L' || currentHabit?.side === 'R'
          ? currentHabit.side
          : isDistalUnilateralDefault
            ? 'R'
            : 'both');
      const chainData =
        kind === 'muscle' && computeMyofascialChain
          ? computeMyofascialChain(id, { side: resolvedSide })
          : null;

      lastPart = id;

      // ①/②/③スポットライト中は下部 .card--habit をそのまま維持し、単体筋肉タップ・連鎖ジャンプ時は筋膜連鎖トーストを下部に表示
      if (!preserveHabitOverlay) {
        ui.showPart({
          id,
          name,
          nameEn,
          groupJa,
          kind,
          layer: chainData?.layer || (kind === 'muscle' ? getMuscleLayer(id) : 'deep'),
          lines,
          action:
            detail?.action ||
            (kind === 'bone' ? '筋肉や筋膜の張力を受け止めて姿勢を支える骨格パーツです。' : ''),
          clinical: detail?.clinical || '',
          relatedHabit: bestHabit ? { id: bestHabit.id, label: bestHabit.label } : null,
          chain: chainData
            ? {
                shortenLinked: chainData.shortenLinked || [],
                lengthenAntagonist: chainData.lengthenAntagonist || [],
                lengthenLinked: chainData.lengthenLinked || [],
              }
            : null,
        });
      }

      if (kind === 'muscle' && chainData && !preserveHabitOverlay) {
        const involvedLines = (chainData.involvedLineIds || [])
          .map((lid) => lineById.get(lid))
          .filter(Boolean);
        const allChainIds = [
          ...new Set([
            ...(chainData.shortenCore || [id]),
            ...(chainData.shortenLinked || []),
            ...(chainData.lengthenAntagonist || []),
            ...(chainData.lengthenLinked || []),
          ]),
        ];
        const keepSet = new Set([
          ...ACTION_BODY_CONTEXT_IDS,
          ...involvedLines.flatMap((l) => l.track || []),
          ...(currentHabit ? buildHabitKeepIds(currentHabit) : []),
          ...allChainIds,
        ]);
        syncDeepContext(allChainIds);
        viewer.ghostOthers([...keepSet]);
        fascia.clearReleaseTool?.();
        fascia.clearTriggerPoint?.();
        fascia.showMuscleChain?.({
          seedId: chainData.seedMuscleId || id,
          shortenCore: chainData.shortenCore,
          shortenLinked: chainData.shortenLinked,
          lengthenAntagonist: chainData.lengthenAntagonist,
          lengthenLinked: chainData.lengthenLinked,
          bridges: chainData.bridges || chainData.stationBridges || [],
          lines: involvedLines.length ? involvedLines : lines,
          side: resolvedSide,
        });
        fascia.setProgress?.(DEFAULT_HABIT_PROGRESS);
        viewer.highlight([id], '#BF6450', { side: resolvedSide });
        if (mode === 'habit' && currentHabit?.pose) {
          // 筋肉タップ単体調査中は反復サイクルを完全停止し、静止解剖図として観察＆省電力待機可能にする
          setPose(currentHabit.pose, 0.12 + 0.98 * DEFAULT_HABIT_PROGRESS, {
            cyclic: false,
            immediate: true,
            habitId: currentHabit.id,
          });
        } else {
          setPose(null, 0, { immediate: true });
          if (mode !== 'story' && mode !== 'line') {
            mode = 'part';
          }
        }
        viewer.syncUiClearanceNow?.();
        const isDistalHandFoot =
          /pollicis|digiti|digitorum|lumbrical|interosse|palmaris|carpi|thenar|hypothenar|brachioradialis|pronator|supinator|hallucis|plantar/.test(id);
        const focusSide = explicitSide
          ? explicitSide
          : resolvedSide === 'L' || resolvedSide === 'R'
            ? resolvedSide
            : isDistalHandFoot
              ? 'R'
              : 'both';
        const focusTargets = allChainIds.length ? [...allChainIds] : [id];
        if (
          focusTargets.some((m) =>
            /carpi|brachioradialis|pronator|supinator|digitorum|pollicis|palmaris|lumbrical|interosse|thenar|hypothenar/.test(m),
          )
        ) {
          if (focusSide === 'L') focusTargets.push('left-third-metacarpal-bone');
          else if (focusSide === 'R') focusTargets.push('right-third-metacarpal-bone');
          else focusTargets.push('right-third-metacarpal-bone', 'left-third-metacarpal-bone');
        }
        viewer.focus([...new Set(focusTargets)], {
          view: focusCamera ? viewForReleaseTarget(id, currentHabit, { side: focusSide }) : undefined,
          side: focusSide,
          inspectorOpen: true,
        });
      } else {
        const isDistalBoneOrMuscle =
          /pollicis|digiti|digitorum|lumbrical|interosse|palmaris|carpi|metacarp|phalang|scaphoid|lunate|triquetr|pisiform|trapez|capitate|hamate|hallucis|plantar/.test(id);
        const focusSide = explicitSide
          ? explicitSide
          : resolvedSide === 'L' || resolvedSide === 'R'
            ? resolvedSide
            : isDistalBoneOrMuscle
              ? 'R'
              : 'both';
        viewer.highlight([id], kind === 'muscle' ? '#BF6450' : '#9E6B4B', { side: focusSide });
        if (!preserveHabitOverlay) {
          viewer.syncUiClearanceNow?.();
          viewer.focus([id], {
            view: focusCamera && kind === 'muscle' ? viewForReleaseTarget(id, currentHabit, { side: focusSide }) : undefined,
            side: focusSide,
            inspectorOpen: true,
          });
        } else if (focusCamera) {
          viewer.focus([id], {
            view: kind === 'muscle' ? viewForReleaseTarget(id, currentHabit, { side: focusSide }) : undefined,
            side: focusSide,
            inspectorOpen: true,
          });
        }
      }
    };

    viewer.onPick(
      safe((id, picked) => {
        ui.tuckSheet?.();
        inspectStructure(id, {
          focusCamera: false,
          side: picked?.side || null,
          preserveHabitOverlay: false,
        });
      }, '部位タップ連鎖'),
    );

    // ----- UI イベント ----------------------------------------------------
    ui.on('line', safe(selectLine, 'ライン選択'));
    ui.on('habit', safe(selectHabit, 'クセ選択'));
    ui.on('story', safe(selectStory, '説明選択'));
    ui.on(
      'inspect',
      safe((id) => {
        ui.tuckSheet?.();
        inspectStructure(id, { focusCamera: true, preserveHabitOverlay: false });
      }, '筋肉連鎖ジャンプ'),
    );
    ui.on(
      'fascia-layer',
      safe((layerMode) => {
        if (layerMode !== 'see-through' && layerMode !== 'surface' && layerMode !== 'deep') return;
        viewer.setFasciaLayerMode?.(layerMode);
        fascia.setLayerFilter?.(layerMode, MUSCLE_LAYERS);
        ui.setFasciaLayerMode?.(layerMode);
      }, '2層レイヤー切替'),
    );
    ui.on(
      'step',
      safe((index) => {
        if (currentStory) applyStep(currentStory, index);
      }, 'ステップ切替'),
    );
    ui.on(
      'progress',
      safe((p) => {
        viewer.wake?.();
        const clamped = Math.max(0, Math.min(1, Number(p) || 0));
        fascia.setProgress(clamped);
        if (mode === 'habit' && currentHabit?.pose) {
          setPose(currentHabit.pose, 0.12 + 0.98 * clamped, { habitId: currentHabit.id });
        }
      }, '進行度スライダー'),
    );
    ui.on('feeling', () => {});
    ui.on(
      'trigger-point',
      safe((payload) => {
        if (payload && typeof payload === 'object' && payload.fromSelfCareModal) return;
        const { habit, muscleId } = resolveTriggerPointPayload(payload, false);
        const targetHabit = habit || currentHabit;
        fascia.clearReleaseTool?.();
        const rawRelCfg = muscleId ? resolveReleaseConfig(targetHabit, muscleId, payload) : null;
        const effSide =
          rawRelCfg?.side === 'L' || rawRelCfg?.side === 'R'
            ? rawRelCfg.side
            : targetHabit?.side === 'L' || targetHabit?.side === 'R'
              ? targetHabit.side
              : 'R';
        const relCfg = rawRelCfg ? { ...rawRelCfg, side: effSide } : null;
        focusTriggerPoint(muscleId, targetHabit, relCfg);
        if (muscleId) {
          inspectStructure(muscleId, {
            focusCamera: false,
            side: relCfg?.side || targetHabit?.side || null,
            preserveHabitOverlay: true,
          });
        }
      }, 'トリガーポイント1点集中'),
    );
    ui.on(
      'trigger-line',
      safe((payload) => {
        const resolvedId = typeof payload === 'string' ? payload : payload?.habitId || payload?.id;
        const habit =
          (resolvedId && habitById.get(resolvedId)) ||
          (payload && typeof payload === 'object' && (payload.shorten || payload.shortenCore || payload.lines)
            ? payload
            : currentHabit);
        returnToTriggerLine(habit);
      }, 'トリガーライン全体表示'),
    );
    ui.on(
      'selfcare',
      safe((payload) => {
        const { habit, muscleId } = resolveTriggerPointPayload(payload, true);
        const targetHabit = habit || currentHabit;
        if (!targetHabit) return;
        syncSelfCareHabitBase(targetHabit);
        fascia.clearReleaseTool?.();
        fascia.clearTriggerPoint?.();
        const rawRelCfg = muscleId ? resolveReleaseConfig(targetHabit, muscleId, payload) : null;
        const effSide =
          rawRelCfg?.side === 'L' || rawRelCfg?.side === 'R'
            ? rawRelCfg.side
            : targetHabit?.side === 'L' || targetHabit?.side === 'R'
              ? targetHabit.side
              : 'R';
        const relCfg = rawRelCfg ? { ...rawRelCfg, side: effSide } : null;
        const xrayAlpha = Number(targetHabit?.triggerLine?.xrayOpacity ?? targetHabit?.goldenLine?.xrayOpacity) || 0.22;
        viewer.setXRayMode?.(true, { skinOpacity: xrayAlpha });

        if (muscleId && relCfg) {
          setSelfCarePose(
            {
              muscleId,
              tool: relCfg.tool,
              motion: relCfg.motion,
              side: relCfg.side,
              target: relCfg.strokeTarget,
            },
            { immediate: true },
          );
        }
        focusSelfCareView(muscleId, targetHabit, relCfg);
        if (muscleId && relCfg) {
          fascia.showReleaseTool?.(relCfg);
        }
      }, 'セルフケア連動'),
    );
    ui.on(
      'selfcare-step',
      safe((payload) => {
        const { habit, muscleId } = resolveTriggerPointPayload(payload, false);
        const targetHabit = habit || currentHabit;
        if (targetHabit) syncSelfCareHabitBase(targetHabit);
        fascia.clearReleaseTool?.();
        fascia.clearTriggerPoint?.();
        const rawRelCfg = muscleId ? resolveReleaseConfig(targetHabit, muscleId, payload) : null;
        const effSide =
          rawRelCfg?.side === 'L' || rawRelCfg?.side === 'R'
            ? rawRelCfg.side
            : targetHabit?.side === 'L' || targetHabit?.side === 'R'
              ? targetHabit.side
              : 'R';
        const relCfg = rawRelCfg ? { ...rawRelCfg, side: effSide } : null;
        const xrayAlpha = Number(targetHabit?.triggerLine?.xrayOpacity ?? targetHabit?.goldenLine?.xrayOpacity) || 0.22;
        viewer.setXRayMode?.(true, { skinOpacity: xrayAlpha });
        if (muscleId && relCfg) {
          setSelfCarePose(
            {
              muscleId,
              tool: relCfg.tool,
              motion: relCfg.motion,
              side: relCfg.side,
              target: relCfg.strokeTarget,
            },
            { immediate: true },
          );
        }
        focusSelfCareView(muscleId, targetHabit, relCfg);
        if (muscleId && relCfg) {
          fascia.showReleaseTool?.(relCfg);
        } else {
          clearSelfCarePose();
          fascia.clearReleaseTool?.();
        }
      }, 'セルフケアステップ連動'),
    );
    ui.on(
      'selfcare-close',
      safe(() => {
        clearSelfCarePose();
        fascia.clearReleaseTool?.();
        viewer.setXRayMode?.(false);
        if (currentHabit) {
          returnToTriggerLine(currentHabit);
        }
      }, 'セルフケア終了'),
    );
    ui.on(
      'xray',
      safe((on) => {
        const enabled = Boolean(on);
        viewer.setXRayMode?.(enabled);
        
      }, 'レントゲン透視切替'),
    );
    ui.on('view', safe((name) => viewer.view(name), '視点切替'));
    ui.on('layer', safe((kind, m) => viewer.setLayer(kind, m), '骨格レイヤー切替'));
    ui.on('style', safe((s) => viewer.setStyle?.(s), '見た目切替'));
    ui.on(
      'isolate',
      safe((targetId) => {
        const id = targetId || lastPart;
        if (!id) return;
        ui.tuckSheet?.();
        inspectStructure(id, { focusCamera: true, preserveHabitOverlay: false });
      }, '連鎖フォーカス'),
    );
    ui.on(
      'reset',
      safe(() => {
        clearAll({ camera: true, resetLayerMode: true });
        viewer.showAll();
        closing = true;
        try {
          if (typeof ui.resetHome === 'function') {
            ui.resetHome();
          } else {
            ui.closeCard();
          }
        } finally {
          closing = false;
        }
      }, 'リセット'),
    );
    ui.on(
      'part-close',
      safe(() => {
        if (mode === 'habit' && currentHabit) {
          returnToTriggerLine(currentHabit);
        } else if (mode === 'part') {
          clearAll({ camera: true, resetLayerMode: false });
          viewer.showAll();
        } else {
          viewer.highlight([]);
        }
      }, '筋肉連鎖カードを閉じる'),
    );
    ui.on(
      'close',
      safe(() => {
        if (closing) return;
        clearAll({ camera: true, resetLayerMode: false });
      }, 'カードを閉じる'),
    );

    ui.hideLoading();

    // 初期表示はアニメーション・発光・カメラ移動を一切行わず、静かな全身直立モデルで待機する
    setPose(null, 0, { immediate: true });

    // ローカル検証環境（127.0.0.1 / localhost）のみスタジオ制御ブリッジと凍結済みデバッグ参照を公開
    const isLocalDev =
      location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (isLocalDev) {
      window.__studioBridge = {
        viewer,
        fascia,
        ui,
        selectHabit,
        selectLine,
        selectStory,
        inspectStructure,
        inspectMuscle: inspectStructure,
        focusTriggerPoint,
        focusSelfCareView,
        returnToTriggerLine,
        clearAll,
        setPose,
        setHabitPhasePose,
        setSelfCarePose,
        clearSelfCarePose,
        LINES,
        TRIGGER_LINES,
        GOLDEN_LINES: TRIGGER_LINES,
        HABITS,
        FEELINGS,
        STORIES,
        OCCUPATIONS,
        MUSCLE_LAYERS,
        computeMyofascialChain,
      };
      window.__app = Object.freeze({
        viewer,
        fascia,
        ui,
        LINES,
        TRIGGER_LINES,
        GOLDEN_LINES: TRIGGER_LINES,
        HABITS,
        FEELINGS,
        STORIES,
        OCCUPATIONS,
        MUSCLE_LAYERS,
      });
    }
  } catch (err) {
    console.error('[main] 起動に失敗しました', err);
    const msg = jaMessage(err);
    if (ui && typeof ui.setLoading === 'function') {
      try {
        ui.setLoading(0, msg);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    const box = document.createElement('div');
    box.textContent = msg;
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;' +
      'color:#2A231E;background:#FAF8F4;font:15px/1.6 system-ui,sans-serif;text-align:center;z-index:9999';
    document.body.appendChild(box);
  }
}

start();
