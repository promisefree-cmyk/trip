import * as dataModule from './data.js?v=20261121c';
import { createFascia } from './fascia.js?v=20261121c';
import * as posture from './posture.js?v=20261121c';
import { resolveCareProfile } from './selfcare_guide3d.js?v=20261121c';
import { createUnifiedFasciaSheets } from './unified_fascia_sheets.js?v=20261121c';
import { createUI } from './ui.js?v=20261121c';
import { createViewer } from './viewer.js?v=20261121c';
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
const setPosePaused = typeof posture.setPaused === 'function' ? posture.setPaused : () => {};
const isPosePaused = typeof posture.isPaused === 'function' ? posture.isPaused : () => false;
let cachedAnatomyDetails = null;
const preloadAnatomyDetails = () =>
  import('./anatomy_details.js?v=20261121c')
    .then((m) => {
      cachedAnatomyDetails = m;
      return m;
    })
    .catch(() => null);
const getAnatomyDetail = (id) => {
  if (!cachedAnatomyDetails) {
    preloadAnatomyDetails();
    return null;
  }
  return typeof cachedAnatomyDetails.getAnatomyDetail === 'function'
    ? cachedAnatomyDetails.getAnatomyDetail(id)
    : cachedAnatomyDetails.ANATOMY_DETAILS?.[id] || null;
};
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
const SYMPTOM_TO_HABIT_MAP = {
  'hip-outer-tight': 'stand-hip-r',
  'scapula-back-heavy': 'desk-round',
  'neck-base-eye': 'phone-neck',
  'jaw-clench-breath': 'teeth-clench-night',
  'morning-lowback-lock': 'sofa-slouch',
  'swayback-arch-pain': 'sway-back',
  'overhead-shoulder-jam': 'laundry-reach',
  'wrist-elbow-thumb': 'mouse-wrist-strain',
  'buttock-deep-sit': 'leg-cross-r',
  'knee-outer-runner': 'running-strike',
  'foot-arch-calf': 'heels-commute-walk',
  'twist-golf-waist': 'golf-swing-rot',
};
const MOTION_TO_HABIT_MAP = {
  'right-stance': 'stand-hip-r',
  'left-stance': 'stand-hip-l',
  'alt-sway': 'stand-hip-r',
  'sway-back-stand': 'sway-back',
  'desk-pc-mouse': 'desk-round',
  'phone-neck': 'phone-neck',
  'clench-slouch': 'teeth-clench-night',
  'arms-fold-stand': 'arms-fold',
  'chair-slouch-sit': 'sofa-slouch',
  'leg-cross-sit': 'leg-cross-r',
  'forward-bend-work': 'vacuum-dish-bend',
  'forearm-pronation-work': 'kitchen-knife-chop',
  'bag-child-hip': 'childcare-hip-l',
  'overhead-reach': 'laundry-reach',
  'run-single-strike': 'running-strike',
  'spiral-functional-twist': 'golf-swing-rot',
  'drive-1010-wheel': 'drive-long',
  'bus-car-sway-neck': 'bag-shoulder-r',
  'sofa-deep-slouch': 'sofa-slouch',
  'sleep-banzai-arms': 'sleep-side-curl',
  'chin-rest-desk': 'laptop-low-screen',
  'shampoo-dentist-arch': 'hair-shampoo-bend',
  'floor-agura-asymmetry': 'floor-sit-cross',
  'kitchen-sink-lean': 'vacuum-dish-bend',
  'morning-sock-reach': 'heavy-lift-dig',
  'stairs-down-knee': 'heels-commute-walk',
};
const lineById = new Map(LINES.map((l) => [l.id, l]));
const habitById = new Map(HABITS.map((h) => [h.id, h]));
const storyById = new Map((STORIES || []).map((s) => [s.id, s]));
const safe = (fn, label) => (...args) => {
  try {
    return fn(...args);
  } catch (err) {
    console.error(`[main] ${label} でエラー`, err);
  }
};
const jaMessage = (err) =>
  err && err.ja && err.message ? err.message : '読み込みに失敗しました。ページを再読み込みしてください。';
