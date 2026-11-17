// =============================================================================
// ui.js — 筋膜ライン 3D の画面部品（UI/UX デザイナー担当）
// ライブラリ不使用の素の ES Module。DOM は #ui-root 配下にすべてここで生成する。
//
// 契約:
//   createUI({ lines, habits, feelings, stories, names, muscleLayers }) => ({
//     on(event, cb),
//     showLine(line), showHabit(habit), showStory(story, index), showPart(part),
//     setFasciaLayerMode(mode), showPeelStatus(status),
//     closeCard(), setProgress(p), setStep(index), setViewBadge(viewName),
//     setLoading(pct, text), hideLoading(),
//   })
//
// emit するイベント:
//   'line'(id) 'habit'(id) 'feeling'(label) 'progress'(0..1) 'play'(bool)
//   'story'(id) 'step'(index) 'view'(name) 'layer'(kind, mode) 'fascia-layer'(mode)
//   'style'('illust'|'real') 'isolate'(id) 'inspect'(id) 'reset'() 'close'() 'present'(bool)
//   'selfcare'(id) 'selfcare-step'(payload) 'selfcare-close'(id) 'xray'(bool)
// =============================================================================

import { MONETIZE_DEFAULTS, MONETIZE_STORAGE_KEY, SAFETY_NOTICE } from './monetize_config.js?v=20261117b';
import { getAllowedToolsAndDefault, resolveCareProfile } from './selfcare_guide3d.js?v=20261117b';

const DISCLAIMER_TEXT =
  SAFETY_NOTICE?.shortDisclaimer ||
  '※本システムは姿勢と筋膜のつながりを学ぶセルフケア図鑑であり、医師の診断・治療に代わるものではありません。強い痛み・しびれ・めまいがある場合は中止してください。';

/* -------------------------------------------------------------------------- */
/* 定数                                                                        */
/* -------------------------------------------------------------------------- */

// アイコン（24x24 / 線画。色は currentColor）
const ICONS = {
  story:
    '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-7l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  line:
    '<circle cx="5" cy="18" r="2.8" fill="currentColor" fill-opacity="0.25"/><circle cx="12" cy="11" r="2.8" fill="currentColor" fill-opacity="0.25"/><circle cx="19" cy="5" r="2.8" fill="currentColor" fill-opacity="0.25"/><path d="M7.2 16.2 9.8 13.2M14.2 9.2 16.8 6.8" stroke-width="2.2"/>',
  habit:
    '<rect x="3" y="7" width="18" height="13" rx="2.2" fill="currentColor" fill-opacity="0.2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  feel:
    '<path d="M13 2.5 5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z" fill="currentColor" fill-opacity="0.22"/>',
  view: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  muscle:
    '<circle cx="12" cy="5" r="2.6"/><path d="M6.5 20v-5.5a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V20"/><path d="M9.5 13.5v6.5M14.5 13.5v6.5"/>',
  layerSeeThrough:
    '<path d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" fill="currentColor" fill-opacity="0.18" stroke-dasharray="2.2 1.8"/><path d="M3.5 13.2 12 17.8l8.5-4.6"/><circle cx="12" cy="14.2" r="2.1" fill="currentColor" stroke="none"/>',
  layerSurface:
    '<path d="M12 4 20.5 8.5 12 13 3.5 8.5 12 4Z" fill="currentColor" fill-opacity="0.34"/><path d="M3.5 14 12 18.5 20.5 14" opacity="0.45"/>',
  layerDeep:
    '<path d="M12 3.8 20.2 8.2 12 12.6 3.8 8.2 12 3.8Z" opacity="0.38" stroke-dasharray="2 2"/><path d="M4.2 13.8 12 18.2l7.8-4.4" fill="currentColor" fill-opacity="0.28"/><circle cx="12" cy="13.8" r="2.5" fill="currentColor" stroke="none"/>',
  peel:
    '<rect x="4" y="8" width="13" height="12" rx="2" opacity="0.45"/><path d="M7 4h13v9l-4 4H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M16 17v-4h4"/>',
  isolate:
    '<circle cx="12" cy="12" r="3"/><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/>',
  reset:
    '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5v4.5H8"/>',
  illust: '<path d="M15 4.5l4.5 4.5L9.5 19H5v-4.5Z"/><path d="M12.5 7l4.5 4.5"/>',
  real: '<circle cx="12" cy="12" r="8.5"/><path d="M8 9.2a4.8 4.8 0 0 1 3.6-2.6"/><path d="M5.5 15.5c4 2 9 2 13 0" opacity=".5"/>',
  present: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  restore: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  prev: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  play: '<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8Z" fill="currentColor" stroke="none"/>',
  pause:
    '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"/><circle cx="12" cy="11" r="2.3"/>',
  bolt: '<path d="M13 2.5 5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.3 1.5 1.5 2.4h4.6c.2-.9.8-1.8 1.5-2.4A6 6 0 0 0 12 3Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5 20 20"/>',
  similar:
    '<path d="M17 3l3.5 3.5L17 10"/><path d="M3.5 11.5v-1a4 4 0 0 1 4-4h13"/><path d="M7 21l-3.5-3.5L7 14"/><path d="M20.5 12.5v1a4 4 0 0 1-4 4h-13"/>',
  video:
    '<rect x="2.5" y="4.5" width="19" height="15" rx="3.2"/><path d="M10 8.8v6.4a.6.6 0 0 0 .9.5l5.4-3.2a.6.6 0 0 0 0-1L10.9 8.3a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none"/>',
  external:
    '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  check: '<path d="M5 12.5l4.5 4.5 9.5-9.5"/>',
  orbit:
    '<ellipse cx="12" cy="12" rx="9" ry="4.2"/><path d="M9.5 14.8 12.2 16.2 9.8 18"/><path d="M14.5 9.2 11.8 7.8 14.2 6"/>',
};

// タブ（4パネルと連動）
const TABS = [
  { id: 'habit', label: '動き・クセ・仕事から', shortLabel: '動き・クセ', sub: '普段の姿勢・家事・仕事・スポーツから探す', icon: 'habit' },
  { id: 'feel', label: '痛む・気になる場所から', shortLabel: '気になる場所', sub: '首・肩・腰・脚などの部位から探す', icon: 'feel' },
  { id: 'line', label: '全身の筋膜シート図鑑', shortLabel: '筋膜シート図鑑', sub: '背中・前・横・芯など全身11枚の「筋膜の面」を見る', icon: 'line' },
  { id: 'story', label: '連動ストーリー', shortLabel: '連動ストーリー', sub: '4ステップで原因を知る', icon: 'story' },
];

// 5つの部位クイックピル定義（ワンタップ逆引き辞書）
const BODY_PILLS = [
  {
    id: 'neck',
    label: '首・顎',
    keywords: ['首', '顎', 'エラ', '頭', '顔', '食いしば', '噛み', '歯ぎしり', '眼', 'うつむき', 'スマホ', '寝転び', 'ネイル', 'まつエク', '枕', '寝違'],
    muscles: [
      'sternocleidomastoid',
      'platysma',
      'masseter',
      'temporalis',
      'splenius-capitis',
      'splenius-cervicis',
      'semispinalis',
      'levator-scapulae',
      'rectus-capitis-posterior-major',
      'rectus-capitis-posterior-minor',
      'scalenus-anterior',
    ],
  },
  {
    id: 'shoulder',
    label: '肩・腕',
    keywords: ['肩', '腕', '肘', '手首', '親指', '母指', '指', '巻き肩', 'ハサミ', 'カット', 'ネイル', 'マウス', '洗濯', '工具', '配送', 'フライパン', '包丁', 'ベビーカー', 'ラケット', 'テニス', 'ゴルフ', 'バスケ', 'カバン'],
    muscles: [
      'abductor-pollicis-brevis',
      'flexor-pollicis-longus',
      'biceps-brachii',
      'brachioradialis',
      'pronator-teres',
      'extensor-carpi-radialis-longus',
      'flexor-carpi-radialis',
      'flexor-digitorum-superficialis',
      'deltoid',
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'trapezius',
      'pectoralis-minor',
      'subclavius',
    ],
  },
  {
    id: 'back',
    label: '胸・背中',
    keywords: ['胸', '背中', '肩甲骨', '脇', '呼吸', '息', 'みぞおち', '猫背', '丸ま', '腕組', '水泳', 'ベンチ', 'ヨガ', 'ピラティス'],
    muscles: [
      'pectoralis-major',
      'pectoralis-minor',
      'rhomboid-major',
      'rhomboid-minor',
      'serratus-anterior',
      'latissimus-dorsi',
      'diaphragm',
      'rectus-abdominis',
      'longissimus',
      'iliocostalis',
    ],
  },
  {
    id: 'waist',
    label: '腰・お尻',
    keywords: ['腰', 'お尻', '骨盤', '股関節', '仙骨', '反り腰', '中腰', '前かがみ', '座り', 'あぐら', '横座り', '抱っこ', 'ベビーカー', '足組', '運転', '配送', 'レジ', 'シャンプー', '介助', '掃除', 'ゴルフ', 'スクワット', 'ヨガ'],
    muscles: [
      'psoas-major',
      'iliacus',
      'pectineus',
      'quadratus-lumborum',
      'multifidus',
      'gluteus-maximus',
      'gluteus-medius',
      'tensor-fasciae-latae',
      'piriformis',
      'external-oblique',
      'internal-oblique',
    ],
  },
  {
    id: 'leg',
    label: '脚・足',
    keywords: ['脚', '足', 'もも', 'ふくらはぎ', 'すね', '膝', '足首', '足裏', 'かかと', 'ヒール', '立ち', 'レジ', 'ラン', '走', '歩', '登山', 'ウォーキング', 'バスケ', 'ジャンプ', 'サッカー', 'スクワット', 'あぐら', '横座り'],
    muscles: [
      'flexor-digitorum-brevis',
      'abductor-digiti-minimi-foot',
      'tibialis-posterior',
      'fibularis-longus',
      'fibularis-brevis',
      'biceps-femoris',
      'semitendinosus',
      'semimembranosus',
      'rectus-femoris',
      'vastus-lateralis',
      'vastus-medialis',
      'gastrocnemius',
      'soleus',
      'tibialis-anterior',
      'adductor-longus',
      'adductor-magnus',
      'pectineus',
      'piriformis',
      'tensor-fasciae-latae',
    ],
  },
];

// 標準のサブカテゴリー定義（大カテゴリー macro: 'work' | 'daily' | 'sports' 付き）
const DEFAULT_OCCUPATIONS = [
  { id: 'デスクワーク', label: 'デスクワーク', short: 'デスクワーク', icon: 'occ-desk', sub: 'PC・マウス・スマホ・座り姿勢', macro: 'work' },
  { id: '美容師・理容師', label: '美容師・理容師', short: '美容師・理容師', icon: 'occ-hair', sub: '腕上げカット・シャンプー・手元作業', macro: 'work' },
  { id: '整体師・介護・看護', label: '整体師・介護・看護', short: '整体・介護・看護', icon: 'occ-care', sub: '前かがみ施術・抱え介助・移動', macro: 'work' },
  { id: '土木・建築・運転', label: '土木・建築・運転', short: '土木・建築・運転', icon: 'occ-build', sub: '荷物持ち・頭上作業・長時間運転', macro: 'work' },
  { id: '立ち仕事・料理・接客', label: '立ち仕事・料理・接客', short: '立ち仕事・料理・接客', icon: 'occ-stand', sub: '調理・接客・レジ立ちっぱなし', macro: 'work' },
  { id: '家事・育児', label: '家事・育児', short: '家事・育児', icon: 'occ-home', sub: '抱っこ・洗濯干し・掃除・料理', macro: 'daily' },
];

// 【レイヤー 1A】「痛む・気になる場所から」5つの部位選択定義
const FEEL_REGIONS = [
  {
    id: 'neck',
    label: '首・あご・頭',
    sub: '首の詰まり・食いしばり・スマホ首など',
    icon: 'phone-neck',
  },
  {
    id: 'shoulder',
    label: '肩・腕・手',
    sub: '肩の重さ・腕が上がりづらい・手首や親指など',
    icon: 'hair-cut',
  },
  {
    id: 'back',
    label: '胸・背中・肩甲骨',
    sub: '背中の張り・猫背・息の浅さなど',
    icon: 'arms-fold',
  },
  {
    id: 'waist',
    label: '腰・骨盤・お尻',
    sub: '座り腰の重さ・立つと伸びづらい・反り腰・お尻奥など',
    icon: 'pelvis-tug-lowback',
  },
  {
    id: 'leg',
    label: '股関節・ひざ・足',
    sub: '股関節の詰まり・前もも・ふくらはぎ・足裏など',
    icon: 'occ-run',
  },
];

// 【レイヤー 1B】「動き・クセ・仕事から」4つのカテゴリー定義
const HABIT_ENTRY_CATEGORIES = [
  {
    id: 'posture',
    emoji: '🛋️',
    label: '日常の姿勢・クセ',
    sub: '足組み・スマホ・片足立ち・ソファー・寝方',
    mode: 'direct-posture',
  },
  {
    id: 'housework',
    emoji: '🏠',
    label: '家事・育児の動き',
    sub: '掃除・洗い物・抱っこ・洗濯干し・料理',
    mode: 'direct-housework',
  },
  {
    id: 'work',
    emoji: '💼',
    label: '仕事・職業の動き',
    sub: 'デスクPC・美容師・介護施術・運転・立ち仕事',
    mode: 'occ-work',
  },
  {
    id: 'sports',
    emoji: '⛳',
    label: 'スポーツ・運動',
    sub: 'ゴルフ・球技・ラン・自転車・筋トレ・水泳',
    mode: 'occ-sports',
  },
];

// 「日常の姿勢・クセ」直通リストの代表的な姿勢・習慣ID順
const POSTURE_HABIT_PRIORITY_IDS = [
  'leg-cross-r',
  'phone-neck',
  'sofa-slouch',
  'phone-bed-side',
  'stand-hip-r',
  'arms-fold',
  'bag-shoulder-r',
  'sleep-side-curl',
  'teeth-clench-night',
  'floor-sit-cross',
  'heels-commute-walk',
];

// 3Dリリース器具ラベル定義（指・ボール・ローラーの安全ルール対応3択）
const TOOL_LABEL = {
  hand: '🤲 指でやる',
  ball: '🎾 ボール',
  roller: '🛞 ローラー',
  pole: '🛞 ローラー',
};

// 3Dリリース器具定義（部位ごとの安全ルールに基づき許可されたボタンのみ表示）
const RELEASE_TOOLS = [
  { id: 'hand', label: TOOL_LABEL.hand, badge: TOOL_LABEL.hand, motion: 'stroke' },
  { id: 'ball', label: TOOL_LABEL.ball, badge: TOOL_LABEL.ball, motion: 'circle' },
  { id: 'roller', label: TOOL_LABEL.roller, badge: TOOL_LABEL.roller, motion: 'roll' },
];
const HAND_TOOL_DEF = RELEASE_TOOLS[0];
const RELEASE_TOOL_MAP = {
  hand: RELEASE_TOOLS[0],
  ball: RELEASE_TOOLS[1],
  roller: RELEASE_TOOLS[2],
  pole: RELEASE_TOOLS[2],
};

// 筋肉IDごとのデフォルト推奨リリース器具マップ（data.js 側で未指定時のフォールバック）
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
  'subclavius': 'ball',
  'coracobrachialis': 'ball',
  'subscapularis': 'ball',
  'sternocleidomastoid': 'hand',
  'scalenus-anterior': 'hand',
  'scalenus-medius': 'hand',
  'platysma': 'hand',
  'masseter': 'ball',
  'temporalis': 'ball',
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
  'diaphragm': 'ball',
  'rectus-abdominis': 'roller',
  'psoas-major': 'ball',
  'iliacus': 'ball',
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
  'internal-oblique': 'ball',
  'gastrocnemius': 'roller',
  'soleus': 'roller',
  'tibialis-anterior': 'roller',
  'tibialis-posterior': 'ball',
  'fibularis-longus': 'roller',
  'fibularis-brevis': 'roller',
  'flexor-digitorum-brevis': 'ball',
  'abductor-digiti-minimi-foot': 'ball',
  'flexor-hallucis-longus': 'ball',
  'popliteus': 'ball',
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

// 医療アトラス専用デュオトーン SVG アイコン定義（20x20 / viewBox 0 0 24 24）
const DUOTONE_PATHS = {
  // === ホーム画面の5大メインボタンアイコン ===
  'cat-work':
    '<rect x="3" y="7" width="18" height="13" rx="2.2" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
    '<path d="M3 12h18"/>',
  'cat-daily':
    '<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5Z" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M9.5 21.5v-6h5v6"/>',
  'cat-sports':
    '<rect x="2" y="8.5" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/>' +
    '<rect x="5.5" y="6.5" width="3" height="11" rx="1" fill="currentColor" fill-opacity="0.25"/>' +
    '<rect x="15.5" y="6.5" width="3" height="11" rx="1" fill="currentColor" fill-opacity="0.25"/>' +
    '<rect x="18.5" y="8.5" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/>' +
    '<path d="M8.5 12h7" stroke-width="2.4"/>',
  'cat-feel':
    '<path d="M13 2.5 5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z" fill="currentColor" fill-opacity="0.22"/>',
  'cat-line':
    '<circle cx="5" cy="18" r="2.8" fill="currentColor" fill-opacity="0.25"/>' +
    '<circle cx="12" cy="11" r="2.8" fill="currentColor" fill-opacity="0.25"/>' +
    '<circle cx="19" cy="5" r="2.8" fill="currentColor" fill-opacity="0.25"/>' +
    '<path d="M7.2 16.2 9.8 13.2M14.2 9.2 16.8 6.8" stroke-width="2.2"/>',

  // === 職業・ライフスタイル・スポーツ サブカテゴリーアイコン ===
  'occ-hair':
    '<circle cx="6" cy="18" r="3" fill="currentColor" fill-opacity="0.2"/>' +
    '<circle cx="6" cy="6" r="3" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M8.5 7.5 20 19M8.5 16.5 20 5"/>',
  'occ-desk':
    '<rect x="4" y="5" width="16" height="11" rx="1.8" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M2 19h20"/>',
  'occ-care':
    '<path d="M12 20.5s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1 4.2 4.2 0 0 1 7 3.1c0 5.5-7 10-7 10Z" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M12 9v5M9.5 11.5h5"/>',
  'occ-home':
    '<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5Z" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M12 16.5s-3-2-3-4a1.8 1.8 0 0 1 3-1.2 1.8 1.8 0 0 1 3 1.2c0 2-3 4-3 4Z"/>',
  'occ-build':
    '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.16"/>' +
    '<circle cx="12" cy="12" r="2.2"/>' +
    '<path d="M4 10.5h16M12 14.2v6"/>',
  'occ-stand':
    '<circle cx="10" cy="12" r="6.5" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M16.5 12H22" stroke-width="2.4"/>',
  'occ-golf':
    '<ellipse cx="10" cy="9" rx="5.5" ry="6.5" transform="rotate(-35 10 9)" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M14 13l6 6"/>' +
    '<circle cx="18.5" cy="6.5" r="2.2" fill="currentColor" fill-opacity="0.3"/>',
  'occ-run':
    '<path d="M3 16.5V12l4-1 4.5 3.5L17 13a3.5 3.5 0 0 1 4 3.5v2H3v-2Z" fill="currentColor" fill-opacity="0.22"/>' +
    '<path d="M3 18.5h18"/>',
  'occ-gym':
    '<rect x="2" y="8.5" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.22"/>' +
    '<rect x="5.5" y="6.5" width="3" height="11" rx="1" fill="currentColor" fill-opacity="0.22"/>' +
    '<rect x="15.5" y="6.5" width="3" height="11" rx="1" fill="currentColor" fill-opacity="0.22"/>' +
    '<rect x="18.5" y="8.5" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.22"/>' +
    '<path d="M8.5 12h7" stroke-width="2.4"/>',
  'occ-bag':
    '<rect x="5" y="8" width="14" height="12" rx="2.2" fill="currentColor" fill-opacity="0.22"/>' +
    '<path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  'occ-sleep':
    '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" fill-opacity="0.22"/>',

  // === 代表動作アイコン ===
  'hair-cut':
    '<circle cx="9" cy="5.5" r="2.3" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M6 19c.3-4 2-6.5 4.8-6.5h2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M10.8 11.2l4.5-3.2 2.8 1.5"/>' +
    '<path d="M17.5 5.2l3 3M20.5 5.2l-3 3"/>',
  'hair-shampoo':
    '<circle cx="13.5" cy="6.2" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M6.2 19.5c-.2-4.5 1.8-8.2 5.2-9.6l4.6 3.6" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M14.5 16.5c1.5-1.2 3.5-1.2 5 0" stroke-dasharray="1.5 2"/>',
  'laundry-up':
    '<circle cx="10.5" cy="6.5" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.8 19.5l.8-8.2h4.2l.8 8.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M12.2 11.5l3.6-5.2M8.4 11.5 6.2 6.8"/>' +
    '<path d="M4.5 4.5h15"/>',
  'vacuum-bend':
    '<circle cx="11.8" cy="5.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M6.2 19.5l1.2-5.5 2.8-5.2 4.2 3.5"/>' +
    '<path d="M14.2 12.2l4.6 7.3h2.2"/>' +
    '<rect x="6.2" y="8.8" width="4.2" height="5.5" rx="1.5" transform="rotate(22 8.3 11.5)" fill="currentColor" fill-opacity="0.16"/>',
  'therapist-press':
    '<circle cx="12" cy="5.2" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.5 8.8h7l-1.2 5.5H8.7L7.5 8.8Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.5 11.5l1.5 5.5M13.5 11.5 12 17"/>' +
    '<rect x="4.5" y="17.2" width="15" height="3" rx="1.2" fill="currentColor" fill-opacity="0.18"/>',
  'heavy-lift':
    '<circle cx="11.5" cy="5.2" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M6.8 19.5l1.2-5 2.2-5.2 4.2 3.8"/>' +
    '<rect x="13.8" y="12.5" width="6.2" height="5.8" rx="1.2" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M16.9 9.2v2.5M15.2 10.5l1.7-1.5 1.7 1.5"/>',
  'driving-sit':
    '<circle cx="9" cy="5.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.2 8.8v6.2h5.5l2 4.5" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.2 11.2h6.2"/>' +
    '<circle cx="17.2" cy="11.2" r="3.2" fill="currentColor" fill-opacity="0.16"/>',
  'cooking-stand':
    '<circle cx="10" cy="5" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.5 8.5h4.8l-.6 11H8.1l-.6-11Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M11.5 10.5l3.5 2.2h4.5"/>' +
    '<path d="M14.5 15.5h6v4h-6Z" fill="currentColor" fill-opacity="0.16"/>',
  'phone-neck':
    '<circle cx="9.2" cy="6.2" r="3" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.8 9.2c-2 2.4-2.6 5.6-2.3 9.3"/>' +
    '<path d="M8.8 11.8l4.2 3.2"/>' +
    '<rect x="14.5" y="10.8" width="5.2" height="8.6" rx="1.3" transform="rotate(-12 17.1 15.1)" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M12.2 7.8l2.6 2.6" stroke-dasharray="1.5 2"/>',
  'desk-round':
    '<circle cx="8.8" cy="6" r="2.7" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7 8.5C4.2 11 4.2 15.6 6.8 18.8h4.4" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M8.2 12.4l3.4 3.1h2.8"/>' +
    '<path d="M15.4 15.5l2-5.2h2.8l-1.8 5.2Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M12.8 18.8h8.2"/>',
  'pelvis-tug-lowback':
    '<path d="M6.5 9.5c-1.8 0-3 1.5-2.6 3.5.3 1.7 1.8 3.1 3.5 3.3l2.3.2 2.3 1.8 2.3-1.8 2.3-.2c1.7-.2 3.2-1.6 3.5-3.3.4-2-.8-3.5-2.6-3.5-1.5 0-2.6.8-3.2 1.9H9.7c-.6-1.1-1.7-1.9-3.2-1.9Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M12 2.5v4.6M9.8 4.6 12 2.5l2.2 2.1"/>' +
    '<path d="M12 21.5v-4.2M9.8 19.4 12 21.5l2.2-2.1"/>',
  'biceps-face-sag':
    '<circle cx="10" cy="6.2" r="3.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M4.8 18.8c.4-3.6 2.3-5.8 5.2-5.8s4.8 2.2 5.2 5.8" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M18 6.5v11.5M15.6 15.6 18 18l2.4-2.4"/>' +
    '<path d="M13.2 8.2l4.8 2.2"/>',
  sofa:
    '<path d="M4 11.5a2 2 0 0 1 2-2h1.6v6H19a1.5 1.5 0 0 1 1.5 1.5v1.8H4v-7.3Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M5.5 18.8v2M18.5 18.8v2"/>' +
    '<circle cx="10.6" cy="5.8" r="2.3" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.2 8c-1.7 2.2-1.3 5 1.5 6.5h4.6l2 3.5"/>',
  'arms-fold':
    '<circle cx="12" cy="5.5" r="2.7" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M5.5 18.2c0-4.3 2.6-7 6.5-7s6.5 2.7 6.5 7" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.5 13.2l9 4.5M16.5 13.2l-9 4.5"/>' +
    '<path d="M5.2 11.2c.8-1.2 2-2 3.4-2.2M18.8 11.2c-.8-1.2-2-2-3.4-2.2"/>',
  'daily-strain':
    '<circle cx="12" cy="5.2" r="2.4" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M8.5 9.2h7l-1 9.6h-5l-1-9.6Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M4.5 12.5c2 2.4 5.5 3.4 9.6 2.6 2.4-.4 4.3-1.4 5.4-2.8"/>' +
    '<path d="M17.2 10.2l2.3 2.1-2.5 1.7"/>',
  'childcare-hip-l':
    '<circle cx="10.5" cy="5.2" r="2.3" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M7.5 9.2l6.2.8-1 9.2H7.8l-.3-10Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<circle cx="16.8" cy="13.4" r="2.8" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M5.5 16.2l13-2"/>',
  'leg-cross-r':
    '<ellipse cx="12" cy="7.8" rx="5.4" ry="2.2" transform="rotate(-9 12 7.8)" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M14.2 10v10.2"/>' +
    '<path d="M9.4 10l7.4 6.6-3.4 3.6"/>' +
    '<circle cx="9.2" cy="7.8" r="1.2" fill="currentColor" stroke="none"/>',
  'leg-cross-l':
    '<ellipse cx="12" cy="7.8" rx="5.4" ry="2.2" transform="rotate(9 12 7.8)" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.8 10v10.2"/>' +
    '<path d="M14.6 10l-7.4 6.6 3.4 3.6"/>' +
    '<circle cx="14.8" cy="7.8" r="1.2" fill="currentColor" stroke="none"/>',
  'stand-hip-r':
    '<circle cx="11.4" cy="4.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M8.2 8.5h6.2l-1.4 5.5H7.8l.4-5.5Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.4 14v6.8M12.8 14l2.2 6.4"/>' +
    '<path d="M4.2 11.2h2.6M5.6 9.6 4 11.2l1.6 1.6"/>',
  'stand-hip-l':
    '<circle cx="12.6" cy="4.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.6 8.5h6.2l.4 5.5H11l-1.4-5.5Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M14.6 14v6.8M11.2 14 9 20.4"/>' +
    '<path d="M17.2 11.2h2.6M18.4 9.6l1.6 1.6-1.6 1.6"/>',
  'sway-back':
    '<circle cx="11.5" cy="4.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M10.5 7.6c2.2 1.8 3.2 4.2 1.4 6.6-1.2 1.6-1 4 0 6.6H9.2c-1-2.6-1.2-5 0-6.6 1.4-2 .6-4.4-1-6.6h2.3Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M5.8 10.5c2 1.2 2 4.6 0 5.8"/>',
  sit:
    '<circle cx="11.2" cy="5" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M9.6 8v5.8H15l1.5 6.2"/>' +
    '<path d="M6.5 9.2v6.6h7.5v-2H8.6V9.2H6.5Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M6.5 15.8v4.2M13.5 15.8v4.2"/>',
  stand:
    '<circle cx="12" cy="4.8" r="2.2" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M8.8 8.5h6.4l-.8 5.8H9.6l-.8-5.8Z" fill="currentColor" fill-opacity="0.16"/>' +
    '<path d="M10.4 14.3v6.5M13.6 14.3v6.5"/>',
};

