// =============================================================================
// ui.js — アナトミー筋膜・筋肉 3D（一体型 3ステップ統合UI v=20261118c）
// ・トップヘッダー（通常｜ダーク）＆ ステージ直下バー（［筋膜｜筋肉］＋［一時停止］）連携
// ・常設3ステップ進捗バー：［ ① 選ぶ ］ → ［ ② 原因と動き ］ → ［ ③ ゆるめる順番 ］
// ・全端末で文字被り 0px・途中省略（…）0箇所・タップ領域 44px 以上
// =============================================================================

import { SAFETY_NOTICE } from './monetize_config.js?v=20261118c';
import { getAllowedToolsAndDefault, resolveCareProfile } from './selfcare_guide3d.js?v=20261118c';

const DISCLAIMER_TEXT =
  SAFETY_NOTICE?.shortDisclaimer ||
  '※本アプリは姿勢と筋膜・筋肉のつながりを学ぶセルフケア図鑑であり、医師の診断・治療に代わるものではありません。強い痛みやしびれがある場合は中止してください。';

/* -------------------------------------------------------------------------- */
/* アイコン・定数辞書                                                          */
/* -------------------------------------------------------------------------- */

const ICONS = {
  feel: '<path d="M13 2.5 5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z" fill="currentColor" fill-opacity="0.18"/>',
  habit:
    '<rect x="3" y="7" width="18" height="13" rx="2.2" fill="currentColor" fill-opacity="0.18"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  line:
    '<circle cx="5" cy="18" r="2.6" fill="currentColor" fill-opacity="0.22"/><circle cx="12" cy="11" r="2.6" fill="currentColor" fill-opacity="0.22"/><circle cx="19" cy="5" r="2.6" fill="currentColor" fill-opacity="0.22"/><path d="M7.2 16.2 9.8 13.2M14.2 9.2 16.8 6.8" stroke-width="2.1"/>',
  story:
    '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-7l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z" fill="currentColor" fill-opacity="0.16"/><path d="M8 9.5h8M8 12.5h5"/>',
  work:
    '<rect x="4" y="5" width="16" height="11" rx="1.8" fill="currentColor" fill-opacity="0.18"/><path d="M2 19h20"/>',
  sports:
    '<ellipse cx="10" cy="9" rx="5.2" ry="6.2" transform="rotate(-35 10 9)" fill="currentColor" fill-opacity="0.18"/><path d="M14 13l6 6"/><circle cx="18.5" cy="6.5" r="2" fill="currentColor" fill-opacity="0.26"/>',
  posture:
    '<circle cx="10.6" cy="5.8" r="2.3" fill="currentColor" fill-opacity="0.18"/><path d="M4 11.5a2 2 0 0 1 2-2h1.6v6H19a1.5 1.5 0 0 1 1.5 1.5v1.8H4v-7.3Z" fill="currentColor" fill-opacity="0.16"/><path d="M9.2 8c-1.7 2.2-1.3 5 1.5 6.5h4.6l2 3.5"/>',
  housework:
    '<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5Z" fill="currentColor" fill-opacity="0.18"/><path d="M9.5 21.5v-6h5v6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5 20 20"/>',
  play: '<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8Z" fill="currentColor" stroke="none"/>',
};

const FEEL_REGIONS = [
  {
    id: 'neck',
    label: '首・あご・頭',
    sub: '首の詰まり・食いしばり・うつむき首など',
  },
  {
    id: 'shoulder',
    label: '肩・腕・手',
    sub: '肩の重さ・腕の上げづらさ・手首や親指など',
  },
  {
    id: 'back',
    label: '胸・背中・肩甲骨',
    sub: '背中の張り・巻き肩・呼吸の浅さなど',
  },
  {
    id: 'waist',
    label: '腰・骨盤・お尻',
    sub: '座り腰の重さ・反り腰・お尻の奥の張りなど',
  },
  {
    id: 'leg',
    label: '股関節・ひざ・足',
    sub: '股関節の詰まり・前もも・ふくらはぎ・足裏など',
  },
];

const EXTRA_LEG_FEELING = {
  id: 'front-thigh-knee',
  partGroup: 'leg',
  partBadge: '前もも・ひざ',
  tag: '前もも・ひざの張り',
  label: '階段や立ち仕事で、前ももやひざまわりが張る',
  habits: ['soccer-kick', 'sway-back', 'running-strike', 'cycling-aero'],
};

const HABIT_CATEGORIES_4 = [
  {
    id: 'work',
    icon: 'work',
    label: '仕事・デスクの動き',
    sub: 'パソコン・マウス・美容師・介護施術・建築運転・立ち仕事',
  },
  {
    id: 'sports',
    icon: 'sports',
    label: 'スポーツ・運動の動き',
    sub: 'ゴルフ・テニス・球技・ラン・自転車・筋トレ・水泳・ヨガ',
  },
  {
    id: 'posture',
    icon: 'posture',
    label: '日常の姿勢・クセ',
    sub: '足組み・スマホ首・ソファー・寝転び・片足立ち・カバン・寝姿勢',
  },
  {
    id: 'housework',
    icon: 'housework',
    label: '家事・育児の動き',
    sub: '掃除・洗い物・抱っこ・ベビーカー・洗濯干し',
  },
];

const POSTURE_HABIT_IDS = new Set([
  'leg-cross-r',
  'leg-cross-l',
  'phone-neck',
  'sofa-slouch',
  'phone-bed-side',
  'stand-hip-r',
  'stand-hip-l',
  'arms-fold',
  'bag-shoulder-r',
  'sleep-side-curl',
  'teeth-clench-night',
  'floor-sit-cross',
  'heels-commute-walk',
  'sway-back',
]);

const HOUSEWORK_HABIT_IDS = new Set([
  'vacuum-dish-bend',
  'childcare-hip-l',
  'stroller-cart-push',
  'laundry-reach',
]);

const TOOL_LABEL = {
  hand: '🤲 指でやる',
  ball: '🎾 ボール',
  roller: '🛞 ローラー',
  pole: '🛞 ローラー',
};

const RELEASE_TOOLS = [
  { id: 'hand', label: TOOL_LABEL.hand, motion: 'stroke' },
  { id: 'ball', label: TOOL_LABEL.ball, motion: 'circle' },
  { id: 'roller', label: TOOL_LABEL.roller, motion: 'roll' },
];

const DEFAULT_MUSCLE_TOOL = {
  'abductor-pollicis-brevis': 'ball',
  'flexor-pollicis-longus': 'ball',
  'biceps-brachii': 'roller',
  'brachioradialis': 'roller',
  'triceps-brachii': 'roller',
  'pronator-teres': 'ball',
  'extensor-carpi-radialis-longus': 'ball',
  'extensor-carpi-radialis-brevis': 'ball',
  'extensor-digitorum': 'ball',
  'flexor-carpi-radialis': 'ball',
  'flexor-carpi-ulnaris': 'ball',
  'flexor-digitorum-superficialis': 'ball',
  'pectoralis-minor': 'ball',
  'pectoralis-major': 'ball',
  'subclavius': 'hand',
  'coracobrachialis': 'ball',
  'subscapularis': 'hand',
  'sternocleidomastoid': 'hand',
  'scalenus-anterior': 'hand',
  'scalenus-medius': 'hand',
  'platysma': 'hand',
  'masseter': 'hand',
  'temporalis': 'hand',
  'rectus-capitis-posterior-major': 'ball',
  'rectus-capitis-posterior-minor': 'ball',
  'obliquus-capitis-inferior': 'ball',
  'splenius-capitis': 'ball',
  'splenius-cervicis': 'ball',
  'latissimus-dorsi': 'roller',
  'serratus-anterior': 'ball',
  'teres-minor': 'ball',
  'deltoid': 'ball',
  'supraspinatus': 'ball',
  'infraspinatus': 'ball',
  'levator-scapulae': 'ball',
  'rhomboid-major': 'ball',
  'rhomboid-minor': 'ball',
  'trapezius': 'ball',
  'diaphragm': 'hand',
  'rectus-abdominis': 'hand',
  'psoas-major': 'hand',
  'iliacus': 'hand',
  'pectineus': 'ball',
  'quadratus-lumborum': 'ball',
  'biceps-femoris': 'roller',
  'semitendinosus': 'roller',
  'semimembranosus': 'roller',
  'gluteus-maximus': 'ball',
  'gluteus-medius': 'ball',
  'gluteus-minimus': 'ball',
  'piriformis': 'ball',
  'tensor-fasciae-latae': 'roller',
  'external-oblique': 'roller',
  'internal-oblique': 'hand',
  'gastrocnemius': 'roller',
  'soleus': 'roller',
  'tibialis-anterior': 'roller',
  'tibialis-posterior': 'ball',
  'fibularis-longus': 'roller',
  'fibularis-brevis': 'roller',
  'flexor-digitorum-brevis': 'ball',
  'abductor-digiti-minimi-foot': 'ball',
  'flexor-hallucis-longus': 'ball',
  'popliteus': 'hand',
  'rectus-femoris': 'roller',
  'vastus-lateralis': 'roller',
  'vastus-medialis': 'roller',
  'adductor-longus': 'roller',
  'adductor-magnus': 'roller',
  'adductor-brevis': 'ball',
  'erector-spinae': 'roller',
  'longissimus': 'roller',
  'iliocostalis': 'roller',
  'multifidus': 'ball',
};