async function loadNames() {
  try {
    const res = await fetch('models/atlas_metadata.json?v=20261121c');
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
const UPPER_ARM_SHOULDER_HABIT_IDS = new Set([
  'hair-cut-arm',
  'laundry-reach',
  'overhead-tool',
  'cook-pan-hold',
  'therapist-press',
]);
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
function getSelfCareMuscles(habit) {
  if (!habit) return [];
  if (Array.isArray(habit.triggerPoints) && habit.triggerPoints.length) {
    const fromHabitTp = habit.triggerPoints
      .map((tp) => (typeof tp === 'string' ? tp : tp?.muscleId || tp?.id))
      .filter(Boolean);
    if (fromHabitTp.length) return fromHabitTp;
  }
  const sc = habit.selfCare;
  if (Array.isArray(sc?.targetMuscles) && sc.targetMuscles.length) {
    return sc.targetMuscles.filter(Boolean);
  }
  const tl = habit.triggerLine || habit.goldenLine;
  if (Array.isArray(tl?.triggerPoints) && tl.triggerPoints.length) {
    const fromTp = tl.triggerPoints.map((tp) => (typeof tp === 'string' ? tp : tp?.muscleId || tp?.id)).filter(Boolean);
    if (fromTp.length) return fromTp;
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
function viewForHabit(habit, lines) {
  if (!habit) return 'front';
  if (habit.id === 'volleyball-smash' || habit.id === 'tennis-baseball-arm') return 'right';
  if (habit.id === 'leg-cross-r') return 'hip-cross-right';
  if (habit.id === 'floor-sit-cross') return 'front';
  if (habit.id === 'cook-pan-hold') return 'front-left';
  if (habit.id === 'desk-round') return 'front';
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
    const searchParams = new URLSearchParams(window.location.search);
    const initialTheme =
      String(searchParams.get('theme') || '').toLowerCase() === 'dark' ? 'dark' : 'light';
    const rawLayer = String(searchParams.get('layer') || '').toLowerCase();
    const initialLayer =
      rawLayer === 'muscle' || rawLayer === 'both' ? rawLayer : 'fascia';
    document.documentElement.setAttribute('data-theme', initialTheme);
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
    ui.setTheme(initialTheme);
    ui.setUnifiedLayer(initialLayer);
    ui.setLoading(2, '3D人体モデルを準備しています…');
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
    const unifiedSheets = createUnifiedFasciaSheets({
      scene: viewer.scene,
      ...viewer.getRoots(),
    });
    viewer.setMuscleLayers?.(MUSCLE_LAYERS);
    viewer.setFasciaLayerMode?.('see-through');
    viewer.setLayer?.('bone', 'on');
    fascia.setLayerFilter?.('see-through', MUSCLE_LAYERS);
    let currentUnifiedLayer = initialLayer;
    /** ［ 筋膜 ｜ 筋肉 ｜ 両方 ］を1ミリもポーズ・カメラ・手順を崩さず瞬時に切り替え */
    const applyUnifiedLayer = (nextMode) => {
      const resolved = nextMode === 'muscle' || nextMode === 'both' ? nextMode : 'fascia';
      currentUnifiedLayer = resolved;
      const showSheets = resolved === 'fascia' || resolved === 'both';
      const showMuscles = resolved === 'muscle' || resolved === 'both';
      viewer.setUnifiedLayerMode?.(showMuscles ? 'muscle' : 'fascia');
      unifiedSheets.setOverlayBlendScale?.(resolved === 'both' ? 0.62 : 1.0);
      unifiedSheets.setVisible(showSheets);
      fascia.setMuscleOverlayVisible?.(showMuscles);
      ui.setUnifiedLayer?.(resolved);
      viewer.wake?.();
      return resolved;
    };
    const applyTheme = (themeMode) => {
      const isDark = themeMode === 'dark';
      viewer.setDarkTheme?.(isDark);
      unifiedSheets.setDarkTheme?.(isDark);
      ui.setTheme?.(isDark ? 'dark' : 'light');
      viewer.wake?.();
    };
    applyTheme(initialTheme);
    applyUnifiedLayer(initialLayer);
    setTimeout(preloadAnatomyDetails, 1200);
    viewer.setKeepAwakePredicate?.(() => {
      if (isPosePaused()) return false;
      return Boolean(fascia.isBusy?.() || isPoseAnimating());
    });
    viewer.onFrame((time, delta) => {
      updatePose(time, delta);
      fascia.update(time, delta);
      unifiedSheets.update(time, delta, viewer.camera?.quaternion || null);
    });
    const syncDeepContext = (ids = []) => {
      const cleanIds = [...new Set((ids || []).filter(Boolean))];
      viewer.setActiveRoleIds?.(cleanIds);
      const deepIds = [];
      for (const id of cleanIds) {
        if (getMuscleLayer(id) === 'deep') deepIds.push(id);
      }
      viewer.setActiveDeepContext?.(deepIds);
    };
    let mode = null; // 'line' | 'habit' | 'story' | 'part' | null
    let currentHabit = null;
    let currentStory = null;
    let currentStepIdx = -1;
    let lastPart = null;
    const clearAll = ({ camera = true } = {}) => {
      setPose(null, 0);
      clearSelfCarePose();
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      unifiedSheets.showAllLines();
      viewer.setXRayMode?.(false);
      viewer.setActiveRoleIds?.([]);
      viewer.setActiveDeepContext?.([]);
      viewer.resetLook({ camera });
      mode = null;
      currentHabit = null;
      currentStory = null;
      currentStepIdx = -1;
      lastPart = null;
    };
    const selectLine = (id) => {
      const line = lineById.get(typeof id === 'object' ? id?.id : id);
      if (!line) return;
      setPose(null, 0);
      clearSelfCarePose();
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      viewer.setXRayMode?.(false);
      viewer.highlight([]);
      syncDeepContext(line.track || []);
      viewer.ghostOthers(line.track);
      fascia.showLine(line, { side: 'both' });
      unifiedSheets.showLine(line.id);
      viewer.focus(line.track, { view: LINE_VIEW[line.id] || 'front' });
      ui.showLine(line);
      mode = 'line';
      currentHabit = null;
      currentStory = null;
      currentStepIdx = -1;
      lastPart = null;
    };
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
      if (base.some((m) => /carpi|brachioradialis|pronator|supinator|digitorum|pollicis|palmaris/.test(m))) {
        if (habit.side === 'L') base.push('left-third-metacarpal-bone');
        else if (habit.side === 'R') base.push('right-third-metacarpal-bone');
        else base.push('right-third-metacarpal-bone', 'left-third-metacarpal-bone');
      }
      const maxRaise = Math.max(Number(habit.pose?.armRaiseL || 0), Number(habit.pose?.armRaiseR || 0));
      if (
        maxRaise >= 0.55 &&
        base.some((m) => /deltoid|supraspinatus|infraspinatus|subscapularis|pectoralis|latissimus|serratus/.test(m))
      ) {
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
          'external-oblique',
        );
      }
      if (habit.id === 'leg-cross-r') {
        base.push(
          'gluteus-maximus',
          'biceps-femoris',
          'adductor-longus',
          'gastrocnemius',
          'right-calcaneus',
          'left-calcaneus',
        );
      } else if (habit.id === 'floor-sit-cross') {
        base.push('frontal-bone', 'right-femur', 'left-femur', 'right-tibia', 'left-tibia');
      }
      if (habit.id === 'sway-back') {
        base.push(
          'frontal-bone',
          'right-calcaneus',
          'left-calcaneus',
          'right-big-toe-distal-phalanx',
          'left-big-toe-distal-phalanx',
        );
      }
      if (
        (Number(habit.pose?.headForward || 0) >= 0.35 || Math.abs(Number(habit.pose?.headPitch || 0)) >= 0.30) &&
        base.some((m) =>
          /capitis|colli|cervicis|sternocleidomastoid|scalene|masseter|temporalis|platysma|occipital|splenius|semispinalis/.test(m),
        )
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
    const DEFAULT_HABIT_PROGRESS = 0.68;
    const selectHabit = (id) => {
      const habit = typeof id === 'object' && id ? id : habitById.get(id);
      if (!habit) return;
      const lines = (habit.lines || []).map((lid) => lineById.get(lid)).filter(Boolean);
      const ids = buildHabitKeepIds(habit);
      currentHabit = habit;
      currentStory = null;
      currentStepIdx = -1;
      clearSelfCarePose();
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
      unifiedSheets.showHabit(habit);
      ui.showHabit(habit);
      const focusIds = getHabitFocusIds(habit);
      viewer.focus(focusIds.length ? focusIds : [...ids], {
        view: viewForHabit(habit, lines),
        side: focusSideForHabit(habit),
      });
      mode = 'habit';
      lastPart = null;
    };
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
      unifiedSheets.showHabit(habit);
      const focusIds = getHabitFocusIds(habit);
      viewer.focus(focusIds.length ? focusIds : [...ids], {
        view: viewForHabit(habit, lines),
        side: focusSideForHabit(habit),
      });
    };
    const resolveReleaseConfig = (habit, muscleId, payload = null) => {
      const pObj = payload && typeof payload === 'object' ? payload : {};
      const tl = habit?.triggerLine || habit?.goldenLine;
      const tpList =
        (Array.isArray(habit?.triggerPoints) && habit.triggerPoints.length ? habit.triggerPoints : null) ||
        (Array.isArray(habit?.selfCare?.triggerPoints) && habit.selfCare.triggerPoints.length
          ? habit.selfCare.triggerPoints
          : null) ||
        tl?.triggerPoints ||
        [];
      const tpEntry = tpList.find((tp) => (typeof tp === 'object' ? (tp.id || tp.muscleId) === muscleId : false)) || {};
      let strokeTarget = pObj.strokeTarget || tpEntry.strokeTarget || null;
      if (!strokeTarget && habit) {
        const scMuscles = getSelfCareMuscles(habit);
        const pathSeq = scMuscles.length
          ? scMuscles
          : tl?.fasciaChain || tl?.arrowPath || habit.chain || [];
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
    const viewForReleaseTarget = (muscleId, habit = currentHabit, relCfg = null) => {
      if (relCfg?.view) return relCfg.view;
      const id = muscleId || '';
      const s = relCfg?.side || habit?.side;
      if (/plantar|flexor-digitorum-brevis|abductor-hallucis|quadratus-plantae/.test(id)) {
        return s === 'L' ? 'sole-left' : 'sole-right';
      }
      if (/rhomboid/.test(id)) {
        return s === 'L' ? 'back-left' : 'back-right';
      }
      if (
        /abductor-pollicis|opponens-pollicis|flexor-pollicis|brachioradialis|flexor-carpi|extensor-carpi|pronator|supinator|pectoralis-minor|subclavius/.test(
          id,
        )
      ) {
        return s === 'L' ? 'front-left' : 'front-right';
      }
      if (
        /rectus-femoris|vastus-intermedius|vastus-medialis|sartorius|tibialis-anterior/.test(id) &&
        (relCfg?.tool === 'roller' || relCfg?.tool === 'ball')
      ) {
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
        (relCfg?.tool === 'roller' || relCfg?.tool === 'ball') &&
        /rectus-femoris|vastus-medialis|vastus-intermedius|sartorius|tibialis-anterior/.test(id)
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
      unifiedSheets.showHabit(habit);
    };
    const focusTriggerPoint = (muscleId, habit = currentHabit, releaseCfg = null) => {
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
      const view = viewForReleaseTarget(muscleId, currentHabit, { ...relCfg, side: focusSide });
      viewer.focus([muscleId], { view, side: focusSide, inspectorOpen: true });
      lastPart = muscleId;
    };
    const focusSelfCareView = (muscleId, habit = currentHabit, releaseCfg = null) => {
      if (!muscleId) {
        returnToTriggerLine(habit);
        return;
      }
      syncSelfCareHabitBase(habit);
      if (currentHabit) {
        unifiedSheets.showHabit(currentHabit);
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
        landmarkIds = ['mandible', 'sternocleidomastoid', 'pectoralis-major', 'deltoid'];
        closeSelfCare = true;
      } else if (/rhomboid/.test(muscleId)) {
        landmarkIds = ['trapezius', 'rhomboid-major', 'infraspinatus', 'latissimus-dorsi'];
        closeSelfCare = true;
      } else if (/tibia|fibula|gastrocnemius|soleus|popliteus|calcane/.test(muscleId) && relCfg?.tool === 'hand') {
        landmarkIds = [
          'tibialis-anterior',
          'gastrocnemius',
          focusSide === 'L' ? 'left-patella' : 'right-patella',
          focusSide === 'L' ? 'left-calcaneus' : 'right-calcaneus',
        ];
        closeSelfCare = true;
        focusBoxSide = focusSide;
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
        landmarkIds = ['pectoralis-major', 'latissimus-dorsi', 'rectus-abdominis', 'gluteus-maximus', 'rectus-femoris'];
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
      viewer.focus(focusIds, { view, side: focusBoxSide, selfCareModal: true, closeSelfCare });
      lastPart = muscleId;
    };
    const resolveTriggerPointPayload = (payload, defaultFirst = false) => {
      if (payload === null) return { habit: currentHabit, muscleId: null };
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
      clearSelfCarePose();
      setPose(step.pose || null, 1, { cyclic: false });
      fascia.clearReleaseTool?.();
      fascia.clearTriggerPoint?.();
      fascia.clear();
      viewer.setXRayMode?.(false);
      syncDeepContext(activeStepIds);
      viewer.highlight(step.focus || []);
      viewer.ghostOthers([...ids]);
      fascia.showStep(step, LINES);
      unifiedSheets.showStep(step);
      const isHeadFaceStep = (step.focus || []).some((id) => HEAD_FACE_JAW_IDS.has(id));
      const contextIds = isHeadFaceStep
        ? ['platysma', 'sternocleidomastoid', 'masseter', 'temporalis']
        : ['pectoralis-major', 'sternocleidomastoid', 'gluteus-maximus'];
      const focusIds = [...new Set([...activeStepIds, ...contextIds])];
      viewer.focus(focusIds.length ? focusIds : [...ids], {
        view: step.view || (line && LINE_VIEW[line.id]) || 'front',
      });
    };
    const selectStory = (id) => {
      const story = storyById.get(typeof id === 'object' ? id?.id : id);
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
    const hasMuscleInList = (list, targetId) =>
      Array.isArray(list) &&
      list.some((item) =>
        typeof item === 'string'
          ? item === targetId
          : Boolean(item && (item.id === targetId || item.muscleId === targetId || item.muscle === targetId)),
      );
    const findBestHabitForMuscle = (muscleId) => {
      if (!muscleId) return null;
      const candidates = [...habitById.values()];
      for (const hb of candidates) {
        if (hasMuscleInList(hb?.shortenCore, muscleId)) return hb;
      }
      for (const hb of candidates) {
        const tl = hb?.triggerLine || hb?.goldenLine;
        if (hasMuscleInList(tl?.triggerPoints, muscleId) || hasMuscleInList(hb?.shorten, muscleId)) return hb;
      }
      for (const hb of candidates) {
        if (hasMuscleInList(hb?.lengthen, muscleId) || hasMuscleInList(hb?.chain, muscleId)) return hb;
      }
      return null;
    };
    const inspectStructure = (id, { focusCamera = false, side = null, preserveHabitOverlay = false } = {}) => {
      if (!id) return;
      const lines = LINES.filter((l) => (l.track || []).includes(id));
      const metaInfo = viewer.info?.(id);
      const name = names[id] || metaInfo?.nameJa || '';
      const kind = metaInfo?.kind || viewer.kindOf?.(id) || 'muscle';
      const detail = kind === 'muscle' ? getAnatomyDetail(id) : null;
      const bestHabit = kind === 'muscle' ? findBestHabitForMuscle(id) : null;
      const resolvedSide = side === 'L' || side === 'R' ? side : currentHabit?.side || 'both';
      const chainData =
        kind === 'muscle' && computeMyofascialChain ? computeMyofascialChain(id, { side: resolvedSide }) : null;
      lastPart = id;
      if (!preserveHabitOverlay) {
        ui.showPart({
          id,
          name,
          kind,
          action: detail?.action || (kind === 'bone' ? '筋肉や筋膜の張力を受け止めて姿勢を支える骨格です。' : ''),
          relatedHabit: bestHabit ? { id: bestHabit.id, label: bestHabit.label } : null,
        });
      }
      if (kind === 'muscle' && chainData && !preserveHabitOverlay) {
        const involvedLines = (chainData.involvedLineIds || []).map((lid) => lineById.get(lid)).filter(Boolean);
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
          ...allChainIds,
        ]);
        syncDeepContext(allChainIds);
        viewer.ghostOthers([...keepSet]);
        fascia.clearReleaseTool?.();
        fascia.clearTriggerPoint?.();
        const chainSpec = {
          seedId: chainData.seedMuscleId || id,
          shortenCore: chainData.shortenCore,
          shortenLinked: chainData.shortenLinked,
          lengthenAntagonist: chainData.lengthenAntagonist,
          lengthenLinked: chainData.lengthenLinked,
          bridges: chainData.bridges || chainData.stationBridges || [],
          lines: involvedLines.length ? involvedLines : lines,
          side: resolvedSide,
        };
        fascia.showMuscleChain?.(chainSpec);
        fascia.setProgress?.(DEFAULT_HABIT_PROGRESS);
        unifiedSheets.showMuscleChain?.(chainSpec);
        viewer.highlight([id], '#BF6450', { side: resolvedSide });
        if (focusCamera) {
          viewer.focus([...new Set(allChainIds)], {
            view: viewForReleaseTarget(id, currentHabit, { side: resolvedSide }),
            side: resolvedSide,
            inspectorOpen: true,
          });
        }
      } else {
        viewer.highlight([id], kind === 'muscle' ? '#BF6450' : '#9E6B4B', { side: resolvedSide });
        if (focusCamera) {
          viewer.focus([id], {
            view: kind === 'muscle' ? viewForReleaseTarget(id, currentHabit, { side: resolvedSide }) : undefined,
            side: resolvedSide,
            inspectorOpen: true,
          });
        }
      }
    };
    viewer.onPick(
      safe((id, picked) => {
        inspectStructure(id, {
          focusCamera: false,
          side: picked?.side || null,
          preserveHabitOverlay: false,
        });
      }, '部位タップ連鎖'),
    );
    ui.on('theme', safe(applyTheme, 'テーマ切替'));
    ui.on('unified-layer', safe(applyUnifiedLayer, '筋膜・筋肉レイヤー切替'));
    ui.on(
      'play-toggle',
      safe((paused) => {
        setPosePaused(paused);
        fascia.setPaused?.(paused);
        viewer.wake?.();
      }, '一時停止・再生切替'),
    );
    ui.on('line', safe(selectLine, 'ライン選択'));
    ui.on(
      'all-lines',
      safe(() => {
        clearAll({ camera: true });
        viewer.showAll();
      }, '全11本ライン表示'),
    );
    ui.on('habit', safe(selectHabit, '動作選択'));
    ui.on('story', safe(selectStory, 'ストーリー選択'));
    ui.on(
      'inspect',
      safe((id) => {
        inspectStructure(id, { focusCamera: true, preserveHabitOverlay: false });
      }, '筋肉フォーカス'),
    );
    ui.on(
      'step',
      safe((index) => {
        if (currentStory) applyStep(currentStory, index);
      }, 'ストーリーステップ切替'),
    );
    ui.on(
      'trigger-point',
      safe((payload) => {
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
      }, '部位スポットライト'),
    );
    ui.on(
      'trigger-line',
      safe((payload) => {
        const resolvedId = typeof payload === 'string' ? payload : payload?.habitId || payload?.id;
        const habit = (resolvedId && habitById.get(resolvedId)) || currentHabit;
        returnToTriggerLine(habit);
      }, '全体アニメーションへ戻す'),
    );
    const handleSelfCareStep = (payload, defaultFirst = false) => {
      const { habit, muscleId } = resolveTriggerPointPayload(payload, defaultFirst);
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
      } else {
        clearSelfCarePose();
        fascia.clearReleaseTool?.();
      }
    };
    ui.on('selfcare', safe((payload) => handleSelfCareStep(payload, true), 'セルフケア開始'));
    ui.on('selfcare-step', safe((payload) => handleSelfCareStep(payload, false), 'セルフケア手順切替'));
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
      'part-close',
      safe(() => {
        if (mode === 'habit' && currentHabit) {
          returnToTriggerLine(currentHabit);
        } else {
          clearAll({ camera: true });
          viewer.showAll();
        }
      }, '部位バナーを閉じる'),
    );
    ui.on(
      'reset',
      safe(() => {
        clearAll({ camera: true });
        viewer.showAll();
        ui.resetHome?.();
      }, 'ホームリセット'),
    );
    ui.hideLoading();
    const habitParam = String(searchParams.get('habit') || '').trim();
    const symptomParam = String(searchParams.get('symptom') || '').trim();
    const motionParam = String(searchParams.get('motion') || '').trim();
    const lineParam = String(searchParams.get('line') || '').trim().toUpperCase();
    const resolvedHabitId =
      (habitParam && habitById.has(habitParam) && habitParam) ||
      (symptomParam && (SYMPTOM_TO_HABIT_MAP[symptomParam] || (habitById.has(symptomParam) ? symptomParam : ''))) ||
      (motionParam && (MOTION_TO_HABIT_MAP[motionParam] || (habitById.has(motionParam) ? motionParam : ''))) ||
      '';
    if (resolvedHabitId && habitById.has(resolvedHabitId)) {
      selectHabit(resolvedHabitId);
    } else if (lineParam && lineById.has(lineParam)) {
      selectLine(lineParam);
    } else {
      setPose(null, 0, { immediate: true });
      unifiedSheets.showAllLines();
    }
    const isLocalDev = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (isLocalDev) {
      window.__studioBridge = {
        viewer,
        fascia,
        unifiedSheets,
        posture,
        ui,
        applyUnifiedLayer,
        applyTheme,
        selectHabit,
        selectLine,
        selectStory,
        inspectStructure,
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
        HABITS,
        FEELINGS,
        STORIES,
        OCCUPATIONS,
        MUSCLE_LAYERS,
      };
      window.__app = Object.freeze({
        viewer,
        fascia,
        unifiedSheets,
        ui,
        LINES,
        HABITS,
        FEELINGS,
        STORIES,
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
      'color:#1E2420;background:#FAF8F5;font:15px/1.6 system-ui,sans-serif;text-align:center;z-index:9999';
    document.body.appendChild(box);
  }
}
start();