// SVG テンプレートキャッシュ
const duotoneProtoCache = new Map();
const iconProtoCache = new Map();

/** 医療アトラス専用デュオトーン SVG アイコン要素を生成 */
function createDuotoneSvg(key, cls = 'duotone-svg') {
  const resolvedKey = DUOTONE_PATHS[key] ? key : 'daily-strain';
  const cacheKey = `${resolvedKey}|${cls}`;
  let proto = duotoneProtoCache.get(cacheKey);
  if (!proto) {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="ico ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DUOTONE_PATHS[resolvedKey]}</svg>`;
    proto = t.content.firstChild;
    duotoneProtoCache.set(cacheKey, proto);
  }
  return proto.cloneNode(true);
}

/** ストーリーIDからデュオトーンSVGアイコンを返す */
function getStoryIcon(storyId) {
  const map = {
    'phone-pc-jaw': 'phone-neck',
    'pelvis-tug-lowback': 'pelvis-tug-lowback',
    'biceps-face-sag': 'biceps-face-sag',
    sofa: 'sofa',
    'arms-fold': 'arms-fold',
    'daily-strain': 'daily-strain',
  };
  return createDuotoneSvg(map[storyId] || 'phone-neck');
}

/** クセ（または動作オブジェクト/ID）からデュオトーンSVGアイコンを返す */
function getHabitIcon(habitOrId) {
  const id = typeof habitOrId === 'string' ? habitOrId : habitOrId?.id || '';
  const label =
    typeof habitOrId === 'object' && habitOrId
      ? `${habitOrId.label || ''}`
      : '';
  const map = {
    'desk-round': 'desk-round',
    'mouse-reach-r': 'desk-round',
    'pc-mouse-right': 'desk-round',
    'phone-neck': 'phone-neck',
    'phone-bed-side': 'phone-neck',
    'bed-phone-neck': 'phone-neck',
    'lying-phone': 'phone-neck',
    'jaw-clench-stress': 'biceps-face-sag',
    'teeth-clench': 'biceps-face-sag',
    'teeth-clench-night': 'biceps-face-sag',
    'sofa-slouch': 'sofa',
    'leg-cross-r': 'leg-cross-r',
    'leg-cross-l': 'leg-cross-l',
    'floor-sit-cross': 'leg-cross-r',
    'floor-agura-sit': 'leg-cross-r',
    'agura-sidesit': 'leg-cross-r',
    'stand-hip-r': 'stand-hip-r',
    'stand-hip-l': 'stand-hip-l',
    'sway-back': 'sway-back',
    'heel-commute-walk': 'sway-back',
    'heels-commute-walk': 'sway-back',
    'heel-stand-walk': 'sway-back',
    'arms-fold': 'arms-fold',
    'childcare-hip-l': 'childcare-hip-l',
    'stroller-push-bend': 'childcare-hip-l',
    'baby-stroller': 'childcare-hip-l',
    'hair-cut': 'hair-cut',
    'hair-cut-arm': 'hair-cut',
    'hair-scissors': 'hair-cut',
    'nail-eye-bend': 'hair-cut',
    'nail-eyelash': 'hair-cut',
    'hair-shampoo': 'hair-shampoo',
    'hair-shampoo-bend': 'hair-shampoo',
    'laundry-up': 'laundry-up',
    'laundry-reach': 'laundry-up',
    'laundry-hang': 'laundry-up',
    'vacuum-bend': 'vacuum-bend',
    'vacuum-dish-bend': 'vacuum-bend',
    'cleaning-bend': 'vacuum-bend',
    'therapist-press': 'therapist-press',
    'care-lift': 'therapist-press',
    'care-lift-bend': 'therapist-press',
    'heavy-lift': 'heavy-lift',
    'heavy-lift-dig': 'heavy-lift',
    'delivery-carry-box': 'heavy-lift',
    'delivery-lift': 'heavy-lift',
    'overhead-tool': 'laundry-up',
    'tool-work': 'heavy-lift',
    'driving-sit': 'driving-sit',
    'drive-long': 'driving-sit',
    'cooking-stand': 'cooking-stand',
    'cook-pan-hold': 'cooking-stand',
    'cook-knife-cut': 'cooking-stand',
    'register-stand-work': 'cooking-stand',
    'cashier-stand': 'cooking-stand',
    'golf-swing': 'occ-golf',
    'golf-swing-rot': 'occ-golf',
    'tennis-serve': 'occ-golf',
    'tennis-baseball-arm': 'occ-golf',
    'baseball-pitch': 'occ-golf',
    'volleyball-smash': 'occ-golf',
    'basket-jump-land': 'occ-golf',
    'basketball-jump': 'occ-golf',
    'run-stride': 'occ-run',
    'running-form': 'occ-run',
    'running-strike': 'occ-run',
    'hiking-trek-walk': 'occ-run',
    'hiking-walk': 'occ-run',
    'mountain-walk': 'occ-run',
    'bench-press': 'occ-gym',
    'gym-bench-push': 'occ-gym',
    'squat-arch': 'occ-gym',
    'gym-squat-lift': 'occ-gym',
    'swim-crawl-yoga': 'occ-gym',
    'yoga-pilates-pose': 'occ-gym',
    'yoga-pilates': 'occ-gym',
    'bag-shoulder': 'occ-bag',
    'bag-shoulder-r': 'occ-bag',
    'sleep-side': 'occ-sleep',
    'sleep-side-curl': 'occ-sleep',
  };
  if (map[id]) return createDuotoneSvg(map[id]);
  const s = `${id} ${label}`.toLowerCase();
  if (s.includes('golf') || s.includes('tennis') || s.includes('swing') || s.includes('basket') || s.includes('jump') || s.includes('volley') || s.includes('ゴルフ') || s.includes('テニス') || s.includes('ラケット') || s.includes('スイング') || s.includes('野球') || s.includes('球技') || s.includes('バスケ') || s.includes('ジャンプ') || s.includes('バレー'))
    return createDuotoneSvg('occ-golf');
  if (s.includes('run') || s.includes('marathon') || s.includes('hik') || s.includes('trek') || s.includes('walk') || s.includes('ラン') || s.includes('走') || s.includes('マラソン') || s.includes('陸上') || s.includes('ダッシュ') || s.includes('サッカー') || s.includes('登山') || s.includes('ウォーキング') || s.includes('歩'))
    return createDuotoneSvg('occ-run');
  if (s.includes('gym') || s.includes('workout') || s.includes('bench') || s.includes('squat') || s.includes('swim') || s.includes('yoga') || s.includes('pilates') || s.includes('筋トレ') || s.includes('ベンチ') || s.includes('スクワット') || s.includes('ダンベル') || s.includes('水泳') || s.includes('ヨガ') || s.includes('ピラティス') || s.includes('プランク'))
    return createDuotoneSvg('occ-gym');
  if (s.includes('bag') || s.includes('カバン') || s.includes('バッグ') || s.includes('リュック') || s.includes('肩掛け'))
    return createDuotoneSvg('occ-bag');
  if (s.includes('phone') || s.includes('スマホ') || s.includes('ゲーム') || s.includes('寝転び'))
    return createDuotoneSvg('phone-neck');
  if (s.includes('sleep') || s.includes('pillow') || s.includes('睡眠') || s.includes('寝') || s.includes('枕') || s.includes('うつ伏せ'))
    return createDuotoneSvg('occ-sleep');
  if (s.includes('clench') || s.includes('jaw') || s.includes('食いしば') || s.includes('歯ぎしり') || s.includes('噛み') || s.includes('エラ') || s.includes('顎'))
    return createDuotoneSvg('biceps-face-sag');
  if (s.includes('shampoo') || s.includes('シャンプー') || s.includes('洗髪')) return createDuotoneSvg('hair-shampoo');
  if (s.includes('hair') || s.includes('cut') || s.includes('scissors') || s.includes('nail') || s.includes('eyelash') || s.includes('美容') || s.includes('ハサミ') || s.includes('カット') || s.includes('ドライヤー') || s.includes('ネイル') || s.includes('まつエク') || s.includes('まつげ'))
    return createDuotoneSvg('hair-cut');
  if (s.includes('laundry') || s.includes('洗濯') || s.includes('干す') || s.includes('高い')) return createDuotoneSvg('laundry-up');
  if (s.includes('vacuum') || s.includes('clean') || s.includes('掃除') || s.includes('拭き')) return createDuotoneSvg('vacuum-bend');
  if (s.includes('child') || s.includes('baby') || s.includes('stroller') || s.includes('抱っこ') || s.includes('だっこ') || s.includes('育児') || s.includes('ベビーカー') || s.includes('授乳'))
    return createDuotoneSvg('childcare-hip-l');
  if (s.includes('therap') || s.includes('care') || s.includes('nurs') || s.includes('整体') || s.includes('施術') || s.includes('介護') || s.includes('看護') || s.includes('介助'))
    return createDuotoneSvg('therapist-press');
  if (s.includes('driv') || s.includes('運転') || s.includes('ハンドル')) return createDuotoneSvg('driving-sit');
  if (s.includes('heavy') || s.includes('lift') || s.includes('build') || s.includes('tool') || s.includes('deliver') || s.includes('carry') || s.includes('土木') || s.includes('建築') || s.includes('荷物') || s.includes('配送') || s.includes('配達') || s.includes('運搬') || s.includes('工具') || s.includes('中腰'))
    return createDuotoneSvg('heavy-lift');
  if (s.includes('cook') || s.includes('kitchen') || s.includes('knife') || s.includes('register') || s.includes('cashier') || s.includes('料理') || s.includes('調理') || s.includes('包丁') || s.includes('接客') || s.includes('レジ'))
    return createDuotoneSvg('cooking-stand');
  if (s.includes('desk') || s.includes('pc') || s.includes('mouse') || s.includes('パソコン') || s.includes('マウス')) return createDuotoneSvg('desk-round');
  if (s.includes('sofa') || s.includes('ソファー')) return createDuotoneSvg('sofa');
  if (s.includes('agura') || s.includes('あぐら') || s.includes('横座り') || s.includes('床座り') || s.includes('cross-r') || s.includes('右足')) return createDuotoneSvg('leg-cross-r');
  if (s.includes('cross-l') || s.includes('左足')) return createDuotoneSvg('leg-cross-l');
  if (s.includes('hip-r')) return createDuotoneSvg('stand-hip-r');
  if (s.includes('hip-l')) return createDuotoneSvg('stand-hip-l');
  if (s.includes('sway') || s.includes('heel') || s.includes('反り腰') || s.includes('ヒール') || s.includes('パンプス') || s.includes('通勤')) return createDuotoneSvg('sway-back');
  if (s.includes('arm') || s.includes('腕')) return createDuotoneSvg('arms-fold');
  return createDuotoneSvg('daily-strain');
}

/** 職業名・グループ名からデュオトーンSVGアイコンを返す */
function getOccupationIcon(occOrName) {
  const key =
    typeof occOrName === 'string'
      ? occOrName
      : occOrName?.icon || occOrName?.label || occOrName?.name || occOrName?.id || '';
  if (DUOTONE_PATHS[key]) return createDuotoneSvg(key);
  const s = String(key).toLowerCase();
  if (s.includes('ゴルフ') || s.includes('球技') || s.includes('ラケット') || s.includes('テニス') || s.includes('野球') || s.includes('golf') || s.includes('tennis'))
    return createDuotoneSvg('occ-golf');
  if (s.includes('ラン') || s.includes('陸上') || s.includes('歩') || s.includes('マラソン') || s.includes('サッカー') || s.includes('run') || s.includes('walk'))
    return createDuotoneSvg('occ-run');
  if (s.includes('筋トレ') || s.includes('ワークアウト') || s.includes('ジム') || s.includes('ヨガ') || s.includes('水泳') || s.includes('スポーツ') || s.includes('gym') || s.includes('workout') || s.includes('swim') || s.includes('sport'))
    return createDuotoneSvg('occ-gym');
  if (s.includes('睡眠') || s.includes('寝') || s.includes('ねる') || s.includes('枕') || s.includes('ソファー') || s.includes('sleep'))
    return createDuotoneSvg('occ-sleep');
  if (s.includes('カバン') || s.includes('バッグ') || s.includes('靴') || s.includes('bag'))
    return createDuotoneSvg('occ-bag');
  if (s.includes('美容') || s.includes('理容') || s.includes('hair')) return createDuotoneSvg('occ-hair');
  if (s.includes('デスク') || s.includes('スマホ') || s.includes('pc') || s.includes('desk') || s.includes('事務'))
    return createDuotoneSvg('occ-desk');
  if (s.includes('整体') || s.includes('介護') || s.includes('看護') || s.includes('care') || s.includes('therap') || s.includes('医療'))
    return createDuotoneSvg('occ-care');
  if (s.includes('家事') || s.includes('育児') || s.includes('日常') || s.includes('home') || s.includes('child') || s.includes('主婦'))
    return createDuotoneSvg('occ-home');
  if (s.includes('土木') || s.includes('建築') || s.includes('運転') || s.includes('build') || s.includes('construct') || s.includes('driv') || s.includes('現場'))
    return createDuotoneSvg('occ-build');
  if (s.includes('立ち') || s.includes('料理') || s.includes('接客') || s.includes('stand') || s.includes('cook') || s.includes('飲食'))
    return createDuotoneSvg('occ-stand');
  if (s.includes('すわる')) return createDuotoneSvg('sit');
  if (s.includes('たつ')) return createDuotoneSvg('stand');
  return createDuotoneSvg('daily-strain');
}

/** グループ名からデュオトーンSVGアイコンを返す */
function getGroupIcon(groupName) {
  return getOccupationIcon(groupName);
}

/** 先頭に絵文字や記号が含まれている場合に除去して純粋な日本語タイトルを返す */
function cleanTitle(str) {
  return String(str || '').replace(/^[^\p{L}\p{N}]+\s*/u, '');
}

/** 文字列中の「ゴールデンライン」表記をすべて「トリガーライン」へ統一 */
function sanitizeTriggerText(str) {
  return String(str || '').replace(/ゴールデンライン/g, 'トリガーライン');
}

// トリガーポイント（点）および主要筋の直感的でやさしい日本語マップ（JLS準拠）
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

// デリケートな部位に対する安全注意フォールバック（data.js に safetyNote が未指定の場合にも保護）
const DELICATE_MUSCLE_SAFETY = {
  sternocleidomastoid:
    '首の前・横には大切な血管や神経が通っています。ボールや強い指圧でグイグイ押さず、皮膚をやさしくつまむか撫でる程度にしてください。',
  'scalenus-anterior':
    '首の横には腕へつながる神経が集まっています。しびれが出る強さでは絶対に押さず、やさしい力加減でゆったり呼吸しながら行ってください。',
  'scalenus-medius':
    '首の横には腕へつながる神経が集まっています。しびれが出る強さでは絶対に押さず、やさしい力加減でゆったり呼吸しながら行ってください。',
  platysma:
    '首すじはとてもデリケートです。器具を強く押し当てず、手のひらでやさしくなで下ろすようにゆるめてください。',
  'psoas-major':
    'おなかの奥は強く押し込まず、息をゆっくり吐きながら心地よい範囲で行ってください（食後すぐや妊娠中はお控えください）。',
  iliacus:
    '骨盤の内側は強くえぐらず、息を吐きながらじんわり心地よい強さでゆるめてください。',
  diaphragm:
    'みぞおち・あばら下は骨や内臓に近い場所です。硬い器具で強く押さず、指の腹で息を吐きながらやさしく触れてください。',
  popliteus:
    'ひざ裏の中央には血管や神経が通っています。ボールを強く食い込ませず、痛気持ちいい手前のやさしい強さで行ってください。',
  subscapularis:
    '脇の奥には腕へ向かう神経や血管があります。しびれや鋭い痛みを感じる場所は避け、じんわり心地よい強さで行ってください。',
  subclavius:
    '鎖骨のすぐ下は神経や血管に近い場所です。強い力でグリグリ押さず、指の腹でやさしくくるくる撫でるようにゆるめてください。',
};

// ねじれ進行スライダーの初期値と状態ラベル
const DEFAULT_HABIT_PROGRESS = 0.68;
function twistStageText(p) {
  if (p < 0.08) return 'ラクな姿勢';
  if (p < 0.42) return '軽い縮み';
  if (p < 0.76) return 'ねじれ進行中';
  return 'ガチガチにロック固定！';
}

// 視点
const VIEWS = [
  { id: 'front', short: '前', aria: '前から見る' },
  { id: 'side', short: '横', aria: '真横から見る' },
  { id: 'back', short: '後', aria: '後ろから見る' },
  { id: 'left', short: '左', aria: '左から見る' },
  { id: 'right', short: '右', aria: '右から見る' },
];
const VIEW_BY_ID = new Map(VIEWS.map((v) => [v.id, v]));

// 筋膜レイヤー切替モード（ワンタップで 重ね透視 ／ 表層 ／ 深層 を比較）
const FASCIA_LAYER_MODES = ['see-through', 'surface', 'deep'];

// 骨格レイヤー（白い骨格として常時くっきり表示・消去不可）
const BONE_LAYER_MODES = ['on'];
const BONE_LAYER_MODE_LABEL = {
  on: 'くっきり表示',
};
const LAYER_KIND_LABEL = { bone: '骨格' };

// 深層筋（DFL・単関節深層筋・ローテーターカフ等）のフォールバック判定セット
const DEFAULT_DEEP_MUSCLES = new Set([
  'scalenus-anterior',
  'scalenus-medius',
  'scalenus-posterior',
  'rectus-capitis-posterior-major',
  'rectus-capitis-posterior-minor',
  'obliquus-capitis-inferior',
  'obliquus-capitis-superior',
  'longus-colli',
  'longus-capitis',
  'semispinalis',
  'splenius-cervicis',
  'pectoralis-minor',
  'subclavius',
  'coracobrachialis',
  'subscapularis',
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'rhomboid-major',
  'rhomboid-minor',
  'levator-scapulae',
  'serratus-posterior-superior',
  'serratus-posterior-inferior',
  'flexor-pollicis-longus',
  'pronator-teres',
  'pronator-quadratus',
  'supinator',
  'brachialis',
  'flexor-digitorum-profundus',
  'diaphragm',
  'psoas-major',
  'psoas-minor',
  'iliacus',
  'quadratus-lumborum',
  'internal-oblique',
  'transversus-abdominis',
  'multifidus',
  'rotatores',
  'pelvic-floor',
  'levator-ani',
  'piriformis',
  'gluteus-minimus',
  'pectineus',
  'adductor-brevis',
  'adductor-magnus',
  'obturator-internus',
  'obturator-externus',
  'gemellus-superior',
  'gemellus-inferior',
  'quadratus-femoris',
  'vastus-intermedius',
  'popliteus',
  'soleus',
  'tibialis-posterior',
  'flexor-hallucis-longus',
  'flexor-digitorum-longus',
  'fibularis-brevis',
]);

// 時間スライダーの目盛りと、筋膜の変化段階
const TICKS = [
  { label: '今日', value: 0 },
  { label: '1か月', value: 0.5 },
  { label: '1年', value: 1 },
];
const STAGES = [
  { label: 'しわ', at: 0.05 },
  { label: 'ねじれ', at: 0.35 },
  { label: '固まる', at: 0.7 },
];
const PLAY_MS = 9000;

// ボトムシート
const SNAP_ORDER = ['closed', 'half', 'full'];
const GRIP_LABEL = { closed: 'メニューを広げる', half: 'メニューを全部広げる', full: 'メニューをしまう' };
const HALF_RATIO = 0.27;

/* -------------------------------------------------------------------------- */
/* 小さな道具                                                                   */
/* -------------------------------------------------------------------------- */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 要素生成。children の null/false は無視。データ由来の文字は必ず textContent で入れる */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) if (sv != null) el.style.setProperty(sk, String(sv));
    } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

/** 静的な SVG アイコン（cloneNode で高速生成） */
function icon(name, cls = '') {
  const cacheKey = `${name}|${cls}`;
  let proto = iconProtoCache.get(cacheKey);
  if (!proto) {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
    proto = t.content.firstChild;
    iconProtoCache.set(cacheKey, proto);
  }
  return proto.cloneNode(true);
}

/** スライダー位置 → 「3日」「2週間」「5か月」など */
function durationText(p) {
  if (p < 0.02) return '今日';
  if (p <= 0.5) {
    const days = Math.max(1, Math.round((p / 0.5) * 30));
    if (days < 7) return `${days}日`;
    if (days < 28) return `${Math.round(days / 7)}週間`;
    return '1か月';
  }
  const months = Math.round(1 + ((p - 0.5) / 0.5) * 11);
  return months >= 12 ? '1年' : `${months}か月`;
}

function ensureRoot() {
  let root = document.getElementById('ui-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ui-root';
    document.body.appendChild(root);
  }
  return root;
}

/* -------------------------------------------------------------------------- */
/* 本体                                                                        */
/* -------------------------------------------------------------------------- */