const FRIENDLY_TP_LABELS = {
  'abductor-pollicis-brevis': '親指のふくらみ',
  'flexor-pollicis-longus': '親指の奥',
  'biceps-brachii': '力こぶ',
  'brachioradialis': '肘の外側',
  'triceps-brachii': '二の腕',
  'pronator-teres': '肘の内側',
  'extensor-carpi-radialis-longus': '前腕の外側',
  'extensor-carpi-radialis-brevis': '前腕の外側',
  'extensor-digitorum': '手の甲〜前腕',
  'flexor-carpi-radialis': '前腕の内側',
  'flexor-carpi-ulnaris': '前腕の小指側',
  'flexor-digitorum-superficialis': '前腕の手のひら側',
  'pectoralis-minor': '鎖骨の下（胸の奥）',
  'pectoralis-major': '胸の前',
  'subclavius': '鎖骨のすぐ下',
  'coracobrachialis': '肩の前の奥',
  'subscapularis': '脇の奥',
  'sternocleidomastoid': '耳の下〜首の前',
  'scalenus-anterior': '首の横',
  'scalenus-medius': '首の横',
  'platysma': 'あご下〜首すじ',
  'masseter': 'エラの筋肉',
  'temporalis': 'こめかみ',
  'rectus-capitis-posterior-major': '後頭部の付け根',
  'rectus-capitis-posterior-minor': '後頭部の付け根',
  'obliquus-capitis-inferior': '後頭部の付け根',
  'latissimus-dorsi': '脇の下〜背中',
  'serratus-anterior': '脇腹・あばら横',
  'teres-minor': '肩のうしろ（脇上）',
  'deltoid': '肩の丸み',
  'supraspinatus': '肩甲骨の上',
  'infraspinatus': '肩甲骨のうしろ',
  'levator-scapulae': '首の付け根〜肩甲骨',
  'rhomboid-major': '肩甲骨のあいだ',
  'rhomboid-minor': '肩甲骨のあいだ',
  'trapezius': '肩の上〜背中',
  'diaphragm': 'みぞおち・あばら下',
  'rectus-abdominis': 'おなかの前',
  'psoas-major': 'おなかの奥（股関節前）',
  'iliacus': '骨盤の内側',
  'pectineus': '足の付け根の内側',
  'quadratus-lumborum': '腰の横奥',
  'biceps-femoris': 'もも裏（外側）',
  'semitendinosus': 'もも裏（内側）',
  'semimembranosus': 'もも裏（内側）',
  'gluteus-maximus': 'お尻のふくらみ',
  'gluteus-medius': 'お尻の横',
  'gluteus-minimus': 'お尻の横の奥',
  'piriformis': 'お尻のえくぼ奥',
  'tensor-fasciae-latae': '骨盤の横前',
  'external-oblique': 'わき腹',
  'internal-oblique': 'わき腹の奥',
  'gastrocnemius': 'ふくらはぎ',
  'soleus': 'ふくらはぎの奥',
  'tibialis-anterior': 'すねの前',
  'tibialis-posterior': '内くるぶしの奥',
  'fibularis-longus': 'すねの外側',
  'fibularis-brevis': '外くるぶしの上',
  'flexor-digitorum-brevis': '足の裏',
  'abductor-digiti-minimi-foot': '足裏の外側',
  'flexor-hallucis-longus': '足裏〜ふくらはぎ奥',
  'popliteus': 'ひざ裏',
  'rectus-femoris': '前もも',
  'vastus-lateralis': '前ももの外側',
  'vastus-medialis': '前ももの内側',
  'adductor-longus': '内もも',
  'adductor-magnus': '内ももの奥',
  'adductor-brevis': '内ももの上',
  'longissimus': '背骨の両わき',
  'iliocostalis': '背中のわき',
  'multifidus': '腰骨のきわ',
  'semispinalis': '首のうしろ',
  'splenius-capitis': '首〜後頭部',
  'splenius-cervicis': '首のうしろ',
  'calcaneal-tendon': 'アキレス腱',
  'epicranial-aponeurosis': '頭のてっぺんの膜',
  'frontalis': 'おでこ',
  'occipitalis': '頭のうしろ',
  'spinalis': '背骨のきわ',
  'extensor-digitorum-brevis': '足の甲',
  'extensor-hallucis-brevis': '足の親指の甲',
  'extensor-digitorum-longus': 'すね前〜足の甲',
  'extensor-hallucis-longus': 'すね前〜親指',
  'vastus-intermedius': '前ももの奥',
  'pyramidalis': '下腹の前',
  'external-intercostals': 'あばらの間',
  'internal-intercostals': 'あばらの奥',
  'linea-alba': 'おなかの真ん中',
  'flexor-digitorum-longus': 'すね裏の奥',
  'adductor-minimus': '内ももの付け根',
  'pubococcygeus': '骨盤の底',
  'iliococcygeus': '骨盤の底',
  'transversus-thoracis': '胸の骨の裏',
  'longus-colli': '首の骨の前',
  'longus-capitis': '首の前奥',
  'sternohyoid': 'のどの前',
  'omohyoid': 'のど〜肩甲骨',
  'mylohyoid': 'あごの下',
  'digastric': 'あご下の奥',
  'palmaris-longus': '手首の真ん中',
  'flexor-digitorum-profundus': '前腕の奥',
  'lumbricals-hand': '手のひらの奥',
  'brachialis': '力こぶの奥',
  'flexor-pollicis-brevis': '親指の付け根',
  'opponens-pollicis': '親指のふくらみ奥',
  'anconeus': '肘のうしろ',
  'extensor-digiti-minimi': '前腕の小指側',
  'extensor-carpi-ulnaris': '手首の小指側',
  'abductor-digiti-minimi-hand': '手の小指側',
  'flexor-digiti-minimi-brevis-hand': '小指のふくらみ',
};

const DELICATE_MUSCLE_SAFETY = {
  sternocleidomastoid:
    '首の前・横には大切な血管や神経が通っています。強い器具で押さず、指の腹で皮膚をやさしく撫でる程度にしてください。',
  'scalenus-anterior':
    '首の横には腕へつながる神経が集まっています。しびれが出る強さでは押さず、やさしい力加減でゆったり呼吸しながら行ってください。',
  'scalenus-medius':
    '首の横には腕へつながる神経が集まっています。しびれが出る強さでは押さず、やさしい力加減でゆったり呼吸しながら行ってください。',
  platysma:
    '首すじはとてもデリケートです。器具を押し当てず、手のひらでやさしくなで下ろすようにゆるめてください。',
  'psoas-major':
    'おなかの奥は強く押し込まず、息をゆっくり吐きながら心地よい範囲で行ってください（食後すぐや妊娠中はお控えください）。',
  iliacus:
    '骨盤の内側は強く押し込まず、息を吐きながらじんわり心地よい強さでゆるめてください。',
  diaphragm:
    'みぞおち・あばら下は骨や内臓に近い場所です。硬い器具で押さず、指の腹で息を吐きながらやさしく触れてください。',
  popliteus:
    'ひざ裏の中央には血管や神経が通っています。強い力で押し込まず、心地よい手前のやさしい強さで行ってください。',
  subscapularis:
    '脇の奥には腕へ向かう神経や血管があります。しびれや鋭い痛みを感じる場所は避け、やさしい強さで行ってください。',
  subclavius:
    '鎖骨のすぐ下は神経や血管に近い場所です。指の腹でやさしくくるくる撫でるようにゆるめてください。',
};

/* -------------------------------------------------------------------------- */
/* DOM 生成ヘルパー                                                            */
/* -------------------------------------------------------------------------- */

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv != null) el.style.setProperty(sk, String(sv));
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v);
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

const iconCache = new Map();
function icon(name, cls = '') {
  const key = `${name}|${cls}`;
  let proto = iconCache.get(key);
  if (!proto) {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.habit}</svg>`;
    proto = t.content.firstChild;
    iconCache.set(key, proto);
  }
  return proto.cloneNode(true);
}

function cleanTitle(str) {
  return String(str || '')
    .replace(/ゴールデンライン/g, 'トリガーライン')
    .replace(/^[^\p{L}\p{N}①②③④⑤]+\s*/u, '')
    .trim();
}

function sanitizeText(str) {
  return String(str || '')
    .replace(/ゴールデンライン/g, 'トリガーライン')
    .replace(/^[⚠️⚠\uFE0F\s]+/u, '')
    .trim();
}

function normalizeToolId(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'pole' || s === 'roller') return 'roller';
  if (s === 'ball') return 'ball';
  return 'hand';
}

/* -------------------------------------------------------------------------- */
/* UI 本体                                                                     */
/* -------------------------------------------------------------------------- */

export function createUI({
  lines = [],
  habits = [],
  feelings = [],
  stories = [],
  triggerLines = [],
  goldenLines = [],
  names = null,
} = {}) {
  lines = Array.isArray(lines) ? lines : [];
  habits = Array.isArray(habits) ? habits : [];
  feelings = Array.isArray(feelings) ? feelings : [];
  stories = Array.isArray(stories) ? stories : [];
  const rawTriggerLines =
    Array.isArray(triggerLines) && triggerLines.length
      ? triggerLines
      : Array.isArray(goldenLines)
        ? goldenLines
        : [];

  const root = document.getElementById('ui-root') || document.body;
  root.textContent = '';

  /* ---------- イベントディスパッチャ ---------- */
  const handlers = new Map();
  function on(event, cb) {
    if (typeof cb !== 'function') return () => {};
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(cb);
    return () => handlers.get(event)?.delete(cb);
  }
  function emit(event, ...args) {
    handlers.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[ui] '${event}' ハンドラーでエラー`, err);
      }
    });
  }

  /* ---------- データ辞書構築 ---------- */
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const habitById = new Map(habits.map((hb) => [hb.id, hb]));
  const storyById = new Map(stories.map((s) => [s.id, s]));
  const triggerLineById = new Map();
  for (const tl of rawTriggerLines) {
    if (tl && (tl.id || tl.code)) triggerLineById.set(tl.id || tl.code, tl);
  }
  for (const hb of habits) {
    const tl = hb?.triggerLine || hb?.goldenLine;
    if (tl && typeof tl === 'object') {
      const key = tl.id || tl.code || hb.triggerLineId || hb.goldenLineId;
      if (key && !triggerLineById.has(key)) triggerLineById.set(key, tl);
    }
  }

  const resolveLine = (x) => (x && typeof x === 'object' ? x : lineById.get(x) || null);
  const resolveHabit = (x) => (x && typeof x === 'object' ? x : habitById.get(x) || null);
  const resolveStory = (x) => (x && typeof x === 'object' ? x : storyById.get(x) || null);
  const resolveTriggerLine = (x) => (x && typeof x === 'object' ? x : triggerLineById.get(x) || null);

  const nameOf = (id) => {
    if (!names || !id) return '';
    if (typeof names === 'function') return names(id) || '';
    if (names instanceof Map) return names.get(id) || '';
    const v = names[id];
    return typeof v === 'string' ? v : v?.nameJa || '';
  };

  const shortMuscleNameOf = (id, preferred = '') => {
    const cleanPref = String(preferred || '').replace(/^[①②③④⑤1-5１-５][.．、\s]*/u, '').trim();
    if (cleanPref) return sanitizeText(cleanPref);
    if (id && FRIENDLY_TP_LABELS[id]) return FRIENDLY_TP_LABELS[id];
    return nameOf(id) || id || '';
  };

  /* ---------- 17違和感リスト構築＆5部位分類 ---------- */
  const allFeelings = [...feelings];
  if (
    !allFeelings.some((f) => f.id === EXTRA_LEG_FEELING.id || String(f.label || '').includes('前もも')) &&
    EXTRA_LEG_FEELING.habits.some((hid) => habitById.has(hid))
  ) {
    allFeelings.push(EXTRA_LEG_FEELING);
  }

  function classifyFeelingRegion(f) {
    const pg = String(f?.partGroup || '').toLowerCase();
    if (pg === 'neck' || pg === 'head' || pg === 'jaw') return 'neck';
    if (pg === 'shoulder' || pg === 'arm' || pg === 'hand') return 'shoulder';
    if (pg === 'back' || pg === 'chest') return 'back';
    if (pg === 'waist' || pg === 'hip' || pg === 'pelvis') return 'waist';
    if (pg === 'leg' || pg === 'foot' || pg === 'knee') return 'leg';

    const txt = `${f?.partBadge || ''} ${f?.tag || ''} ${f?.label || ''}`;
    if (/(首|あご|顎|頭|目|こめかみ|食いしば)/.test(txt)) return 'neck';
    if (/(肩甲骨|背中|胸|呼吸|息|巻き肩|猫背)/.test(txt) && !/(腕|手首|親指)/.test(txt)) return 'back';
    if (/(肩|腕|肘|手首|親指|指)/.test(txt)) return 'shoulder';
    if (/(股関節|もも|ひざ|膝|ふくらはぎ|すね|足裏|かかと|足首)/.test(txt)) return 'leg';
    return 'waist';
  }

  /* ---------- 全45動作の4分類（漏れ・重複 0件） ---------- */
  function classifyHabitCategory4(hb) {
    if (!hb) return 'work';
    if (HOUSEWORK_HABIT_IDS.has(hb.id)) return 'housework';
    const occText = `${hb.occupation || ''} ${hb.group || ''}`;
    if (/(家事|育児)/.test(occText)) return 'housework';
    if (
      /(スポーツ|ゴルフ|球技|ラケット|テニス|野球|バレー|バスケ|ラン|サッカー|自転車|筋トレ|ワークアウト|ジム|水泳|ヨガ|ピラティス|登山)/.test(
        `${occText} ${hb.label || ''}`,
      )
    ) {
      return 'sports';
    }
    if (POSTURE_HABIT_IDS.has(hb.id) || /(姿勢|睡眠|カバン|日常)/.test(occText)) {
      return 'posture';
    }
    return 'work';
  }

  const habitsByCat4 = {
    work: [],
    sports: [],
    posture: [],
    housework: [],
  };
  for (const hb of habits) {
    const cat = classifyHabitCategory4(hb);
    habitsByCat4[cat].push(hb);
  }

  /* ---------- 因果解説・主要部位・セルフケア手順データ解決 ---------- */
  function extractHabitTriggerPoints(hb) {
    if (!hb) return [];
    const tl = hb.triggerLine || hb.goldenLine || resolveTriggerLine(hb.triggerLineId || hb.goldenLineId);
    const arrowPath = Array.isArray(tl?.arrowPath) ? tl.arrowPath : [];
    const rawSource =
      Array.isArray(hb.triggerPoints) && hb.triggerPoints.length
        ? hb.triggerPoints
        : Array.isArray(tl?.triggerPoints) && tl.triggerPoints.length
          ? tl.triggerPoints
          : Array.isArray(hb.selfCare?.targetMuscles) && hb.selfCare.targetMuscles.length
            ? hb.selfCare.targetMuscles
            : Array.isArray(tl?.rootMuscles) && tl.rootMuscles.length
              ? tl.rootMuscles
              : [...(hb.shortenCore || []), ...(hb.shorten || [])];

    const nums = ['①', '②', '③'];
    const seen = new Set();
    const list = [];
    for (const item of rawSource) {
      if (list.length >= 3) break;
      const id = typeof item === 'string' ? item : item?.muscleId || item?.id || item?.muscle || '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const pref =
        typeof item === 'object' && item
          ? item.easyLabel || item.shortName || item.label || item.name || ''
          : '';
      const shortLabel = shortMuscleNameOf(id, pref);
      const stepStr = typeof item === 'object' && item?.step ? item.step : '';
      const explicitTool = typeof item === 'object' && item?.tool ? item.tool : DEFAULT_MUSCLE_TOOL[id] || '';
      const profile = resolveCareProfile(id, explicitTool || null, shortLabel);
      const arrowIdx = arrowPath.indexOf(id);
      const strokeTarget =
        (typeof item === 'object' && item?.strokeTarget) ||
        (arrowIdx >= 0 && arrowIdx + 1 < arrowPath.length ? arrowPath[arrowIdx + 1] : null);
      list.push({
        id,
        num: nums[list.length] || `${list.length + 1}`,
        shortLabel,
        step: stepStr,
        durationSec: typeof item === 'object' && Number(item?.durationSec) > 0 ? Number(item.durationSec) : 30,
        tool: profile.tool,
        motion: profile.motion,
        strokeTarget,
      });
    }
    return list;
  }

  function resolveShortenMuscles(hb) {
    const tl = hb?.triggerLine || hb?.goldenLine || resolveTriggerLine(hb?.triggerLineId || hb?.goldenLineId);
    const ids = [
      ...(hb?.shortenCore || []),
      ...(tl?.shortenCore || []),
      ...(hb?.shorten || []),
      ...(hb?.shortenLinked || []),
    ];
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = typeof raw === 'string' ? raw : raw?.id || raw?.muscleId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, label: shortMuscleNameOf(id) });
      if (out.length >= 4) break;
    }
    return out;
  }

  function resolveLengthenMuscles(hb, excludeIds = new Set()) {
    const tl = hb?.triggerLine || hb?.goldenLine || resolveTriggerLine(hb?.triggerLineId || hb?.goldenLineId);
    const ids = [
      ...(hb?.lengthenAntagonist || []),
      ...(tl?.lengthenAntagonist || []),
      ...(hb?.lengthen || []),
      ...(hb?.lengthenLinked || []),
    ];
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = typeof raw === 'string' ? raw : raw?.id || raw?.muscleId;
      if (!id || seen.has(id) || excludeIds.has(id)) continue;
      seen.add(id);
      out.push({ id, label: shortMuscleNameOf(id) });
      if (out.length >= 4) break;
    }
    return out;
  }

  function resolveCausalSummaryText(hb) {
    const tl = hb?.triggerLine || hb?.goldenLine || resolveTriggerLine(hb?.triggerLineId || hb?.goldenLineId);
    const explicit = sanitizeText(hb?.causalSummary || tl?.causalSummary || '');
    if (explicit) return explicit;
    if (hb?.why) return sanitizeText(hb.why);
    const sList = resolveShortenMuscles(hb).slice(0, 2).map((m) => m.label).join('や');
    const lList = resolveLengthenMuscles(hb).slice(0, 2).map((m) => m.label).join('や');
    if (sList && lList) {
      return `${sList}が縮んで固まることで、筋膜のつながりを伝って「${lList}」が引っぱられて張っています。`;
    }
    return sanitizeText(hb?.feel || '離れた場所の縮みが筋膜を伝わり、気になる場所を引っぱっています。');
  }

  function resolveSafetyNoteText(hb, muscleIds = []) {
    const tl = hb?.triggerLine || hb?.goldenLine || resolveTriggerLine(hb?.triggerLineId || hb?.goldenLineId);
    const explicit = sanitizeText(hb?.safetyNote || tl?.safetyNote || hb?.selfCare?.safetyNote || '');
    if (explicit) return explicit;
    for (const mid of muscleIds) {
      if (mid && DELICATE_MUSCLE_SAFETY[mid]) return DELICATE_MUSCLE_SAFETY[mid];
    }
    return '';
  }

  function buildSelfCareSteps(hb) {
    const raw = hb?.selfCare || {};
    const tpList = extractHabitTriggerPoints(hb);
    const targetMuscles = tpList.length
      ? tpList.map((tp) => tp.id)
      : Array.isArray(raw.targetMuscles) && raw.targetMuscles.length
        ? raw.targetMuscles
        : resolveShortenMuscles(hb).map((m) => m.id).slice(0, 3);

    const rawSteps =
      Array.isArray(raw.steps) && raw.steps.length
        ? raw.steps
        : tpList.length && tpList.some((tp) => tp.step)
          ? tpList.map((tp) => tp.step)
          : targetMuscles.map((mId) => `${shortMuscleNameOf(mId)}のまわりを心地よい強さで30秒ほぐします。`);

    const count = Math.max(targetMuscles.length, rawSteps.length, 1);
    const steps = [];
    const nums = ['①', '②', '③', '④'];
    for (let i = 0; i < Math.min(count, 3); i++) {
      const tp = tpList[i] || null;
      const st = rawSteps[i];
      const muscleId =
        (typeof st === 'object' && (st?.muscleId || st?.muscle || st?.target)) ||
        tp?.id ||
        targetMuscles[i] ||
        targetMuscles[0] ||
        '';
      const shortName = tp?.shortLabel || shortMuscleNameOf(muscleId);
      const rawStepStr =
        typeof st === 'string' ? st : st?.step || st?.text || st?.desc || tp?.step || '';
      const cleanStep = sanitizeText(rawStepStr).replace(/^[①②③④⑤1-5１-５][.．、\s]*/u, '').trim();

      let reqTool =
        (typeof st === 'object' && st?.tool) ||
        tp?.tool ||
        DEFAULT_MUSCLE_TOOL[muscleId] ||
        '';
      if (!reqTool) {
        if (/指|手/.test(cleanStep)) reqTool = 'hand';
        else if (/ローラー|ポール/.test(cleanStep)) reqTool = 'roller';
        else if (/ボール/.test(cleanStep)) reqTool = 'ball';
      }
      const profile = resolveCareProfile(muscleId, reqTool || null, shortName);
      const normTool = profile.tool;
      const hasMismatchedWord =
        (normTool === 'hand' && /(ボール|ローラー|ポール)/u.test(cleanStep)) ||
        (normTool === 'ball' && /(ローラー|ポール)/u.test(cleanStep)) ||
        (normTool === 'roller' && /ボール/u.test(cleanStep));
      const baseText = !cleanStep || hasMismatchedWord ? profile.guideText : cleanStep;
      const durSec = tp?.durationSec || 30;
      const nextTpId = tpList[i + 1]?.id || tpList[0]?.id || null;

      steps.push({
        index: i,
        num: nums[i] || `${i + 1}`,
        muscleId,
        shortName,
        initialTool: normTool,
        tool: normTool,
        motion: profile.motion,
        baseText,
        durationSec: durSec,
        strokeTarget: tp?.strokeTarget || nextTpId || null,
        userSwitchedTool: false,
      });
    }
    return steps;
  }

  /* ---------- UI ステート ---------- */
  const state = {
    step: 1, // 1: 選ぶ | 2: 原因と動き | 3: ゆるめる順番
    step1Route: 'home', // 'home' | 'feel-regions' | 'feel-list' | 'habit-cats' | 'habit-list' | 'stories' | 'lines'
    feelRegionId: 'neck',
    habitCatId: 'work', // 'work' | 'sports' | 'posture' | 'housework' | 'all'
    searchOpen: false,
    searchQuery: '',

    activeType: null, // 'habit' | 'story' | null
    currentHabit: null,
    currentStory: null,
    storyStepIdx: 0,
    feelingContext: null, // { label, habits: Habit[] } | null
    activeLineId: null, // Step1 'lines' 図鑑で選択中のラインID
    focusedRoleMuscleId: null, // Step2 2カラムカードで単体フォーカス中の筋肉ID
    pickedPart: null, // 3D直接タップ時のミニ部位バナー情報

    scSteps: [],
    scStepIndex: 0,

    unifiedLayer: 'fascia', // 'fascia' | 'muscle'
    theme: 'light', // 'light' | 'dark'
    paused: false,
  };

  /* ---------- 外部シェルボタン（index.html）結線 ---------- */
  const btnThemeLight = document.getElementById('btn-theme-light');
  const btnThemeDark = document.getElementById('btn-theme-dark');
  const btnLayerFascia = document.getElementById('btn-layer-fascia');
  const btnLayerMuscle = document.getElementById('btn-layer-muscle');
  const btnPlayToggle = document.getElementById('btn-play-toggle');
  const btnPlayLabel = document.getElementById('btn-play-label');
  const stageLoader = document.getElementById('stage-loader');
  const stageLoaderText = document.getElementById('stage-loader-text');
  const stageLoaderFill = document.getElementById('stage-loader-fill');
  const metaThemeColor = document.getElementById('meta-theme-color');

  function applyThemeDOM(themeMode) {
    const next = themeMode === 'dark' ? 'dark' : 'light';
    state.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', next === 'dark' ? '#0B132B' : '#FAF8F5');
    }
    if (btnThemeLight) {
      const on = next === 'light';
      btnThemeLight.classList.toggle('is-active', on);
      btnThemeLight.setAttribute('aria-pressed', String(on));
    }
    if (btnThemeDark) {
      const on = next === 'dark';
      btnThemeDark.classList.toggle('is-active', on);
      btnThemeDark.setAttribute('aria-pressed', String(on));
    }
  }

  function applyUnifiedLayerDOM(layerMode) {
    const next = layerMode === 'muscle' ? 'muscle' : 'fascia';
    state.unifiedLayer = next;
    if (btnLayerFascia) {
      const on = next === 'fascia';
      btnLayerFascia.classList.toggle('is-active', on);
      btnLayerFascia.setAttribute('aria-pressed', String(on));
    }
    if (btnLayerMuscle) {
      const on = next === 'muscle';
      btnLayerMuscle.classList.toggle('is-active', on);
      btnLayerMuscle.setAttribute('aria-pressed', String(on));
    }
  }

  function applyPausedDOM(paused) {
    state.paused = Boolean(paused);
    if (btnPlayToggle) {
      btnPlayToggle.classList.toggle('is-paused', state.paused);
      btnPlayToggle.setAttribute('aria-pressed', String(state.paused));
    }
    if (btnPlayLabel) {
      btnPlayLabel.textContent = state.paused ? '▶ 再生' : '一時停止';
    }
  }

  btnThemeLight?.addEventListener('click', () => {
    if (state.theme === 'light') return;
    applyThemeDOM('light');
    emit('theme', 'light');
  });
  btnThemeDark?.addEventListener('click', () => {
    if (state.theme === 'dark') return;
    applyThemeDOM('dark');
    emit('theme', 'dark');
  });

  btnLayerFascia?.addEventListener('click', () => {
    if (state.unifiedLayer === 'fascia') return;
    applyUnifiedLayerDOM('fascia');
    emit('unified-layer', 'fascia');
  });
  btnLayerMuscle?.addEventListener('click', () => {
    if (state.unifiedLayer === 'muscle') return;
    applyUnifiedLayerDOM('muscle');
    emit('unified-layer', 'muscle');
  });

  btnPlayToggle?.addEventListener('click', () => {
    applyPausedDOM(!state.paused);
    emit('play-toggle', state.paused);
  });

  /* ---------- 常設3ステップ進捗バー ＆ スクロール領域 ---------- */
  const progBtn1 = h('button', {
    type: 'button',
    class: 'step-prog-btn is-current',
    id: 'step-prog-1',
    onclick: () => goToStep(1),
    text: '① 選ぶ',
  });
  const progBtn2 = h('button', {
    type: 'button',
    class: 'step-prog-btn',
    id: 'step-prog-2',
    disabled: true,
    onclick: () => goToStep(2),
    text: '② 原因と動き',
  });
  const progBtn3 = h('button', {
    type: 'button',
    class: 'step-prog-btn',
    id: 'step-prog-3',
    disabled: true,
    onclick: () => goToStep(3),
    text: '③ ゆるめる順番',
  });

  const progressBar = h(
    'nav',
    { class: 'step-progress-bar', 'aria-label': '操作のステップ進捗' },
    progBtn1,
    h('span', { class: 'step-prog-arrow', 'aria-hidden': 'true', text: '→' }),
    progBtn2,
    h('span', { class: 'step-prog-arrow', 'aria-hidden': 'true', text: '→' }),
    progBtn3,
  );

  const scrollBody = h('div', { class: 'panel-scroll-body' });
  root.append(progressBar, scrollBody);

  function syncProgressBar() {
    const hasCauseTarget = Boolean(state.currentHabit || state.currentStory);
    const hasCareTarget = Boolean(state.currentHabit);

    progBtn1.classList.toggle('is-current', state.step === 1);
    progBtn2.classList.toggle('is-current', state.step === 2);
    progBtn3.classList.toggle('is-current', state.step === 3);

    progBtn1.setAttribute('aria-current', state.step === 1 ? 'step' : 'false');
    progBtn2.setAttribute('aria-current', state.step === 2 ? 'step' : 'false');
    progBtn3.setAttribute('aria-current', state.step === 3 ? 'step' : 'false');

    progBtn2.disabled = !hasCauseTarget;
    progBtn3.disabled = !hasCareTarget;
  }

  function scrollTopNow() {
    scrollBody.scrollTop = 0;
  }

  /* ---------- ステップ遷移アクション ---------- */
  function goToStep(targetStep) {
    if (targetStep === 1) {
      if (state.step === 3 && state.currentHabit) {
        emit('selfcare-close', state.currentHabit.id);
      }
      state.step = 1;
      state.focusedRoleMuscleId = null;
      render();
      scrollTopNow();
      return;
    }
    if (targetStep === 2) {
      if (!state.currentHabit && !state.currentStory) return;
      if (state.step === 3 && state.currentHabit) {
        emit('selfcare-close', state.currentHabit.id);
      } else if (state.step === 1) {
        if (state.activeType === 'story' && state.currentStory) {
          emit('story', state.currentStory.id);
        } else if (state.currentHabit) {
          emit('habit', state.currentHabit.id);
        }
      }
      state.step = 2;
      state.focusedRoleMuscleId = null;
      render();
      scrollTopNow();
      return;
    }
    if (targetStep === 3) {
      if (!state.currentHabit) return;
      openStep3SelfCare(state.currentHabit);
    }
  }

  function openHabitStep2(hb, opts = {}) {
    const resolved = resolveHabit(hb);
    if (!resolved) return;
    if (!opts.keepFeelingContext) {
      state.feelingContext = null;
    }
    state.pickedPart = null;
    state.activeType = 'habit';
    state.currentHabit = resolved;
    state.currentStory = null;
    state.focusedRoleMuscleId = null;
    state.step = 2;
    render();
    scrollTopNow();
    if (!opts.fromExternal) {
      emit('habit', resolved.id);
    }
  }

  function openStoryStep2(stObj, stepIdx = 0, opts = {}) {
    const resolved = resolveStory(stObj);
    if (!resolved) return;
    state.feelingContext = null;
    state.pickedPart = null;
    state.activeType = 'story';
    state.currentStory = resolved;
    state.storyStepIdx = Math.max(0, Math.min((resolved.steps?.length || 1) - 1, Number(stepIdx) || 0));
    // ストーリーからセルフケアに進めるよう関連動作を解決しておく
    const fallbackHabit =
      resolveHabit(resolved.relatedHabitId) ||
      habits.find((hItem) => (hItem.shorten || []).some((m) => (resolved.steps?.[0]?.focus || []).includes(m))) ||
      habits[0] ||
      null;
    state.currentHabit = fallbackHabit;
    state.focusedRoleMuscleId = null;
    state.step = 2;
    render();
    scrollTopNow();
    if (!opts.fromExternal) {
      emit('story', resolved.id);
    }
  }

  function openStep3SelfCare(hb) {
    const resolved = resolveHabit(hb) || state.currentHabit;
    if (!resolved) return;
    state.currentHabit = resolved;
    state.activeType = 'habit';
    state.focusedRoleMuscleId = null;
    state.pickedPart = null;
    state.scSteps = buildSelfCareSteps(resolved);
    state.scStepIndex = 0;
    state.step = 3;
    render();
    scrollTopNow();

    const first = state.scSteps[0];
    if (first) {
      emitSelfCareStepPayload(resolved, first, 0, false);
    } else {
      emit('selfcare', resolved.id);
    }
  }

  function emitSelfCareStepPayload(hb, st, idx, toolSwitchOnly = false) {
    if (!hb || !st?.muscleId) return;
    const profile = resolveCareProfile(st.muscleId, st.tool, st.shortName);
    st.tool = profile.tool;
    st.motion = toolSwitchOnly ? profile.motion : st.motion || profile.motion;
    emit('selfcare-step', {
      habitId: hb.id,
      muscleId: st.muscleId,
      id: st.muscleId,
      index: idx,
      stepIndex: idx,
      tool: st.tool,
      motion: st.motion,
      handPose: profile.handPose,
      supportSurface: profile.supportSurface,
      strokeTarget: st.strokeTarget || null,
      toolSwitchOnly,
    });
  }

  /* ---------- 検索ロジック ---------- */
  function matchSearchItems(qRaw) {
    const q = String(qRaw || '').trim().toLowerCase();
    if (!q) return { habits: [], feelings: [], lines: [] };

    const matchedFeelings = allFeelings.filter((f) =>
      `${f.label || ''} ${f.partBadge || ''} ${f.tag || ''}`.toLowerCase().includes(q),
    );
    const matchedHabits = habits.filter((hb) => {
      const mText = [...(hb.shorten || []), ...(hb.lengthen || [])]
        .map((id) => `${shortMuscleNameOf(id)} ${nameOf(id)}`)
        .join(' ');
      const blob = `${hb.label || ''} ${hb.symptom || ''} ${hb.feel || ''} ${hb.occupation || ''} ${hb.group || ''} ${hb.causalSummary || ''} ${mText}`.toLowerCase();
      return blob.includes(q);
    });
    const matchedLines = lines.filter((l) =>
      `${l.id || ''} ${l.tag || ''} ${l.name || ''} ${l.oneLine || ''} ${l.desc || ''}`
        .toLowerCase()
        .includes(q),
    );
    return { habits: matchedHabits, feelings: matchedFeelings, lines: matchedLines };
  }

  /* ---------- 描画部品：3D直接タップ時のミニ部位バナー ---------- */
  function renderPickedPartBanner() {
    if (!state.pickedPart) return null;
    const p = state.pickedPart;
    const friendly = shortMuscleNameOf(p.id, p.name);
    const official = p.name && p.name !== friendly ? `（${p.name}）` : '';
    return h(
      'div',
      { class: 'picked-part-banner', role: 'status' },
      h(
        'div',
        { class: 'picked-part-info' },
        h('p', { class: 'picked-part-title', text: `選択中：${friendly}${official}` }),
        p.action ? h('p', { class: 'picked-part-sub', text: sanitizeText(p.action) }) : null,
      ),
      h(
        'div',
        { class: 'picked-part-actions' },
        p.relatedHabit
          ? h('button', {
              type: 'button',
              class: 'mini-action-btn is-primary',
              text: '関連する動きへ',
              onclick: () => {
                const hb = resolveHabit(p.relatedHabit.id);
                if (hb) openHabitStep2(hb);
              },
            })
          : null,
        h('button', {
          type: 'button',
          class: 'mini-action-btn',
          text: '閉じる',
          onclick: () => {
            state.pickedPart = null;
            emit('part-close');
            render();
          },
        }),
      ),
    );
  }

  /* ---------- 描画：ステップ ①「選ぶ」 ---------- */
  function renderStep1() {
    const frag = document.createDocumentFragment();

    const pickedBanner = renderPickedPartBanner();
    if (pickedBanner) frag.append(pickedBanner);

    // 上部バー：見出し（または戻るボタン）＋ 右端コンパクト「検索」トグル
    const isSubRoute = state.step1Route !== 'home' && !state.searchOpen;
    const topBarLeft = isSubRoute
      ? h(
          'button',
          {
            type: 'button',
            class: 'back-pill-btn',
            onclick: () => {
              if (state.step1Route === 'feel-list') {
                state.step1Route = 'feel-regions';
              } else if (state.step1Route === 'habit-list' || state.step1Route === 'stories') {
                state.step1Route = 'habit-cats';
              } else {
                if (state.step1Route === 'lines' && state.activeLineId) {
                  state.activeLineId = null;
                  emit('reset');
                }
                state.step1Route = 'home';
              }
              render();
              scrollTopNow();
            },
          },
          '← 戻る',
        )
      : h('h2', { class: 'step1-heading', text: '気になる入り口を選んでください' });

    const searchBtn = h(
      'button',
      {
        type: 'button',
        id: 'btn-search-toggle',
        class: `search-toggle-btn${state.searchOpen ? ' is-active' : ''}`,
        'aria-expanded': String(state.searchOpen),
        onclick: () => {
          state.searchOpen = !state.searchOpen;
          if (!state.searchOpen) state.searchQuery = '';
          render();
          if (state.searchOpen) {
            const inp = scrollBody.querySelector('.search-input');
            inp?.focus();
          }
        },
      },
      icon('search'),
      h('span', { text: '検索' }),
    );

    frag.append(h('div', { class: 'step1-top-bar' }, topBarLeft, searchBtn));

    // 検索ボックス展開時
    if (state.searchOpen) {
      const resultsHost = h('div', { class: 'full-row-stack' });
      const countNote = h('p', { class: 'search-count-note' });

      const updateSearchList = () => {
        resultsHost.textContent = '';
        const q = state.searchQuery.trim();
        if (!q) {
          countNote.textContent = `キーワードを入れると全${habits.length}動作・${allFeelings.length}症状・${lines.length}本の筋膜ラインから即座に探せます。`;
          return;
        }
        const matched = matchSearchItems(q);
        const total = matched.feelings.length + matched.habits.length + matched.lines.length;
        countNote.textContent = `「${q}」の検索結果：${total}件`;
        if (total === 0) {
          resultsHost.append(
            h('p', {
              class: 'row-sub',
              text: '見つかりませんでした。「肩」「腰」「デスク」「ゴルフ」「足裏」などの短い言葉でお試しください。',
            }),
          );
          return;
        }
        for (const f of matched.feelings) {
          resultsHost.append(makeFeelingRow(f));
        }
        for (const hb of matched.habits) {
          resultsHost.append(makeHabitRow(hb));
        }
        for (const l of matched.lines) {
          resultsHost.append(
            makeLineRow(l, () => {
              state.searchOpen = false;
              state.step1Route = 'lines';
              state.activeLineId = l.id;
              render();
              scrollTopNow();
              emit('line', l.id);
            }),
          );
        }
      };

      const searchInput = h('input', {
        type: 'search',
        class: 'search-input',
        placeholder: '例：スマホ首、足組み、ゴルフ、肩甲骨…',
        value: state.searchQuery,
        'aria-label': 'キーワード検索',
        oninput: (e) => {
          state.searchQuery = e.target.value || '';
          updateSearchList();
        },
      });

      const clearBtn = h('button', {
        type: 'button',
        class: 'search-clear-btn',
        text: 'クリア',
        onclick: () => {
          state.searchQuery = '';
          searchInput.value = '';
          updateSearchList();
          searchInput.focus();
        },
      });

      frag.append(
        h(
          'div',
          { class: 'search-box-wrap' },
          h('div', { class: 'search-input-row' }, searchInput, clearBtn),
          countNote,
          resultsHost,
        ),
      );
      updateSearchList();
      if (state.searchQuery.trim()) return frag;
    }

    // --- Route A: 3つの入り口ホーム ---
    if (state.step1Route === 'home') {
      const stack = h(
        'div',
        { class: 'full-row-stack' },
        h(
          'button',
          {
            type: 'button',
            id: 'entry-feel',
            class: 'entry-card',
            onclick: () => {
              state.step1Route = 'feel-regions';
              render();
              scrollTopNow();
            },
          },
          h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('feel')),
          h(
            'span',
            { class: 'row-body' },
            h('span', { class: 'row-title', text: '痛む・気になる場所から探す' }),
            h('span', { class: 'row-sub', text: '首・肩・背中・腰・足裏の違和感から逆引き' }),
          ),
          h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
        ),
        h(
          'button',
          {
            type: 'button',
            id: 'entry-habits',
            class: 'entry-card',
            onclick: () => {
              state.step1Route = 'habit-cats';
              render();
              scrollTopNow();
            },
          },
          h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('habit')),
          h(
            'span',
            { class: 'row-body' },
            h('span', { class: 'row-title', text: '全45の動き・仕事・スポーツから探す' }),
            h('span', { class: 'row-sub', text: 'デスク作業・家事・姿勢・スポーツの4分類' }),
          ),
          h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
        ),
        h(
          'button',
          {
            type: 'button',
            id: 'entry-lines',
            class: 'entry-card',
            onclick: () => {
              state.step1Route = 'lines';
              render();
              scrollTopNow();
            },
          },
          h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('line')),
          h(
            'span',
            { class: 'row-body' },
            h('span', { class: 'row-title', text: '全身11本の筋膜ライン図鑑' }),
            h('span', { class: 'row-sub', text: '頭から足裏までつながる11本の筋膜シート一覧' }),
          ),
          h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
        ),
      );
      frag.append(stack);
      return frag;
    }

    // --- Route B1: 5部位リスト ---
    if (state.step1Route === 'feel-regions') {
      frag.append(
        h('h2', { class: 'subnav-title', style: { 'margin-bottom': '8px' }, text: 'どのあたりが気になりますか？' }),
      );
      const stack = h('div', { class: 'full-row-stack' });
      for (const reg of FEEL_REGIONS) {
        const count = allFeelings.filter((f) => classifyFeelingRegion(f) === reg.id).length;
        stack.append(
          h(
            'button',
            {
              type: 'button',
              class: 'list-row-btn',
              'data-feel-region-btn': reg.id,
              onclick: () => {
                state.feelRegionId = reg.id;
                state.step1Route = 'feel-list';
                render();
                scrollTopNow();
              },
            },
            h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('feel')),
            h(
              'span',
              { class: 'row-body' },
              h('span', { class: 'row-title', text: `${reg.label}（${count}）` }),
              h('span', { class: 'row-sub', text: reg.sub }),
            ),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
          ),
        );
      }
      frag.append(stack);
      return frag;
    }

    // --- Route B2: 部位別の違和感リスト（全17項目・横一行フル幅で見切れゼロ） ---
    if (state.step1Route === 'feel-list') {
      const reg = FEEL_REGIONS.find((r) => r.id === state.feelRegionId) || FEEL_REGIONS[0];
      const items = allFeelings.filter((f) => classifyFeelingRegion(f) === reg.id);
      frag.append(
        h('h2', {
          class: 'subnav-title',
          style: { 'margin-bottom': '8px' },
          text: `${reg.label}の気になる症状（${items.length}件）`,
        }),
      );
      const stack = h('div', { class: 'full-row-stack' });
      for (const f of items) {
        stack.append(makeFeelingRow(f));
      }
      frag.append(stack);
      return frag;
    }

    // --- Route C1: 4分類（仕事・スポーツ・日常姿勢・家事育児）＋ 連動ストーリー ---
    if (state.step1Route === 'habit-cats') {
      frag.append(
        h('h2', {
          class: 'subnav-title',
          style: { 'margin-bottom': '8px' },
          text: '普段よくする動き・姿勢を選んでください',
        }),
      );
      const stack = h('div', { class: 'full-row-stack' });
      for (const cat of HABIT_CATEGORIES_4) {
        const list = habitsByCat4[cat.id] || [];
        stack.append(
          h(
            'button',
            {
              type: 'button',
              class: 'list-row-btn',
              'data-habit-cat': cat.id,
              onclick: () => {
                state.habitCatId = cat.id;
                state.step1Route = 'habit-list';
                render();
                scrollTopNow();
              },
            },
            h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon(cat.icon)),
            h(
              'span',
              { class: 'row-body' },
              h('span', { class: 'row-title', text: `${cat.label}（${list.length}）` }),
              h('span', { class: 'row-sub', text: cat.sub }),
            ),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
          ),
        );
      }

      if (stories.length > 0) {
        stack.append(
          h(
            'button',
            {
              type: 'button',
              class: 'list-row-btn',
              'data-habit-cat': 'stories',
              onclick: () => {
                state.step1Route = 'stories';
                render();
                scrollTopNow();
              },
            },
            h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('story')),
            h(
              'span',
              { class: 'row-body' },
              h('span', { class: 'row-title', text: `連動4ステップストーリー（${stories.length}編）` }),
              h('span', { class: 'row-sub', text: '1つのクセから全身へ張りが広がる流れを4段階で見る' }),
            ),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
          ),
        );
      }

      stack.append(
        h(
          'button',
          {
            type: 'button',
            class: 'list-row-btn',
            'data-habit-cat': 'all',
            onclick: () => {
              state.habitCatId = 'all';
              state.step1Route = 'habit-list';
              render();
              scrollTopNow();
            },
          },
          h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('habit')),
          h(
            'span',
            { class: 'row-body' },
            h('span', { class: 'row-title', text: `全${habits.length}動作を一覧で見る` }),
            h('span', { class: 'row-sub', text: 'すべての姿勢・仕事・スポーツ動作をまとめて表示' }),
          ),
          h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
        ),
      );

      frag.append(stack);
      return frag;
    }

    // --- Route C2: 各カテゴリーの動作リスト ---
    if (state.step1Route === 'habit-list') {
      const catMeta = HABIT_CATEGORIES_4.find((c) => c.id === state.habitCatId);
      const list = state.habitCatId === 'all' ? habits : habitsByCat4[state.habitCatId] || habits;
      const heading = catMeta ? `${catMeta.label}（${list.length}件）` : `全${list.length}動作一覧`;
      frag.append(h('h2', { class: 'subnav-title', style: { 'margin-bottom': '8px' }, text: heading }));

      const stack = h('div', { class: 'full-row-stack' });
      for (const hb of list) {
        stack.append(makeHabitRow(hb));
      }
      frag.append(stack);
      return frag;
    }

    // --- Route C3: 連動4ステップストーリー一覧 ---
    if (state.step1Route === 'stories') {
      frag.append(
        h('h2', {
          class: 'subnav-title',
          style: { 'margin-bottom': '8px' },
          text: `連動4ステップストーリー（${stories.length}編）`,
        }),
      );
      const stack = h('div', { class: 'full-row-stack' });
      for (const stObj of stories) {
        stack.append(
          h(
            'button',
            {
              type: 'button',
              class: 'list-row-btn',
              'data-story': stObj.id,
              onclick: () => openStoryStep2(stObj, 0),
            },
            h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('story')),
            h(
              'span',
              { class: 'row-body' },
              h('span', { class: 'row-title', text: cleanTitle(stObj.title) }),
              stObj.lead ? h('span', { class: 'row-sub', text: sanitizeText(stObj.lead) }) : null,
            ),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
          ),
        );
      }
      frag.append(stack);
      return frag;
    }

    // --- Route D: 全身11本の筋膜ライン図鑑 ---
    if (state.step1Route === 'lines') {
      frag.append(
        h('h2', {
          class: 'subnav-title',
          style: { 'margin-bottom': '8px' },
          text: `全身${lines.length}本の筋膜ライン図鑑`,
        }),
      );

      // 選択中のライン解説カード
      const activeLine = state.activeLineId ? lineById.get(state.activeLineId) : null;
      if (activeLine) {
        const relatedHabits = habits.filter((hb) => (hb.lines || []).includes(activeLine.id)).slice(0, 5);
        const trackLabels = (activeLine.track || [])
          .slice(0, 6)
          .map((mId) => shortMuscleNameOf(mId))
          .filter(Boolean);
        const uniqTrack = [...new Set(trackLabels)];

        frag.append(
          h(
            'div',
            { class: 'line-detail-card' },
            h(
              'div',
              { class: 'line-detail-head' },
              h('span', { class: 'row-color-dot', style: { background: activeLine.color || '#B88E3E' } }),
              h('h3', {
                class: 'line-detail-name',
                text: `${activeLine.tag || activeLine.name}${activeLine.name && activeLine.tag ? `（${activeLine.name}）` : ''}`,
              }),
            ),
            h('p', {
              class: 'line-detail-desc',
              text: sanitizeText(activeLine.desc || activeLine.oneLine || ''),
            }),
            uniqTrack.length
              ? h('p', {
                  class: 'row-sub',
                  text: `主な通り道：${uniqTrack.join(' → ')}`,
                })
              : null,
            relatedHabits.length
              ? h(
                  'div',
                  null,
                  h('p', { class: 'line-detail-subhead', text: 'このラインが関わる代表的な動き（タップで原因と動きへ）：' }),
                  h(
                    'div',
                    { class: 'pill-wrap-row' },
                    ...relatedHabits.map((hb) =>
                      h('button', {
                        type: 'button',
                        class: 'action-pill-btn',
                        text: cleanTitle(hb.label),
                        onclick: () => openHabitStep2(hb),
                      }),
                    ),
                  ),
                )
              : null,
          ),
        );
      }

      const showAllBtn = h(
        'button',
        {
          type: 'button',
          class: `list-row-btn${!state.activeLineId ? ' is-active' : ''}`,
          style: { 'margin-bottom': '8px' },
          onclick: () => {
            state.activeLineId = null;
            emit('all-lines');
            render();
          },
        },
        h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('line')),
        h(
          'span',
          { class: 'row-body' },
          h('span', { class: 'row-title', text: '全身11本のラインをまとめて表示' }),
          h('span', { class: 'row-sub', text: '全身を包む筋膜ネットワーク全体を見る' }),
        ),
      );
      frag.append(showAllBtn);

      const stack = h('div', { class: 'full-row-stack' });
      for (const l of lines) {
        stack.append(
          makeLineRow(l, () => {
            state.activeLineId = l.id;
            render();
            scrollTopNow();
            emit('line', l.id);
          }),
        );
      }
      frag.append(stack);
      return frag;
    }

    return frag;
  }

  function makeFeelingRow(f) {
    const matchedHabits = (f.habits || []).map((hid) => resolveHabit(hid)).filter(Boolean);
    return h(
      'button',
      {
        type: 'button',
        class: 'list-row-btn',
        'data-feel': f.label,
        onclick: () => {
          const primary = matchedHabits[0] || habits[0];
          if (!primary) return;
          state.feelingContext = {
            label: f.label,
            habits: matchedHabits.length ? matchedHabits : [primary],
          };
          openHabitStep2(primary, { keepFeelingContext: true });
        },
      },
      h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('feel')),
      h(
        'span',
        { class: 'row-body' },
        h('span', { class: 'row-title', text: f.label }),
        matchedHabits[0]
          ? h('span', {
              class: 'row-sub',
              text: `主な原因になりやすい動き：${matchedHabits.slice(0, 2).map((x) => cleanTitle(x.label)).join(' ／ ')}`,
            })
          : null,
      ),
      h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
    );
  }

  function makeHabitRow(hb) {
    const isCurrent = state.currentHabit?.id === hb.id;
    const sub = sanitizeText(hb.symptom || hb.feel || hb.occupation || '');
    return h(
      'button',
      {
        type: 'button',
        class: `list-row-btn${isCurrent ? ' is-active' : ''}`,
        'data-habit': hb.id,
        onclick: () => openHabitStep2(hb),
      },
      h('span', { class: 'row-leading', 'aria-hidden': 'true' }, icon('habit')),
      h(
        'span',
        { class: 'row-body' },
        h('span', { class: 'row-title', text: cleanTitle(hb.label) }),
        sub ? h('span', { class: 'row-sub', text: sub }) : null,
      ),
      h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
    );
  }

  function makeLineRow(l, onTap) {
    const isSelected = state.activeLineId === l.id;
    return h(
      'button',
      {
        type: 'button',
        class: `list-row-btn${isSelected ? ' is-active' : ''}`,
        'data-line': l.id,
        onclick: onTap,
      },
      h('span', { class: 'row-color-dot', style: { background: l.color || '#B88E3E' } }),
      h(
        'span',
        { class: 'row-body' },
        h('span', {
          class: 'row-title',
          text: `${l.tag || l.name}${l.name && l.tag ? `（${l.name}）` : ''}`,
        }),
        l.oneLine ? h('span', { class: 'row-sub', text: sanitizeText(l.oneLine) }) : null,
      ),
      h('span', { class: 'row-chevron', 'aria-hidden': 'true', text: '›' }),
    );
  }

  /* ---------- 描画：ステップ ②「原因と動き」 ---------- */
  function renderStep2() {
    if (state.activeType === 'story' && state.currentStory) {
      return renderStep2Story(state.currentStory);
    }
    const hb = state.currentHabit || habits[0];
    if (!hb) return renderStep1();

    const wrap = h('div', { class: 'step2-wrap' });

    const pickedBanner = renderPickedPartBanner();
    if (pickedBanner) wrap.append(pickedBanner);

    // 1. [ ← 戻る ] ＋ 動作・症状タイトル（見切れゼロ）
    wrap.append(
      h(
        'div',
        { class: 'subnav-bar' },
        h(
          'button',
          {
            type: 'button',
            class: 'back-pill-btn',
            id: 'btn-step2-back',
            onclick: () => goToStep(1),
          },
          '← 戻る',
        ),
        h('h2', { class: 'subnav-title', text: cleanTitle(hb.label) }),
      ),
    );

    // 違和感逆引きから入った場合：関連する原因動作のワンタップ切替バー
    if (state.feelingContext && state.feelingContext.habits.length > 1) {
      wrap.append(
        h(
          'div',
          { class: 'context-switcher-box' },
          h('p', {
            class: 'context-switcher-label',
            text: `「${state.feelingContext.label}」に関わる動きを切り替え：`,
          }),
          h(
            'div',
            { class: 'pill-wrap-row' },
            ...state.feelingContext.habits.map((cand) =>
              h('button', {
                type: 'button',
                class: `action-pill-btn${cand.id === hb.id ? ' is-active' : ''}`,
                text: cleanTitle(cand.label),
                onclick: () => openHabitStep2(cand, { keepFeelingContext: true }),
              }),
            ),
          ),
        ),
      );
    }

    // 2. わかりやすい因果解説ボックス（途中省略 `…` 一切なし！）
    const causalSummary = resolveCausalSummaryText(hb);
    const tl = hb.triggerLine || hb.goldenLine || resolveTriggerLine(hb.triggerLineId || hb.goldenLineId);
    const quickCheck = sanitizeText(hb.quickCheck || tl?.quickCheck || '');
    const feelDetail = sanitizeText(hb.feel || '');
    const extraLine = quickCheck || (feelDetail && feelDetail !== causalSummary ? feelDetail : '');

    wrap.append(
      h(
        'div',
        { class: 'causal-box' },
        h('p', { class: 'causal-lead', text: causalSummary }),
        extraLine ? h('p', { class: 'causal-sub', text: extraLine }) : null,
      ),
      h(
        'button',
        {
          type: 'button',
          id: 'btn-open-step3',
          class: 'primary-step3-cta',
          onclick: () => openStep3SelfCare(hb),
        },
        h('span', { text: '▶ ③ ゆるめる順番（3Dマッサージ）を見る' }),
      ),
    );

    // 3. 2カラム整理カード：左「● 縮んでいる原因」 ／ 右「● 引っぱられて張る場所」
    const shortMuscles = resolveShortenMuscles(hb);
    const shortIdSet = new Set(shortMuscles.map((m) => m.id));
    const longMuscles = resolveLengthenMuscles(hb, shortIdSet);

    const makeRoleMuscleButton = (mObj) => {
      const isFocused = state.focusedRoleMuscleId === mObj.id;
      return h(
        'button',
        {
          type: 'button',
          class: `role-muscle-btn${isFocused ? ' is-focused' : ''}`,
          'data-role-muscle': mObj.id,
          'aria-pressed': String(isFocused),
          onclick: () => {
            if (state.focusedRoleMuscleId === mObj.id) {
              state.focusedRoleMuscleId = null;
              emit('trigger-line', hb.id);
            } else {
              state.focusedRoleMuscleId = mObj.id;
              emit('trigger-point', { habitId: hb.id, muscleId: mObj.id });
            }
            render();
          },
        },
        h('span', { text: mObj.label }),
        h('span', { 'aria-hidden': 'true', text: isFocused ? '戻す' : '見る' }),
      );
    };

    wrap.append(
      h(
        'div',
        { class: 'cause-symptom-grid' },
        h(
          'div',
          { class: 'role-card is-short' },
          h(
            'h3',
            { class: 'role-card-head' },
            h('span', { class: 'role-dot', 'aria-hidden': 'true' }),
            h('span', { text: '縮んでいる原因' }),
          ),
          h(
            'div',
            { class: 'role-pill-list' },
            ...(shortMuscles.length
              ? shortMuscles.map(makeRoleMuscleButton)
              : [h('span', { class: 'row-sub', text: '主要な縮み部位' })]),
          ),
        ),
        h(
          'div',
          { class: 'role-card is-long' },
          h(
            'h3',
            { class: 'role-card-head' },
            h('span', { class: 'role-dot', 'aria-hidden': 'true' }),
            h('span', { text: '引っぱられて張る場所' }),
          ),
          h(
            'div',
            { class: 'role-pill-list' },
            ...(longMuscles.length
              ? longMuscles.map(makeRoleMuscleButton)
              : [h('span', { class: 'row-sub', text: sanitizeText(hb.pulledLabel || hb.symptom || '張る部位') })]),
          ),
        ),
      ),
    );

    if (state.focusedRoleMuscleId) {
      wrap.append(
        h('button', {
          type: 'button',
          class: 'focus-reset-btn',
          text: '全体の動きアニメーションに戻す',
          onclick: () => {
            state.focusedRoleMuscleId = null;
            emit('trigger-line', hb.id);
            render();
          },
        }),
      );
    }



    return wrap;
  }

  function renderStep2Story(story) {
    const steps = Array.isArray(story.steps) ? story.steps : [];
    const curStep = steps[state.storyStepIdx] || steps[0] || {};
    const wrap = h('div', { class: 'step2-wrap' });

    wrap.append(
      h(
        'div',
        { class: 'subnav-bar' },
        h('button', {
          type: 'button',
          class: 'back-pill-btn',
          text: '← 戻る',
          onclick: () => goToStep(1),
        }),
        h('h2', { class: 'subnav-title', text: cleanTitle(story.title) }),
      ),
    );

    // 4ステップ切替バー
    wrap.append(
      h(
        'div',
        { class: 'sc-step-grid' },
        ...steps.map((stItem, idx) =>
          h('button', {
            type: 'button',
            class: `sc-step-tab${idx === state.storyStepIdx ? ' is-active' : ''}`,
            text: `${idx + 1}. ${cleanTitle(stItem.head || stItem.title || `ステップ${idx + 1}`)}`,
            onclick: () => {
              state.storyStepIdx = idx;
              emit('step', idx);
              render();
            },
          }),
        ),
      ),
    );

    wrap.append(
      h(
        'div',
        { class: 'causal-box' },
        h('p', {
          class: 'causal-lead',
          text: sanitizeText(curStep.body || curStep.text || curStep.desc || story.lead || ''),
        }),
      ),
    );

    const sIds = [...new Set([...(curStep.shortenCore || []), ...(curStep.shorten || [])])].slice(0, 3);
    const lIds = [...new Set([...(curStep.lengthenAntagonist || []), ...(curStep.lengthen || [])])].slice(0, 3);
    if (sIds.length || lIds.length) {
      wrap.append(
        h(
          'div',
          { class: 'cause-symptom-grid' },
          h(
            'div',
            { class: 'role-card is-short' },
            h(
              'h3',
              { class: 'role-card-head' },
              h('span', { class: 'role-dot', 'aria-hidden': 'true' }),
              h('span', { text: '縮んでいる原因' }),
            ),
            h(
              'div',
              { class: 'role-pill-list' },
              ...sIds.map((id) =>
                h('button', {
                  type: 'button',
                  class: 'role-muscle-btn',
                  text: shortMuscleNameOf(id),
                  onclick: () => emit('inspect', id),
                }),
              ),
            ),
          ),
          h(
            'div',
            { class: 'role-card is-long' },
            h(
              'h3',
              { class: 'role-card-head' },
              h('span', { class: 'role-dot', 'aria-hidden': 'true' }),
              h('span', { text: '引っぱられて張る場所' }),
            ),
            h(
              'div',
              { class: 'role-pill-list' },
              ...lIds.map((id) =>
                h('button', {
                  type: 'button',
                  class: 'role-muscle-btn',
                  text: shortMuscleNameOf(id),
                  onclick: () => emit('inspect', id),
                }),
              ),
            ),
          ),
        ),
      );
    }

    if (state.currentHabit) {
      wrap.append(
        h(
          'button',
          {
            type: 'button',
            class: 'primary-step3-cta',
            onclick: () => openStep3SelfCare(state.currentHabit),
          },
          h('span', { text: '▶ ③ ゆるめる順番（3Dマッサージ）を見る' }),
        ),
      );
    }

    return wrap;
  }

  /* ---------- 描画：ステップ ③「ゆるめる順番」 ---------- */
  function renderStep3() {
    const hb = state.currentHabit;
    if (!hb) return renderStep1();
    if (!state.scSteps.length) {
      state.scSteps = buildSelfCareSteps(hb);
    }
    const idx = Math.max(0, Math.min(state.scSteps.length - 1, state.scStepIndex));
    const cur = state.scSteps[idx];

    const wrap = h('div', { class: 'step3-wrap' });

    // 1. [ ← ② 原因へ ] ＋ タイトル
    wrap.append(
      h(
        'div',
        { class: 'subnav-bar' },
        h(
          'button',
          {
            type: 'button',
            id: 'btn-step3-back',
            class: 'back-pill-btn',
            onclick: () => goToStep(2),
          },
          '← ② 原因へ',
        ),
        h('h2', {
          class: 'subnav-title',
          text: `${cleanTitle(hb.label)}のゆるめる順番`,
        }),
      ),
    );

    // 2. 手順ステップ切替ボタン（① 〇〇 ／ ② 〇〇 ／ ③ 〇〇）
    wrap.append(
      h(
        'div',
        { class: 'sc-step-grid', role: 'tablist', 'aria-label': 'ゆるめる順番ステップ' },
        ...state.scSteps.map((st, sIdx) => {
          const active = sIdx === idx;
          return h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': String(active),
              class: `sc-step-tab${active ? ' is-active' : ''}`,
              'data-sc-step': String(sIdx),
              onclick: () => {
                state.scStepIndex = sIdx;
                render();
                emitSelfCareStepPayload(hb, state.scSteps[sIdx], sIdx, false);
              },
            },
            `${st.num} ${String(st.shortName || '').replace(/[（(][^）)]*[）)]/gu, '').trim() || st.shortName}`,
          );
        }),
      ),
    );

    // 3. 安全ガード付き道具ワンタップ切替ピル
    if (cur) {
      const rule = getAllowedToolsAndDefault(cur.muscleId);
      const allowedList = rule.allowedTools || rule.allowed || ['hand', 'ball', 'roller'];
      const onlyHand = Boolean(rule.isDelicate || allowedList.length <= 1);
      const activeTool = allowedList.includes(normalizeToolId(cur.tool))
        ? normalizeToolId(cur.tool)
        : rule.defaultTool;
      cur.tool = activeTool;

      if (onlyHand) {
        wrap.append(
          h('div', {
            class: 'sc-delicate-guard',
            role: 'status',
            text: '🤲 指でやさしくケア（強い器具は使いません）',
          }),
        );
      } else {
        wrap.append(
          h(
            'div',
            { class: 'sc-tool-row', role: 'group', 'aria-label': '使う道具の切り替え' },
            ...RELEASE_TOOLS.filter((rt) => allowedList.includes(rt.id)).map((rt) => {
              const onTool = rt.id === activeTool;
              return h(
                'button',
                {
                  type: 'button',
                  class: `sc-tool-pill${onTool ? ' is-active' : ''}`,
                  'data-sc-tool': rt.id,
                  'aria-pressed': String(onTool),
                  onclick: () => {
                    if (cur.tool === rt.id) return;
                    const profile = resolveCareProfile(cur.muscleId, rt.id, cur.shortName);
                    cur.tool = profile.tool;
                    cur.motion = profile.motion;
                    cur.userSwitchedTool = cur.tool !== cur.initialTool;
                    render();
                    emitSelfCareStepPayload(hb, cur, idx, true);
                  },
                },
                rt.label,
              );
            }),
          ),
        );
      }

      // 4. やさしいやり方ガイド（1〜2行・省略ゼロ）
      const profile = resolveCareProfile(cur.muscleId, cur.tool, cur.shortName);
      const guideBody =
        cur.userSwitchedTool && cur.tool !== cur.initialTool ? profile.guideText : cur.baseText;
      const durSuffix = /\d+\s*秒/.test(guideBody) ? '' : `（目安 ${cur.durationSec || 30}秒）`;

      wrap.append(
        h(
          'div',
          { class: 'sc-howto-card' },
          h('p', {
            class: 'sc-howto-target',
            text: `手順 ${cur.num}：${cur.shortName}（${TOOL_LABEL[cur.tool] || TOOL_LABEL.hand}）`,
          }),
          h('p', {
            class: 'sc-howto-text',
            text: `${guideBody}${durSuffix}`,
          }),
        ),
      );

      // 安全ポイント（該当部位または動作にある場合）
      const safetyNote = resolveSafetyNoteText(hb, [
        cur.muscleId,
        ...state.scSteps.map((s) => s.muscleId),
      ]);
      if (safetyNote) {
        wrap.append(
          h('div', {
            class: 'sc-safety-note',
            role: 'note',
            text: `安全ポイント：${safetyNote}`,
          }),
        );
      }
    }

    // 5. 控えめな1行免責注記
    wrap.append(h('p', { class: 'sc-disclaimer', text: DISCLAIMER_TEXT }));

    return wrap;
  }

  /* ---------- メイン再描画 ---------- */
  function render() {
    syncProgressBar();
    scrollBody.textContent = '';
    if (state.step === 3) {
      scrollBody.append(renderStep3());
    } else if (state.step === 2) {
      scrollBody.append(renderStep2());
    } else {
      scrollBody.append(renderStep1());
    }
  }

  render();

  /* ---------- 外部公開 API（main.js 互換＋一体型拡張） ---------- */
  return {
    on,

    setLoading(pct = 0, text = '準備しています…') {
      if (stageLoader) stageLoader.classList.remove('is-hidden');
      if (stageLoaderText && text) stageLoaderText.textContent = String(text);
      if (stageLoaderFill) {
        const clamped = Math.max(4, Math.min(100, Math.round(Number(pct) || 0)));
        stageLoaderFill.style.width = `${clamped}%`;
      }
    },

    hideLoading() {
      if (stageLoaderFill) stageLoaderFill.style.width = '100%';
      if (stageLoader) {
        stageLoader.classList.add('is-hidden');
        setTimeout(() => {
          if (stageLoader.classList.contains('is-hidden')) {
            stageLoader.hidden = true;
          }
        }, 260);
      }
    },

    setTheme(themeMode) {
      applyThemeDOM(themeMode);
    },

    setUnifiedLayer(layerMode) {
      applyUnifiedLayerDOM(layerMode);
    },

    setPaused(paused) {
      applyPausedDOM(paused);
    },

    showHabit(habit) {
      const resolved = resolveHabit(habit);
      if (!resolved) return;
      if (state.step === 3 && state.currentHabit?.id === resolved.id) return;
      openHabitStep2(resolved, {
        fromExternal: true,
        keepFeelingContext: Boolean(
          state.feelingContext && state.feelingContext.habits.some((x) => x.id === resolved.id),
        ),
      });
    },

    showLine(line) {
      const resolved = resolveLine(line);
      if (!resolved) return;
      state.step = 1;
      state.step1Route = 'lines';
      state.activeLineId = resolved.id;
      render();
    },

    showStory(story, index = 0) {
      const resolved = resolveStory(story);
      if (!resolved) return;
      openStoryStep2(resolved, index, { fromExternal: true });
    },

    showPart(part) {
      if (!part || !part.id) return;
      state.pickedPart = part;
      render();
    },

    openSelfCare(habit) {
      openStep3SelfCare(habit || state.currentHabit);
    },

    resetHome() {
      state.step = 1;
      state.step1Route = 'home';
      state.activeType = null;
      state.currentHabit = null;
      state.currentStory = null;
      state.feelingContext = null;
      state.activeLineId = null;
      state.focusedRoleMuscleId = null;
      state.pickedPart = null;
      state.scSteps = [];
      state.scStepIndex = 0;
      render();
      scrollTopNow();
    },

    closeCard() {
      this.resetHome();
    },

    setProgress() {},
    setStep(index) {
      if (state.activeType === 'story' && state.currentStory) {
        state.storyStepIdx = Number(index) || 0;
        render();
      }
    },
    setViewBadge() {},
    setFasciaLayerMode() {},
    tuckSheet() {},
  };
}