export function createUI({
  lines = [],
  habits = [],
  feelings = [],
  stories = [],
  occupations = [],
  triggerLines = [],
  goldenLines = [],
  names = null,
  muscleLayers = null,
} = {}) {
  lines = Array.isArray(lines) ? lines : [];
  habits = Array.isArray(habits) ? habits : [];
  feelings = Array.isArray(feelings) ? feelings : [];
  stories = Array.isArray(stories) ? stories : [];
  occupations = Array.isArray(occupations) ? occupations : [];
  const rawTriggerLines =
    Array.isArray(triggerLines) && triggerLines.length
      ? triggerLines
      : Array.isArray(goldenLines)
        ? goldenLines
        : [];

  const root = ensureRoot();
  root.textContent = '';
  root.classList.add('ui', 'is-instant');

  // ホームページ埋め込みモード (?embed=1) ＆ 公開モード ('clinic' / 'public') の安全な判定
  const initSearchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const hostname = typeof window !== 'undefined' ? String(window.location.hostname || '') : '';
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  const isEmbedMode =
    initSearchParams.get('embed') === '1' ||
    initSearchParams.get('embed') === 'true' ||
    Boolean(typeof window !== 'undefined' && window.FASCIA_EMBED);

  function resolveDeployMode() {
    if (isEmbedMode) return 'clinic';
    if (isLocalHost) {
      const modeParam = String(initSearchParams.get('mode') || '').trim().toLowerCase();
      if (modeParam === 'public') return 'public';
      if (modeParam === 'clinic') return 'clinic';
    }
    return MONETIZE_DEFAULTS.deployMode === 'public' ? 'public' : 'clinic';
  }

  const initialDeployMode = resolveDeployMode();
  root.classList.toggle('is-embed', isEmbedMode);
  root.classList.toggle('is-clinic-mode', initialDeployMode === 'clinic');
  root.dataset.mode = initialDeployMode;

  /** CTA リンク先の厳格検証（URLパラメータからの任意URL注入は完全廃止・フィッシング誘導防止）
   *  許可するのは https:// 絶対URL、同一オリジンの相対パス（/reserve 等・//evil は拒否）、安全な #anchor のみ。 */
  function sanitizeSafeCtaUrl(raw, fallback = '') {
    const check = (val) => {
      const s = String(val || '').trim();
      if (!s || /[\r\n\t\0]/.test(s)) return '';
      if (/^#[A-Za-z0-9_-]+$/.test(s)) return s;
      if (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\')) {
        return s;
      }
      try {
        const u = new URL(s);
        if (u.protocol === 'https:') return u.href;
      } catch {
        // invalid URL
      }
      return '';
    };
    return check(raw) || check(fallback) || '';
  }

  /** 収益化・来院相談導線設定:
   *  公開環境では MONETIZE_DEFAULTS のみを使用（localStorage 上書きや ?ad_test=1 は localhost のみ許可）。
   *  URLパラメータからのリンク先や文言の差し替えは一切受け付けない。 */
  function getMonetizeConfig() {
    let local = {};
    if (isLocalHost) {
      try {
        const raw = window.localStorage?.getItem(MONETIZE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') local = parsed;
      } catch {
        local = {};
      }
    }
    const pick = (key) => (local[key] != null && local[key] !== '' ? local[key] : MONETIZE_DEFAULTS[key]);
    const safeHttps = (v, fallback) => {
      try {
        const u = new URL(String(v || ''));
        return u.protocol === 'https:' ? u.href : fallback;
      } catch {
        return fallback;
      }
    };
    const safeLabel = (v, fallback, maxLen = 64) => {
      const s = String(v ?? '').trim().slice(0, maxLen);
      return s || fallback;
    };
    const mode = resolveDeployMode();
    const isClinic = mode === 'clinic';
    const freqRaw = Number.parseInt(pick('adFrequency'), 10);
    const adTest = isLocalHost && initSearchParams.get('ad_test') === '1';
    return {
      mode,
      isClinic,
      clinicCtaUrl: sanitizeSafeCtaUrl(pick('clinicCtaUrl'), MONETIZE_DEFAULTS.clinicCtaUrl || ''),
      clinicCtaLabel: safeLabel(
        pick('clinicCtaLabel'),
        MONETIZE_DEFAULTS.clinicCtaLabel || 'セルフケアで取れない深いねじれをプロに相談する',
        64,
      ),
      clinicCtaSub: safeLabel(
        pick('clinicCtaSub') || pick('clinicCtaSubtext'),
        MONETIZE_DEFAULTS.clinicCtaSub || '長年のクセで固まった筋膜や姿勢のバランスを専門家がチェックします',
        96,
      ),
      ballUrl: safeHttps(pick('ballUrl'), MONETIZE_DEFAULTS.ballUrl),
      rollerUrl: safeHttps(pick('rollerUrl'), MONETIZE_DEFAULTS.rollerUrl),
      ballLabel: safeLabel(pick('ballLabel'), MONETIZE_DEFAULTS.ballLabel, 40),
      rollerLabel: safeLabel(pick('rollerLabel'), MONETIZE_DEFAULTS.rollerLabel, 40),
      adFrequency: isClinic ? 0 : (Number.isFinite(freqRaw) ? clamp(freqRaw, 0, 20) : MONETIZE_DEFAULTS.adFrequency),
      admobRewardId: isClinic ? '' : String(pick('admobRewardId') || '').trim(),
      disclosure: String(MONETIZE_DEFAULTS.disclosure || ''),
      adTest: isClinic ? false : adTest,
    };
  }

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqWide = window.matchMedia('(min-width: 740px)');
  const reduced = () => mqReduce.matches;

  /* ---------- イベント ---------- */
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
        console.error(`[ui] '${event}' の処理でエラー`, err);
      }
    });
  }

  /* ---------- データ参照（Mapを1回だけ構築して共有） ---------- */
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const lineIndexById = new Map(lines.map((l, i) => [l.id, i]));
  const habitById = new Map(habits.map((x) => [x.id, x]));
  const habitIndexById = new Map(habits.map((x, i) => [x.id, i]));
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

  // 類似動作リストの事前解決 Map
  const similarByHabitId = new Map();
  for (const hb of habits) {
    if (!hb) continue;
    const rawIds =
      Array.isArray(hb.similar) && hb.similar.length
        ? hb.similar
        : habits
            .filter(
              (other) =>
                other.id !== hb.id &&
                ((other.lines || [])[0] === (hb.lines || [])[0] ||
                  (other.shorten || []).some((m) => (hb.shorten || []).includes(m))),
            )
            .slice(0, 3)
            .map((x) => x.id);
    similarByHabitId.set(
      hb.id,
      rawIds.map((simId) => habitById.get(simId)).filter(Boolean),
    );
  }

  const resolveLine = (x) => (x && typeof x === 'object' ? x : lineById.get(x));
  const resolveHabit = (x) => (x && typeof x === 'object' ? x : habitById.get(x));
  const resolveStory = (x) => (x && typeof x === 'object' ? x : storyById.get(x));
  const resolveTriggerLine = (x) => (x && typeof x === 'object' ? x : triggerLineById.get(x));
  const nameOf = (id) => {
    if (!names || id == null) return '';
    if (typeof names === 'function') return names(id) || '';
    if (names instanceof Map) return names.get(id) || '';
    const v = names[id];
    return typeof v === 'string' ? v : v?.nameJa || '';
  };
  const shortMuscleNameOf = (id, preferred = '') => {
    const cleanPref = String(preferred || '').replace(/^[①②③④⑤1-5１-５][.．、\s]*/u, '').trim();
    if (cleanPref) return sanitizeTriggerText(cleanPref);
    if (id && FRIENDLY_TP_LABELS[id]) return FRIENDLY_TP_LABELS[id];
    return nameOf(id) || id || '';
  };

  /** 筋肉IDや要素データから表層 ('surface') / 深層 ('deep') を解決 */
  const resolveMuscleLayer = (id, item = null, hb = null) => {
    if (item && typeof item === 'object' && (item.layer === 'deep' || item.layer === 'surface')) {
      return item.layer;
    }
    if (id && muscleLayers != null) {
      let rawLayer = null;
      if (typeof muscleLayers === 'function') rawLayer = muscleLayers(id);
      else if (muscleLayers instanceof Map) rawLayer = muscleLayers.get(id);
      else if (muscleLayers instanceof Set) return muscleLayers.has(id) ? 'deep' : 'surface';
      else if (typeof muscleLayers === 'object') rawLayer = muscleLayers[id];
      if (rawLayer === 'deep' || rawLayer === true || rawLayer?.layer === 'deep') return 'deep';
      if (rawLayer === 'surface' || rawLayer === 'superficial' || rawLayer === false || rawLayer?.layer === 'surface') {
        return 'surface';
      }
    }
    if (id && names && typeof names === 'object' && !(names instanceof Map)) {
      const meta = names[id];
      if (meta && typeof meta === 'object' && (meta.layer === 'deep' || meta.layer === 'surface')) {
        return meta.layer;
      }
    }
    if (id && hb && typeof hb === 'object') {
      const hbLayer = hb.muscleLayers?.[id];
      if (hbLayer === 'deep' || hbLayer === true) return 'deep';
      if (hbLayer === 'surface') return 'surface';
      if (Array.isArray(hb.deepMuscles) && hb.deepMuscles.includes(id)) return 'deep';
    }
    return id && DEFAULT_DEEP_MUSCLES.has(id) ? 'deep' : 'surface';
  };

  /** data.js の新フィールド（pulledLabel / causalSummary / quickCheck / safetyNote）をフォールバック付きで解決 */
  function resolvePulledLabel(hb, tlObj, tpIdSet = new Set()) {
    const explicit = String(hb?.pulledLabel || tlObj?.pulledLabel || '').trim();
    if (explicit) return sanitizeTriggerText(explicit).replace(/^[⚠️⚠\uFE0F\s]+/u, '');
    const namesList = [];
    for (const rawLong of hb?.lengthen || []) {
      if (namesList.length >= 2) break;
      const lid = typeof rawLong === 'string' ? rawLong : rawLong?.id;
      if (!lid || tpIdSet.has(lid)) continue;
      const lbl = shortMuscleNameOf(lid);
      if (lbl && !namesList.includes(lbl)) namesList.push(lbl);
    }
    return namesList.join('・') || cleanTitle(hb?.symptom || hb?.feel || '気になる場所');
  }

  function resolveCausalSummary(hb, tlObj, tpList, pulledText) {
    const explicit = String(hb?.causalSummary || tlObj?.causalSummary || '').trim();
    if (explicit) return sanitizeTriggerText(explicit).replace(/^[⚠️⚠\uFE0F\s]+/u, '');
    const roots = tpList
      .slice(0, 2)
      .map((tp) => tp.shortLabel)
      .filter(Boolean)
      .join('や');
    if (roots && pulledText) {
      return `${roots}が縮んで固まり、筋膜の綱引きで「${pulledText}」が引っ張られています。`;
    }
    return sanitizeTriggerText(hb?.why || hb?.desc || '離れた場所の縮みが筋膜を伝わり、気になる場所を引っ張っています。');
  }

  function resolveQuickCheck(hb, tlObj) {
    const explicit = String(hb?.quickCheck || tlObj?.quickCheck || '').trim();
    return explicit ? sanitizeTriggerText(explicit) : '';
  }

  function resolveSafetyNote(hb, tlObj, muscleIds = []) {
    const explicit = String(hb?.safetyNote || tlObj?.safetyNote || hb?.selfCare?.safetyNote || '').trim();
    if (explicit) return sanitizeTriggerText(explicit).replace(/^[⚠️⚠\uFE0F\s]+/u, '');
    for (const mid of muscleIds) {
      if (mid && DELICATE_MUSCLE_SAFETY[mid]) {
        return DELICATE_MUSCLE_SAFETY[mid];
      }
    }
    return '';
  }

  /* ---------- 大カテゴリー（仕事 / 日常動作 / スポーツ）とサブカテゴリーの構築 ---------- */
  function inferMacroCategory(rawOccOrStr) {
    if (rawOccOrStr && typeof rawOccOrStr === 'object') {
      const explicit = String(rawOccOrStr.macro || rawOccOrStr.category || '').toLowerCase();
      if (explicit === 'sports' || explicit.includes('スポーツ')) return 'sports';
      if (explicit === 'daily' || explicit.includes('日常') || explicit.includes('生活') || explicit.includes('家事'))
        return 'daily';
      if (explicit === 'work' || explicit.includes('仕事') || explicit.includes('職業')) return 'work';
    }
    const s = String(
      typeof rawOccOrStr === 'string'
        ? rawOccOrStr
        : `${rawOccOrStr?.id || ''} ${rawOccOrStr?.name || ''} ${rawOccOrStr?.label || ''} ${rawOccOrStr?.sub || ''}`,
    ).toLowerCase();
    if (
      s.includes('スポーツ') ||
      s.includes('ゴルフ') ||
      s.includes('球技') ||
      s.includes('ラケット') ||
      s.includes('テニス') ||
      s.includes('野球') ||
      s.includes('ラン') ||
      s.includes('陸上') ||
      s.includes('マラソン') ||
      s.includes('筋トレ') ||
      s.includes('ワークアウト') ||
      s.includes('ジム') ||
      s.includes('水泳') ||
      s.includes('ヨガ') ||
      s.includes('サッカー') ||
      s.includes('sport') ||
      s.includes('golf') ||
      s.includes('run') ||
      s.includes('gym') ||
      s.includes('workout') ||
      s.includes('swim') ||
      s.includes('tennis')
    ) {
      return 'sports';
    }
    if (
      s.includes('家事') ||
      s.includes('育児') ||
      s.includes('日常') ||
      s.includes('睡眠') ||
      s.includes('寝') ||
      s.includes('ねる') ||
      s.includes('ソファー') ||
      s.includes('カバン') ||
      s.includes('バッグ') ||
      s.includes('スマホ') ||
      s.includes('生活') ||
      s.includes('housework') ||
      s.includes('daily') ||
      s.includes('sleep') ||
      s.includes('bag') ||
      s.includes('home') ||
      s.includes('child')
    ) {
      return 'daily';
    }
    return 'work';
  }

  function mapOccupationLabel(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    for (const d of DEFAULT_OCCUPATIONS) {
      if (s === d.label || s === d.id || s === d.short) return d.label;
    }
    for (const occIn of occupations) {
      if (!occIn || typeof occIn !== 'object') continue;
      const oName = occIn.name || occIn.label || occIn.title || occIn.id || '';
      if (s === oName || s === occIn.id || s === occIn.short) return oName;
    }
    const low = s.toLowerCase();
    if (low.includes('ゴルフ') || low.includes('球技') || low.includes('ラケット') || low.includes('golf') || low.includes('tennis'))
      return 'ゴルフ・球技・ラケット';
    if (low.includes('ラン') || low.includes('サッカー') || low.includes('自転車') || low.includes('陸上') || low.includes('マラソン') || low.includes('run'))
      return 'ランニング・サッカー・自転車';
    if (low.includes('筋トレ') || low.includes('ワークアウト') || low.includes('水泳') || low.includes('ヨガ') || low.includes('gym') || low.includes('workout'))
      return '筋トレ・ヨガ・水泳';
    if (low.includes('姿勢') || low.includes('睡眠') || low.includes('カバン') || low.includes('寝') || low.includes('sleep') || low.includes('bag'))
      return '姿勢・睡眠・カバン';
    if (low.includes('美容') || low.includes('理容') || low.includes('hair') || low.includes('beaut')) return '美容師・理容師';
    if (low.includes('デスク') || low.includes('pc') || low.includes('desk') || low.includes('すわる')) return 'デスクワーク';
    if (low.includes('整体') || low.includes('介護') || low.includes('看護') || low.includes('therap') || low.includes('care'))
      return '整体師・介護・看護';
    if (low.includes('家事') || low.includes('育児') || low.includes('home') || low.includes('house') || low.includes('child'))
      return '家事・育児';
    if (low.includes('土木') || low.includes('建築') || low.includes('運転') || low.includes('construct') || low.includes('build') || low.includes('driv'))
      return '土木・建築・運転';
    if (low.includes('立ち') || low.includes('料理') || low.includes('接客') || low.includes('stand') || low.includes('cook') || low.includes('たつ'))
      return '立ち仕事・料理・接客';
    return s;
  }

  function resolveHabitOccupation(hb) {
    if (!hb) return DEFAULT_OCCUPATIONS[0].label;
    const direct = mapOccupationLabel(hb.occupation || hb.group);
    if (direct) return direct;
    if (hb.id === 'hair-cut-arm' || hb.id === 'hair-shampoo-bend') return '美容師・理容師';
    if (hb.id === 'therapist-press' || hb.id === 'care-lift-bend' || hb.id === 'stand-hip-l') return '整体師・介護・看護';
    if (hb.id === 'childcare-hip-l' || hb.id === 'laundry-reach' || hb.id === 'vacuum-dish-bend' || hb.id === 'sofa-slouch')
      return '家事・育児';
    if (hb.id === 'heavy-lift-dig' || hb.id === 'overhead-tool' || hb.id === 'drive-long') return '土木・建築・運転';
    if (hb.id === 'cook-pan-hold' || hb.id === 'sway-back' || hb.id === 'arms-fold') return '立ち仕事・料理・接客';
    return 'デスクワーク';
  }

  // サブカテゴリーリスト（normalizedOccupations）を動的に構築（DEFAULT 6種 ＋ data.js で追加された全カテゴリ）
  const normalizedOccupations = [];
  const occByLabel = new Map();

  function ensureOccEntry({ id, label, short, icon: ic, sub, macro }) {
    const cleanLbl = String(label || id || '').trim();
    if (!cleanLbl) return null;
    if (occByLabel.has(cleanLbl)) return occByLabel.get(cleanLbl);
    const entry = {
      id: id || cleanLbl,
      label: cleanLbl,
      short: short || cleanLbl,
      icon: ic || cleanLbl,
      sub: sub || '',
      macro: macro || inferMacroCategory({ id, label: cleanLbl, sub }),
      habits: [],
    };
    normalizedOccupations.push(entry);
    occByLabel.set(cleanLbl, entry);
    return entry;
  }

  for (const def of DEFAULT_OCCUPATIONS) {
    const incoming = occupations.find((o) => {
      const lbl = typeof o === 'string' ? o : o?.name || o?.label || o?.title || o?.id || '';
      return mapOccupationLabel(lbl) === def.label || o?.id === def.id;
    });
    ensureOccEntry({
      id: (typeof incoming === 'object' && incoming?.id) || def.id,
      label: def.label,
      short: (typeof incoming === 'object' && incoming?.short) || def.short,
      icon: (typeof incoming === 'object' && incoming?.icon) || def.icon,
      sub: (typeof incoming === 'object' && incoming?.sub) || def.sub,
      macro: (typeof incoming === 'object' && (incoming?.macro || incoming?.category))
        ? inferMacroCategory(incoming)
        : def.macro,
    });
  }

  for (const occIn of occupations) {
    if (!occIn || typeof occIn !== 'object') continue;
    const rawLbl = occIn.name || occIn.label || occIn.title || occIn.id || '';
    const mappedLbl = mapOccupationLabel(rawLbl) || rawLbl;
    ensureOccEntry({
      id: occIn.id || mappedLbl,
      label: mappedLbl,
      short: occIn.short || mappedLbl,
      icon: occIn.icon || mappedLbl,
      sub: occIn.sub || '',
      macro: inferMacroCategory(occIn),
    });
  }

  // 各 habit をプライマリサブカテゴリーへ重複なく割り当て（全 data-habit が DOM に1つずつ確実に存在するようにする）
  const assignedHabitIds = new Set();
  for (const occIn of occupations) {
    if (!occIn || typeof occIn !== 'object') continue;
    const rawLbl = occIn.name || occIn.label || occIn.title || occIn.id || '';
    const targetOcc = occByLabel.get(mapOccupationLabel(rawLbl) || rawLbl);
    if (!targetOcc) continue;
    for (const rawH of occIn.habits || []) {
      const hb = resolveHabit(rawH);
      if (hb && !assignedHabitIds.has(hb.id)) {
        assignedHabitIds.add(hb.id);
        targetOcc.habits.push(hb);
      }
    }
  }
  for (const hb of habits) {
    if (!hb || assignedHabitIds.has(hb.id)) continue;
    assignedHabitIds.add(hb.id);
    const occLabel = resolveHabitOccupation(hb);
    const targetOcc = ensureOccEntry({
      id: occLabel,
      label: occLabel,
      short: occLabel,
      icon: occLabel,
      sub: '',
      macro: inferMacroCategory({ label: occLabel, sub: hb.label }),
    });
    if (targetOcc) targetOcc.habits.push(hb);
  }

  /* ---------- 状態 ---------- */
  const state = {
    atHome: true,
    tab: habits.length ? 'habit' : stories.length ? 'story' : 'line',
    macroFilter: 'all', // 'all' | 'work' | 'daily' | 'sports'
    habitStep: 'cat', // 'cat' (レイヤー1B: 4カテゴリー選択) | 'occ' (レイヤー2B: 職種/種目一覧) | 'list' (動作リスト)
    habitDirectMode: null, // null | 'posture' | 'housework'（中間職種を挟まず直接動作リストを表示）
    feelStep: 'region', // 'region' (レイヤー1A: 5部位選択) | 'list' (レイヤー2A: 部位別の違和感リスト) | 'result' (フォールバック)
    feelRegion: null, // 'neck' | 'shoulder' | 'back' | 'waist' | 'leg' | null
    cardReturnContext: null, // 'feel-list' | 'habit-list' | 'home-search' | 'line-list' | 'story-list' | null
    sheet: 'half',
    active: null, // { type: 'line'|'habit'|'story', id }
    occupation: null,
    feeling: null,
    feelingContext: null, // { label, partBadge, habits } 部位違和感から開いた際の複数原因クセ切替用
    dictBodyPill: null, // 'neck' | 'shoulder' | 'back' | 'waist' | 'leg' | null
    dictQuery: '',
    progress: DEFAULT_HABIT_PROGRESS,
    playing: false,
    step: 0,
    view: 'front',
    fasciaLayer: 'see-through', // 'see-through' | 'surface' | 'deep'
    layers: { muscle: 'on', bone: 'on' },
    storyReturnToHabit: false,
    style: 'real',
    present: false,
  };

  /* ======================================================================== */
  /* ツールチップ（アイコンだけのボタン用）                                       */
  /* ======================================================================== */
  const tip = h('div', { class: 'tip', role: 'tooltip', hidden: true });
  let tipTimer = 0;
  function showTip(el, text) {
    if (!text) return;
    clearTimeout(tipTimer);
    tip.textContent = text;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
    tip.style.right = `${Math.round(root.clientWidth - r.left + 10)}px`;
  }
  function hideTip(delay = 0) {
    clearTimeout(tipTimer);
    if (delay) tipTimer = setTimeout(() => (tip.hidden = true), delay);
    else tip.hidden = true;
  }
  const flashTip = (el) => {
    showTip(el, el.getAttribute('aria-label'));
    hideTip(1100);
  };
  function attachTip(el) {
    let timer = 0;
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(el, el.getAttribute('aria-label'));
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') hideTip();
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      el._longPressed = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        el._longPressed = true;
        showTip(el, el.getAttribute('aria-label'));
        navigator.vibrate?.(8);
      }, 450);
    });
    const end = () => {
      clearTimeout(timer);
      if (el._longPressed) hideTip(900);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('focus', () => {
      if (el.matches(':focus-visible')) showTip(el, el.getAttribute('aria-label'));
    });
    el.addEventListener('blur', () => hideTip());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function iconButton({ ic, label, cls = '', onTap }) {
    const b = h('button', { class: cls, type: 'button', 'aria-label': label }, icon(ic));
    attachTip(b);
    b.addEventListener('click', (e) => {
      if (b._longPressed) {
        b._longPressed = false;
        e.preventDefault();
        return;
      }
      onTap(e);
    });
    return b;
  }

  /* ======================================================================== */
  /* 上部: タイトル・温度感4色凡例＋？説明ガイドボタン (#ui-help-btn)・見せるモード */
  /* ======================================================================== */
  const brand = h(
    'div',
    { class: 'brand' },
    h('span', { class: 'brand-mark', 'aria-hidden': 'true' }),
    h('h1', { class: 'brand-name', text: '筋膜ライン 3D' }),
  );
  const legend = h(
    'button',
    {
      class: 'legend help-pill-btn',
      id: 'ui-help-btn',
      type: 'button',
      'aria-label': '筋膜シートの色と濃淡の意味・使いかたを開く',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      onclick: () => toggleHelpModal(),
    },
    h(
      'span',
      { class: 'legend-item is-short is-shrink-group', title: '濃い赤＝中心の縮み ／ 淡い赤＝一緒に縮む周辺の筋肉・筋膜' },
      h(
        'span',
        { class: 'legend-dots legend-dots--red', 'aria-hidden': 'true' },
        h('i', { class: 'is-core-dot' }),
        h('i', { class: 'is-linked-dot' }),
      ),
      h('span', { class: 'legend-txt', text: '縮む筋肉' }),
    ),
    h(
      'span',
      { class: 'legend-item is-long is-stretch-group', title: '濃い青＝反対側の伸び ／ 淡い青＝シート延長で張る筋肉・筋膜' },
      h(
        'span',
        { class: 'legend-dots legend-dots--blue', 'aria-hidden': 'true' },
        h('i', { class: 'is-antag-dot' }),
        h('i', { class: 'is-ext-dot' }),
      ),
      h('span', { class: 'legend-txt', text: '伸びる筋肉' }),
    ),
    h('span', { class: 'help-pill-q', 'aria-hidden': 'true', text: '？' }),
  );
  const presentBtn = iconButton({
    ic: 'present',
    label: '見せるモード',
    cls: 'present-btn',
    onTap: () => setPresent(!state.present),
  });
  presentBtn.setAttribute('aria-pressed', 'false');
  const topbar = h('header', { class: 'topbar' }, h('div', { class: 'topbar-left' }, brand, legend), presentBtn);

  /* ======================================================================== */
  /* 筋膜シートの面・色と濃淡・右側ボタンの説明モーダル (.help-modal)          */
  /* ======================================================================== */
  const helpDisclosureEl = h('p', {
    class: 'help-disclosure',
    hidden: initialDeployMode === 'clinic',
    text: MONETIZE_DEFAULTS.disclosure,
  });

  const helpModal = h(
    'div',
    {
      class: 'help-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': '筋膜シートの見かたと操作ガイド',
      hidden: true,
      onclick: (e) => {
        if (e.target === helpModal) closeHelpModal();
      },
    },
    h(
      'div',
      { class: 'help-modal-card' },
      h(
        'header',
        { class: 'help-modal-head' },
        h('h2', { class: 'help-modal-title', text: '筋膜シートの見かたと使いかた' }),
        h(
          'button',
          {
            class: 'icon-btn help-modal-close',
            type: 'button',
            'aria-label': '閉じる',
            onclick: () => closeHelpModal(),
          },
          icon('close'),
        ),
      ),
      h(
        'div',
        { class: 'help-modal-body' },
        // 1. 「線」ではなく「面（シート）」でつながる筋膜
        h(
          'section',
          { class: 'help-sec help-sec--sweater' },
          h('h3', { class: 'help-sec-title' }, icon('layerSeeThrough', 'help-inline-svg'), h('span', { text: '「線」ではなく「面（シート）」でつながる筋膜' })),
          h('p', {
            class: 'help-sweater-lead',
            text: '全身タイツのような半透明の筋膜シートが複数の筋肉を包み込み、面で引っ張り合っています。全身の筋膜シート図鑑では各シートの場所を静止した解剖図として確認でき、動き・クセやセルフケア指導では実際の動きに合わせてアニメーションします。',
          }),
        ),
        // 2. 🎨 水彩カラーと濃淡の意味
        h(
          'section',
          { class: 'help-sec help-sec--temp' },
          h('h3', { class: 'help-sec-title', text: '🎨 水彩カラーと濃淡の意味' }),
          h(
            'div',
            { class: 'help-list' },
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-color-dot is-core', 'aria-hidden': 'true' }),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '濃い水彩レッド（赤）' }),
                h('span', { text: '：一番固く縮んでいる中心の筋肉・筋膜シート' }),
              ),
            ),
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-color-dot is-linked-short', 'aria-hidden': 'true' }),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '淡いコーラルレッド' }),
                h('span', { text: '：筋膜シートで引き連れられて一緒に縮む周辺の筋肉' }),
              ),
            ),
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-color-dot is-stretch-grad', 'aria-hidden': 'true' }),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '水彩ブルー（青〜水色）' }),
                h('span', { text: '：反対側や延長線上で引き伸ばされている筋肉・筋膜シート' }),
              ),
            ),
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-color-dot is-neutral-gray', 'aria-hidden': 'true' }),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '透ける生成り輪郭' }),
                h('span', { text: '：この動きに直接関係しない筋肉（中の骨格が透けて見えます）' }),
              ),
            ),
          ),
        ),
        // 3. 🔘 上部・右側ボタン
        h(
          'section',
          { class: 'help-sec' },
          h('h3', { class: 'help-sec-title', text: '🔘 上部・右側ボタン' }),
          h(
            'div',
            { class: 'help-list help-list--icons' },
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-ico-badge', 'aria-hidden': 'true' }, icon('layerSeeThrough')),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '透視 / 表層 / 深層：' }),
                h('span', { text: '表面の筋膜シートを透かして奥を見るか、1層ずつ見るかを切り替え' }),
              ),
            ),
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-ico-badge', 'aria-hidden': 'true' }, icon('view')),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '横見 / 背面 / 正面：' }),
                h('span', { text: 'ワンタップで 正面 ➔ 真横（側面）➔ 後ろ（背面）へ向きを切り替え' }),
              ),
            ),
            h(
              'div',
              { class: 'help-row' },
              h('span', { class: 'help-ico-badge', 'aria-hidden': 'true' }, icon('reset')),
              h(
                'div',
                { class: 'help-row-text' },
                h('strong', { text: '戻す：' }),
                h('span', { text: '最初の状態・正面カメラに戻す' }),
              ),
            ),
          ),
        ),
        // 4. 🛡️ 免責・安全上のご注意
        h(
          'section',
          { class: 'help-sec help-sec--safety' },
          h('p', { class: 'help-safety-text', text: DISCLAIMER_TEXT }),
          SAFETY_NOTICE?.redFlags
            ? h('p', { class: 'help-safety-sub', text: SAFETY_NOTICE.redFlags })
            : null,
        ),
        // 5. 広告表記（public モードのみ表示）
        helpDisclosureEl,
      ),
    ),
  );

  function openHelpModal() {
    hideToast({ keepSelection: true });
    closeFly();
    const cfg = getMonetizeConfig();
    helpDisclosureEl.hidden = cfg.isClinic;
    helpModal.hidden = false;
    legend.classList.add('is-active');
    legend.setAttribute('aria-expanded', 'true');
  }

  function closeHelpModal() {
    helpModal.hidden = true;
    legend.classList.remove('is-active');
    legend.setAttribute('aria-expanded', 'false');
  }

  function toggleHelpModal() {
    if (helpModal.hidden) openHelpModal();
    else closeHelpModal();
  }

  /* ======================================================================== */
  /* 筋肉タップ時の「筋膜連鎖トースト (.toast)」コンパクト・グラスカード        */
  /* タップした筋肉（縮みの中心）からどう筋膜が連動するかが一目でわかる＆切替可 */
  /* ======================================================================== */
  const toast = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true });
  let toastTimer = 0;
  let toastHasDetail = false;
  let toastKeepOpen = false;
  let inspectedPartId = null;
  let activeTriggerPointId = null;

  function syncPartTags() {
    root.querySelectorAll('.part-tag[data-part]').forEach((el) => {
      const partId = el.dataset.part;
      const on = Boolean(
        (activeTriggerPointId && partId === activeTriggerPointId) ||
          (!activeTriggerPointId && inspectedPartId && partId === inspectedPartId),
      );
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-pressed', String(on));
    });
    root.querySelectorAll('.is-trigger-line-btn').forEach((btn) => {
      const lineActive = !activeTriggerPointId && !inspectedPartId;
      btn.classList.toggle('is-active', lineActive);
      btn.setAttribute('aria-pressed', String(lineActive));
    });
  }

  const scheduleToastHide = () => {
    clearTimeout(toastTimer);
    if (toastKeepOpen || toastHasDetail) return;
    toastTimer = setTimeout(() => hideToast(), 7000);
  };

  function syncToastSheetOffset() {
    if (!toast.hidden) {
      root.classList.add('is-toast-open');
      const th = mqWide.matches ? 0 : (toast.offsetHeight || 180) + 14;
      root.style.setProperty('--sheet-vis', `${Math.round(th)}px`);
      updateRail(th);
    } else {
      root.classList.remove('is-toast-open');
      if (typeof setVis === 'function' && typeof snaps !== 'undefined') {
        setVis(snaps[state.sheet] || 0);
        updateRail(vis);
      }
    }
  }

  function hideToast({ keepSelection = false, immediate = false } = {}) {
    clearTimeout(toastTimer);
    if (!keepSelection) {
      inspectedPartId = null;
      activeTriggerPointId = null;
      syncPartTags();
    }
    root.classList.remove('is-toast-open');
    if (toast.hidden) {
      syncToastSheetOffset();
      return;
    }
    if (immediate || reduced()) {
      toast.hidden = true;
      toast.classList.remove('is-leaving');
      syncToastSheetOffset();
      return;
    }
    toast.classList.add('is-leaving');
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove('is-leaving');
      syncToastSheetOffset();
    }, 180);
  }

  toast.addEventListener('click', (e) => {
    if (!toastKeepOpen && !toastHasDetail && !e.target.closest('button')) hideToast();
  });
  toast.addEventListener('pointerenter', () => clearTimeout(toastTimer));
  toast.addEventListener('pointerleave', scheduleToastHide);

  /** 筋肉の役割文から難しい運動学括弧だけを整理し、1〜2行で読みやすい自然な日本語にする */
  function formatActionText(raw) {
    const full = String(raw || '').trim();
    if (!full) return '';
    return full
      .replace(/（[^）]*(?:外転|内転|外旋|内旋|屈曲|伸展|回内|回外|挙上|下制|回旋|背屈|底屈|側屈)[^）]*）/g, '')
      .replace(/\([^)]*(?:外転|内転|外旋|内旋|屈曲|伸展|回内|回外|挙上|下制|回旋|背屈|底屈|側屈)[^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const TOAST_CHAIN_GROUPS = [
    { key: 'shortenLinked', cls: 'is-shorten-linked', label: '🔴 筋膜シートで一緒に縮む筋肉' },
    { key: 'lengthenAntagonist', cls: 'is-lengthen-antagonist', label: '🔵 反対側で引き伸ばされる筋肉' },
    { key: 'lengthenLinked', cls: 'is-lengthen-linked', label: '💧 シート延長で張る筋肉' },
  ];

  function showPart(part = {}) {
    const partId = part?.id || '';
    const name = part?.name || nameOf(partId);
    if (!name && !partId) {
      hideToast();
      return;
    }
    const displayName = sanitizeTriggerText(name || partId);
    const metaObj = names && typeof names === 'object' && typeof names[partId] === 'object' ? names[partId] : null;
    const rawClinical = String(part?.clinical || metaObj?.clinical || '').trim();
    const clinicalText = rawClinical ? sanitizeTriggerText(rawClinical) : '';
    const bodyText =
      clinicalText ||
      formatActionText(part?.action || metaObj?.action || '') ||
      '姿勢や動きをささえる大切なパーツです。';

    const relatedId = String(part?.relatedHabit?.id || '').trim();
    const relatedHbObj = relatedId ? resolveHabit(relatedId) : null;
    const relatedLabel = cleanTitle(part?.relatedHabit?.label || relatedHbObj?.label || '');

    toastKeepOpen = Boolean(clinicalText || relatedId);
    toastHasDetail = Boolean(toastKeepOpen || bodyText);
    inspectedPartId = partId || null;
    syncPartTags();

    // 3Dセルフケア指導中は3D人体・骨格へのカード被りを 0px に保つためトーストを出さない
    if (typeof selfCareModal !== 'undefined' && !selfCareModal.hidden) {
      hideToast();
      return;
    }

    const closeBtn = h(
      'button',
      {
        class: 'toast-close',
        type: 'button',
        'aria-label': '閉じる',
        onclick: (e) => {
          e.stopPropagation();
          hideToast();
          emit('part-close');
        },
      },
      icon('close'),
    );

    const head = h(
      'div',
      { class: 'toast-head' },
      h(
        'div',
        { class: 'toast-title-row' },
        h('span', { class: 'toast-core-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'toast-name', text: displayName }),
      ),
      closeBtn,
    );

    const actionEl = h('p', { class: 'toast-action', text: bodyText });

    const habitJumpBtn =
      relatedId && relatedLabel
        ? h(
            'button',
            {
              class: 'toast-habit-btn',
              type: 'button',
              'data-related-habit': relatedId,
              onclick: (e) => {
                e.stopPropagation();
                hideToast({ immediate: true });
                if (state.active?.type === 'habit' && state.active.id === relatedId) {
                  state.active = null;
                }
                selectHabit(relatedId);
              },
            },
            icon('habit', 'toast-habit-ico'),
            h('span', {
              class: 'toast-habit-label',
              text: `▶ 「${relatedLabel}」の動き・ケアを見る`,
            }),
          )
        : null;

    toast.replaceChildren(...[head, actionEl, habitJumpBtn].filter(Boolean));
    toast.classList.toggle('has-detail', toastHasDetail);
    toast.classList.toggle('has-habit-cta', Boolean(habitJumpBtn));
    toast.classList.remove('has-chain');
    toast.classList.remove('is-leaving');
    toast.hidden = false;

    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    syncToastSheetOffset();
    scheduleToastHide();
  }

  /** 後方互換用（従来の peel バナー API 呼び出しでエラーを出さない安全処理） */
  function showPeelStatus() {}

  /* ======================================================================== */
  /* 右端のツールレール（[透視] [表層] [深層] ── [横見] [戻す]）                */
  /* すべてのボタンは 44×44px 以上のタップ領域を確保しつつ右端にコンパクト配置  */
  /* ======================================================================== */
  function railButton({ ic, label, shortLabel, cls = 'rail-btn', onTap }) {
    const b = iconButton({ ic, label, cls, onTap });
    if (shortLabel) {
      b.append(h('span', { class: 'rail-lbl rail-label', 'aria-hidden': 'true', text: shortLabel }));
    }
    return b;
  }

  const viewOpts = new Map();
  const viewFly = h(
    'div',
    { class: 'view-fly', role: 'group', 'aria-label': '視点', hidden: true },
    ...VIEWS.map((v) => {
      const isInitial = v.id === state.view;
      const b = h('button', {
        class: `view-opt${isInitial ? ' is-active' : ''}`,
        type: 'button',
        'aria-label': v.aria,
        'aria-pressed': String(isInitial),
        text: v.short,
        onclick: () => {
          setViewUI(v.id);
          closeFly();
          emit('view', v.id);
        },
      });
      viewOpts.set(v.id, b);
      return b;
    }),
  );

  const nextCycleViewOf = (curView) => {
    if (curView === 'side') return 'back';
    if (curView === 'back') return 'front';
    return 'side';
  };

  const viewActionMetaOf = (curView) => {
    if (curView === 'side') {
      return {
        shortLabel: '背面',
        aria: '後ろから見る（ワンタップで 横向き ⇄ 背面 ⇄ 正面）',
        rotated: true,
      };
    }
    if (curView === 'back') {
      return {
        shortLabel: '正面',
        aria: '正面から見る（ワンタップで 横向き ⇄ 背面 ⇄ 正面）',
        rotated: true,
      };
    }
    return {
      shortLabel: '横見',
      aria: '真横から見る（ワンタップで 横向き ⇄ 背面 ⇄ 正面）',
      rotated: false,
    };
  };

  const viewBtn = railButton({
    ic: 'view',
    label: '真横から見る（ワンタップで 横向き ⇄ 背面 ⇄ 正面）',
    shortLabel: '横見',
    cls: 'rail-btn is-view-btn',
    onTap: () => {
      closeFly();
      const nextView = nextCycleViewOf(state.view);
      setViewUI(nextView);
      emit('view', nextView);
      const appliedTip =
        nextView === 'side'
          ? '真横から表示（もう一度押すと背面）'
          : nextView === 'back'
            ? '後ろから表示（もう一度押すと正面）'
            : '正面から表示';
      showTip(viewBtn, appliedTip);
      hideTip(1200);
    },
  });
  const viewBtnLbl = viewBtn.querySelector('.rail-lbl');
  viewBtn.dataset.view = state.view;

  function openFly() {
    viewFly.hidden = true;
    hideTip();
  }
  function closeFly() {
    viewFly.hidden = true;
  }
  function setViewUI(id) {
    const found = VIEW_BY_ID.get(id);
    if (!found) return;
    state.view = found.id;
    viewOpts.forEach((b, k) => {
      const active = k === found.id;
      b.setAttribute('aria-pressed', String(active));
      b.classList.toggle('is-active', active);
    });
    const meta = viewActionMetaOf(found.id);
    if (viewBtnLbl) viewBtnLbl.textContent = meta.shortLabel;
    viewBtn.setAttribute('aria-label', meta.aria);
    viewBtn.classList.toggle('is-rotated', meta.rotated);
    viewBtn.dataset.view = found.id;
  }
  function setViewBadge(viewName) {
    setViewUI(viewName);
  }

  // ワンタップ 3層モード切替（透視 / 表層 / 深層）
  const FASCIA_LAYER_DEFS = [
    {
      mode: 'see-through',
      ic: 'layerSeeThrough',
      shortLabel: '透視',
      aria: '重ね透視（表層を半透明にして深層と同時に見る）',
    },
    {
      mode: 'surface',
      ic: 'layerSurface',
      shortLabel: '表層',
      aria: '表層のみ（表面の大きな筋肉とラインを見る）',
    },
    {
      mode: 'deep',
      ic: 'layerDeep',
      shortLabel: '深層',
      aria: '深層のみ（奥の芯の筋肉を直接見る・触る）',
    },
  ];

  const fasciaLayerBtns = new Map();
  function setFasciaLayerMode(mode) {
    const resolved = FASCIA_LAYER_MODES.includes(mode) ? mode : 'see-through';
    state.fasciaLayer = resolved;
    fasciaLayerBtns.forEach((btn, key) => {
      const active = key === resolved;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  for (const def of FASCIA_LAYER_DEFS) {
    const isInitial = def.mode === state.fasciaLayer;
    const b = railButton({
      ic: def.ic,
      label: def.aria,
      shortLabel: def.shortLabel,
      cls: `rail-btn is-fascia-layer${isInitial ? ' is-active' : ''}`,
      onTap: () => {
        setFasciaLayerMode(def.mode);
        emit('fascia-layer', def.mode);
        flashTip(b);
      },
    });
    b.dataset.fasciaLayer = def.mode;
    b.setAttribute('aria-pressed', String(isInitial));
    fasciaLayerBtns.set(def.mode, b);
  }

  // 骨格レイヤーは常時表示（外部互換のため状態保持関数のみ維持）
  function setBoneLayerUI(mode) {
    const resolved = 'on';
    state.layers.bone = resolved;
  }

  // リセット（戻す）
  const resetBtn = railButton({
    ic: 'reset',
    label: '元の状態にリセット',
    shortLabel: '戻す',
    cls: 'rail-btn is-reset-btn',
    onTap: () => {
      closeFly();
      if (state.fasciaLayer !== 'see-through') {
        setFasciaLayerMode('see-through');
        emit('fascia-layer', 'see-through');
      }
      setViewUI('front');
      hideToast();
      emit('reset');
      flashTip(resetBtn);
    },
  });

  const railSep = () => h('span', { class: 'rail-sep', 'aria-hidden': 'true' });
  const rail = h(
    'nav',
    { class: 'rail', 'aria-label': '表示の切り替え' },
    viewFly,
    fasciaLayerBtns.get('see-through'),
    fasciaLayerBtns.get('surface'),
    fasciaLayerBtns.get('deep'),
    railSep(),
    viewBtn,
    resetBtn,
  );

  /* ======================================================================== */
  /* ボトムシート（固定ボタンパネル：上下スライド廃止・全項目ボタン選択＆ページ切替） */
  /* ======================================================================== */
  const grip = h(
    'button',
    { class: 'sheet-grip', type: 'button', hidden: true, 'aria-label': GRIP_LABEL.half, 'aria-expanded': 'true' },
    h('span', { class: 'sheet-grip-bar', 'aria-hidden': 'true' }),
  );

  /** スクロールなしで太い指でも全ての項目をボタンで選べるページネーション生成ヘルパー */
  function createButtonPager(getItems, pageSize = 6) {
    let currentPage = 0;
    const prevBtn = h(
      'button',
      {
        class: 'pager-btn is-prev',
        type: 'button',
        'aria-label': '前のページ',
        onclick: (e) => {
          e.stopPropagation();
          setPage(currentPage - 1);
        },
      },
      h('span', { text: '◀ 前へ' }),
    );
    const pageInfo = h('span', { class: 'pager-info', text: '1 / 1' });
    const nextBtn = h(
      'button',
      {
        class: 'pager-btn is-next',
        type: 'button',
        'aria-label': '次のページ',
        onclick: (e) => {
          e.stopPropagation();
          setPage(currentPage + 1);
        },
      },
      h('span', { text: '次へ ▶' }),
    );
    const bar = h('div', { class: 'pager-bar', hidden: true }, prevBtn, pageInfo, nextBtn);

    function refresh(resetPage = false) {
      const all = getItems() || [];
      const eligible = all.filter(
        (el) => el && !el.hidden && !el.classList.contains('is-macro-hidden'),
      );
      const totalPages = Math.max(1, Math.ceil(eligible.length / pageSize));
      if (resetPage) currentPage = 0;
      currentPage = clamp(currentPage, 0, totalPages - 1);
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const visibleSet = new Set(eligible.slice(start, end));
      for (const el of all) {
        if (!el) continue;
        el.classList.toggle('is-page-hidden', !visibleSet.has(el));
      }
      const showBar = eligible.length > pageSize;
      bar.hidden = !showBar;
      bar.classList.toggle('is-step-hidden', !showBar);
      pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
      prevBtn.disabled = currentPage <= 0;
      nextBtn.disabled = currentPage >= totalPages - 1;
    }

    function setPage(p) {
      currentPage = p;
      refresh(false);
      measure();
      if (state.sheet !== 'closed') {
        setVis(snaps.half);
        updateRail(snaps.half);
      }
    }

    return { bar, refresh, setPage };
  }

  // --- 1. 検索バー＆部位クイックピル ---
  const dictSearchInput = h('input', {
    class: 'dict-search-input',
    type: 'search',
    placeholder: '🔍 キーワードで細かく検索（例：ゴルフ、抱っこ、肩…）',
    'aria-label': 'キーワードで細かく検索',
  });
  const dictSearchClearBtn = h(
    'button',
    {
      class: 'dict-search-clear',
      type: 'button',
      'aria-label': '検索をクリア',
      hidden: true,
      onclick: () => {
        dictSearchInput.value = '';
        state.dictQuery = '';
        state.dictBodyPill = null;
        renderDictSearchResults();
      },
    },
    icon('close'),
  );
  const dictSearchInputWrap = h(
    'div',
    { class: 'dict-search-input-wrap' },
    dictSearchInput,
    dictSearchClearBtn,
  );

  const bodyPillBtns = new Map();
  const dictBodyPillsBar = h(
    'div',
    { class: 'dict-body-pills', role: 'group', 'aria-label': '部位クイック逆引き' },
    ...BODY_PILLS.map((bp) => {
      const btn = h(
        'button',
        {
          class: 'dict-body-pill',
          type: 'button',
          'data-body-pill': bp.id,
          'aria-pressed': 'false',
          onclick: () => {
            state.dictBodyPill = state.dictBodyPill === bp.id ? null : bp.id;
            renderDictSearchResults();
            if (state.sheet === 'closed') snapTo('half');
          },
        },
        h('span', { text: bp.label }),
      );
      bodyPillBtns.set(bp.id, btn);
      return btn;
    }),
  );

  const dictSearchResults = h('div', {
    class: 'dict-search-results is-step-hidden',
    role: 'region',
    'aria-label': '部位・キーワード検索結果',
    hidden: true,
  });

  function collectHabitAllMuscleIds(hb) {
    return [
      ...new Set([
        ...(hb?.shortenCore || []),
        ...(hb?.shortenLinked || []),
        ...(hb?.lengthenAntagonist || []),
        ...(hb?.lengthenLinked || []),
        ...(hb?.shorten || []),
        ...(hb?.lengthen || []),
        ...(hb?.yore || []),
        ...(hb?.chain || []),
      ]),
    ];
  }

  function habitMatchesBodyPill(hb, pillId) {
    const bp = BODY_PILLS.find((x) => x.id === pillId);
    if (!bp || !hb) return false;
    const textBlob = `${hb.label || ''} ${hb.symptom || ''} ${hb.feel || ''} ${hb.occupation || ''} ${hb.group || ''} ${hb.triggerLine?.name || ''} ${hb.triggerLine?.shortName || ''}`.toLowerCase();
    if (bp.keywords.some((kw) => textBlob.includes(kw.toLowerCase()))) return true;
    const muscleSet = new Set(collectHabitAllMuscleIds(hb));
    return bp.muscles.some((m) => muscleSet.has(m));
  }

  function habitMatchesQuery(hb, q) {
    if (!q) return true;
    const low = q.toLowerCase();
    const muscleNames = collectHabitAllMuscleIds(hb)
      .map((id) => `${id} ${nameOf(id)} ${shortMuscleNameOf(id)}`)
      .join(' ');
    const blob = `${hb.label || ''} ${hb.symptom || ''} ${hb.feel || ''} ${hb.occupation || ''} ${hb.group || ''} ${hb.triggerLine?.name || ''} ${hb.triggerLine?.shortName || ''} ${muscleNames}`.toLowerCase();
    return blob.includes(low);
  }

  function renderDictSearchResults() {
    const q = state.dictQuery.trim();
    const pillId = state.dictBodyPill;
    const hasFilter = Boolean(q || pillId);

    dictSearchClearBtn.hidden = !hasFilter;
    bodyPillBtns.forEach((btn, id) => {
      const on = id === pillId;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    if (typeof finderHome !== 'undefined') {
      finderHome.classList.toggle('is-filter-open', hasFilter);
    }

    if (!hasFilter) {
      dictSearchResults.hidden = true;
      dictSearchResults.classList.add('is-step-hidden');
      dictSearchResults.textContent = '';
      measure();
      if (state.sheet !== 'closed') {
        setBodyHeight(snaps.half);
        setVis(snaps.half);
      }
      return;
    }

    const matched = habits.filter((hb) => {
      if (pillId && !habitMatchesBodyPill(hb, pillId)) return false;
      if (q && !habitMatchesQuery(hb, q)) return false;
      return true;
    });

    const matchedMuscles = [];
    if (q) {
      const lowQ = q.toLowerCase();
      for (const [mid, mEntry] of Object.entries(names || {})) {
        const kind = typeof mEntry === 'object' ? mEntry?.kind : null;
        if (kind && kind !== 'muscle') continue;
        const fullJa = nameOf(mid);
        const shortJa = shortMuscleNameOf(mid);
        if (`${mid} ${fullJa} ${shortJa}`.toLowerCase().includes(lowQ)) {
          matchedMuscles.push({ id: mid, fullJa, shortJa });
          if (matchedMuscles.length >= 6) break;
        }
      }
    }

    const totalHits = matched.length + matchedMuscles.length;
    const pillObj = BODY_PILLS.find((x) => x.id === pillId);
    const headerTitle = pillObj && q
      ? `${pillObj.label} × ${q}（${totalHits}）`
      : pillObj
        ? `${pillObj.label}（${totalHits}）`
        : `${q}（${totalHits}）`;

    const headRow = h(
      'div',
      { class: 'dict-results-head' },
      h(
        'button',
        {
          class: 'step-back-btn dict-results-close',
          type: 'button',
          onclick: () => {
            dictSearchInput.value = '';
            state.dictQuery = '';
            state.dictBodyPill = null;
            renderDictSearchResults();
            if (typeof setHomeSearchOpen === 'function') {
              setHomeSearchOpen(false);
            }
          },
        },
        h('span', { text: '← 戻る' }),
      ),
      h('span', { class: 'dict-results-title', text: headerTitle }),
    );

    const chipEls = matched.map((hb) => {
      const occLbl = resolveHabitOccupation(hb);
      return h(
        'button',
        {
          class: 'chip chip--habit dict-result-chip',
          type: 'button',
          'data-dict-habit': hb.id,
          onclick: () => selectHabit(hb, { returnContext: 'home-search' }),
        },
        h('span', { class: 'chip-ico', 'aria-hidden': 'true' }, getHabitIcon(hb)),
        h(
          'span',
          { class: 'chip-body' },
          h('span', { class: 'chip-label', text: cleanTitle(hb.label) }),
        ),
      );
    });

    const muscleChipEls = matchedMuscles.map((m) =>
      h(
        'button',
        {
          class: 'chip chip--habit dict-result-chip',
          type: 'button',
          'data-dict-muscle': m.id,
          onclick: () => emit('inspect', m.id),
        },
        h('span', { class: 'chip-ico', 'aria-hidden': 'true' }, icon('muscle')),
        h(
          'span',
          { class: 'chip-body' },
          h('span', { class: 'chip-label', text: m.fullJa }),
        ),
      ),
    );
    const allChipEls = [...muscleChipEls, ...chipEls];
    const dictPager = createButtonPager(() => allChipEls, 6);
    dictPager.refresh(true);

    const chipsWrap = allChipEls.length
      ? h(
          'div',
          { class: 'chips chips--habit-flat dict-results-grid' },
          ...allChipEls,
        )
      : h('p', { class: 'dict-results-empty', text: '該当する動作・部位がありません' });

    dictSearchResults.replaceChildren(headRow, chipsWrap, dictPager.bar);
    dictSearchResults.hidden = false;
    dictSearchResults.classList.remove('is-step-hidden');
    measure();
    if (state.sheet !== 'closed') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
    }
  }

  dictSearchInput.addEventListener('input', () => {
    state.dictQuery = dictSearchInput.value;
    renderDictSearchResults();
  });

  const dictSearchBar = h(
    'div',
    { class: 'dict-search-bar' },
    dictSearchInputWrap,
  );

  // --- 2. 【Mission 2】1タップ問診ホーム（違和感2カラムグリッド）＋ 下部コンパクト切替バー ---
  function inferSenseBadge(f) {
    if (f?.sense || f?.badge || f?.word || f?.tag) return f.sense || f.badge || f.word || f.tag;
    const s = String(f?.label || '');
    if (s.includes('伸びない')) return '伸びない';
    if (s.includes('引っかか') || s.includes('上がら')) return '引っかかる';
    if (s.includes('片側')) return '片側だけ張る';
    if (s.includes('呼吸') || s.includes('息が浅い')) return '息が浅い';
    if (s.includes('パンパン') || s.includes('鉛')) return '鉛のように重い';
    if (s.includes('食いしば') || s.includes('顎') || s.includes('エラ')) return '食いしばる';
    if (s.includes('足裏') || s.includes('かかと') || s.includes('土踏まず')) return '足裏がつらい';
    if (s.includes('股関節') || s.includes('あぐら') || s.includes('付け根')) return '股関節が詰まる';
    if (s.includes('お尻') || s.includes('坐骨')) return 'お尻の奥が重い';
    if (s.includes('膝') || s.includes('階段')) return 'ひざ・脚が張る';
    if (s.includes('ふくらはぎ') || s.includes('むくみ') || s.includes('つる')) return 'ふくらはぎが張る';
    if (s.includes('首') || s.includes('頭') || s.includes('眼')) return '首・頭が重い';
    if (s.includes('腕') || s.includes('手首') || s.includes('親指') || s.includes('指')) return '腕・手がだるい';
    if (s.includes('腰が反') || s.includes('反り腰')) return '腰が反る';
    if (s.includes('肩甲骨') || s.includes('詰ま') || s.includes('たるみ')) return '背中が詰まる';
    return '重だるい';
  }

  function inferPartBadge(f) {
    if (f?.partBadge) return String(f.partBadge).trim();
    const s = String(f?.label || '');
    if (s.includes('食いしば') || s.includes('顎') || s.includes('エラ') || s.includes('顔')) return 'あご・顔';
    if (s.includes('首') || s.includes('頭') || s.includes('眼')) return '首・頭';
    if (s.includes('腕') || s.includes('手首') || s.includes('親指') || s.includes('指') || s.includes('肘')) return '肩・腕・手';
    if (s.includes('肩甲骨') || s.includes('呼吸') || s.includes('息') || s.includes('胸') || s.includes('背中')) return '胸・背中';
    if (s.includes('肩')) return '首・肩';
    if (s.includes('腰') || s.includes('お尻') || s.includes('坐骨') || s.includes('股関節') || s.includes('骨盤')) return '腰・お尻';
    if (s.includes('足裏') || s.includes('かかと') || s.includes('ふくらはぎ') || s.includes('膝') || s.includes('脚')) return '脚・足裏';
    return inferSenseBadge(f);
  }

  function animateLayerSwitch(el) {
    if (!el || reduced()) return;
    el.classList.remove('is-layer-enter');
    void el.offsetWidth;
    el.classList.add('is-layer-enter');
  }

  function classifyFeelingRegion(f) {
    const pg = String(f?.partGroup || '').trim();
    const s = `${f?.partBadge || ''} ${f?.tag || ''} ${f?.label || ''}`;
    if (pg === 'neck') return 'neck';
    if (pg === 'shoulder' || pg === 'arm') return 'shoulder';
    if (pg === 'chest' || pg === 'back') return 'back';
    if (pg === 'waist') return 'waist';
    if (pg === 'leg') return 'leg';
    if (pg === 'hip') {
      return s.includes('股関節') || s.includes('あぐら') || s.includes('付け根') ? 'leg' : 'waist';
    }
    if (f?.id === 'arch-back' || s.includes('反り腰')) return 'waist';
    if (
      s.includes('股関節') ||
      s.includes('あぐら') ||
      s.includes('前もも') ||
      s.includes('ひざ') ||
      s.includes('膝') ||
      s.includes('ふくらはぎ') ||
      s.includes('足裏') ||
      s.includes('かかと') ||
      s.includes('土踏まず')
    ) {
      return 'leg';
    }
    if (
      s.includes('あご') ||
      s.includes('顎') ||
      s.includes('食いしば') ||
      s.includes('こめかみ') ||
      s.includes('頭') ||
      s.includes('眼') ||
      s.includes('目の奥') ||
      (s.includes('首') && !s.includes('手首') && !s.includes('足首'))
    ) {
      return 'neck';
    }
    if (
      s.includes('腕') ||
      s.includes('手首') ||
      s.includes('親指') ||
      s.includes('ひじ') ||
      s.includes('肘') ||
      s.includes('指先') ||
      (s.includes('肩') && !s.includes('肩甲骨'))
    ) {
      return 'shoulder';
    }
    if (
      s.includes('肩甲骨') ||
      s.includes('背中') ||
      s.includes('胸') ||
      s.includes('呼吸') ||
      s.includes('息') ||
      s.includes('猫背')
    ) {
      return 'back';
    }
    return 'waist';
  }

  const EXTRA_LEG_FEELING = {
    id: 'front-thigh-knee',
    partGroup: 'leg',
    partBadge: '前もも・ひざ',
    tag: '前もも・ひざの張り',
    label: '階段や立ち仕事で、前ももやひざまわりが張る',
    habits: ['soccer-kick', 'sway-back', 'running-strike', 'cycling-aero'],
  };

  const LEGACY_FALLBACK_FEELINGS = [
    { label: '腕を上げると肩が引っかかる', partGroup: 'shoulder', partBadge: '肩・腕', sense: '引っかかる', habits: ['laundry-reach', 'overhead-tool', 'hair-cut-arm'] },
    { label: '腕や手首・親指がだるい', partGroup: 'arm', partBadge: '腕・手', sense: '腕がだるい', habits: ['cook-pan-hold', 'therapist-press', 'hair-cut-arm'] },
    { label: '立ちっぱなしで腰が反る', partGroup: 'waist', partBadge: '腰・骨盤', sense: '腰が反る', habits: ['sway-back', 'laundry-reach', 'stand-hip-r'] },
  ];

  const allFeelings = [...feelings];
  if (
    !allFeelings.some((f) => f.id === EXTRA_LEG_FEELING.id || String(f.label || '').includes('前もも')) &&
    EXTRA_LEG_FEELING.habits.some((hid) => resolveHabit(hid))
  ) {
    allFeelings.push(EXTRA_LEG_FEELING);
  }
  if (feelings.length < 10) {
    for (const ex of LEGACY_FALLBACK_FEELINGS) {
      if (
        ex.habits.some((hid) => resolveHabit(hid)) &&
        !allFeelings.some((f) => f.label === ex.label || inferSenseBadge(f) === ex.sense)
      ) {
        allFeelings.push(ex);
      }
    }
  }

  const tabBtns = {};

  dictSearchInput.placeholder = '🔍 動作・部位を検索（例：ゴルフ、抱っこ、肩…）';
  let homeSearchOpen = false;

  const homeSearchToggleBtn = h(
    'button',
    {
      class: 'home-aux-pill home-search-toggle-btn',
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': 'キーワードで検索する',
      onclick: () => {
        setHomeSearchOpen(!homeSearchOpen, { focusInput: !homeSearchOpen });
      },
    },
    icon('search', 'home-search-btn-ico'),
    h('span', { text: '検索' }),
  );

  // 柱1: 📍 痛む・気になる場所から (#ui-tab-feel)
  const feelEntryBtn = h(
    'button',
    {
      class: 'home-entry-card home-entry-card--feel finder-btn tab finder-btn--feel',
      type: 'button',
      role: 'tab',
      id: 'ui-tab-feel',
      'data-tab': 'feel',
      'aria-controls': 'ui-panel-feel',
      'aria-selected': 'false',
      tabindex: '0',
      onclick: () => {
        openFeelEntry();
        if (state.sheet === 'closed') snapTo('half');
      },
    },
    h('span', { class: 'home-entry-ico', 'aria-hidden': 'true' }, createDuotoneSvg('cat-feel', 'home-entry-svg')),
    h(
      'span',
      { class: 'home-entry-body' },
      h('span', { class: 'home-entry-title finder-btn-label tab-label', text: '痛む・気になる場所から' }),
    ),
    icon('next', 'home-entry-chevron'),
  );
  tabBtns.feel = feelEntryBtn;

  // 柱2: 🏃 動き・クセ・仕事から (#ui-tab-habit)
  const habitEntryBtn = h(
    'button',
    {
      class: 'home-entry-card home-entry-card--habit finder-btn tab finder-btn--habit',
      type: 'button',
      role: 'tab',
      id: 'ui-tab-habit',
      'data-tab': 'habit',
      'aria-controls': 'ui-panel-habit',
      'aria-selected': 'false',
      tabindex: '0',
      onclick: () => {
        openHabitEntry();
        if (state.sheet === 'closed') snapTo('half');
      },
    },
    h('span', { class: 'home-entry-ico', 'aria-hidden': 'true' }, createDuotoneSvg('cat-work', 'home-entry-svg')),
    h(
      'span',
      { class: 'home-entry-body' },
      h('span', { class: 'home-entry-title finder-btn-label tab-label', text: '動き・クセ・仕事から' }),
    ),
    icon('next', 'home-entry-chevron'),
  );
  tabBtns.habit = habitEntryBtn;

  // 柱3: 全身の筋膜シート図鑑 (#ui-tab-line)
  const lineCatBtn = h(
    'button',
    {
      class: 'home-entry-card home-entry-card--line finder-btn tab finder-btn--line',
      type: 'button',
      role: 'tab',
      id: 'ui-tab-line',
      'data-tab': 'line',
      'aria-controls': 'ui-panel-line',
      'aria-selected': 'false',
      tabindex: '0',
      onclick: () => {
        openFinderCategory('line');
        if (state.sheet === 'closed') snapTo('half');
      },
    },
    h('span', { class: 'home-entry-ico', 'aria-hidden': 'true' }, icon('layerSeeThrough', 'home-entry-svg')),
    h(
      'span',
      { class: 'home-entry-body' },
      h('span', { class: 'home-entry-title finder-btn-label tab-label', text: '全身の筋膜シート図鑑' }),
    ),
    icon('next', 'home-entry-chevron'),
  );
  tabBtns.line = lineCatBtn;

  // 📖 連動ストーリー（動き・クセ・仕事からパネル内の控えめなサブリンク ＆ #ui-tab-story 互換維持）
  const storySubBtn = h(
    'button',
    {
      class: 'finder-sub-btn habit-story-sub-link tab finder-btn--story',
      type: 'button',
      role: 'tab',
      id: 'ui-tab-story',
      'data-tab': 'story',
      'aria-controls': 'ui-panel-story',
      'aria-selected': 'false',
      tabindex: '0',
      onclick: () => {
        state.storyReturnToHabit = true;
        openFinderCategory('story');
        if (state.sheet === 'closed') snapTo('half');
      },
    },
    h('span', { class: 'habit-story-sub-label' }, createDuotoneSvg('cat-line', 'story-sub-svg'), h('span', { text: '連動ストーリー（4ステップ図解で見る）' })),
    icon('next', 'habit-story-sub-chevron'),
  );
  tabBtns.story = storySubBtn;

  const homeBottomSearchRow = h(
    'div',
    { class: 'home-search-row', hidden: true },
    dictSearchBar,
  );

  function setHomeSearchOpen(open, { focusInput = false } = {}) {
    homeSearchOpen = Boolean(open);
    const hasFilter = Boolean(state.dictQuery.trim() || state.dictBodyPill);
    const visible = homeSearchOpen || hasFilter;
    homeBottomSearchRow.hidden = !visible;
    homeSearchToggleBtn.classList.toggle('is-active', visible);
    homeSearchToggleBtn.setAttribute('aria-expanded', String(visible));
    measure();
    if (state.sheet !== 'closed') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
    }
    if (visible && focusInput) {
      queueMicrotask(() => dictSearchInput.focus());
    }
  }

  dictSearchClearBtn.addEventListener('click', () => {
    setHomeSearchOpen(false);
  });

  const finderHomeHeader = h(
    'div',
    { class: 'home-top-row intake-head' },
    h('h2', { class: 'finder-home-title home-top-title', text: 'どこから筋膜のつながりを見ますか？' }),
    h(
      'div',
      { class: 'home-aux-pills' },
      homeSearchToggleBtn,
    ),
  );

  const tablist = h(
    'div',
    {
      class: 'home-entry-grid finder-grid',
      role: 'tablist',
      'aria-label': '筋膜のつながりの探し方を選択',
      style: { '--tabs': TABS.length },
    },
    feelEntryBtn,
    habitEntryBtn,
    lineCatBtn,
  );

  // 【階層 0：迷わない3つの入り口（3本柱）ホーム】
  const finderHome = h(
    'div',
    { class: 'finder-home', 'aria-label': '筋膜のつながりホーム' },
    finderHomeHeader,
    homeBottomSearchRow,
    dictSearchResults,
    tablist,
    h('div', { class: 'legacy-body-pills-keep', hidden: true }, dictBodyPillsBar),
  );

  const head = h('div', { class: 'sheet-head', hidden: true }, grip);
  const body = h('div', { class: 'sheet-body' }, finderHome);
  const panels = {};
  const slots = {};
  for (const t of TABS) {
    slots[t.id] = h('div', { class: 'slot' });
    panels[t.id] = h('div', {
      class: `panel panel--${t.id} is-step-hidden`,
      role: 'tabpanel',
      id: `ui-panel-${t.id}`,
      'aria-labelledby': `ui-tab-${t.id}`,
      hidden: true,
    });
    body.append(panels[t.id]);
  }
  const sheet = h('section', { class: 'sheet is-home', 'aria-label': 'メニュー' }, head, body);

  const closeButton = () =>
    h(
      'button',
      {
        class: 'icon-btn card-close',
        type: 'button',
        'aria-label': '閉じる',
        onclick: (e) => {
          e.stopPropagation();
          goHome({ clearSearch: true });
        },
      },
      icon('close'),
    );

  const cardBackButton = (label = '← 戻る') =>
    h(
      'button',
      {
        class: 'step-back-btn is-card-back',
        type: 'button',
        'aria-label': '戻る',
        onclick: (e) => {
          e.stopPropagation();
          returnFromCard();
        },
      },
      h('span', { text: label }),
    );

  /** 階層ヘッダー（押しやすい「← 戻る」ボタン ＋ ステップ見出し） */
  function makeStepHeadBar(backNodeOrText, titleNodeOrText, onBack) {
    const backLabelEl =
      typeof backNodeOrText === 'object' && backNodeOrText?.nodeType
        ? backNodeOrText
        : h('span', { text: String(backNodeOrText || '← 戻る') });
    const titleEl =
      typeof titleNodeOrText === 'object' && titleNodeOrText?.nodeType
        ? titleNodeOrText
        : h('span', { class: 'step-head-title', text: String(titleNodeOrText || '') });
    return h(
      'div',
      { class: 'step-head-bar' },
      h(
        'button',
        {
          class: 'step-back-btn',
          type: 'button',
          onclick: (e) => {
            e.stopPropagation();
            onBack(e);
          },
        },
        backLabelEl,
      ),
      titleEl,
    );
  }

  let postureDirectGroupEl = null;

  /** サブカテゴリー（美容師など）および直通リストの選択ハイライトを解除 */
  function clearOccupationSelection() {
    state.occupation = null;
    occCards.forEach((btn) => {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-pressed', 'false');
    });
    occGroupEls.forEach((sec, lbl) => {
      sec.classList.remove('is-selected', 'is-open');
      sec.classList.add('is-step-hidden');
      const tagEl = sec.querySelector('.occ-group-tag');
      if (tagEl) {
        const count = occByLabel.get(lbl)?.habits?.length || 0;
        tagEl.textContent = `${count}`;
      }
    });
    if (postureDirectGroupEl) {
      postureDirectGroupEl.classList.remove('is-selected', 'is-open');
      postureDirectGroupEl.classList.add('is-step-hidden');
    }
  }

  /** 初期ホーム画面（階層0）へ戻る */
  function goHome({ clearSearch = true } = {}) {
    state.feelingContext = null;
    state.fromHomeIntake = false;
    state.feeling = null;
    state.cardReturnContext = null;
    state.habitDirectMode = null;
    if (clearSearch && (state.dictQuery || state.dictBodyPill || homeSearchOpen)) {
      dictSearchInput.value = '';
      state.dictQuery = '';
      state.dictBodyPill = null;
      homeSearchOpen = false;
      homeBottomSearchRow.hidden = true;
      homeSearchToggleBtn.classList.remove('is-active');
      homeSearchToggleBtn.setAttribute('aria-expanded', 'false');
      renderDictSearchResults();
    }
    if (state.active) {
      clearCards();
      hideToast();
      state.active = null;
      state.progress = DEFAULT_HABIT_PROGRESS;
      syncPressed();
      renderPresent();
      emit('close');
    } else {
      hideToast();
    }
    sheet.classList.remove('has-active-card');
    for (const t of TABS) panels[t.id].classList.remove('has-card');
    lineChips.classList.remove('is-compact');
    clearOccupationSelection();
    state.atHome = true;
    state.habitStep = 'cat';
    state.feelStep = 'region';
    syncStepHierarchy();
    animateLayerSwitch(finderHome);
    measure();
    if (state.sheet !== 'half') snapTo('half');
    else {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  /** カード上の [← 戻る] 押下時：直前のリスト階層へ1段階戻る */
  function returnFromCard() {
    const retCtx = state.cardReturnContext;
    const prevTab = state.tab;
    const prevFeelRegion = state.feelRegion;
    const prevDirectMode = state.habitDirectMode;
    state.cardReturnContext = null;

    if (state.fromHomeIntake && !retCtx) {
      goHome();
      return;
    }

    closeCard();
    emit('close');

    if (retCtx === 'home-search') {
      state.atHome = true;
      syncStepHierarchy();
      animateLayerSwitch(finderHome);
    } else if (retCtx === 'feel-list' || prevTab === 'feel') {
      state.atHome = false;
      state.tab = 'feel';
      state.feelingContext = null;
      if (prevFeelRegion) {
        state.feelStep = 'list';
        applyFeelRegionFilter(prevFeelRegion);
        syncStepHierarchy();
        animateLayerSwitch(feelStepList);
      } else {
        state.feelStep = 'region';
        syncStepHierarchy();
        animateLayerSwitch(feelStepRegion);
      }
    } else if (prevTab === 'line') {
      state.atHome = false;
      state.tab = 'line';
      syncStepHierarchy();
      animateLayerSwitch(lineStepList);
    } else if (prevTab === 'story') {
      state.atHome = false;
      state.tab = 'story';
      syncStepHierarchy();
      animateLayerSwitch(storyStepList);
    } else {
      state.atHome = false;
      state.tab = 'habit';
      state.habitDirectMode = prevDirectMode;
      state.habitStep = 'list';
      syncStepHierarchy();
      animateLayerSwitch(occStep2);
    }

    measure();
    if (state.sheet !== 'half') snapTo('half');
    else {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  /** 入口A: 📍 痛む・気になる場所から（階層1A 部位5分類）を開く */
  function openFeelEntry() {
    state.feelingContext = null;
    state.fromHomeIntake = false;
    state.feeling = null;
    state.cardReturnContext = null;
    if (state.active) {
      clearCards();
      hideToast();
      state.active = null;
      state.progress = DEFAULT_HABIT_PROGRESS;
      syncPressed();
      renderPresent();
      emit('close');
    } else {
      hideToast();
    }
    state.atHome = false;
    state.feelStep = 'region';
    selectTab('feel');
    animateLayerSwitch(feelStepRegion);
    scrollBodyTop();
  }

  /** 入口B: 🏃 動き・クセ・仕事から（階層1B 4分類）を開く */
  function openHabitEntry() {
    state.feelingContext = null;
    state.fromHomeIntake = false;
    state.feeling = null;
    state.cardReturnContext = null;
    state.habitDirectMode = null;
    if (state.active) {
      clearCards();
      hideToast();
      state.active = null;
      state.progress = DEFAULT_HABIT_PROGRESS;
      syncPressed();
      renderPresent();
      emit('close');
    } else {
      hideToast();
    }
    clearOccupationSelection();
    state.atHome = false;
    state.habitStep = 'cat';
    selectTab('habit');
    animateLayerSwitch(occStepCat);
    scrollBodyTop();
  }

  /** 大カテゴリー（仕事 / 日常動作 / スポーツ）を開く互換ヘルパー */
  function openMacroCategory(macro) {
    if (macro === 'daily') {
      openHabitEntry();
      return;
    }
    openHabitCategory4(macro === 'sports' ? 'sports' : 'work');
  }

  /** ホーム画面から各タブパネルを開く */
  function openFinderCategory(id) {
    if (!panels[id]) return;
    if (id === 'feel') {
      openFeelEntry();
      return;
    }
    if (id === 'habit') {
      openHabitEntry();
      return;
    }
    state.feelingContext = null;
    state.fromHomeIntake = false;
    state.cardReturnContext = null;
    if (state.active && state.tab !== id) {
      clearCards();
      hideToast();
      state.active = null;
      state.progress = DEFAULT_HABIT_PROGRESS;
      syncPressed();
      renderPresent();
      emit('close');
    } else {
      hideToast();
    }
    state.atHome = false;
    selectTab(id);
    if (id === 'line' && !state.active) animateLayerSwitch(lineStepList);
    else if (id === 'story' && !state.active) animateLayerSwitch(storyStepList);
  }

  /* ---------- ④ 痛みの連動図解（ストーリー） ---------- */
  const storyItemById = new Map();
  const storyList = h(
    'div',
    { class: 'story-list', role: 'group', 'aria-label': '連動図解' },
    ...stories.map((s) => {
      const btn = h(
        'button',
        {
          class: 'story-item',
          type: 'button',
          'aria-pressed': 'false',
          'data-story': s.id,
          onclick: () => selectStory(s),
        },
        h('span', { class: 'story-icon story-ico', 'aria-hidden': 'true' }, getStoryIcon(s.id)),
        h('span', { class: 'story-title', text: cleanTitle(s.title) }),
      );
      storyItemById.set(s.id, btn);
      return btn;
    }),
  );
  const storyStepList = h(
    'div',
    { class: 'story-step-list' },
    makeStepHeadBar('← 戻る', '📖 連動ストーリー', () => {
      if (state.storyReturnToHabit) {
        state.storyReturnToHabit = false;
        openHabitEntry();
      } else {
        goHome();
      }
    }),
    storyList,
  );
  panels.story.append(slots.story, storyStepList);

  /* ---------- ③ 全身の筋膜シート図鑑（全11枚の「筋膜の面」一覧） ---------- */
  const isExtraLine = () => false;
  let extraLinesOpen = true;
  const lineChipById = new Map();

  const lineChips = h(
    'div',
    { class: 'chips chips--lines is-sheet-atlas', role: 'group', 'aria-label': '全身の筋膜シート図鑑' },
    ...lines.map((l) => {
      const subText = l.oneLine || (l.tag && l.name ? l.name : '');
      const btn = h(
        'button',
        {
          class: 'chip chip--line',
          type: 'button',
          'aria-pressed': 'false',
          'aria-label': l.tag && l.name ? `${l.tag}（${l.name}）` : l.name || l.tag || null,
          'data-line': l.id,
          style: { '--c': l.color },
          onclick: () => selectLine(l),
        },
        h('span', { class: 'dot dot--sheet', 'aria-hidden': 'true' }),
        h(
          'span',
          { class: 'chip-body' },
          h('span', { class: 'chip-label', text: l.tag || l.name }),
        ),
      );
      lineChipById.set(l.id, btn);
      return btn;
    }),
  );

  function setExtraLinesOpen(open) {
    extraLinesOpen = Boolean(open);
  }

  const lineAtlasLead = h('p', {
    class: 'line-atlas-lead',
    text: '複数の筋肉を面で包み込む、全身11枚の「筋膜シート」の場所を解剖図として確認できます。',
  });

  const lineStepList = h(
    'div',
    { class: 'line-step-list' },
    makeStepHeadBar('← 戻る', `全身の筋膜シート図鑑（${lines.length}枚）`, () => goHome()),
    lineChips,
  );

  panels.line.append(slots.line, lineStepList);

  /* ---------- ① 動き・クセ・仕事パネル（階層1B: 4分類 ➔ 職種/種目 または 直通動作リスト） ---------- */
  const habitChip = (hb) => {
    const sym = cleanTitle(hb.symptom || hb.feel || '');
    return h(
      'button',
      {
        class: 'chip chip--habit',
        type: 'button',
        'aria-pressed': 'false',
        'data-habit': hb.id,
        onclick: () => selectHabit(hb, { returnContext: 'habit-list' }),
      },
      h('span', { class: 'chip-ico', 'aria-hidden': 'true' }, getHabitIcon(hb)),
      h(
        'span',
        { class: 'chip-body' },
        h('span', { class: 'chip-label', text: cleanTitle(hb.label) }),
        sym ? h('span', { class: 'chip-sub', hidden: true, text: sym }) : null,
      ),
    );
  };

  const postureHabitChip = (hb) => {
    const sym = cleanTitle(hb.symptom || hb.feel || '');
    return h(
      'button',
      {
        class: 'chip chip--habit',
        type: 'button',
        'aria-pressed': 'false',
        'data-posture-habit': hb.id,
        onclick: () => selectHabit(hb, { returnContext: 'habit-list' }),
      },
      h('span', { class: 'chip-ico', 'aria-hidden': 'true' }, getHabitIcon(hb)),
      h(
        'span',
        { class: 'chip-body' },
        h('span', { class: 'chip-label', text: cleanTitle(hb.label) }),
        sym ? h('span', { class: 'chip-sub', hidden: true, text: sym }) : null,
      ),
    );
  };

  const occCards = new Map();
  const occGroupEls = new Map();
  const macroPillBtns = new Map();

  const MACRO_PILLS = [
    { id: 'all', label: 'すべて' },
    { id: 'work', label: '仕事' },
    { id: 'daily', label: '日常動作' },
    { id: 'sports', label: 'スポーツ' },
  ];

  const macroFilterBar = h(
    'div',
    { class: 'macro-filter-bar', role: 'group', 'aria-label': 'カテゴリー絞り込み', hidden: true },
    ...MACRO_PILLS.map((mp) => {
      const btn = h(
        'button',
        {
          class: `macro-pill${mp.id === state.macroFilter ? ' is-active' : ''}`,
          type: 'button',
          'data-macro-pill': mp.id,
          'aria-pressed': String(mp.id === state.macroFilter),
          onclick: () => setMacroFilter(mp.id),
        },
        h('span', { text: mp.label }),
      );
      macroPillBtns.set(mp.id, btn);
      return btn;
    }),
  );

  let occPager = null;

  function setMacroFilter(macroId) {
    const valid = ['all', 'work', 'daily', 'sports'].includes(macroId) ? macroId : 'all';
    const hasMatchingOcc =
      valid === 'all' || normalizedOccupations.some((o) => o.macro === valid);
    const effective = hasMatchingOcc ? valid : 'all';
    state.macroFilter = valid;

    macroPillBtns.forEach((btn, id) => {
      const on = id === valid;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    occCards.forEach((cardBtn, lbl) => {
      const occ = occByLabel.get(lbl);
      const visible = effective === 'all' || occ?.macro === effective;
      cardBtn.classList.toggle('is-macro-hidden', !visible);
    });

    occPager?.refresh(true);

    measure();
    if (state.sheet !== 'closed') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
    }
  }

  const occStep1TitleEl = h('span', {
    class: 'step-head-title',
    text: 'どの仕事・作業に近いですか？',
  });
  const step2BackTextEl = h('span', { text: '← 戻る' });
  const step2TitleEl = h('span', {
    class: 'step-head-title occ-step-title-text',
    text: `${state.occupation}`,
  });

  function buildPostureDirectHabits() {
    const list = [];
    const seen = new Set();
    const pushHb = (hb) => {
      if (!hb || seen.has(hb.id)) return;
      seen.add(hb.id);
      list.push(hb);
    };
    for (const hid of POSTURE_HABIT_PRIORITY_IDS) {
      pushHb(resolveHabit(hid));
    }
    const postureOcc = occByLabel.get('姿勢・睡眠・カバン');
    if (postureOcc) {
      for (const hb of postureOcc.habits) pushHb(hb);
    }
    if (list.length === 0) {
      for (const occ of normalizedOccupations) {
        if (occ.macro === 'daily') {
          for (const hb of occ.habits) pushHb(hb);
        }
      }
    }
    if (list.length === 0) {
      for (const hb of habits.slice(0, 6)) pushHb(hb);
    }
    return list;
  }

  function openPostureDirectList() {
    clearOccupationSelection();
    state.habitDirectMode = 'posture';
    if (postureDirectGroupEl) {
      postureDirectGroupEl.classList.remove('is-step-hidden');
      postureDirectGroupEl.classList.add('is-open', 'is-selected');
    }
    step2BackTextEl.textContent = '← 戻る';
    step2TitleEl.textContent = '日常の姿勢・クセ';
    state.atHome = false;
    state.tab = 'habit';
    state.habitStep = 'list';
    selectTab('habit', { skipUpdateCard: true });
    syncStepHierarchy();
    animateLayerSwitch(occStep2);
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  function openHouseworkDirectList() {
    const hwOcc =
      occByLabel.get('家事・育児') ||
      normalizedOccupations.find((o) => o.macro === 'daily') ||
      normalizedOccupations[0];
    clearOccupationSelection();
    state.habitDirectMode = 'housework';
    if (hwOcc) {
      selectOccupation(hwOcc.label, { enterList: false });
    }
    step2BackTextEl.textContent = '← 戻る';
    step2TitleEl.textContent = '家事・育児の動き';
    state.atHome = false;
    state.tab = 'habit';
    state.habitStep = 'list';
    selectTab('habit', { skipUpdateCard: true });
    syncStepHierarchy();
    animateLayerSwitch(occStep2);
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  function backToHabitCategories() {
    clearOccupationSelection();
    state.habitDirectMode = null;
    state.habitStep = 'cat';
    syncStepHierarchy();
    animateLayerSwitch(occStepCat);
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  function openHabitCategory4(catId) {
    state.feelingContext = null;
    state.fromHomeIntake = false;
    state.cardReturnContext = null;
    if (state.active) {
      clearCards();
      hideToast();
      state.active = null;
      state.progress = DEFAULT_HABIT_PROGRESS;
      syncPressed();
      renderPresent();
      emit('close');
    } else {
      hideToast();
    }

    if (catId === 'posture') {
      openPostureDirectList();
      return;
    }
    if (catId === 'housework') {
      openHouseworkDirectList();
      return;
    }

    state.habitDirectMode = null;
    clearOccupationSelection();
    const isSports = catId === 'sports';
    setMacroFilter(isSports ? 'sports' : 'work');
    occStep1TitleEl.textContent = isSports
      ? 'どのスポーツ・運動に近いですか？'
      : 'どの仕事・作業に近いですか？';
    state.atHome = false;
    state.habitStep = 'occ';
    selectTab('habit');
    animateLayerSwitch(occStep1);
    scrollBodyTop();
  }

  function selectOccupation(occLabel, { enterList = false } = {}) {
    if (!occByLabel.has(occLabel)) return;
    if (enterList) {
      state.habitDirectMode = null;
    }
    if (postureDirectGroupEl && state.habitDirectMode !== 'posture') {
      postureDirectGroupEl.classList.remove('is-selected', 'is-open');
      postureDirectGroupEl.classList.add('is-step-hidden');
    }
    state.occupation = occLabel;
    occCards.forEach((btn, lbl) => {
      const on = lbl === occLabel;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    occGroupEls.forEach((sec, lbl) => {
      const on = lbl === occLabel;
      sec.classList.toggle('is-selected', on);
      sec.classList.toggle('is-open', on);
      sec.classList.toggle('is-step-hidden', !on);
      const tagEl = sec.querySelector('.occ-group-tag');
      if (tagEl) {
        const count = occByLabel.get(lbl)?.habits?.length || 0;
        tagEl.textContent = on ? '選択中' : `${count}`;
      }
    });
    if (state.habitDirectMode === 'housework') {
      step2BackTextEl.textContent = '← 戻る';
      step2TitleEl.textContent = '家事・育児の動き';
    } else {
      const occMeta = occByLabel.get(occLabel);
      step2BackTextEl.textContent =
        occMeta?.macro === 'sports' ? '← 種目を選び直す' : '← 職種を選び直す';
      step2TitleEl.textContent = `${occLabel}`;
    }
    if (enterList) {
      state.atHome = false;
      state.tab = 'habit';
      state.habitStep = 'list';
      syncStepHierarchy();
      animateLayerSwitch(occStep2);
      measure();
      if (state.sheet === 'half') {
        setBodyHeight(snaps.half);
        setVis(snaps.half);
        updateRail(snaps.half);
      }
      scrollBodyTop();
    }
  }

  // 階層1B: 4分類（日常の姿勢・クセ / 家事・育児 / 仕事・職業 / スポーツ・運動）
  const habitCat4Grid = h(
    'div',
    { class: 'habit-cat4-grid', role: 'group', 'aria-label': '動きや習慣のカテゴリーを選択' },
    ...HABIT_ENTRY_CATEGORIES.map((cat) => {
      const catIco =
        { posture: 'sofa', housework: 'occ-home', work: 'occ-desk', sports: 'occ-golf' }[cat.id] ||
        'cat-work';
      return h(
        'button',
        {
          class: 'habit-cat4-card',
          type: 'button',
          'data-habit-cat': cat.id,
          onclick: () => openHabitCategory4(cat.id),
        },
        h('span', { class: 'habit-cat4-ico', 'aria-hidden': 'true' }, createDuotoneSvg(catIco)),
        h(
          'span',
          { class: 'habit-cat4-body' },
          h('span', { class: 'habit-cat4-title', text: cat.label }),
        ),
      );
    }),
  );

  const occStepCat = h(
    'div',
    { class: 'habit-step-cat occ-step occ-step--cat' },
    makeStepHeadBar('← 戻る', 'どの動き・習慣に近いですか？', () => goHome()),
    habitCat4Grid,
    stories.length ? storySubBtn : h('div', { hidden: true }, storySubBtn),
  );

  const occGrid = h(
    'div',
    { class: 'occ-grid', role: 'group', 'aria-label': 'サブカテゴリー一覧' },
    ...normalizedOccupations.map((occ) => {
      const isInitial = occ.label === state.occupation;
      const btn = h(
        'button',
        {
          class: `occ-card${isInitial ? ' is-active' : ''}`,
          type: 'button',
          'data-occ': occ.label,
          'data-occ-id': occ.id,
          'data-macro': occ.macro,
          'aria-pressed': String(isInitial),
          onclick: () => selectOccupation(occ.label, { enterList: true }),
        },
        h('span', { class: 'occ-card-ico', 'aria-hidden': 'true' }, getOccupationIcon(occ)),
        h(
          'span',
          { class: 'occ-card-info' },
          h('span', { class: 'occ-card-name', text: occ.short || occ.label }),
        ),
        h('span', { class: 'occ-card-count', hidden: true, 'aria-hidden': 'true', text: String(occ.habits.length) }),
      );
      occCards.set(occ.label, btn);
      return btn;
    }),
  );

  occPager = createButtonPager(() => [...occCards.values()], 6);
  occPager.refresh(true);

  // 職種・種目サブカテゴリーを選ぶ画面 (.habit-step-occ)
  const occStep1 = h(
    'div',
    { class: 'habit-step-occ occ-step occ-step--1 is-step-hidden' },
    makeStepHeadBar('← 戻る', occStep1TitleEl, () => backToHabitCategories()),
    macroFilterBar,
    occGrid,
    occPager.bar,
  );

  postureDirectGroupEl = h(
    'section',
    {
      class: 'occ-group acc is-posture-direct is-step-hidden',
      'data-occ-group': '__posture_direct__',
      'aria-label': '日常の姿勢・クセの代表的な動作',
    },
    h(
      'div',
      { class: 'chips chips--habit-flat occ-group-chips' },
      ...buildPostureDirectHabits().map(postureHabitChip),
    ),
  );

  const occGroupsWrap = h(
    'div',
    { class: 'occ-groups', role: 'group', 'aria-label': 'サブカテゴリー別の代表的な動作' },
    postureDirectGroupEl,
    ...normalizedOccupations.map((occ) => {
      const isSelected = occ.label === state.occupation;
      const sec = h(
        'section',
        {
          class: `occ-group acc${isSelected ? ' is-open is-selected' : ' is-step-hidden'}`,
          'data-occ-group': occ.label,
          'aria-label': `${occ.label}の代表的な動作`,
        },
        h(
          'button',
          {
            class: 'occ-group-head acc-head',
            type: 'button',
            hidden: true,
            onclick: () => selectOccupation(occ.label, { enterList: true }),
          },
          h('span', { class: 'occ-group-ico', 'aria-hidden': 'true' }, getOccupationIcon(occ)),
          h('span', { class: 'occ-group-title acc-title', text: occ.short || occ.label }),
          h('span', { class: 'occ-group-tag', text: isSelected ? '選択中' : `${occ.habits.length}` }),
        ),
        h(
          'div',
          { class: 'chips chips--habit-flat occ-group-chips' },
          ...occ.habits.map(habitChip),
        ),
      );
      occGroupEls.set(occ.label, sec);
      return sec;
    }),
  );

  // 動作ボタン一覧 (.habit-step-list)
  const occStep2 = h(
    'div',
    { class: 'habit-step-list occ-step occ-step--2 is-step-hidden' },
    makeStepHeadBar(step2BackTextEl, step2TitleEl, () => {
      if (state.habitDirectMode === 'posture' || state.habitDirectMode === 'housework') {
        backToHabitCategories();
        return;
      }
      clearOccupationSelection();
      state.habitStep = 'occ';
      syncStepHierarchy();
      animateLayerSwitch(occStep1);
      measure();
      if (state.sheet === 'half') {
        setBodyHeight(snaps.half);
        setVis(snaps.half);
        updateRail(snaps.half);
      }
      scrollBodyTop();
    }),
    occGroupsWrap,
  );

  panels.habit.append(slots.habit, occStepCat, occStep1, occStep2);

  /* ---------- ② 痛む・気になる場所パネル（階層1A: 部位5分類 ➔ 階層2A: 部位別の症状3〜5件） ---------- */
  const feelBtns = new Map();
  const feelRegionBtns = new Map();
  let feelResult = null;

  const feelSearchInput = h('input', {
    class: 'feel-search-input',
    type: 'search',
    placeholder: '🔍 違和感を検索',
    'aria-label': '違和感を検索',
  });
  const feelSearchWrap = h(
    'div',
    { class: 'feel-search-wrap', hidden: true },
    icon('search', 'feel-search-ico'),
    feelSearchInput,
  );

  const feelChips = h(
    'div',
    { class: 'chips chips--feel', role: 'group', 'aria-label': '体の違和感一覧' },
    ...allFeelings.map((f) => {
      const partBadge = inferPartBadge(f);
      const senseBadge = inferSenseBadge(f);
      const regionId = classifyFeelingRegion(f);
      const b = h(
        'button',
        {
          class: 'chip chip--feel',
          type: 'button',
          'aria-pressed': 'false',
          'data-feel': f.label,
          'data-feel-region': regionId,
          'data-sense': senseBadge,
          'data-part-badge': partBadge,
          onclick: () => selectFeeling(f),
        },
        h(
          'span',
          { class: 'chip-ico', 'aria-hidden': 'true' },
          createDuotoneSvg(FEEL_REGIONS.find((r) => r.id === regionId)?.icon || 'cat-feel'),
        ),
        h('span', { class: 'feel-chip-text', text: f.label }),
      );
      feelBtns.set(f.label, b);
      return b;
    }),
  );

  const feelPager = createButtonPager(() => [...feelBtns.values()], 6);
  feelPager.refresh(true);

  const feelListTitleEl = h('span', {
    class: 'step-head-title',
    text: 'どんな違和感ですか？',
  });

  function applyFeelRegionFilter(regionId) {
    const reg = FEEL_REGIONS.find((r) => r.id === regionId) || null;
    feelRegionBtns.forEach((btn, rid) => {
      const active = rid === regionId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (!reg) {
      feelBtns.forEach((btn) => {
        btn.hidden = false;
      });
      feelListTitleEl.textContent = 'どんな違和感ですか？';
      feelPager.refresh(true);
      return;
    }
    let matchedCount = 0;
    feelBtns.forEach((btn) => {
      const match = btn.dataset.feelRegion === reg.id;
      btn.hidden = !match;
      if (match) matchedCount++;
    });
    if (matchedCount === 0) {
      feelBtns.forEach((btn) => {
        btn.hidden = false;
      });
    }
    feelListTitleEl.textContent = `「${reg.label}」のどんな違和感ですか？`;
    feelPager.refresh(true);
  }

  function selectFeelRegion(regionId) {
    state.feelRegion = regionId;
    state.feelStep = 'list';
    state.atHome = false;
    state.tab = 'feel';
    feelSearchInput.value = '';
    applyFeelRegionFilter(regionId);
    syncStepHierarchy();
    animateLayerSwitch(feelStepList);
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  function backToFeelRegions() {
    state.feelStep = 'region';
    state.feeling = null;
    state.feelingContext = null;
    feelSearchInput.value = '';
    syncPressed();
    syncStepHierarchy();
    animateLayerSwitch(feelStepRegion);
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  feelSearchInput.addEventListener('input', () => {
    const q = feelSearchInput.value.trim().toLowerCase();
    feelBtns.forEach((btn, lbl) => {
      const regionMatch = !state.feelRegion || btn.dataset.feelRegion === state.feelRegion;
      const sense = (btn.dataset.sense || '').toLowerCase();
      const part = (btn.dataset.partBadge || '').toLowerCase();
      const match =
        regionMatch && (!q || lbl.toLowerCase().includes(q) || sense.includes(q) || part.includes(q));
      btn.hidden = !match;
    });
    feelPager.refresh(true);
    measure();
    if (state.sheet !== 'closed') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
    }
  });

  // 階層1A: 部位5分類 (.feel-step-region)
  const feelRegionGrid = h(
    'div',
    { class: 'feel-region-grid', role: 'group', 'aria-label': '気になる体の部位を選択' },
    ...FEEL_REGIONS.map((reg) => {
      const btn = h(
        'button',
        {
          class: 'feel-region-card',
          type: 'button',
          'aria-pressed': 'false',
          'data-feel-region-btn': reg.id,
          onclick: () => selectFeelRegion(reg.id),
        },
        h('span', { class: 'feel-region-ico', 'aria-hidden': 'true' }, createDuotoneSvg(reg.icon)),
        h(
          'span',
          { class: 'feel-region-body' },
          h('span', { class: 'feel-region-title', text: reg.label }),
        ),
        icon('next', 'feel-region-chevron'),
      );
      feelRegionBtns.set(reg.id, btn);
      return btn;
    }),
  );

  const feelStepRegion = h(
    'div',
    { class: 'feel-step-region' },
    makeStepHeadBar('← 戻る', 'どこが一番気になりますか？', () => goHome()),
    feelRegionGrid,
  );

  // 階層2A: 選んだ部位の違和感カード一覧 (.feel-step-list)
  const feelStepList = h(
    'div',
    { class: 'feel-step-list is-step-hidden' },
    makeStepHeadBar('← 戻る', feelListTitleEl, () => backToFeelRegions()),
    feelChips,
    feelPager.bar,
    feelSearchWrap,
  );

  // 互換用マウント (.feel-step-result)
  const feelResultTitleEl = h('span', {
    class: 'step-head-title',
    text: '原因になりやすい動作',
  });
  const feelResultMount = h('div', { class: 'feel-result-mount' });
  const feelStepResult = h(
    'div',
    { class: 'feel-step-result is-step-hidden' },
    makeStepHeadBar('← 戻る', feelResultTitleEl, () => {
      state.feelStep = state.feelRegion ? 'list' : 'region';
      state.feeling = null;
      state.feelingContext = null;
      syncPressed();
      syncStepHierarchy();
      measure();
      if (state.sheet === 'half') {
        setBodyHeight(snaps.half);
        setVis(snaps.half);
        updateRail(snaps.half);
      }
      scrollBodyTop();
    }),
    feelResultMount,
  );

  panels.feel.append(slots.feel, feelStepRegion, feelStepList, feelStepResult);

  /** 【階層2A ➔ 即3D反応】部位別の違和感カードをタップしたら、
   *  即座に代表的な原因クセ (matchingHabits[0]) の3Dポーズ・筋膜ライン＆原因カードを起動する */
  function selectFeeling(f, { fromHome = false } = {}) {
    if (!f) return;
    feelResult?.remove();
    feelResult = null;
    const list = (f.habits || []).map(resolveHabit).filter(Boolean);
    const partBadge = inferPartBadge(f);
    const inferredReg = classifyFeelingRegion(f);
    if (!state.feelRegion && inferredReg) {
      state.feelRegion = inferredReg;
      applyFeelRegionFilter(inferredReg);
    }

    state.feeling = f.label;
    state.fromHomeIntake = Boolean(fromHome);
    state.cardReturnContext = fromHome ? null : 'feel-list';
    state.feelingContext = list.length
      ? { label: f.label, partBadge, habits: list }
      : null;

    emit('feeling', f.label);

    if (list.length > 0) {
      state.atHome = false;
      state.tab = 'feel';
      state.feelStep = 'list';
      if (state.active?.type === 'habit' && state.active.id === list[0].id) {
        emit('habit', list[0].id);
        clearCards();
        state.active = null;
        showHabit(list[0]);
      } else {
        selectHabit(list[0], { keepFeelingContext: true, returnContext: fromHome ? null : 'feel-list' });
      }
      return;
    }

    state.atHome = false;
    state.tab = 'feel';
    state.feelStep = 'result';
    feelResultTitleEl.textContent = `${f.label}`;
    feelResult = h(
      'div',
      { class: 'feel-result', role: 'group', 'aria-label': `${f.label}に関係する動作` },
      h('p', { class: 'dict-results-empty', text: '該当する原因動作が見つかりませんでした' }),
    );
    feelResultMount.replaceChildren(feelResult);
    syncPressed();
    syncStepHierarchy();
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
    scrollBodyTop();
  }

  /* ======================================================================== */
  /* カード                                                                     */
  /* ======================================================================== */
  let lineCard = null;
  let habitCard = null;
  let storyCard = null;
  let timeUI = null;
  let storyUI = null;

  /** 部位名タグ（色付き丸ドット ＋ 筋肉名 ＋ 深層バッジ）のインタラクティブボタン配列を生成 */
  function renderPartTagElements(
    shorten = [],
    lengthen = [],
    yore = [],
    { maxShort = 1, maxLong = 1, maxYore = 1, maxTotal = 3 } = {},
  ) {
    const seen = new Set();
    const tags = [];
    const addTags = (list, cls, max) => {
      let count = 0;
      for (const raw of list || []) {
        if (count >= max || tags.length >= maxTotal) break;
        const id = typeof raw === 'string' ? raw : raw?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const name = shortMuscleNameOf(id);
        if (!name) continue;
        const isDeep = resolveMuscleLayer(id, raw) === 'deep';
        const isActive = inspectedPartId === id;
        const btn = h(
          'button',
          {
            type: 'button',
            class: `part-tag ${cls}${isDeep ? ' is-deep' : ''}${isActive ? ' is-active' : ''}`,
            'data-part': id,
            'aria-pressed': String(isActive),
            'aria-label': `${name}${isDeep ? '（深層）' : ''}の役割と筋膜の連動を見る`,
            onclick: (e) => {
              e.stopPropagation();
              activeTriggerPointId = null;
              inspectedPartId = id;
              syncPartTags();
              emit('inspect', id);
            },
          },
          h('span', { class: 'part-tag-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'part-tag-label', text: name }),
          isDeep ? h('span', { class: 'part-deep-badge', text: '深' }) : null,
        );
        tags.push(btn);
        count++;
      }
    };
    addTags(shorten, 'is-short is-shorten-core', maxShort);
    addTags(lengthen, 'is-long is-lengthen-antagonist', maxLong);
    addTags(yore, 'is-yore is-shorten-linked', maxYore);
    return tags;
  }

  /** 路線図カード */
  function buildLineCard(l) {
    const stations = [...(l.stations || [])].reverse();
    const cross = l.side === 'cross';
    const linePartIds = l.path || l.track || [];
    const seenLineLabels = new Set();
    const linePartBtns = linePartIds
      .map((raw) => {
        const id = typeof raw === 'string' ? raw : raw?.id;
        const name = id ? shortMuscleNameOf(id) : '';
        if (!id || !name || seenLineLabels.has(name)) return null;
        seenLineLabels.add(name);
        const isDeep = resolveMuscleLayer(id, raw) === 'deep';
        const isActive = inspectedPartId === id;
        return h(
          'button',
          {
            type: 'button',
            class: `part-tag is-line-part${isDeep ? ' is-deep' : ''}${isActive ? ' is-active' : ''}`,
            'data-part': id,
            'aria-pressed': String(isActive),
            'aria-label': `${name}${isDeep ? '（深層）' : ''}の役割と筋膜の連動を見る`,
            onclick: (e) => {
              e.stopPropagation();
              activeTriggerPointId = null;
              inspectedPartId = id;
              syncPartTags();
              emit('inspect', id);
            },
          },
          h('span', { class: 'part-tag-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'part-tag-label', text: name }),
          isDeep ? h('span', { class: 'part-deep-badge', text: '深' }) : null,
        );
      })
      .filter(Boolean);

    const sheetSummaryText = String(l.oneLine || l.summary || l.desc || '').trim();

    return h(
      'article',
      { class: `card card--line${cross ? ' is-cross' : ''}`, style: { '--c': l.color }, 'aria-label': `${l.name}の筋膜シート図鑑` },
      h(
        'header',
        { class: 'card-head' },
        cardBackButton('← 戻る'),
        h('span', { class: 'card-swatch', 'aria-hidden': 'true' }),
        h(
          'div',
          { class: 'card-titles' },
          h(
            'h2',
            { class: 'card-title' },
            h('span', { text: l.tag || l.name }),
            l.tag ? h('small', { class: 'card-sub', text: l.name }) : null,
            cross ? h('small', { class: 'card-badge', text: '左右交差シート' }) : null,
          ),
        ),
        closeButton(),
      ),
      sheetSummaryText
        ? h('p', { class: 'line-sheet-summary', text: sheetSummaryText })
        : null,
      linePartBtns.length
        ? h(
            'div',
            { class: 'line-sheet-sec' },
            h('span', { class: 'line-sheet-sec-lbl' }, icon('layerSeeThrough', 'line-sec-svg'), h('span', { text: 'つながる筋膜シートの面' })),
            h('div', { class: 'part-tags part-tags--line', 'aria-label': 'つながる筋膜シートの面' }, ...linePartBtns),
          )
        : null,
      stations.length
        ? h(
            'div',
            { class: 'route-wrap' },
            h('span', { class: 'line-sheet-sec-lbl', text: '📍 シートが通るポイント' }),
            h('span', { class: 'route-bar', 'aria-hidden': 'true' }, h('span', { class: 'route-pulse' })),
            h(
              'ol',
              { class: 'route', 'aria-label': 'シートが通るポイント' },
              ...stations.map((s, i) =>
                h(
                  'li',
                  {
                    class: `stop${i === 0 || i === stations.length - 1 ? ' stop--end' : ''}`,
                    style: { '--i': i },
                  },
                  h('span', { class: 'stop-dot', 'aria-hidden': 'true' }),
                  h('span', { class: 'stop-name', text: s }),
                ),
              ),
            ),
          )
        : null,
    );
  }

  const playButtons = new Set();
  function makePlayButton(cls) {
    const b = h(
      'button',
      { class: `play-btn ${cls}`, type: 'button', 'aria-label': '再生', 'aria-pressed': 'false', onclick: togglePlay },
      icon('play'),
    );
    playButtons.add(b);
    return b;
  }

  /* ======================================================================== */
  /* 3Dレントゲン＆筋膜リリース指導アニメーション・プレイヤー (.selfcare-modal)  */
  /* ======================================================================== */
  const selfCareModal = h('div', {
    class: 'selfcare-modal',
    role: 'dialog',
    'aria-label': '3Dリリース指導プレイヤー',
    hidden: true,
  });
  let scTimerId = 0;
  let scPlaying = false;
  let scStepIndex = 0;
  let scProgressSec = 0;
  let scCurrentHabit = null;
  let scSheetBefore = null;
  let scXrayOn = false;
  let scMuscleLayerBefore = 'on';
  let scActiveTool = 'ball';
  const SC_STEP_DURATION = 5;

  function normalizeScTool(rawTool) {
    if (rawTool === 'hand') return 'hand';
    return rawTool === 'pole' || rawTool === 'roller' ? 'roller' : 'ball';
  }

  function scToolEmoji(normTool) {
    if (normTool === 'hand') return '🤲［指でケア］';
    return normTool === 'roller' ? '🛞［ローラー］' : '🎾［ボール］';
  }

  function scDefaultMotion(normTool, muscleId = '') {
    const profile = resolveCareProfile(muscleId, normTool);
    return profile.motion || (normTool === 'hand' ? 'stroke' : normTool === 'roller' ? 'roll' : 'circle');
  }

  function parseTotalSeconds(durStr, stepCount = 3) {
    const s = String(durStr || '');
    const mMatch = s.match(/(\d+)\s*分/);
    const sMatch = s.match(/(\d+)\s*秒/);
    let total = 0;
    if (mMatch) total += Number(mMatch[1]) * 60;
    if (sMatch) total += Number(sMatch[1]);
    return total > 0 ? total : stepCount * 30;
  }

  function formatMMSS(sec) {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  /** トリガーポイントの推奨器具 ('hand' | 'ball' | 'roller') とモーションを安全ルール込みで解決 */
  function resolveTpToolAndMotion(rawTp, muscleId, stepText = '', idx = 0) {
    const explicitTool = typeof rawTp === 'object' && rawTp ? rawTp.tool : '';
    const explicitMotion = typeof rawTp === 'object' && rawTp ? rawTp.motion : '';
    let requested = explicitTool;
    if (!requested || !RELEASE_TOOL_MAP[requested]) {
      const txt = String(stepText || (typeof rawTp === 'object' ? rawTp?.step || '' : '')).toLowerCase();
      if (txt.includes('指') || txt.includes('手')) requested = 'hand';
      else if (txt.includes('ポール') || txt.includes('pole') || txt.includes('ローラー') || txt.includes('roller')) requested = 'roller';
      else if (txt.includes('ボール') || txt.includes('ball') || txt.includes('くるくる')) requested = 'ball';
      else requested = DEFAULT_MUSCLE_TOOL[muscleId] || '';
    }
    const profile = resolveCareProfile(muscleId, requested || null);
    const toolDef = RELEASE_TOOL_MAP[profile.tool] || RELEASE_TOOLS[0];
    const motion =
      explicitMotion && profile.tool === normalizeScTool(requested)
        ? explicitMotion
        : profile.motion || toolDef.motion;
    const label = TOOL_LABEL[toolDef.id] || toolDef.label;
    return { tool: toolDef.id, motion, toolBadge: label, toolLabel: label, isDelicate: profile.isDelicate };
  }

  /** 動作 hb からトリガーポイント（点：①・②・③）を重複なく最大3点抽出 */
  function extractHabitTriggerPoints(hb) {
    if (!hb) return [];
    const tl = hb.triggerLine || hb.goldenLine || resolveTriggerLine(hb.triggerLineId || hb.goldenLineId) || null;
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
              : [...(hb.shorten || []), ...(hb.yore || [])];

    const nums = ['①', '②', '③'];
    const seen = new Set();
    const result = [];
    for (const item of rawSource) {
      if (result.length >= 3) break;
      const id = typeof item === 'string' ? item : item?.muscleId || item?.id || item?.muscle || '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const preferred =
        typeof item === 'object' && item
          ? item.easyLabel || item.shortName || item.label || item.name || ''
          : '';
      const shortLabel = shortMuscleNameOf(id, preferred);
      const fullName = nameOf(id) || shortLabel || id;
      const idx = result.length;
      const num = nums[idx] || `${idx + 1}`;
      const stepStr = typeof item === 'object' && item?.step ? item.step : '';
      const durationSec =
        typeof item === 'object' && Number(item?.durationSec) > 0 ? Number(item.durationSec) : 30;
      const { tool, motion, toolBadge, toolLabel } = resolveTpToolAndMotion(item, id, stepStr, idx);
      const explicitStrokeTarget = typeof item === 'object' && item ? item.strokeTarget : null;
      const arrowIdx = arrowPath.indexOf(id);
      const fallbackStrokeTarget =
        arrowIdx >= 0 && arrowIdx + 1 < arrowPath.length ? arrowPath[arrowIdx + 1] : null;

      result.push({
        id,
        index: idx,
        num,
        easyLabel: shortLabel,
        shortLabel,
        fullName,
        numberedLabel: `${num} ${shortLabel}`,
        tool,
        motion,
        toolBadge,
        toolLabel,
        strokeTarget: explicitStrokeTarget || fallbackStrokeTarget || null,
        step: stepStr,
        durationSec,
      });
    }
    return result;
  }

  function buildSelfCareData(hb) {
    const raw = hb?.selfCare || {};
    const tpList = extractHabitTriggerPoints(hb);
    const targetMuscles = tpList.length
      ? tpList.map((tp) => tp.id)
      : Array.isArray(raw.targetMuscles) && raw.targetMuscles.length
        ? raw.targetMuscles
        : [...(hb?.shorten || []), ...(hb?.yore || [])].slice(0, 3);
    const rawSteps =
      Array.isArray(raw.steps) && raw.steps.length
        ? raw.steps
        : tpList.length && tpList.some((tp) => tp.step)
          ? tpList.map((tp) => tp.step)
          : targetMuscles.map((mId, idx) => {
              const mName = shortMuscleNameOf(mId) || nameOf(mId) || '対象部位';
              const nums = ['①', '②', '③'];
              return `${nums[idx] || `${idx + 1}.`} ${mName}のまわりを痛気持ちいい強さで30秒ほぐす`;
            });
    const steps = rawSteps.map((st, idx) => {
      const tp = tpList[idx] || null;
      const rawStepStr =
        typeof st === 'string'
          ? st
          : st?.step || st?.text || st?.desc || st?.title || tp?.step || '';
      const text = sanitizeTriggerText(rawStepStr || tp?.step || '');
      const cleanStep = String(text).replace(/^[①②③④⑤1-5１-５][.．、\s]*/u, '').trim();
      const muscleId =
        (typeof st === 'object' && (st?.muscleId || st?.muscle || st?.target)) ||
        tp?.id ||
        targetMuscles[idx] ||
        targetMuscles[0] ||
        '';
      const muscleName = tp?.shortLabel || shortMuscleNameOf(muscleId) || nameOf(muscleId) || '';
      const resolvedTool = resolveTpToolAndMotion(tp || st, muscleId, cleanStep, idx);
      const normTool = resolvedTool.tool;
      const profile = resolveCareProfile(muscleId, normTool, muscleName);
      const toolEmoji = scToolEmoji(normTool);
      const num = ['①', '②', '③', '④'][idx] || `${idx + 1}`;
      const durSec =
        tp?.durationSec ||
        (typeof st === 'object' && Number(st?.durationSec) > 0 ? Number(st.durationSec) : 30);
      // 元のテキストが禁止器具（デリケート部位なのにボール・ローラー等）を含む場合は安全なガイド文言に差し替える
      const hasMismatchedToolWord =
        (normTool === 'hand' && /(ボール|ローラー|ポール)/u.test(cleanStep)) ||
        (normTool === 'ball' && /(ローラー|ポール)/u.test(cleanStep)) ||
        (normTool === 'roller' && /ボール/u.test(cleanStep));
      const bodyStep = !cleanStep || hasMismatchedToolWord ? profile.guideText : cleanStep;
      const stepWithNum = `${num} ${bodyStep}`;
      const hasDuration = /\d+\s*秒/.test(bodyStep);
      const guideWithEmoji = `${toolEmoji} ${stepWithNum}${hasDuration ? '' : `（${durSec}秒）`}`;
      const nextTpId = tpList[idx + 1]?.id || tpList[0]?.id || null;
      return {
        index: idx,
        num,
        rawText: text || stepWithNum,
        text: bodyStep,
        step: stepWithNum,
        stepText: stepWithNum,
        guide: guideWithEmoji,
        durationSec: durSec,
        muscleId,
        muscleName,
        initialTool: normTool,
        userSwitchedTool: false,
        tool: normTool,
        motion: resolvedTool.motion,
        toolBadge: resolvedTool.toolBadge,
        toolLabel: resolvedTool.toolLabel,
        strokeTarget: tp?.strokeTarget || nextTpId || null,
      };
    });
    return {
      title: sanitizeTriggerText(raw.title || `${cleanTitle(hb?.label || '')}の3Dリリース`),
      videoDuration: raw.videoDuration || raw.duration || '90秒',
      targetMuscles,
      steps,
    };
  }

  function stopSelfCareTimer() {
    if (scTimerId) {
      clearInterval(scTimerId);
      scTimerId = 0;
    }
    scPlaying = false;
  }

  function setXrayMode(onoff) {
    scXrayOn = Boolean(onoff);
    emit('xray', scXrayOn);
  }

  function closeSelfCareModal({ restoreSheet = true } = {}) {
    stopSelfCareTimer();
    const prevHabit = scCurrentHabit;
    scCurrentHabit = null;
    if (!selfCareModal.hidden) {
      selfCareModal.hidden = true;
      selfCareModal.textContent = '';
      if (scXrayOn) {
        setXrayMode(false);
      }
      if (prevHabit) {
        activeTriggerPointId = null;
        inspectedPartId = null;
        syncPartTags();
        emit('selfcare-close', prevHabit.id);
        emit('trigger-point', null);
        emit('trigger-line', prevHabit.id);
      }
    }
    if (restoreSheet && scSheetBefore && state.sheet === 'closed') {
      const prev = scSheetBefore;
      scSheetBefore = null;
      snapTo(prev);
    } else {
      scSheetBefore = null;
    }
  }

  /* ======================================================================== */
  /* リワード広告ゲート (.reward-ad-modal)                                      */
  /* セルフケアを N 回開くごとに1回だけ挟む。アプリ版は AdMob リワード動画、     */
  /* Web/PWA 版は器具紹介カード（5秒で自動的にセルフケアへ進む・すぐ見るも可）。 */
  /* ======================================================================== */
  const AD_GATE_SEC = 5;
  let scOpenCount = 0;
  let adGateTimer = 0;
  let adGateOnUnlock = null;
  const adGateModal = h('div', {
    class: 'reward-ad-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'PR',
    hidden: true,
    onclick: (e) => {
      if (e.target === adGateModal) closeAdGate();
    },
  });

  function onAdGateKey(e) {
    if (e.key === 'Escape') closeAdGate();
  }

  function closeAdGate() {
    clearInterval(adGateTimer);
    adGateTimer = 0;
    adGateOnUnlock = null;
    adGateModal.hidden = true;
    adGateModal.textContent = '';
    document.removeEventListener('keydown', onAdGateKey);
  }

  function unlockAdGate() {
    const done = adGateOnUnlock;
    closeAdGate();
    if (typeof done === 'function') done();
  }

  /** ストアアプリ版（Capacitor + @capacitor-community/admob）ならネイティブのリワード動画を再生。
   *  失敗しても利用者を待たせないよう、必ずセルフケアは開く。 */
  async function showNativeRewardAd(cfg, onUnlocked) {
    const AdMob = window.Capacitor?.Plugins?.AdMob;
    try {
      if (typeof AdMob.prepareRewardVideoAd === 'function') {
        await AdMob.prepareRewardVideoAd({ adId: cfg.admobRewardId });
      }
      await AdMob.showRewardVideoAd();
    } catch (err) {
      console.warn('[ui] AdMob リワード広告を表示できませんでした（そのまま開きます）', err);
    }
    onUnlocked();
  }

  function openRewardAdGate(cfg, onUnlocked) {
    const AdMob = typeof window !== 'undefined' ? window.Capacitor?.Plugins?.AdMob : null;
    if (cfg.admobRewardId && typeof AdMob?.showRewardVideoAd === 'function') {
      showNativeRewardAd(cfg, onUnlocked);
      return;
    }

    closeAdGate();
    adGateOnUnlock = onUnlocked;

    const toolLink = (cls, href, label) =>
      h(
        'a',
        {
          class: `rad-tool ${cls}`,
          href,
          target: '_blank',
          rel: 'noopener noreferrer sponsored',
          'aria-label': `${label}（広告・外部サイト）`,
        },
        h('span', { class: 'rad-tool-text', text: label }),
        h('span', { class: 'rad-tool-arrow', 'aria-hidden': 'true', text: '▸' }),
      );

    const barFill = h('span', { class: 'rad-bar-fill' });
    const secEl = h('span', { class: 'rad-sec', text: String(AD_GATE_SEC) });
    const goBtn = h(
      'button',
      { class: 'rad-go-btn', type: 'button', onclick: () => unlockAdGate() },
      h('span', { text: '▶ すぐ見る' }),
      h('span', { class: 'rad-go-sec' }, secEl),
    );

    adGateModal.replaceChildren(
      h(
        'div',
        { class: 'rad-card' },
        h(
          'header',
          { class: 'rad-head' },
          h('span', { class: 'rad-badge', text: 'PR' }),
          h('h2', { class: 'rad-title', text: 'セルフケアで使う器具' }),
          h(
            'button',
            { class: 'icon-btn rad-close', type: 'button', 'aria-label': '閉じる', onclick: () => closeAdGate() },
            icon('close'),
          ),
        ),
        h(
          'div',
          { class: 'rad-tools' },
          toolLink('is-ball', cfg.ballUrl, cfg.ballLabel),
          toolLink('is-roller', cfg.rollerUrl, cfg.rollerLabel),
        ),
        h('div', { class: 'rad-bar', 'aria-hidden': 'true' }, barFill),
        goBtn,
        h('p', { class: 'rad-disclosure', text: cfg.disclosure }),
      ),
    );
    adGateModal.hidden = false;
    document.addEventListener('keydown', onAdGateKey);
    goBtn.focus({ preventScroll: true });

    const startedAt = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const ratio = clamp(elapsed / AD_GATE_SEC, 0, 1);
      barFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
      secEl.textContent = String(Math.max(0, Math.ceil(AD_GATE_SEC - elapsed)));
      if (ratio >= 1) unlockAdGate();
    };
    tick();
    adGateTimer = setInterval(tick, 100);
  }

  /** 「▶ セルフケアのやり方を見る」の入口。adFrequency 回に1回だけ広告ゲートを挟む
   *  （?ad_test=1 なら毎回）。1〜2回目は従来どおり即座に開く。 */
  function openSelfCareWithAdGate(hb) {
    const cfg = getMonetizeConfig();
    scOpenCount += 1;
    const open = () => {
      openSelfCareModal(hb, { emitInitialStep: false });
      emit('selfcare', hb.id);
    };
    const gated = cfg.adFrequency > 0 && (cfg.adTest || scOpenCount % cfg.adFrequency === 0);
    if (gated) openRewardAdGate(cfg, open);
    else open();
  }

  function openSelfCareModal(hb, { emitInitialStep = true } = {}) {
    const resolved = resolveHabit(hb);
    if (!resolved) return;
    stopPlay();
    stopTween();
    stopSelfCareTimer();
    hideToast();

    scCurrentHabit = resolved;
    scStepIndex = 0;
    scProgressSec = 0;
    scMuscleLayerBefore = state.layers.muscle || 'on';

    if (state.sheet !== 'closed') {
      scSheetBefore = state.sheet;
      snapTo('closed');
    }

    const sc = buildSelfCareData(resolved);
    const stepCount = Math.max(1, sc.steps.length);
    const totalCycleSec = stepCount * SC_STEP_DURATION;
    const displayTotalSec = parseTotalSeconds(sc.videoDuration, stepCount);

    // レントゲン透視を初期ONにして深層トリガーポイントと骨格を透視表示
    setXrayMode(true);

    // 1段目: 動作タイトル ＋ [🎬 編集] ＋ [×]（[🔬 透視] ボタンは自動ONのため非表示）
    const xrayToggleBtn = h(
      'button',
      {
        class: 'sc-xray-toggle is-active',
        type: 'button',
        hidden: true,
        'aria-pressed': 'true',
        onclick: () => {
          setXrayMode(!scXrayOn);
          xrayToggleBtn.classList.toggle('is-active', scXrayOn);
          xrayToggleBtn.setAttribute('aria-pressed', String(scXrayOn));
          xrayToggleBtn.textContent = '🔬 透視';
        },
      },
      '🔬 透視',
    );

    const modalHead = h(
      'header',
      { class: 'sc-modal-head' },
      xrayToggleBtn,
      h('h2', { class: 'sc-modal-title', text: cleanTitle(resolved.label) }),
      h(
        'button',
        {
          class: 'icon-btn sc-modal-close',
          type: 'button',
          'aria-label': '3Dリリース指導を閉じる',
          onclick: () => closeSelfCareModal({ restoreSheet: true }),
        },
        icon('close'),
      ),
    );

    const tlObjForSc =
      resolved.triggerLine ||
      resolved.goldenLine ||
      resolveTriggerLine(resolved.triggerLineId || resolved.goldenLineId) ||
      null;
    const safetyText = resolveSafetyNote(resolved, tlObjForSc, [
      ...sc.targetMuscles,
      ...(resolved.shorten || []),
    ]);
    const safetyBox = safetyText
      ? h(
          'div',
          { class: 'sc-safety-box', role: 'note', 'aria-label': 'セルフケアの安全注意' },
          h('span', { class: 'sc-safety-badge', text: '⚠️ 安全ポイント' }),
          h('p', { class: 'sc-safety-text', text: safetyText.replace(/^[⚠️⚠\uFE0F\s]+/u, '') }),
        )
      : null;

    // 2段目: 1行でセルフケアのやり方がわかる簡単ガイドバー (.sc-guide-banner)
    const guideBannerTextEl = h('span', {
      class: 'sc-guide-text',
      text: sc.steps[0]?.guide || sc.steps[0]?.step || sc.steps[0]?.text || '',
    });
    const guideBanner = h(
      'div',
      {
        class: 'sc-guide-banner',
        role: 'status',
        'aria-live': 'polite',
      },
      guideBannerTextEl,
    );

    function syncGuideBannerUI(st) {
      if (!st) return;
      guideBanner.classList.remove('is-cta-hint');
      const norm = normalizeScTool(st.tool);
      const toolEmoji = scToolEmoji(norm);
      let baseStep = st.stepText || st.step || `${st.num} ${st.text || ''}`;
      if (st.userSwitchedTool && norm !== st.initialTool) {
        const profile = resolveCareProfile(st.muscleId, norm, st.muscleName);
        baseStep = `${st.num} ${profile.guideText}`;
      }
      const durSuffix = st.durationSec && !/\d+\s*秒/.test(baseStep) ? `（${st.durationSec}秒）` : '';
      guideBannerTextEl.textContent = `${toolEmoji} ${baseStep}${durSuffix}`;
    }

    // 部位別安全ルール付きの3Dやり方切替バー（🤲 指でやる ／ 🎾 ボール ／ 🛞 ローラー）
    const toolBtns = new Map();
    const stepCards = [];
    const delicateBadgeEl = h(
      'div',
      {
        class: 'sc-delicate-badge',
        hidden: true,
        role: 'status',
      },
      '🤲 指でやさしくケア（強い器具は使いません）',
    );

    // 4段目: 公開モード別に「来院・相談ボタン（clinic）」または「器具PRリンク（public）」を出し分け
    const mCfg = getMonetizeConfig();
    const affiliateLabelEl = h('span', { class: 'sc-aff-text' });
    const affiliateBtn = mCfg.isClinic
      ? null
      : h(
          'a',
          {
            class: 'sc-tool-affiliate-btn',
            target: '_blank',
            rel: 'noopener noreferrer sponsored',
            title: mCfg.disclosure,
          },
          affiliateLabelEl,
          h('span', { class: 'sc-aff-badge', 'aria-label': '広告', text: 'PR' }),
        );

    function syncAffiliateUI(activeToolId) {
      if (!affiliateBtn) return;
      const norm = normalizeScTool(activeToolId);
      if (norm === 'hand') {
        affiliateBtn.hidden = true;
        return;
      }
      affiliateBtn.hidden = false;
      const isRoller = norm === 'roller';
      affiliateBtn.classList.toggle('is-roller', isRoller);
      affiliateBtn.classList.toggle('is-ball', !isRoller);
      affiliateBtn.href = isRoller ? mCfg.rollerUrl : mCfg.ballUrl;
      affiliateLabelEl.textContent = isRoller ? mCfg.rollerLabel : mCfg.ballLabel;
      affiliateBtn.setAttribute('aria-label', `${affiliateLabelEl.textContent}（広告・外部サイト）`);
    }

    function syncToolBtnsUI(activeToolId, muscleId = '') {
      const rule = getAllowedToolsAndDefault(muscleId);
      const allowedList = rule.allowedTools || rule.allowed || ['hand', 'ball', 'roller'];
      const allowedSet = new Set(allowedList);
      const norm = allowedSet.has(normalizeScTool(activeToolId))
        ? normalizeScTool(activeToolId)
        : rule.defaultTool;
      const onlyHand = rule.isDelicate || allowedList.length <= 1;
      delicateBadgeEl.hidden = !onlyHand;
      toolBtns.forEach((btn, tid) => {
        const canUse = !onlyHand && allowedSet.has(tid);
        btn.hidden = !canUse;
        const on = canUse && tid === norm;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      syncAffiliateUI(norm);
    }

    function emitSelfCareStep(st, idx = scStepIndex, extra = {}) {
      const currentStepMuscleId = st?.muscleId || sc.targetMuscles[0] || '';
      if (!currentStepMuscleId) return;
      const profile = resolveCareProfile(currentStepMuscleId, st?.tool || scActiveTool, st?.muscleName);
      scActiveTool = profile.tool;
      const activeMotion = extra.toolSwitchOnly
        ? profile.motion
        : st?.motion || profile.motion;
      activeTriggerPointId = currentStepMuscleId;
      inspectedPartId = currentStepMuscleId;
      syncPartTags();
      emit('trigger-point', {
        habitId: resolved.id,
        muscleId: currentStepMuscleId,
        id: currentStepMuscleId,
        index: idx,
        tool: scActiveTool,
        motion: activeMotion,
        handPose: profile.handPose,
        supportSurface: profile.supportSurface,
        strokeTarget: st?.strokeTarget || null,
        fromSelfCareModal: true,
      });
      emit('selfcare-step', {
        habitId: resolved.id,
        muscleId: currentStepMuscleId,
        id: currentStepMuscleId,
        index: idx,
        stepIndex: idx,
        tool: scActiveTool,
        motion: activeMotion,
        handPose: profile.handPose,
        supportSurface: profile.supportSurface,
        toolSwitchOnly: Boolean(extra.toolSwitchOnly),
        strokeTarget: st?.strokeTarget || null,
      });
    }

    const toolBarBtns = RELEASE_TOOLS.map((rt) => {
      const btn = h(
        'button',
        {
          class: 'sc-tool-btn',
          type: 'button',
          hidden: true,
          'data-sc-tool': rt.id,
          'aria-pressed': 'false',
          onclick: () => {
            const st = sc.steps[scStepIndex] || sc.steps[0];
            const profile = resolveCareProfile(st?.muscleId || '', rt.id, st?.muscleName || '');
            scActiveTool = profile.tool;
            if (st) {
              st.tool = scActiveTool;
              st.motion = profile.motion;
              st.userSwitchedTool = scActiveTool !== st.initialTool;
              st.toolBadge = TOOL_LABEL[scActiveTool];
              const badgeEl = stepCards[scStepIndex]?.querySelector('.sc-step-muscle-tag');
              if (badgeEl) badgeEl.textContent = TOOL_LABEL[scActiveTool];
              if (stepCards[scStepIndex]) stepCards[scStepIndex].dataset.tool = scActiveTool;
              syncGuideBannerUI(st);
            }
            syncToolBtnsUI(scActiveTool, st?.muscleId || '');
            measure();
            setVis(snaps.closed);
            emitSelfCareStep(st, scStepIndex, { toolSwitchOnly: true });
          },
        },
        h('span', { text: TOOL_LABEL[rt.id] || rt.label }),
      );
      toolBtns.set(rt.id, btn);
      return btn;
    });

    const timerReadoutEl = h('span', {
      class: 'sc-timer',
      hidden: true,
      text: `${formatMMSS(displayTotalSec)}`,
    });
    const seekRange = h('input', {
      class: 'sc-seek',
      type: 'range',
      hidden: true,
      min: '0',
      max: '1000',
      step: '1',
      value: '0',
      'aria-label': '3Dリリース指導の再生位置',
    });
    const playToggleBtn = h(
      'button',
      {
        class: 'sc-play-btn',
        type: 'button',
        hidden: true,
        'aria-label': '一時停止',
        'aria-pressed': 'true',
      },
      icon('pause'),
    );

    const toolAndControlRow = h(
      'div',
      { class: 'sc-video-stage' },
      h(
        'div',
        { class: 'sc-controls', hidden: true },
        playToggleBtn,
        seekRange,
        timerReadoutEl,
      ),
      h(
        'div',
        { class: 'sc-tool-bar', role: 'group', 'aria-label': 'セルフケアのやり方切り替え' },
        ...toolBarBtns,
        delicateBadgeEl,
      ),
    );

    function activateSelfCareStep(idx, { emitEvent = true, resetStepProgress = false } = {}) {
      const clampedIdx = clamp(idx, 0, stepCount - 1);
      scStepIndex = clampedIdx;
      if (resetStepProgress) {
        scProgressSec = clampedIdx * SC_STEP_DURATION;
      }
      const st = sc.steps[clampedIdx] || sc.steps[0];
      const profile = resolveCareProfile(st?.muscleId || '', st?.tool, st?.muscleName || '');
      scActiveTool = profile.tool;
      if (st) {
        st.tool = scActiveTool;
        st.motion = st.userSwitchedTool ? profile.motion : st.motion || profile.motion;
        st.toolBadge = TOOL_LABEL[scActiveTool];
        syncGuideBannerUI(st);
      }

      syncToolBtnsUI(scActiveTool, st?.muscleId || '');

      stepCards.forEach((card, i) => {
        const active = i === clampedIdx;
        card.classList.toggle('is-active', active);
        card.classList.toggle('is-done', i < clampedIdx);
        card.setAttribute('aria-pressed', String(active));
      });

      measure();
      setVis(snaps.closed);

      if (emitEvent && st?.muscleId) {
        emitSelfCareStep(st, clampedIdx);
      }
    }

    function syncScTimeUI() {
      const ratio = clamp(scProgressSec / totalCycleSec, 0, 1);
      seekRange.value = String(Math.round(ratio * 1000));
      seekRange.style.setProperty('--sc-p', ratio.toFixed(4));
      const remainSec = Math.max(0, Math.ceil((1 - ratio) * displayTotalSec));
      timerReadoutEl.textContent = `${formatMMSS(remainSec)}`;
    }

    // 3段目: [① 親指のふくらみ] [② 力こぶ] [③ 鎖骨の下] の3つのステップボタン
    const stepsWrap = h(
      'div',
      { class: 'sc-steps', role: 'group', 'aria-label': 'ねじれ元 ① ➔ ② ➔ ③ のほどき方ステップ' },
      ...sc.steps.map((st, idx) => {
        const normTool = normalizeScTool(st.tool);
        const baseName = String(st.muscleName || st.text || '')
          .replace(/[（(][^）)]*[）)]/gu, '')
          .trim();
        const stepLabelWithTool = baseName;
        const card = h(
          'button',
          {
            class: `sc-step-card${idx === 0 ? ' is-active' : ''}`,
            type: 'button',
            'data-sc-step': String(idx),
            'data-part': st.muscleId || null,
            'data-tool': normTool,
            'aria-pressed': String(idx === 0),
            onclick: () => {
              activateSelfCareStep(idx, { emitEvent: true, resetStepProgress: true });
              syncScTimeUI();
            },
          },
          h('span', { class: 'sc-step-num', text: st.num }),
          h(
            'span',
            { class: 'sc-step-body' },
            h('span', { class: 'sc-step-text', text: stepLabelWithTool }),
            h('span', { class: 'sc-step-muscle-tag sc-step-tool-badge', hidden: true, text: TOOL_LABEL[normTool] }),
          ),
        );
        stepCards.push(card);
        return card;
      }),
    );

    // HP掲載モード ('clinic') 用の上品で押しつけがましくない相談導線カード
    // ※クロスオリジン <iframe> 内で相対 '#contact' のまま target="_top" にすると親HPから離脱してしまうため防止する
    const isFramed = (() => {
      try {
        return typeof window !== 'undefined' && window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const isSameOriginTop = (() => {
      if (!isFramed) return true;
      try {
        return Boolean(window.top && window.top.location && window.top.location.origin === window.location.origin);
      } catch {
        return false;
      }
    })();
    const rawClinicUrl = String(mCfg.clinicCtaUrl || '').trim();
    const isExternalHttps = rawClinicUrl.startsWith('https://');
    const isHashUrl = rawClinicUrl.startsWith('#');
    const isCrossOriginRelativeHash = isFramed && !isSameOriginTop && isHashUrl;
    const hasValidHashTarget = (() => {
      if (!isHashUrl) return true;
      if (rawClinicUrl === '#' || isCrossOriginRelativeHash) return false;
      try {
        if (document.querySelector(rawClinicUrl)) return true;
        if (isFramed && isSameOriginTop && window.top?.document?.querySelector(rawClinicUrl)) {
          return true;
        }
      } catch {
        return false;
      }
      return false;
    })();
    const clinicCtaTarget = isExternalHttps ? '_blank' : isFramed && isSameOriginTop ? '_top' : null;
    const clinicCtaEl =
      mCfg.isClinic && rawClinicUrl && hasValidHashTarget && !isCrossOriginRelativeHash
        ? h(
            'a',
            {
              class: 'sc-pro-cta sc-clinic-cta',
              href: rawClinicUrl,
              target: clinicCtaTarget,
              rel: isExternalHttps ? 'noopener noreferrer' : null,
              'aria-label': mCfg.clinicCtaLabel,
            },
            h(
              'span',
              { class: 'sc-clinic-cta-body' },
              h('span', { class: 'sc-pro-cta-text sc-clinic-cta-title', text: mCfg.clinicCtaLabel }),
              mCfg.clinicCtaSub
                ? h('span', { class: 'sc-clinic-cta-sub', text: mCfg.clinicCtaSub })
                : null,
            ),
            h('span', { class: 'sc-clinic-cta-arrow', 'aria-hidden': 'true', text: '▸' }),
          )
        : null;

    const disclaimerEl = h('p', {
      class: 'sc-disclaimer',
      text: DISCLAIMER_TEXT,
    });

    // replaceChildren は null を "null" という文字として描画してしまうため除外する
    selfCareModal.replaceChildren(
      ...[modalHead, safetyBox, guideBanner, toolAndControlRow, stepsWrap, affiliateBtn, clinicCtaEl, disclaimerEl].filter(Boolean),
    );
    selfCareModal.hidden = false;
    measure();
    setVis(snaps.closed);

    const st0 = sc.steps[0];
    if (st0?.muscleId) {
      activeTriggerPointId = st0.muscleId;
      inspectedPartId = st0.muscleId;
      syncPartTags();
    }
    activateSelfCareStep(0, { emitEvent: emitInitialStep, resetStepProgress: true });
    syncScTimeUI();
  }

  /** 【A2】原因クセカード (.card--habit) スリム3段構成
   *  上段補助: 1タップ問診で複数候補がある場合のワンタップ切替ピル
   *  1段目: [← 戻る] ＋ 動作タイトル(15px bold) ＋ [💡 10秒実験]（ある場合のみ） ＋ [×]
   *  2段目: 因果要約 causalSummary ＋ [⚡ シート全体] ＋ 赤の濃淡（縮む筋肉）・青の濃淡（伸びる筋肉）ピル
   *  3段目: [ ▶ 3Dセルフケア指導（筋膜のほどき方を見る） ]
   */
  function buildHabitCard(hb) {
    const tlObj =
      hb.triggerLine ||
      hb.goldenLine ||
      resolveTriggerLine(hb.triggerLineId || hb.goldenLineId) ||
      null;

    const tpList = extractHabitTriggerPoints(hb);
    const tpIdSet = new Set(tpList.map((tp) => tp.id));
    const pulledText = resolvePulledLabel(hb, tlObj, tpIdSet);
    const causalSummaryText = resolveCausalSummary(hb, tlObj, tpList, pulledText);

    const spotNames = tpList
      .slice(0, 2)
      .map((tp) =>
        String(tp.easyLabel || tp.shortLabel || shortMuscleNameOf(tp.id) || tp.fullName || '')
          .replace(/^[①②③④⑤1-5１-５][.．、\s]*/u, '')
          .replace(/[（(][^）)]*[）)]/gu, '')
          .trim(),
      )
      .filter(Boolean);

    const scHowtoText = spotNames.length
      ? `ケアの目安：${spotNames.join('・')}を、呼吸を止めずにやさしくゆるめます。`
      : 'ケアの目安：縮んでいる中心の筋膜を、呼吸を止めずにやさしくゆるめます。';

    const causalSummaryEl = causalSummaryText
      ? h('p', { class: 'habit-causal-summary', text: causalSummaryText })
      : null;

    // スライダー行は画面上から撤廃して3D画面を広く確保（外部 setProgress API は内部安全維持）
    timeUI = null;

    const selfCareHowtoEl = h('p', {
      class: 'habit-selfcare-howto',
      text: scHowtoText,
    });

    const selfCareCtaBtn = h(
      'button',
      {
        class: 'selfcare-cta-btn',
        type: 'button',
        onclick: (e) => {
          e.stopPropagation();
          openSelfCareWithAdGate(hb);
        },
      },
      h('span', { class: 'sc-cta-label', text: '▶ 3Dでセルフケアの動きを見る' }),
    );

    const bottomRow = h(
      'div',
      { class: 'habit-selfcare-box habit-bottom-row habit-selfcare-cta' },
      selfCareHowtoEl,
      selfCareCtaBtn,
    );

    const hbLabel = cleanTitle(hb.label);

    return h(
      'article',
      { class: 'card card--habit', 'aria-label': hbLabel },
      h(
        'header',
        { class: 'card-head habit-zukan-head' },
        cardBackButton('← 戻る'),
        h(
          'div',
          { class: 'card-titles' },
          h('h2', { class: 'card-title' }, h('span', { text: hbLabel })),
        ),
        closeButton(),
      ),
      causalSummaryEl,
      bottomRow,
    );
  }

  /** 説明カード */
  function buildStoryCard(s) {
    const steps = s.steps || [];
    const text = h('p', { class: 'story-text', 'aria-live': 'polite' });
    const linePill = h('span', { class: 'line-pill is-main story-line', hidden: true });
    const stepCounter = h('span', { class: 'step-counter', text: `1 / ${steps.length || 1}` });
    const metaRow = h('div', { class: 'story-meta' }, linePill, stepCounter);
    const partTags = h('div', { class: 'part-tags' });
    const prev = iconButton({ ic: 'prev', label: '前へ', cls: 'step-nav', onTap: () => goStep(state.step - 1) });
    const next = iconButton({ ic: 'next', label: '次へ', cls: 'step-nav', onTap: () => goStep(state.step + 1) });
    const dots = steps.map((st, i) =>
      h(
        'button',
        {
          class: 'step-dot',
          type: 'button',
          'aria-label': `${i + 1}番目`,
          style: { '--c': resolveLine(st.line)?.color },
          onclick: () => goStep(i),
        },
        h('span', { 'aria-hidden': 'true' }),
      ),
    );
    const stTitle = cleanTitle(s.title);
    storyUI = { text, linePill, stepCounter, partTags, prev, next, dots, steps };
    return h(
      'article',
      { class: 'card card--story', 'aria-label': stTitle },
      h(
        'header',
        { class: 'card-head' },
        cardBackButton('← 戻る'),
        h('span', { class: 'card-icon card-ico card-icon--story', 'aria-hidden': 'true' }, getStoryIcon(s.id)),
        h('div', { class: 'card-titles' }, h('h2', { class: 'card-title' }, h('span', { text: stTitle }))),
        closeButton(),
      ),
      metaRow,
      text,
      partTags,
      h('div', { class: 'step-bar' }, prev, h('div', { class: 'step-dots' }, ...dots), next),
    );
  }

  /* ---------- 階層ステップ表示の一元同期 & カードの出し入れ ---------- */
  function syncStepHierarchy() {
    sheet.classList.toggle('is-home', state.atHome);
    finderHome.classList.toggle('is-step-hidden', !state.atHome);
    finderHome.hidden = !state.atHome;

    TABS.forEach((t, i) => {
      const onTab = !state.atHome && t.id === state.tab;
      if (tabBtns[t.id]) tabBtns[t.id].setAttribute('aria-selected', String(onTab));
      panels[t.id].hidden = !onTab;
      panels[t.id].classList.toggle('is-step-hidden', !onTab);
      if (onTab) tablist.style.setProperty('--ti', String(i));
    });

    const hasHabitCard = Boolean(slots.habit.firstChild);
    occStepCat.classList.toggle('is-step-hidden', hasHabitCard || state.habitStep !== 'cat');
    occStep1.classList.toggle('is-step-hidden', hasHabitCard || state.habitStep !== 'occ');
    occStep2.classList.toggle('is-step-hidden', hasHabitCard || state.habitStep !== 'list');

    const hasFeelCard = Boolean(slots.feel.firstChild);
    feelStepRegion.classList.toggle('is-step-hidden', hasFeelCard || state.feelStep !== 'region');
    feelStepList.classList.toggle('is-step-hidden', hasFeelCard || state.feelStep !== 'list');
    feelStepResult.classList.toggle('is-step-hidden', hasFeelCard || state.feelStep !== 'result');

    const hasLineCard = Boolean(slots.line.firstChild);
    lineStepList.classList.toggle('is-step-hidden', hasLineCard);

    const hasStoryCard = Boolean(slots.story.firstChild);
    storyStepList.classList.toggle('is-step-hidden', hasStoryCard);
  }

  function clearCards() {
    stopPlay();
    stopTween();
    closeSelfCareModal({ restoreSheet: false });
    hideToast();
    lineCard?.remove();
    habitCard?.remove();
    storyCard?.remove();
    lineCard = habitCard = storyCard = null;
    if (timeUI) playButtons.delete(timeUI.playBtn);
    timeUI = null;
    storyUI = null;
  }

  function closeCard() {
    clearCards();
    hideToast();
    state.active = null;
    state.progress = DEFAULT_HABIT_PROGRESS;
    syncPressed();
    updateHasCard();
    renderPresent();
  }

  function updateHasCard() {
    const hasAny = Boolean(state.active);
    sheet.classList.toggle('has-active-card', hasAny);
    for (const t of TABS) panels[t.id].classList.toggle('has-card', !!slots[t.id].firstChild);
    lineChips.classList.toggle('is-compact', !!slots.line.firstChild);
    syncStepHierarchy();
    measure();
    if (state.sheet === 'half') {
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(snaps.half);
    }
  }

  function syncPressed() {
    const a = state.active;
    lineChipById.forEach((b, id) =>
      b.setAttribute('aria-pressed', String(a?.type === 'line' && id === a.id)),
    );
    root.querySelectorAll('[data-habit]').forEach((b) =>
      b.setAttribute('aria-pressed', String(a?.type === 'habit' && b.dataset.habit === a.id)),
    );
    root.querySelectorAll('[data-posture-habit]').forEach((b) =>
      b.setAttribute('aria-pressed', String(a?.type === 'habit' && b.dataset.postureHabit === a.id)),
    );
    root.querySelectorAll('[data-dict-habit]').forEach((b) =>
      b.setAttribute('aria-pressed', String(a?.type === 'habit' && b.dataset.dictHabit === a.id)),
    );
    storyItemById.forEach((b, id) =>
      b.setAttribute('aria-pressed', String(a?.type === 'story' && id === a.id)),
    );
    feelBtns.forEach((b, label) => b.setAttribute('aria-pressed', String(state.feeling === label)));
  }

  function ensureSheetOpen() {
    if (state.sheet !== 'half') {
      snapTo('half');
    } else {
      measure();
      setBodyHeight(snaps.half);
      setVis(snaps.half);
      updateRail(vis);
    }
  }

  function scrollBodyTop() {
    body.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  }

  function centerLineChip(id) {
    const chip = lineChipById.get(id);
    if (!chip) return;
    lineChips.scrollTo({
      left: chip.offsetLeft - (lineChips.clientWidth - chip.offsetWidth) / 2,
      behavior: reduced() ? 'auto' : 'smooth',
    });
  }

  /* ---------- ライン ---------- */
  function selectLine(l) {
    if (state.active?.type === 'line' && state.active.id === l.id) {
      returnFromCard();
      return;
    }
    emit('line', l.id);
    showLine(l);
  }

  function showLine(line) {
    const l = resolveLine(line);
    if (!l) return;
    hideToast();
    state.atHome = false;
    state.cardReturnContext = 'line-list';
    const lineIdx = lineIndexById.has(l.id) ? lineIndexById.get(l.id) : 0;
    if (!extraLinesOpen && isExtraLine(l, lineIdx)) {
      setExtraLinesOpen(true);
    }
    if (state.active?.type === 'line' && state.active.id === l.id && lineCard) {
      selectTab('line');
      ensureSheetOpen();
      return;
    }
    clearCards();
    state.active = { type: 'line', id: l.id };
    lineCard = buildLineCard(l);
    slots.line.append(lineCard);
    selectTab('line', { skipUpdateCard: true });
    animateLayerSwitch(lineCard);
    syncPressed();
    updateHasCard();
    ensureSheetOpen();
    renderPresent();
    scrollBodyTop();
    requestAnimationFrame(() => centerLineChip(l.id));
  }

  /* ---------- 職業・動作（クセ） ---------- */
  function selectHabit(hbOrId, { keepFeelingContext = false, returnContext = null } = {}) {
    const hb = resolveHabit(hbOrId);
    if (!hb) return;
    if (returnContext) {
      state.cardReturnContext = returnContext;
    } else if (!state.cardReturnContext) {
      state.cardReturnContext = keepFeelingContext ? 'feel-list' : 'habit-list';
    }
    if (!keepFeelingContext) {
      state.feelingContext = null;
      state.fromHomeIntake = false;
      state.feeling = null;
      state.tab = 'habit';
    }
    if (state.active?.type === 'habit' && state.active.id === hb.id) {
      returnFromCard();
      return;
    }
    emit('habit', hb.id);
    showHabit(hb);
  }

  function showHabit(habit) {
    const hb = resolveHabit(habit);
    if (!hb) return;
    hideToast();
    const wasAtHome = state.atHome;
    state.atHome = false;
    const tab = state.tab === 'feel' ? 'feel' : 'habit';

    if (tab === 'habit') {
      if (state.habitDirectMode === 'posture' && postureDirectGroupEl) {
        postureDirectGroupEl.classList.remove('is-step-hidden');
        postureDirectGroupEl.classList.add('is-open', 'is-selected');
        step2BackTextEl.textContent = '← 戻る';
        step2TitleEl.textContent = '日常の姿勢・クセ';
      } else if (state.habitDirectMode === 'housework') {
        const hwOcc =
          occByLabel.get('家事・育児') ||
          normalizedOccupations.find((o) => o.macro === 'daily') ||
          normalizedOccupations[0];
        if (hwOcc) selectOccupation(hwOcc.label, { enterList: false });
        step2BackTextEl.textContent = '← 戻る';
        step2TitleEl.textContent = '家事・育児の動き';
      } else {
        const occLabel = resolveHabitOccupation(hb);
        if (occLabel) {
          const occMeta = occByLabel.get(occLabel);
          if (occMeta && (wasAtHome || state.macroFilter !== occMeta.macro)) {
            if (occMeta.macro === 'work' || occMeta.macro === 'sports') {
              setMacroFilter(occMeta.macro);
              occStep1TitleEl.textContent =
                occMeta.macro === 'sports'
                  ? 'どのスポーツ・運動に近いですか？'
                  : 'どの仕事・作業に近いですか？';
            }
          }
          selectOccupation(occLabel);
        }
      }
      state.habitStep = 'list';
      if (!state.cardReturnContext) state.cardReturnContext = 'habit-list';
    }

    if (state.active?.type === 'habit' && state.active.id === hb.id && habitCard) {
      selectTab(tab);
      ensureSheetOpen();
      return;
    }
    clearCards();
    state.active = { type: 'habit', id: hb.id };
    habitCard = buildHabitCard(hb);
    selectTab(tab, { skipUpdateCard: true });
    animateLayerSwitch(habitCard);
    syncPressed();
    updateHasCard();
    ensureSheetOpen();
    setProgress(DEFAULT_HABIT_PROGRESS, { silent: true });
    queueMicrotask(() => {
      if (state.active?.type === 'habit' && state.active.id === hb.id) {
        emit('progress', state.progress);
      }
    });
    renderPresent();
    scrollBodyTop();
  }

  /* ---------- 時間スライダー / 再生 ---------- */
  let tweenRaf = 0;
  function stopTween() {
    if (tweenRaf) cancelAnimationFrame(tweenRaf);
    tweenRaf = 0;
  }
  function tweenProgress(to, { duration, linear = false, onDone } = {}) {
    stopTween();
    const from = state.progress;
    const dist = Math.abs(to - from);
    if (dist < 0.001 || (!linear && reduced())) {
      setProgress(to);
      onDone?.();
      return;
    }
    const dur = duration ?? 450 + 1300 * dist;
    const t0 = performance.now();
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      const e = linear ? k : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setProgress(from + (to - from) * e);
      if (k < 1) tweenRaf = requestAnimationFrame(step);
      else {
        tweenRaf = 0;
        onDone?.();
      }
    };
    tweenRaf = requestAnimationFrame(step);
  }

  function togglePlay() {
    if (state.playing) stopPlay();
    else startPlay();
  }
  function startPlay() {
    if (state.active?.type !== 'habit') return;
    if (state.progress >= 0.999) setProgress(0);
    state.playing = true;
    updatePlayButtons();
    emit('play', true);
    tweenProgress(1, { duration: (1 - state.progress) * PLAY_MS, linear: true, onDone: () => stopPlay() });
  }
  function stopPlay() {
    if (!state.playing) return;
    state.playing = false;
    stopTween();
    updatePlayButtons();
    emit('play', false);
  }
  function updatePlayButtons() {
    playButtons.forEach((b) => {
      b.replaceChildren(icon(state.playing ? 'pause' : 'play'));
      b.setAttribute('aria-label', state.playing ? '一時停止' : '再生');
      b.setAttribute('aria-pressed', String(state.playing));
    });
  }

  function renderProgress(p) {
    let now = -1;
    STAGES.forEach((s, i) => {
      if (p >= s.at) now = i;
    });
    const durTxt = durationText(p);
    const stageLabel = twistStageText(p);
    const stageKey = p < 0.08 ? 'relax' : p < 0.42 ? 'mild' : p < 0.76 ? 'mid' : 'lock';
    if (timeUI) {
      const { range, readout, stageEls, tickEls } = timeUI;
      range.value = String(Math.round(p * 1000));
      range.style.setProperty('--p', p.toFixed(4));
      range.setAttribute('aria-valuetext', `${stageLabel}（${durTxt}）`);
      readout.textContent = stageLabel;
      readout.dataset.stage = stageKey;
      stageEls.forEach((el, i) => {
        el.classList.toggle('is-on', i <= now);
        el.classList.toggle('is-now', i === now);
      });
      let near = 0;
      TICKS.forEach((t, i) => {
        if (Math.abs(t.value - p) < Math.abs(TICKS[near].value - p)) near = i;
      });
      tickEls.forEach((el, i) => el.classList.toggle('is-near', i === near));
    }
    pbStage.textContent = stageLabel;
    pbReadout.textContent = durTxt;
    pbFill.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  function setProgress(p, { silent = false } = {}) {
    state.progress = clamp(Number(p) || 0, 0, 1);
    renderProgress(state.progress);
    if (!silent) emit('progress', state.progress);
  }

  /* ---------- 説明（ストーリー） ---------- */
  function selectStory(s) {
    if (state.active?.type === 'story' && state.active.id === s.id) {
      closeCard();
      emit('close');
      return;
    }
    emit('story', s.id);
    showStory(s, 0);
    emit('step', state.step);
  }

  function showStory(story, index) {
    const s = resolveStory(story);
    if (!s) return;
    hideToast();
    state.atHome = false;
    const last = Math.max(0, (s.steps || []).length - 1);
    if (state.active?.type === 'story' && state.active.id === s.id && storyCard) {
      selectTab('story');
      ensureSheetOpen();
      if (index != null) renderStep(clamp(index, 0, last));
      return;
    }
    clearCards();
    state.active = { type: 'story', id: s.id };
    storyCard = buildStoryCard(s);
    slots.story.append(storyCard);
    selectTab('story', { skipUpdateCard: true });
    syncPressed();
    updateHasCard();
    ensureSheetOpen();
    renderStep(clamp(index ?? 0, 0, last));
    renderPresent();
    scrollBodyTop();
  }

  function goStep(i) {
    if (!storyUI) return;
    const n = clamp(i, 0, storyUI.steps.length - 1);
    if (n === state.step) return;
    hideToast();
    renderStep(n);
    emit('step', n);
  }

  function renderStep(i) {
    state.step = i;
    if (!storyUI) return;
    const { text, linePill, stepCounter, partTags, prev, next, dots, steps } = storyUI;
    const st = steps[i] || {};
    if (stepCounter) stepCounter.textContent = `${i + 1} / ${steps.length}`;
    if (st.view) setViewUI(st.view);
    text.textContent = st.text || '';
    text.classList.remove('is-in');
    void text.offsetWidth;
    text.classList.add('is-in');
    const l = resolveLine(st.line);
    if (l) {
      linePill.hidden = false;
      linePill.style.setProperty('--c', l.color);
      linePill.replaceChildren(h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { text: l.tag || l.name }));
    } else linePill.hidden = true;
    if (partTags) {
      const tags = renderPartTagElements(st.shorten, st.lengthen, st.yore, { maxShort: 2, maxLong: 2, maxYore: 1, maxTotal: 4 });
      partTags.replaceChildren(...tags);
      partTags.hidden = tags.length === 0;
    }
    prev.disabled = i <= 0;
    next.disabled = i >= steps.length - 1;
    dots.forEach((d, k) => {
      d.classList.toggle('is-now', k === i);
      d.classList.toggle('is-past', k < i);
      if (k === i) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    pbText.textContent = st.text || '';
    pbPrev.disabled = prev.disabled;
    pbNext.disabled = next.disabled;
    pbDots.replaceChildren(...steps.map((_, k) => h('span', { class: k === i ? 'is-now' : k < i ? 'is-past' : '' })));
  }

  /* ======================================================================== */
  /* 見せるモード                                                              */
  /* ======================================================================== */
  const pbPrev = iconButton({ ic: 'prev', label: '前へ', cls: 'pb-nav', onTap: () => goStep(state.step - 1) });
  const pbNext = iconButton({ ic: 'next', label: '次へ', cls: 'pb-nav', onTap: () => goStep(state.step + 1) });
  const pbText = h('p', { class: 'pb-text', 'aria-live': 'polite' });
  const pbDots = h('div', { class: 'pb-dots', 'aria-hidden': 'true' });
  const pbStory = h('div', { class: 'pb-story' }, pbPrev, h('div', { class: 'pb-mid' }, pbText, pbDots), pbNext);
  const pbPlay = makePlayButton('play-btn--bar');
  const pbStage = h('span', { class: 'pb-stage' });
  const pbReadout = h('span', { class: 'pb-readout' });
  const pbFill = h('span', { class: 'pb-fill' });
  const pbHabit = h(
    'div',
    { class: 'pb-habit' },
    pbPlay,
    h('div', { class: 'pb-hmid' }, h('div', { class: 'pb-hrow' }, pbStage, pbReadout), h('span', { class: 'pb-track', 'aria-hidden': 'true' }, pbFill)),
  );
  const presentBar = h('div', { class: 'present-bar', hidden: true }, pbStory, pbHabit);

  function renderPresent() {
    const t = state.present ? state.active?.type : null;
    presentBar.hidden = !(t === 'story' || t === 'habit');
    pbStory.hidden = t !== 'story';
    pbHabit.hidden = t !== 'habit';
  }

  function setPresent(onoff) {
    state.present = !!onoff;
    root.classList.toggle('is-present', state.present);
    presentBtn.setAttribute('aria-pressed', String(state.present));
    presentBtn.setAttribute('aria-label', state.present ? 'メニューを戻す' : '見せるモード');
    presentBtn.replaceChildren(icon(state.present ? 'restore' : 'present'));
    closeFly();
    hideTip();
    renderPresent();
    emit('present', state.present);
  }

  /* ======================================================================== */
  /* タブ切替                                                                   */
  /* ======================================================================== */
  function selectTab(id, { skipUpdateCard = false } = {}) {
    if (!panels[id]) return;
    const changed = state.tab !== id || state.atHome;
    state.atHome = false;
    state.tab = id;
    if (habitCard && (id === 'habit' || id === 'feel') && habitCard.parentNode !== slots[id]) {
      slots[id].append(habitCard);
    }
    syncStepHierarchy();
    if (!skipUpdateCard) updateHasCard();
    if (changed) body.scrollTop = 0;
  }

  tablist.addEventListener('keydown', (e) => {
    const i = TABS.findIndex((t) => t.id === state.tab);
    const n = TABS.length;
    let k = null;
    if (e.key === 'ArrowRight') k = (i + 1) % n;
    else if (e.key === 'ArrowLeft') k = (i + n - 1) % n;
    else if (e.key === 'Home') k = 0;
    else if (e.key === 'End') k = n - 1;
    if (k == null) return;
    e.preventDefault();
    e.stopPropagation();
    openFinderCategory(TABS[k].id);
    tabBtns[TABS[k].id]?.focus();
    if (state.sheet === 'closed') snapTo('half');
  });

  /* ======================================================================== */
  /* ローディング                                                               */
  /* ======================================================================== */
  const loadFill = h('span', { class: 'loading-fill' });
  const loadStops = [0, 1, 2, 3, 4].map((i) =>
    h('span', {
      class: 'loading-stop',
      style: { '--i': i, '--c': lines.length ? lines[(i * 2) % lines.length].color : null },
    }),
  );
  const loadText = h('p', { class: 'loading-text', text: '準備しています…' });
  const loading = h(
    'div',
    {
      class: 'loading',
      role: 'progressbar',
      'aria-label': '読み込み中',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0',
    },
    h(
      'div',
      { class: 'loading-inner' },
      h('p', { class: 'loading-title', text: '筋膜ライン 3D' }),
      h('div', { class: 'loading-route', 'aria-hidden': 'true' }, loadFill, ...loadStops),
      loadText,
    ),
  );
  let loadingTimer = 0;

  /* ======================================================================== */
  /* 初回3D操作ヒント（「🔄 指で回せます」を2秒間だけ表示して自動フェードアウト） */
  /* ======================================================================== */
  const orbitHint = h(
    'div',
    {
      class: 'orbit-hint',
      'aria-hidden': 'true',
      hidden: true,
    },
    icon('orbit', 'orbit-hint-ico'),
    h('span', { class: 'orbit-hint-text', text: '指で回せます' }),
  );
  let orbitHintShown = false;
  let orbitHintTimer = 0;
  let orbitHintHideTimer = 0;

  function dismissOrbitHint() {
    clearTimeout(orbitHintTimer);
    orbitHintTimer = 0;
    window.removeEventListener('pointerdown', dismissOrbitHint, true);
    window.removeEventListener('wheel', dismissOrbitHint, true);
    if (orbitHint.hidden || orbitHint.classList.contains('is-hiding')) return;
    orbitHint.classList.remove('is-visible');
    orbitHint.classList.add('is-hiding');
    clearTimeout(orbitHintHideTimer);
    orbitHintHideTimer = setTimeout(() => {
      orbitHint.hidden = true;
      orbitHint.classList.remove('is-hiding');
    }, reduced() ? 0 : 320);
  }

  function triggerOrbitHintOnce() {
    if (orbitHintShown) return;
    orbitHintShown = true;
    orbitHint.hidden = false;
    orbitHint.classList.remove('is-hiding');
    void orbitHint.offsetWidth;
    orbitHint.classList.add('is-visible');
    window.addEventListener('pointerdown', dismissOrbitHint, { capture: true, passive: true });
    window.addEventListener('wheel', dismissOrbitHint, { capture: true, passive: true });
    clearTimeout(orbitHintTimer);
    orbitHintTimer = setTimeout(() => {
      dismissOrbitHint();
    }, 2000);
  }

  function setLoading(pct, text) {
    let p = Number(pct);
    if (!Number.isFinite(p)) p = 0;
    if (p > 0 && p < 1) p *= 100;
    p = clamp(p, 0, 100);
    clearTimeout(loadingTimer);
    loading.hidden = false;
    loading.classList.remove('is-done');
    loadFill.style.transform = `scaleX(${(p / 100).toFixed(3)})`;
    loadStops.forEach((s, i) => s.classList.toggle('is-lit', p >= i * 25));
    loading.setAttribute('aria-valuenow', String(Math.round(p)));
    if (text != null && text !== '') loadText.textContent = String(text);
  }

  function hideLoading() {
    clearTimeout(loadingTimer);
    loading.classList.add('is-done');
    loadingTimer = setTimeout(() => {
      loading.hidden = true;
    }, reduced() ? 0 : 600);
    measure();
    snapTo(state.sheet, { instant: true });
    triggerOrbitHintOnce();
  }

  /* ======================================================================== */
  /* 固定ボトムパネル制御（上下スライド廃止・3Dアニメーションとの干渉防止）       */
  /* ======================================================================== */
  const safeBottomProbe = h('div', { class: 'safe-probe safe-probe--b', 'aria-hidden': 'true' });
  const safeTopProbe = h('div', { class: 'safe-probe safe-probe--t', 'aria-hidden': 'true' });
  const snaps = { closed: 0, half: 260, full: 260 };
  let vis = 0;

  function measure() {
    body.style.height = 'auto';
    const scH = !selfCareModal.hidden ? selfCareModal.offsetHeight + 14 : 0;
    const sheetH = sheet.offsetHeight || 240;
    snaps.closed = scH;
    snaps.half = Math.round(sheetH);
    snaps.full = Math.round(sheetH);
  }

  function setVis(v) {
    const isClosed = state.sheet === 'closed';
    const scH = !selfCareModal.hidden ? selfCareModal.offsetHeight + 14 : 0;
    const toastH = !toast.hidden ? (toast.offsetHeight || 180) + 14 : 0;
    const baseVis = isClosed ? scH : (sheet.offsetHeight || v || snaps.half);
    const effectiveVis = mqWide.matches ? 0 : toastH > 0 ? toastH : baseVis;
    vis = effectiveVis;
    sheet.style.transform = isClosed ? 'translate3d(0, 108%, 0)' : 'translate3d(0, 0, 0)';
    sheet.style.pointerEvents = isClosed || toastH > 0 ? 'none' : 'auto';
    root.style.setProperty('--sheet-vis', `${Math.round(effectiveVis)}px`);
  }

  const setBodyHeight = () => {
    body.style.height = 'auto';
  };

  function snapTo(name = 'half') {
    const targetName = name === 'closed' ? 'closed' : 'half';
    state.sheet = targetName;
    sheet.dataset.state = targetName;
    grip.setAttribute('aria-label', GRIP_LABEL[targetName] || GRIP_LABEL.half);
    grip.setAttribute('aria-expanded', String(targetName !== 'closed'));
    measure();
    const target = snaps[targetName];
    setBodyHeight(target);
    setVis(target);
    updateRail(vis);
  }

  /** UIパネル上のタッチ・ホイール・ポインター操作が3Dキャンバスに干渉しないよう完全分離（パネル内スクロールは維持） */
  function isolatePanelEvents(el) {
    if (!el) return;
    const stopOnly = (e) => {
      e.stopPropagation();
    };
    el.addEventListener('pointerdown', stopOnly, { passive: true });
    el.addEventListener('pointermove', stopOnly, { passive: true });
    el.addEventListener('pointerup', stopOnly, { passive: true });
    el.addEventListener('touchstart', stopOnly, { passive: true });
    el.addEventListener('touchmove', stopOnly, { passive: true });
    el.addEventListener('touchend', stopOnly, { passive: true });
    el.addEventListener('wheel', stopOnly, { passive: true });
  }

  [sheet, selfCareModal, topbar, rail, toast, helpModal, adGateModal, presentBar].forEach(
    isolatePanelEvents,
  );

  function updateRail(v = vis) {
    if (mqWide.matches) {
      rail.classList.remove('is-tucked');
      return;
    }
    const top = (safeTopProbe.getBoundingClientRect().height || 0) + 52;
    const room = root.clientHeight - v - top;
    const tucked = room < rail.offsetHeight + 8;
    rail.classList.toggle('is-tucked', tucked);
    if (tucked) closeFly();
  }

  /* ======================================================================== */
  /* 全体のキー操作・外側タップ                                                   */
  /* ======================================================================== */
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!viewFly.hidden && !rail.contains(e.target)) closeFly();
    },
    true,
  );
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape') {
      if (!viewFly.hidden) {
        closeFly();
        viewBtn.focus();
      } else if (!helpModal.hidden) {
        closeHelpModal();
      } else if (!selfCareModal.hidden) {
        closeSelfCareModal({ restoreSheet: true });
      } else if (!toast.hidden) {
        hideToast();
      } else if (state.present) setPresent(false);
      else if (state.active) {
        returnFromCard();
      } else if (!state.atHome) {
        if (state.tab === 'feel' && state.feelStep === 'list') {
          backToFeelRegions();
        } else if (state.tab === 'habit' && state.habitStep === 'list') {
          if (state.habitDirectMode === 'posture' || state.habitDirectMode === 'housework') {
            backToHabitCategories();
          } else {
            clearOccupationSelection();
            state.habitStep = 'occ';
            syncStepHierarchy();
            animateLayerSwitch(occStep1);
            measure();
            scrollBodyTop();
          }
        } else if (state.tab === 'habit' && state.habitStep === 'occ') {
          backToHabitCategories();
        } else {
          goHome();
        }
      } else if (homeSearchOpen || state.dictQuery || state.dictBodyPill) {
        goHome({ clearSearch: true });
      }
      return;
    }
    if (!typing && !t?.closest?.('[role="tablist"]')) {
      if (state.active?.type === 'story') {
        if (e.key === 'ArrowRight') goStep(state.step + 1);
        else if (e.key === 'ArrowLeft') goStep(state.step - 1);
      } else if (state.active?.type === 'habit' && habits.length > 1) {
        const idx = habitIndexById.has(state.active.id) ? habitIndexById.get(state.active.id) : -1;
        if (idx >= 0) {
          if (e.key === 'ArrowRight') selectHabit(habits[(idx + 1) % habits.length]);
          else if (e.key === 'ArrowLeft') selectHabit(habits[(idx - 1 + habits.length) % habits.length]);
        }
      }
    }
  });

  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      measure();
      snapTo(state.sheet, { instant: true });
    });
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  mqWide.addEventListener?.('change', onResize);

  /* ======================================================================== */
  /* 組み立て                                                                   */
  /* ======================================================================== */
  root.append(topbar, toast, rail, orbitHint, sheet, selfCareModal, adGateModal, helpModal, presentBar, tip, safeBottomProbe, safeTopProbe, loading);
  syncStepHierarchy();
  setProgress(0, { silent: true });
  measure();
  snapTo('half', { instant: true });
  queueMicrotask(() => {
    emit('style', state.style);
  });

  return {
    on,
    showLine,
    showHabit,
    showStory,
    showPart,
    showPeelStatus,
    setFasciaLayerMode,
    openSelfCareModal,
    closeSelfCareModal,
    closeCard,
    resetHome: () => {
      closeHelpModal();
      if (!selfCareModal.hidden) closeSelfCareModal({ silent: true });
      goHome({ clearSearch: true });
      ensureSheetOpen();
    },
    // 筋肉タップ時にボトムシートが勝手に閉じないよう no-op として維持
    tuckSheet: () => {},
    setProgress: (p) => setProgress(p, { silent: true }),
    setStep: (i) => {
      if (storyUI) renderStep(clamp(Number(i) || 0, 0, storyUI.steps.length - 1));
    },
    setViewBadge,
    setLoading,
    hideLoading,
  };
}
