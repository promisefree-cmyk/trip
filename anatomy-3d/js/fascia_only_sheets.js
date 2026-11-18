// =============================================================================
// fascia_only_sheets.js — 筋肉メッシュ非表示・全11アナトミートレイン連続3D筋膜シート＆コラーゲン線維シェーダー
//
// 特徴:
// 1. `muscles.glb` はシーンに一切追加せず、オフスクリーンで体幹・下肢・上肢の体表外周コンター
//    （Cylindrical Body & Arm Surface Envelopes）を抽出するためだけに参照し、直後に破棄する。
// 2. 全11アナトミートレイン筋膜ライン
//    - 基本5ライン: LL（ラテラル）, SBL（バック）, SFL（フロント）, SPL（スパイラル）, DFL（ディープ・フロント）
//    - アーム4ライン: DFAL（深前アーム）, SFAL（表前アーム）, DBAL（深後アーム）, SBAL（表後アーム）
//    - 機能2ライン: BFL（バック・ファンクショナル）, FFL（フロント・ファンクショナル）
//    をすべて「筋肉の塊ゼロ・骨のピン留め部をつなぐ連続した半透明コラーゲン膜シート」として生成する。
// 3. 毎フレーム実空間3D経路長 L と基準長 L0（＋生理学的腱膜テンション結合）からひずみ ε を算出し、
//    GLSLシェーダーで「真珠シルク光沢の半透明膜」「伸張時の青い縦走ファイバー」「短縮時の赤い3D横じわ」を描画する。
// =============================================================================

import * as THREE from 'three';
import {
  BONE,
  BONY_STATIONS,
  GLSL_BONE_UNIFORMS,
  skinWorldPoint,
  createBoneMatrixArray,
  computeMotionParams,
  solveRigMatrices,
} from './fascia_only_biomechanics.js?v=20261118b';

const SEG_COUNT = 32;

// 新候補10アニメーション用：最初(0%)姿勢の22ボーン行列キャッシュ（0%で歪みゼロ基準を作る）
const HABIT_ZERO_MATS_CACHE = new Map();
function getHabitZeroBoneMats(presetId) {
  let mats = HABIT_ZERO_MATS_CACHE.get(presetId);
  if (!mats) {
    mats = createBoneMatrixArray();
    const mp0 = computeMotionParams({ presetId, manualScrub: 0, phase01: 0, intensity: 1.0 });
    solveRigMatrices(mp0, mats);
    HABIT_ZERO_MATS_CACHE.set(presetId, mats);
  }
  return mats;
}

/**
 * 新候補10アニメーションにおける「原因（赤：縮む < 0）」と「症状（青：張る > 0）」の解剖学的テンション定義
 */
function getHabitSpanTargetStrain(presetId, sheetId, spanId, t) {
  if (t <= 1e-5) return 0;
  switch (presetId) {
    case 'drive-1010-wheel': {
      // 10時10分ハンドル保持：鎖骨下〜力こぶ〜親指・前腕内側が縮み(赤)、肩上〜肩甲骨間が張る(青)
      if (sheetId.startsWith('dfal-')) return -0.155 * t;
      if (sheetId.startsWith('sfal-')) return -0.135 * t;
      if (sheetId.startsWith('dbal-')) return (spanId === 'dbal-rhomboid' ? +0.16 : +0.085) * t;
      if (sheetId.startsWith('sbal-')) return (spanId === 'sbal-deltoid' ? +0.155 : +0.115) * t;
      return null;
    }
    case 'bus-car-sway-neck': {
      // バス・車の揺れ踏ん張り：首奥・あご・みぞおち・片側脇腹が固まり(赤)、首うしろ・肩上・反対体側が張る(青)
      if (sheetId.startsWith('dfl-neck-jaw-') || sheetId === 'dfl-diaphragm') return -0.155 * t;
      if ((sheetId === 'll-main-r' && (spanId === 'oblique' || spanId === 'intercostal')) || sheetId === 'dfl-ql-r' || sheetId === 'll-neck-scm-r') {
        return -0.145 * t;
      }
      if (sheetId.startsWith('sbl-') && (spanId === 'sbl-upperback' || spanId === 'sbl-scalp' || spanId === 'sbl-lumbar')) {
        return +0.15 * t;
      }
      if (sheetId.startsWith('sbal-')) return (spanId === 'sbal-deltoid' ? +0.15 : +0.07) * t;
      if ((sheetId === 'll-main-l' && (spanId === 'oblique' || spanId === 'intercostal' || spanId === 'tfl-itb')) || sheetId === 'll-neck-spl-l' || sheetId === 'll-neck-spl-r') {
        return +0.135 * t;
      }
      return null;
    }
    case 'sofa-deep-slouch': {
      // ソファー沈み込み：お腹前・みぞおち・股関節奥が潰れて縮み(赤)、丸まった腰〜背中〜首うしろが張る(青)
      if (sheetId.startsWith('sfl-') && (spanId === 'sfl-abs' || spanId === 'sfl-chest-neck')) return -0.155 * t;
      if (sheetId === 'dfl-diaphragm' || (sheetId.startsWith('dfl-adductor-psoas-') && spanId === 'iliopsoas') || sheetId.startsWith('dfl-neck-jaw-')) {
        return -0.15 * t;
      }
      if (sheetId.startsWith('sbl-') && (spanId === 'sbl-lumbar' || spanId === 'sbl-upperback' || spanId === 'sbl-scalp')) {
        return +0.155 * t;
      }
      return null;
    }
    case 'sleep-banzai-arms': {
      // バンザイ寝：反り上がる腰が縮み(赤)、引き伸ばされる鎖骨下・胸・わきの下〜腕が張る(青)
      if (sheetId.startsWith('sbl-') && spanId === 'sbl-lumbar') return -0.155 * t;
      if (sheetId.startsWith('sbl-') && spanId === 'sbl-upperback') return -0.09 * t;
      if (sheetId.startsWith('dfal-')) return +0.145 * t;
      if (sheetId.startsWith('sfal-')) return +0.135 * t;
      if (sheetId.startsWith('bfl-')) return +0.155 * t;
      return null;
    }
    case 'chin-rest-desk': {
      // 片手頬杖：右のあご・鎖骨下〜腕内側・右首脇腹が縮み(赤)、左の首肩・脇腹と背中の斜めラインが張る(青)
      if (sheetId === 'dfal-r' || sheetId === 'dfl-neck-jaw-r') return -0.16 * t;
      if (sheetId === 'll-neck-scm-r' || sheetId === 'll-neck-spl-r' || (sheetId === 'll-main-r' && (spanId === 'oblique' || spanId === 'intercostal')) || sheetId === 'dfl-ql-r') {
        return -0.14 * t;
      }
      if (sheetId === 'll-neck-scm-l' || sheetId === 'll-neck-spl-l' || (sheetId === 'll-main-l' && (spanId === 'oblique' || spanId === 'intercostal' || spanId === 'tfl-itb'))) {
        return +0.15 * t;
      }
      if (sheetId.startsWith('spl-') && (spanId === 'spl-sling' || spanId === 'spl-upper')) return +0.135 * t;
      return null;
    }
    case 'shampoo-dentist-arch': {
      // シャンプー台・歯医者：縮んで伸びない股関節奥・前もも・みぞおちが原因(赤)、反り上げられて苦しい腰・首うしろが症状(青)
      if ((sheetId.startsWith('dfl-adductor-psoas-') && spanId === 'iliopsoas') || sheetId === 'dfl-diaphragm') {
        return -0.16 * t;
      }
      if (sheetId.startsWith('sfl-') && (spanId === 'sfl-quad' || spanId === 'sfl-chest-neck')) return -0.14 * t;
      if (sheetId.startsWith('sbl-') && (spanId === 'sbl-lumbar' || spanId === 'sbl-upperback' || spanId === 'sbl-scalp')) {
        return +0.16 * t;
      }
      if (sheetId.startsWith('sfl-') && spanId === 'sfl-abs') return +0.11 * t;
      return null;
    }
    case 'floor-agura-asymmetry': {
      // 床のあぐら：ひざが浮く右の内もも・股関節奥・右脇腹が縮み(赤)、丸まる腰〜背中とお尻外側が張る(青)
      if (sheetId === 'dfl-adductor-psoas-r' || sheetId === 'dfl-ql-r') return -0.16 * t;
      if (sheetId === 'll-main-r' && spanId === 'oblique') return -0.135 * t;
      if (sheetId.startsWith('sbl-') && (spanId === 'sbl-lumbar' || spanId === 'sbl-upperback')) return +0.155 * t;
      if ((sheetId.startsWith('ll-main-') && spanId === 'tfl-itb') || (sheetId.startsWith('spl-') && spanId === 'spl-sling')) {
        return +0.14 * t;
      }
      return null;
    }
    case 'kitchen-sink-lean': {
      // キッチン洗い物：浮かせた両腕〜胸前とお腹奥が縮み(赤)、上体を吊り支える背面全体が張る(青)
      if (sheetId.startsWith('dfal-') || sheetId.startsWith('sfal-')) return -0.15 * t;
      if (sheetId === 'dfl-diaphragm' || (sheetId.startsWith('dfl-adductor-psoas-') && spanId === 'iliopsoas')) return -0.135 * t;
      if (sheetId.startsWith('sbl-')) return +0.15 * t;
      return null;
    }
    case 'morning-sock-reach': {
      // 朝の靴下履き：脚の付け根奥・内もも・軸足脇腹が縮み(赤)、お尻横〜外ももと丸まった腰が強く張る(青)
      if (sheetId === 'dfl-adductor-psoas-r' || (sheetId === 'll-main-l' && spanId === 'oblique') || sheetId === 'dfl-ql-l') {
        return -0.16 * t;
      }
      if ((sheetId === 'll-main-r' && spanId === 'tfl-itb') || (sheetId.startsWith('sbl-') && (spanId === 'sbl-lumbar' || spanId === 'sbl-upperback' || spanId === 'sbl-calf'))) {
        return +0.16 * t;
      }
      return null;
    }
    case 'stairs-down-knee': {
      // 階段下り：硬いふくらはぎ・すね内側奥・股関節前が縮み(赤)、ブレーキがかかる太もも前〜ひざ上と外ももが張る(青)
      if ((sheetId === 'sbl-r' && (spanId === 'sbl-calf' || spanId === 'sbl-plantar')) || sheetId === 'dfl-tibpost-r' || (sheetId === 'dfl-adductor-psoas-r' && spanId === 'iliopsoas')) {
        return -0.16 * t;
      }
      if ((sheetId === 'sfl-r' && (spanId === 'sfl-quad' || spanId === 'sfl-shin')) || (sheetId === 'll-main-r' && spanId === 'tfl-itb')) {
        return +0.165 * t;
      }
      return null;
    }
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// 全11アナトミートレイン連続筋膜シートのメタ情報（JLS準拠・やさしい日本語）
// -----------------------------------------------------------------------------
export const FASCIA_LINE_DEFS = [
  {
    id: 'LL',
    name: 'ラテラル・ライン（体側・腸脛靱帯）',
    shortName: 'ラテラル（体側）',
    group: '体幹・脚の基本5ライン',
    subtitle: '足底あぶみ〜腓骨筋膜〜腸脛靱帯・大腿筋膜張筋膜〜脇腹〜ろっ骨〜首のX字帯',
    defaultOn: true,
    baseOpacity: 1.0,
    accentHex: '#0284C7',
  },
  {
    id: 'DFL',
    name: 'ディープ・フロント（体の芯・内もも〜横隔膜〜あご）',
    shortName: 'ディープ・フロント',
    group: '体幹・脚の基本5ライン',
    subtitle: '土踏まず奥〜内転筋膜〜腸腰筋膜・腰方形筋膜〜横隔膜ドーム〜首の奥・あご',
    defaultOn: true,
    baseOpacity: 0.84,
    accentHex: '#0D9488',
  },
  {
    id: 'SBL',
    name: 'バック・ライン（足裏〜もも裏〜背中〜おでこ）',
    shortName: 'バック（背面）',
    group: '体幹・脚の基本5ライン',
    subtitle: '足底腱膜〜アキレス腱〜もも裏〜胸腰筋膜〜背骨わき〜頭頂の帽状腱膜〜眉上',
    defaultOn: true,
    baseOpacity: 0.92,
    accentHex: '#0369A1',
  },
  {
    id: 'SFL',
    name: 'フロント・ライン（すね前〜前もも〜お腹〜首前）',
    shortName: 'フロント（前面）',
    group: '体幹・脚の基本5ライン',
    subtitle: '前脛骨筋膜〜大腿四頭筋膜〜腹直筋鞘・白線〜胸骨筋膜〜胸鎖乳突筋膜',
    defaultOn: true,
    baseOpacity: 0.92,
    accentHex: '#0891B2',
  },
  {
    id: 'SPL',
    name: 'スパイラル・ライン（全身を巻くらせんの帯）',
    shortName: 'スパイラル（らせん）',
    group: '体幹・脚の基本5ライン',
    subtitle: '後頭骨〜反対の肩甲骨・わき下〜おへそ斜め交差〜骨盤前〜腸脛靱帯〜足裏',
    defaultOn: true,
    baseOpacity: 0.92,
    accentHex: '#2563EB',
  },
  {
    id: 'DFAL',
    name: '深前アーム・ライン（鎖骨下・小胸筋膜〜力こぶ〜親指）',
    shortName: '深前アーム（親指）',
    group: '肩・腕・手のアーム4ライン',
    subtitle: 'ろっ骨前〜小胸筋膜（烏口突起）〜力こぶの膜〜前腕の親指側〜母指球',
    defaultOn: true,
    baseOpacity: 0.95,
    accentHex: '#0EA5E9',
  },
  {
    id: 'SFAL',
    name: '表前アーム・ライン（大胸筋膜〜肘内側〜手のひら）',
    shortName: '表前アーム（手のひら）',
    group: '肩・腕・手のアーム4ライン',
    subtitle: '鎖骨・胸骨（大胸筋膜）〜腕の内側〜肘の内側〜手首を曲げる膜〜手のひら',
    defaultOn: true,
    baseOpacity: 0.90,
    accentHex: '#06B6D4',
  },
  {
    id: 'DBAL',
    name: '深後アーム・ライン（肩甲骨のあいだ〜二の腕裏〜小指）',
    shortName: '深後アーム（肩甲骨内）',
    group: '肩・腕・手のアーム4ライン',
    subtitle: '背骨〜菱形筋膜（肩甲骨の内側）〜肩の深層膜〜二の腕うしろ〜尺骨〜小指側',
    defaultOn: true,
    baseOpacity: 0.94,
    accentHex: '#3B82F6',
  },
  {
    id: 'SBAL',
    name: '表後アーム・ライン（肩上〜三角筋膜〜肘外側〜手首甲）',
    shortName: '表後アーム（肘外・手甲）',
    group: '肩・腕・手のアーム4ライン',
    subtitle: '後頭骨・背骨（僧帽筋膜）〜肩峰・三角筋膜〜肘の外側〜手首の甲〜指の背',
    defaultOn: true,
    baseOpacity: 0.90,
    accentHex: '#6366F1',
  },
  {
    id: 'BFL',
    name: 'バック機能ライン（わき下・広背筋膜〜反対のお尻横）',
    shortName: 'バック機能（背面対角）',
    group: '対角スイング機能2ライン',
    subtitle: '腕の付け根〜広背筋膜〜腰のひし形膜を斜めに横断〜反対側の大殿筋・外もも',
    defaultOn: true,
    baseOpacity: 0.92,
    accentHex: '#1D4ED8',
  },
  {
    id: 'FFL',
    name: 'フロント機能ライン（胸の下部〜恥骨〜反対の内もも）',
    shortName: 'フロント機能（前面対角）',
    group: '対角スイング機能2ライン',
    subtitle: '腕の付け根〜大胸筋下部〜腹直筋鞘・恥骨を斜めに横断〜反対側の内もも膜',
    defaultOn: true,
    baseOpacity: 0.92,
    accentHex: '#14B8A6',
  },
];

// -----------------------------------------------------------------------------
// 1. オフスクリーン体表エンベロープ構築（脚・体幹・腕の3系統シリンドリカル曲面）
// -----------------------------------------------------------------------------
const ARM_MUSCLE_SET = new Set([
  'deltoid',
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'teres-major',
  'subscapularis',
  'biceps-brachii',
  'brachialis',
  'coracobrachialis',
  'triceps-brachii',
  'anconeus',
  'brachioradialis',
  'pronator-teres',
  'flexor-carpi-radialis',
  'palmaris-longus',
  'flexor-carpi-ulnaris',
  'flexor-digitorum-superficialis',
  'flexor-digitorum-profundus',
  'flexor-pollicis-longus',
  'pronator-quadratus',
  'supinator',
  'extensor-carpi-radialis-longus',
  'extensor-carpi-radialis-brevis',
  'extensor-digitorum',
  'extensor-digiti-minimi',
  'extensor-carpi-ulnaris',
  'abductor-pollicis-longus',
  'extensor-pollicis-brevis',
  'extensor-pollicis-longus',
  'extensor-indicis',
  'abductor-pollicis-brevis',
  'flexor-pollicis-brevis',
  'opponens-pollicis',
  'adductor-pollicis',
  'abductor-digiti-minimi-hand',
  'flexor-digiti-minimi-brevis-hand',
  'opponens-digiti-minimi-hand',
  'lumbricals-hand',
  'palmar-interossei',
  'dorsal-interossei-hand',
]);

function isArmBoneId(id = '') {
  return /(humerus|radius|ulna|carpal|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|thumb|finger|hand)/.test(
    id,
  );
}

function smoothstep(e0, e1, x) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 脚の断面中心 (cx, cz) */
function getLegAxisCenter(isRight, y) {
  const s = isRight ? -1 : +1;
  let ax = 0.30;
  let cz = -0.03;
  if (y < -3.02) {
    const t = THREE.MathUtils.clamp((y - -3.28) / (-3.02 - -3.28), 0, 1);
    ax = THREE.MathUtils.lerp(0.35, 0.32, t);
    cz = THREE.MathUtils.lerp(0.01, -0.09, t);
  } else if (y < -1.64) {
    const t = THREE.MathUtils.clamp((y - -3.02) / (-1.64 - -3.02), 0, 1);
    ax = THREE.MathUtils.lerp(0.32, 0.295, t);
    cz = THREE.MathUtils.lerp(-0.09, -0.025, t);
  } else {
    const t = THREE.MathUtils.clamp((y - -1.64) / (0.10 - -1.64), 0, 1);
    ax = THREE.MathUtils.lerp(0.295, 0.275, t);
    cz = THREE.MathUtils.lerp(-0.025, -0.045, t);
  }
  return { cx: s * ax, cz };
}

/** 体幹・骨盤・頭頸部の断面中心 (0, cz) */
function getTorsoAxisCenter(y) {
  let cz = -0.04;
  if (y < 0.55) {
    cz = -0.045;
  } else if (y < 2.05) {
    cz = -0.035;
  } else if (y < 2.50) {
    cz = -0.055;
  } else {
    cz = -0.045;
  }
  return { cx: 0, cz };
}

/** 上肢（肩〜上腕〜肘〜前腕〜手首〜手掌）の中立断面中心 (cx, cz) */
function getArmAxisCenter(isRight, y) {
  const s = isRight ? -1 : +1;
  let ax = 0.72;
  let cz = -0.08;
  if (y >= 2.02) {
    ax = 0.72;
    cz = -0.08;
  } else if (y >= 0.925) {
    const t = (y - 0.925) / (2.02 - 0.925);
    ax = THREE.MathUtils.lerp(0.865, 0.72, t);
    cz = THREE.MathUtils.lerp(-0.128, -0.08, t);
  } else if (y >= 0.016) {
    const t = (y - 0.016) / (0.925 - 0.016);
    ax = THREE.MathUtils.lerp(1.012, 0.865, t);
    cz = THREE.MathUtils.lerp(+0.068, -0.128, t);
  } else {
    const t = THREE.MathUtils.clamp((y - -0.36) / (0.016 - -0.36), 0, 1);
    ax = THREE.MathUtils.lerp(1.045, 1.012, t);
    cz = THREE.MathUtils.lerp(+0.085, +0.068, t);
  }
  return { cx: s * ax, cz };
}

function fallbackLegRadius(y, theta) {
  if (y < -3.05) return 0.11;
  if (y < -2.65) return 0.085;
  if (y < -1.75) return 0.125 + 0.02 * Math.sin(theta);
  if (y < -1.45) return 0.135;
  const tThigh = THREE.MathUtils.clamp((y - -1.45) / (-0.05 - -1.45), 0, 1);
  return THREE.MathUtils.lerp(0.155, 0.255, tThigh);
}

function fallbackTorsoRadius(y, theta) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  if (y < 0.62) {
    const rx = 0.49;
    const rz = 0.25;
    return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
  }
  if (y < 2.08) {
    const waistDip = Math.exp(-Math.pow((y - 0.88) / 0.28, 2));
    const rx = 0.51 - 0.075 * waistDip - 0.07 * smoothstep(1.75, 2.08, y);
    const rz = 0.25 - 0.025 * waistDip - 0.04 * smoothstep(1.80, 2.08, y);
    return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
  }
  if (y < 2.52) {
    const rx = 0.185;
    const rz = 0.175;
    return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
  }
  const rx = 0.22;
  const rz = 0.27;
  return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
}

function fallbackArmRadius(y, theta) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  if (y < 0.02) {
    // 手首〜手掌・手背（前後方向に薄い楕円）
    const rx = 0.052;
    const rz = 0.036;
    return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
  }
  if (y < 0.92) {
    // 前腕（手首 0.046 -> 肘下 0.082）
    const t = (y - 0.02) / 0.90;
    return THREE.MathUtils.lerp(0.046, 0.084, t);
  }
  // 上腕〜三角筋（肘 0.082 -> 肩 0.118）
  const t = THREE.MathUtils.clamp((y - 0.92) / 1.12, 0, 1);
  return THREE.MathUtils.lerp(0.082, 0.118, t);
}

function finalizeCylindricalGrid(rawGrid, ny, nth, yMin, yMax, fallbackFn) {
  const filled = new Float32Array(rawGrid.length);
  for (let iy = 0; iy < ny; iy++) {
    const y = yMin + ((iy + 0.5) / ny) * (yMax - yMin);
    for (let it = 0; it < nth; it++) {
      const th = -Math.PI + ((it + 0.5) / nth) * Math.PI * 2;
      const v = rawGrid[iy * nth + it];
      if (v > 0.01) {
        filled[iy * nth + it] = v;
        continue;
      }
      let best = 0;
      let wSum = 0;
      for (let dy = -3; dy <= 3; dy++) {
        const jy = THREE.MathUtils.clamp(iy + dy, 0, ny - 1);
        for (let dt = -4; dt <= 4; dt++) {
          const jt = ((it + dt) % nth + nth) % nth;
          const nv = rawGrid[jy * nth + jt];
          if (nv > 0.01) {
            const w = 1 / (1 + dy * dy + dt * dt);
            best += nv * w;
            wSum += w;
          }
        }
      }
      const fb = fallbackFn(y, th);
      filled[iy * nth + it] = wSum > 0 ? Math.max(fb * 0.85, best / wSum) : fb;
    }
  }

  let cur = filled;
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(cur.length);
    for (let iy = 0; iy < ny; iy++) {
      const iy0 = Math.max(0, iy - 1);
      const iy2 = Math.min(ny - 1, iy + 1);
      for (let it = 0; it < nth; it++) {
        const it0 = (it - 1 + nth) % nth;
        const it2 = (it + 1) % nth;
        const c = cur[iy * nth + it];
        const avg =
          cur[iy * nth + it] * 0.36 +
          (cur[iy * nth + it0] + cur[iy * nth + it2]) * 0.16 +
          (cur[iy0 * nth + it] + cur[iy2 * nth + it]) * 0.12 +
          (cur[iy0 * nth + it0] + cur[iy0 * nth + it2] + cur[iy2 * nth + it0] + cur[iy2 * nth + it2]) * 0.02;
        next[iy * nth + it] = pass === 0 ? Math.max(avg, c * 0.985) : avg;
      }
    }
    cur = next;
  }
  return cur;
}

function sampleCylGrid(grid, ny, nth, yMin, yMax, y, theta) {
  const fy = THREE.MathUtils.clamp(((y - yMin) / (yMax - yMin)) * ny - 0.5, 0, ny - 1.0001);
  const iy0 = Math.floor(fy);
  const iy1 = Math.min(ny - 1, iy0 + 1);
  const ty = fy - iy0;

  let normTh = (theta + Math.PI) / (Math.PI * 2);
  normTh = normTh - Math.floor(normTh);
  const ft = normTh * nth - 0.5;
  const it0 = ((Math.floor(ft) % nth) + nth) % nth;
  const it1 = (it0 + 1) % nth;
  const tt = ft - Math.floor(ft);

  const r00 = grid[iy0 * nth + it0];
  const r10 = grid[iy0 * nth + it1];
  const r01 = grid[iy1 * nth + it0];
  const r11 = grid[iy1 * nth + it1];

  const r0 = r00 + (r10 - r00) * tt;
  const r1 = r01 + (r11 - r01) * tt;
  return r0 + (r1 - r0) * ty;
}

export function buildBodyEnvelope(muscleRoot, skeletonRoot) {
  const LEG_NY = 96;
  const LEG_NTH = 72;
  const LEG_YMIN = -3.29;
  const LEG_YMAX = +0.18;

  const TOR_NY = 116;
  const TOR_NTH = 72;
  const TOR_YMIN = -0.28;
  const TOR_YMAX = +3.12;

  const ARM_NY = 84;
  const ARM_NTH = 60;
  const ARM_YMIN = -0.36;
  const ARM_YMAX = +2.14;

  const rawLegR = new Float32Array(LEG_NY * LEG_NTH);
  const rawLegL = new Float32Array(LEG_NY * LEG_NTH);
  const rawTorso = new Float32Array(TOR_NY * TOR_NTH);
  const rawArmR = new Float32Array(ARM_NY * ARM_NTH);
  const rawArmL = new Float32Array(ARM_NY * ARM_NTH);

  const tmpV = new THREE.Vector3();

  const feedGroup = (rootObj, kind) => {
    if (!rootObj) return;
    rootObj.updateMatrixWorld(true);
    rootObj.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
      const id = obj.userData?.structureId || obj.name || '';
      const isArmItem =
        (kind === 'muscle' && ARM_MUSCLE_SET.has(id)) ||
        (kind === 'bone' && isArmBoneId(id));

      const isAxillarySpanMuscle =
        id === 'latissimus-dorsi' || id === 'pectoralis-major' || id === 'pectoralis-minor';
      const isScapulaOrClavicle = id.includes('scapula') || id.includes('clavicle');

      const pos = obj.geometry.attributes.position;
      const step = pos.count > 8000 ? 2 : 1;
      for (let i = 0; i < pos.count; i += step) {
        tmpV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
        const wx = tmpV.x;
        const wy = tmpV.y;
        const wz = tmpV.z;

        // 0) 上肢エンベロープへの登録（上肢専用メッシュ＋肩峰外端）
        if ((isArmItem || (isScapulaOrClavicle && Math.abs(wx) > 0.60)) && wy >= ARM_YMIN && wy <= ARM_YMAX) {
          const iy = Math.min(ARM_NY - 1, Math.max(0, Math.floor(((wy - ARM_YMIN) / (ARM_YMAX - ARM_YMIN)) * ARM_NY)));
          if (wx < -0.52) {
            const { cx, cz } = getArmAxisCenter(true, wy);
            const dx = wx - cx;
            const dz = wz - cz;
            const r = Math.hypot(dx, dz);
            if (r < 0.21) {
              const th = Math.atan2(dz, dx);
              const it = Math.min(ARM_NTH - 1, Math.max(0, Math.floor(((th + Math.PI) / (Math.PI * 2)) * ARM_NTH)));
              const idx = iy * ARM_NTH + it;
              if (r > rawArmR[idx]) rawArmR[idx] = r;
            }
          } else if (wx > +0.52) {
            const { cx, cz } = getArmAxisCenter(false, wy);
            const dx = wx - cx;
            const dz = wz - cz;
            const r = Math.hypot(dx, dz);
            if (r < 0.21) {
              const th = Math.atan2(dz, dx);
              const it = Math.min(ARM_NTH - 1, Math.max(0, Math.floor(((th + Math.PI) / (Math.PI * 2)) * ARM_NTH)));
              const idx = iy * ARM_NTH + it;
              if (r > rawArmL[idx]) rawArmL[idx] = r;
            }
          }
        }

        if (isArmItem) continue;

        // 1) 下肢エンベロープへの登録
        if (wy >= LEG_YMIN && wy <= LEG_YMAX) {
          const iy = Math.min(LEG_NY - 1, Math.max(0, Math.floor(((wy - LEG_YMIN) / (LEG_YMAX - LEG_YMIN)) * LEG_NY)));
          if (wx < -0.015 && wx > -0.68) {
            const { cx, cz } = getLegAxisCenter(true, wy);
            const dx = wx - cx;
            const dz = wz - cz;
            const r = Math.hypot(dx, dz);
            if (r < 0.42) {
              const th = Math.atan2(dz, dx);
              const it = Math.min(LEG_NTH - 1, Math.max(0, Math.floor(((th + Math.PI) / (Math.PI * 2)) * LEG_NTH)));
              const idx = iy * LEG_NTH + it;
              if (r > rawLegR[idx]) rawLegR[idx] = r;
            }
          } else if (wx > +0.015 && wx < +0.68) {
            const { cx, cz } = getLegAxisCenter(false, wy);
            const dx = wx - cx;
            const dz = wz - cz;
            const r = Math.hypot(dx, dz);
            if (r < 0.42) {
              const th = Math.atan2(dz, dx);
              const it = Math.min(LEG_NTH - 1, Math.max(0, Math.floor(((th + Math.PI) / (Math.PI * 2)) * LEG_NTH)));
              const idx = iy * LEG_NTH + it;
              if (r > rawLegL[idx]) rawLegL[idx] = r;
            }
          }
        }

        // 2) 体幹・骨盤・頭頸部エンベロープへの登録
        if (wy >= TOR_YMIN && wy <= TOR_YMAX) {
          if (isAxillarySpanMuscle && wy > 1.32 && Math.abs(wx) > 0.545) continue;
          if (isScapulaOrClavicle && Math.abs(wx) > 0.56) continue;
          if (Math.abs(wx) > 0.63) continue;

          const iy = Math.min(TOR_NY - 1, Math.max(0, Math.floor(((wy - TOR_YMIN) / (TOR_YMAX - TOR_YMIN)) * TOR_NY)));
          const { cx, cz } = getTorsoAxisCenter(wy);
          const dx = wx - cx;
          const dz = wz - cz;
          const r = Math.hypot(dx, dz);
          const th = Math.atan2(dz, dx);
          const it = Math.min(TOR_NTH - 1, Math.max(0, Math.floor(((th + Math.PI) / (Math.PI * 2)) * TOR_NTH)));
          const idx = iy * TOR_NTH + it;
          if (r > rawTorso[idx]) rawTorso[idx] = r;
        }
      }
    });
  };

  feedGroup(muscleRoot, 'muscle');
  feedGroup(skeletonRoot, 'bone');

  const legR = finalizeCylindricalGrid(rawLegR, LEG_NY, LEG_NTH, LEG_YMIN, LEG_YMAX, fallbackLegRadius);
  const legL = finalizeCylindricalGrid(rawLegL, LEG_NY, LEG_NTH, LEG_YMIN, LEG_YMAX, fallbackLegRadius);
  const torso = finalizeCylindricalGrid(rawTorso, TOR_NY, TOR_NTH, TOR_YMIN, TOR_YMAX, fallbackTorsoRadius);
  const armR = finalizeCylindricalGrid(rawArmR, ARM_NY, ARM_NTH, ARM_YMIN, ARM_YMAX, fallbackArmRadius);
  const armL = finalizeCylindricalGrid(rawArmL, ARM_NY, ARM_NTH, ARM_YMIN, ARM_YMAX, fallbackArmRadius);

  return {
    sampleLeg(isRight, y, theta, offset = 0.0055, out = new THREE.Vector3()) {
      const grid = isRight ? legR : legL;
      const { cx, cz } = getLegAxisCenter(isRight, y);
      const r = sampleCylGrid(grid, LEG_NY, LEG_NTH, LEG_YMIN, LEG_YMAX, y, theta) + offset;
      return out.set(cx + r * Math.cos(theta), y, cz + r * Math.sin(theta));
    },

    sampleTorso(y, theta, offset = 0.006, out = new THREE.Vector3()) {
      const { cx, cz } = getTorsoAxisCenter(y);
      const r = sampleCylGrid(torso, TOR_NY, TOR_NTH, TOR_YMIN, TOR_YMAX, y, theta) + offset;
      return out.set(cx + r * Math.cos(theta), y, cz + r * Math.sin(theta));
    },

    sampleArm(isRight, y, theta, offset = 0.0055, out = new THREE.Vector3()) {
      const grid = isRight ? armR : armL;
      const { cx, cz } = getArmAxisCenter(isRight, y);
      const r = sampleCylGrid(grid, ARM_NY, ARM_NTH, ARM_YMIN, ARM_YMAX, y, theta) + offset;
      return out.set(cx + r * Math.cos(theta), y, cz + r * Math.sin(theta));
    },

    sampleContinuum(side, y, thetaLeg, thetaTorso, offset = 0.006, out = new THREE.Vector3()) {
      const isRight = side === 'R';
      if (y <= -0.14) {
        return this.sampleLeg(isRight, y, thetaLeg, offset, out);
      }
      if (y >= +0.18) {
        return this.sampleTorso(y, thetaTorso, offset, out);
      }
      const t = smoothstep(-0.14, +0.18, y);
      const pLeg = this.sampleLeg(isRight, y, thetaLeg, offset, new THREE.Vector3());
      const pTor = this.sampleTorso(y, thetaTorso, offset, new THREE.Vector3());
      out.lerpVectors(pLeg, pTor, t);
      if (isRight) {
        out.x = Math.min(out.x, THREE.MathUtils.lerp(pLeg.x, pTor.x, t) - 0.002);
      } else {
        out.x = Math.max(out.x, THREE.MathUtils.lerp(pLeg.x, pTor.x, t) + 0.002);
      }
      return out;
    },
  };
}

// -----------------------------------------------------------------------------
// 2. スキニング重みヘルパー（体幹・下肢・上肢の解剖学的連続4ボーンブレンド）
// -----------------------------------------------------------------------------
function makeWeights(entries) {
  const filtered = entries
    .filter((e) => e[1] > 1e-4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  let sum = 0;
  for (const e of filtered) sum += e[1];
  if (sum <= 1e-6) return { idx: [BONE.PELVIS, 0, 0, 0], w: [1, 0, 0, 0] };
  const idx = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  for (let i = 0; i < filtered.length; i++) {
    idx[i] = filtered[i][0];
    w[i] = filtered[i][1] / sum;
  }
  return { idx, w };
}

function getBodyChainSkin(side, y, region = 'auto') {
  const isRight = side === 'R';
  const B_FOOT = isRight ? BONE.FOOT_R : BONE.FOOT_L;
  const B_SHANK = isRight ? BONE.SHANK_R : BONE.SHANK_L;
  const B_FEMUR = isRight ? BONE.FEMUR_R : BONE.FEMUR_L;

  if (region === 'foot') {
    return makeWeights([[B_FOOT, 1]]);
  }

  if (y < -2.94) {
    const t = smoothstep(-3.14, -2.94, y);
    return makeWeights([
      [B_FOOT, 1 - t],
      [B_SHANK, t],
    ]);
  }
  if (y < -1.65) {
    return makeWeights([[B_SHANK, 1]]);
  }
  if (y < -1.48) {
    const t = smoothstep(-1.65, -1.48, y);
    return makeWeights([
      [B_SHANK, 1 - t],
      [B_FEMUR, t],
    ]);
  }
  if (y < -0.03) {
    return makeWeights([[B_FEMUR, 1]]);
  }
  if (y < +0.46) {
    const t = smoothstep(-0.03, +0.34, y);
    return makeWeights([
      [B_FEMUR, 1 - t],
      [BONE.PELVIS, t],
    ]);
  }
  if (y < +0.58) {
    return makeWeights([[BONE.PELVIS, 1]]);
  }
  if (y < +0.86) {
    const t = smoothstep(+0.58, +0.86, y);
    return makeWeights([
      [BONE.PELVIS, 1 - t],
      [BONE.LUMBAR, t],
    ]);
  }
  if (y < +1.16) {
    const t = smoothstep(+0.86, +1.16, y);
    return makeWeights([
      [BONE.LUMBAR, 1 - t],
      [BONE.THORAX_LOW, t],
    ]);
  }
  if (y < +1.68) {
    const t = smoothstep(+1.22, +1.66, y);
    return makeWeights([
      [BONE.THORAX_LOW, 1 - t],
      [BONE.THORAX_HIGH, t],
    ]);
  }
  if (y < +2.14) {
    return makeWeights([[BONE.THORAX_HIGH, 1]]);
  }
  if (y < +2.40) {
    const t = smoothstep(+2.14, +2.40, y);
    return makeWeights([
      [BONE.THORAX_HIGH, 1 - t],
      [BONE.NECK, t],
    ]);
  }
  if (y < +2.65) {
    const t = smoothstep(+2.40, +2.65, y);
    return makeWeights([
      [BONE.NECK, 1 - t],
      [BONE.HEAD, t],
    ]);
  }
  return makeWeights([[BONE.HEAD, 1]]);
}

/**
 * 上肢の筋膜シート用ボーン重み（橈骨側 radialWeight ∈ [0..1] に応じて ULNA と RADIUS を解剖学的配分）
 */
function getArmChainSkin(isRight, y, radialWeight = 0.5) {
  const B_GIRDLE = isRight ? BONE.GIRDLE_R : BONE.GIRDLE_L;
  const B_HUM = isRight ? BONE.HUMERUS_R : BONE.HUMERUS_L;
  const B_ULNA = isRight ? BONE.ULNA_R : BONE.ULNA_L;
  const B_RAD = isRight ? BONE.RADIUS_R : BONE.RADIUS_L;
  const B_HAND = isRight ? BONE.HAND_R : BONE.HAND_L;

  // 解剖学的に肘窩付近は尺骨ヒンジを主軸とし、遠位（手首側）へ向かうにつれて橈骨の回内回転へ滑らかに連続移行させる
  const distalFactor = 1 - smoothstep(0.22, 0.86, y);
  const effRadW = radialWeight * (0.12 + 0.88 * distalFactor);

  if (y >= 1.98) {
    const t = smoothstep(1.98, 2.08, y);
    return makeWeights([
      [B_HUM, 1 - t],
      [B_GIRDLE, t],
    ]);
  }
  if (y >= 0.98) {
    return makeWeights([[B_HUM, 1]]);
  }
  if (y >= 0.80) {
    // 肘関節移行帯（急激なねじれを防ぎ滑らかにヒンジ追従）
    const t = 1 - smoothstep(0.80, 0.98, y);
    return makeWeights([
      [B_HUM, 1 - t],
      [B_RAD, t * effRadW],
      [B_ULNA, t * (1 - effRadW)],
    ]);
  }
  if (y >= 0.06) {
    // 前腕部：肘から手首へ向けて橈骨（親指側）と尺骨（小指側）のクロス回旋を連続配分
    return makeWeights([
      [B_RAD, effRadW],
      [B_ULNA, 1 - effRadW],
    ]);
  }
  if (y >= -0.04) {
    // 手首移行帯
    const t = 1 - smoothstep(-0.04, 0.06, y);
    return makeWeights([
      [B_RAD, (1 - t) * effRadW],
      [B_ULNA, (1 - t) * (1 - effRadW)],
      [B_HAND, t],
    ]);
  }
  return makeWeights([[B_HAND, 1]]);
}

// -----------------------------------------------------------------------------
// 3. GLSL コラーゲン線維＆リアルタイム物理ストレッチ・短縮しわシェーダー（承認デザイン完全維持）
// -----------------------------------------------------------------------------
const FASCIA_SHEET_VERTEX = /* glsl */ `
  ${GLSL_BONE_UNIFORMS}

  attribute vec4 aBoneIdx;
  attribute vec4 aBoneW;
  attribute vec4 aFasciaMeta;

  uniform float uSegStrain[${SEG_COUNT}];
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying float vStrain;
  varying vec4 vMeta;

  float sampleStrainProfile(float v) {
    float fv = clamp(v, 0.0, 1.0) * float(${SEG_COUNT - 1});
    int i0 = int(floor(fv));
    int i1 = min(${SEG_COUNT - 1}, i0 + 1);
    float t = fv - float(i0);
    return mix(uSegStrain[i0], uSegStrain[i1], t);
  }

  void main() {
    vUv = uv;
    vMeta = aFasciaMeta;

    float strain = sampleStrainProfile(uv.y);
    vStrain = strain;

    mat4 skinMat = getBlendedBoneMatrix(aBoneIdx, aBoneW);
    vec4 wp = skinMat * vec4(position, 1.0);
    vec3 wn = normalize(mat3(skinMat) * normal);

    // 1) 短縮時: 3D横方向アコーディオンじわ（凹凸波）
    float shortAmt = clamp((-strain - 0.012) / 0.14, 0.0, 1.35);
    if (shortAmt > 0.001) {
      float edgeGuard = sin(clamp(uv.x, 0.0, 1.0) * 3.14159265);
      float endGuard = smoothstep(0.0, 0.06, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));
      float wavePhase = uv.y * 135.0 + sin(uv.x * 9.42) * 0.85;
      float wrinkleDisp = sin(wavePhase) * 0.0038 * shortAmt * (0.35 + 0.65 * edgeGuard) * endGuard;
      wp.xyz += wn * wrinkleDisp;
      wn = normalize(wn + vec3(0.0, cos(wavePhase) * 0.24 * shortAmt * endGuard, 0.0));
    }

    // 2) 伸張時: シートがピンと張って引き締まる
    float stretchAmt = clamp((strain - 0.012) / 0.16, 0.0, 1.35);
    if (stretchAmt > 0.001) {
      wp.xyz += wn * (0.0010 * stretchAmt);
    }

    vWorldPos = wp.xyz;
    vWorldNormal = wn;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FASCIA_SHEET_FRAGMENT = /* glsl */ `
  uniform float uDarkTheme;
  uniform float uBaseOpacity;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying float vStrain;
  varying vec4 vMeta;

  void main() {
    vec3 N = normalize(vWorldNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorldPos);

    float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.05);

    vec3 L1 = normalize(vec3(-0.45, 0.68, 0.58));
    vec3 L2 = normalize(vec3(0.55, 0.22, 0.60));
    float diff = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0) * 0.76 + max(dot(N, L2), 0.0) * 0.24;
    vec3 H = normalize(L1 + V);
    float spec = pow(max(dot(N, H), 0.0), 28.0);

    float u = vUv.x;
    float v = vUv.y;
    float fiberType = vMeta.x;
    float yBranchZone = vMeta.y;

    float stretchT = clamp((vStrain - 0.010) / 0.145, 0.0, 1.20);
    float shortT   = clamp((-vStrain - 0.010) / 0.135, 0.0, 1.20);

    float crimpAmp = mix(0.016, 0.0, clamp(stretchT * 1.35, 0.0, 1.0)) + 0.022 * shortT;
    float uCrimped = u + sin(v * 92.0) * crimpAmp;

    float f1 = 0.5 + 0.5 * sin(uCrimped * 88.0);
    float f2 = 0.5 + 0.5 * sin(uCrimped * 196.0 + 1.3);
    float longFibers = pow(f1, 1.6) * 0.68 + f2 * 0.32;

    float denseBandMask = clamp(fiberType, 0.0, 1.0) * (1.0 - step(1.5, fiberType));
    longFibers = mix(longFibers, pow(f1, 1.15) * 0.78 + f2 * 0.35, denseBandMask * 0.65);

    if (yBranchZone > 0.01) {
      float splitDist = mix(0.14, 0.33, yBranchZone);
      float antBranch = exp(-pow((u - (0.5 + splitDist)) / 0.15, 2.0));
      float postBranch = exp(-pow((u - (0.5 - splitDist)) / 0.16, 2.0));
      float medSheet = 0.48;
      longFibers *= mix(1.0, clamp(medSheet + (antBranch + postBranch) * 0.72, 0.42, 1.25), yBranchZone);
    }

    float basketMask = step(1.5, fiberType);
    float diagA = 0.5 + 0.5 * sin((u * 38.0 + v * 76.0));
    float diagB = 0.5 + 0.5 * sin((u * 38.0 - v * 76.0));
    float basketWeave = pow(diagA, 2.2) * 0.52 + pow(diagB, 2.2) * 0.52;

    float retinaculum = vMeta.z * (0.5 + 0.5 * sin(v * 260.0));

    float collagenTex = mix(longFibers, longFibers * 0.42 + basketWeave * 0.78, basketMask);
    collagenTex = clamp(collagenTex + retinaculum * 0.35, 0.0, 1.25);

    float crossWrinkleWave = 0.5 + 0.5 * sin(v * 135.0 + sin(u * 9.42) * 0.85);
    float wrinkleCrest = pow(crossWrinkleWave, 1.75);
    float wrinkleTrough = 1.0 - crossWrinkleWave;

    float flowWave = 0.5 + 0.5 * sin(v * 34.0 - uTime * 2.4);
    float tensionGlint = pow(f1, 2.6) * (0.55 + 0.45 * flowWave) * clamp(stretchT, 0.0, 1.0);

    // 承認コントラスト・カラートークン完全維持
    vec3 neutralLightBg = mix(vec3(0.48, 0.58, 0.69), vec3(0.84, 0.89, 0.94), 0.30 + 0.70 * diff);
    neutralLightBg = mix(neutralLightBg, vec3(0.28, 0.39, 0.52), fresnel * 0.62);

    vec3 neutralDarkBg = mix(vec3(0.56, 0.64, 0.74), vec3(0.90, 0.94, 0.99), 0.30 + 0.70 * diff);
    neutralDarkBg = mix(neutralDarkBg, vec3(0.78, 0.88, 0.98), fresnel * 0.50);

    vec3 baseCol = mix(neutralLightBg, neutralDarkBg, uDarkTheme);
    baseCol += (collagenTex - 0.45) * mix(0.19, 0.18, uDarkTheme);

    vec3 stretchCoreLight = mix(vec3(0.024, 0.58, 0.82), vec3(0.07, 0.30, 0.82), clamp(stretchT * 0.75, 0.0, 1.0));
    vec3 stretchFiberLight = vec3(0.28, 0.86, 0.98);
    vec3 stretchColLight = mix(stretchCoreLight * (0.72 + 0.38 * diff), stretchFiberLight, collagenTex * 0.58 + tensionGlint * 0.42);

    vec3 stretchCoreDark = mix(vec3(0.03, 0.64, 0.88), vec3(0.11, 0.42, 0.94), clamp(stretchT * 0.70, 0.0, 1.0));
    vec3 stretchFiberDark = vec3(0.52, 0.94, 1.00);
    vec3 stretchColDark = mix(stretchCoreDark * (0.75 + 0.35 * diff), stretchFiberDark, collagenTex * 0.62 + tensionGlint * 0.45);

    vec3 stretchCol = mix(stretchColLight, stretchColDark, uDarkTheme);

    vec3 shortBaseLight = vec3(0.76, 0.11, 0.26) * (0.76 + 0.32 * diff);
    vec3 shortCrestLight = vec3(0.98, 0.52, 0.62);
    vec3 shortValleyLight = vec3(0.42, 0.04, 0.13);
    vec3 shortColLight = mix(shortBaseLight, shortCrestLight, wrinkleCrest * 0.56);
    shortColLight = mix(shortColLight, shortValleyLight, pow(wrinkleTrough, 2.0) * 0.52);

    vec3 shortBaseDark = vec3(0.88, 0.18, 0.34) * (0.78 + 0.30 * diff);
    vec3 shortCrestDark = vec3(1.00, 0.68, 0.76);
    vec3 shortValleyDark = vec3(0.45, 0.06, 0.16);
    vec3 shortColDark = mix(shortBaseDark, shortCrestDark, wrinkleCrest * 0.60);
    shortColDark = mix(shortColDark, shortValleyDark, pow(wrinkleTrough, 2.0) * 0.48);

    vec3 shortCol = mix(shortColLight, shortColDark, uDarkTheme);

    vec3 col = baseCol;
    col = mix(col, stretchCol, smoothstep(0.0, 0.85, stretchT));
    col = mix(col, shortCol, smoothstep(0.0, 0.85, shortT));

    col += vec3(1.0, 0.99, 0.97) * spec * mix(0.22, 0.34, denseBandMask);

    float edgeDist = min(u, 1.0 - u) * 2.0;
    float edgeFade = smoothstep(0.0, 0.11, edgeDist);
    float borderLine = exp(-pow((edgeDist - 0.10) / 0.048, 2.0));
    float endFade = smoothstep(0.0, 0.035, v) * (1.0 - smoothstep(0.965, 1.0, v));

    float activeBoost = clamp(max(stretchT, shortT), 0.0, 1.0);
    float baseAlpha = mix(0.36, 0.36, uDarkTheme) + denseBandMask * 0.11;
    float strainAlpha = baseAlpha + activeBoost * 0.34 + fresnel * 0.24 + borderLine * 0.26 + collagenTex * 0.09;

    float faceMul = gl_FrontFacing ? 1.0 : 0.62;
    float alpha = clamp(strainAlpha * edgeFade * endFade * uBaseOpacity * vMeta.w * faceMul, 0.0, 0.90);

    if (alpha < 0.012) discard;

    vec3 rimTint = mix(
      mix(vec3(0.32, 0.40, 0.50), vec3(0.82, 0.90, 0.98), uDarkTheme),
      col * 1.18,
      activeBoost
    );
    col = mix(col, rimTint, borderLine * 0.38);

    gl_FragColor = vec4(col, alpha);
  }
`;

// -----------------------------------------------------------------------------
// 4. パラメトリック連続筋膜シートビルダー
// -----------------------------------------------------------------------------
function buildSheetMesh({
  id,
  lineId,
  nu = 18,
  nv = 80,
  renderOrder = 6,
  alphaScale = 1.0,
  stationEvalFn,
  spans,
  sharedThemeUniforms,
}) {
  const vertCount = (nu + 1) * (nv + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const boneIdxArr = new Float32Array(vertCount * 4);
  const boneWArr = new Float32Array(vertCount * 4);
  const metaArr = new Float32Array(vertCount * 4);

  const sampleUs = [-0.55, 0.0, +0.55];
  const fiberSamples = sampleUs.map(() => []);

  for (let iv = 0; iv <= nv; iv++) {
    const v = iv / nv;
    for (let iu = 0; iu <= nu; iu++) {
      const u01 = iu / nu;
      const uNorm = u01 * 2 - 1;
      const res = stationEvalFn(uNorm, v);
      const k = iv * (nu + 1) + iu;

      positions[k * 3] = res.pos.x;
      positions[k * 3 + 1] = res.pos.y;
      positions[k * 3 + 2] = res.pos.z;

      uvs[k * 2] = u01;
      uvs[k * 2 + 1] = v;

      boneIdxArr[k * 4] = res.skin.idx[0];
      boneIdxArr[k * 4 + 1] = res.skin.idx[1];
      boneIdxArr[k * 4 + 2] = res.skin.idx[2];
      boneIdxArr[k * 4 + 3] = res.skin.idx[3];

      boneWArr[k * 4] = res.skin.w[0];
      boneWArr[k * 4 + 1] = res.skin.w[1];
      boneWArr[k * 4 + 2] = res.skin.w[2];
      boneWArr[k * 4 + 3] = res.skin.w[3];

      metaArr[k * 4] = res.fiberType || 0;
      metaArr[k * 4 + 1] = res.yBranch || 0;
      metaArr[k * 4 + 2] = res.retinaculum || 0;
      metaArr[k * 4 + 3] = alphaScale;
    }

    for (let su = 0; su < sampleUs.length; su++) {
      const sRes = stationEvalFn(sampleUs[su], v);
      fiberSamples[su].push({
        v,
        restPos: sRes.pos.clone(),
        curPos: sRes.pos.clone(),
        idx: sRes.skin.idx,
        w: sRes.skin.w,
      });
    }
  }

  const indices = [];
  for (let iv = 0; iv < nv; iv++) {
    for (let iu = 0; iu < nu; iu++) {
      const a = iv * (nu + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (nu + 1) + iu;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('aBoneIdx', new THREE.BufferAttribute(boneIdxArr, 4));
  geom.setAttribute('aBoneW', new THREE.BufferAttribute(boneWArr, 4));
  geom.setAttribute('aFasciaMeta', new THREE.BufferAttribute(metaArr, 4));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const restStepLen = fiberSamples.map((pts) => {
    const lens = new Float32Array(nv);
    for (let iv = 0; iv < nv; iv++) {
      lens[iv] = Math.max(1e-5, pts[iv].restPos.distanceTo(pts[iv + 1].restPos));
    }
    return lens;
  });

  const spanInfos = (spans || [{ id: 'all', v0: 0, v1: 1, complianceRatio: 1.0 }]).map((sp) => {
    const i0 = Math.max(0, Math.min(nv - 1, Math.round(sp.v0 * nv)));
    const i1 = Math.max(i0 + 1, Math.min(nv, Math.round(sp.v1 * nv)));
    let l0Sum = 0;
    for (let su = 0; su < fiberSamples.length; su++) {
      for (let iv = i0; iv < i1; iv++) l0Sum += restStepLen[su][iv];
    }
    const meanL0 = l0Sum / fiberSamples.length;
    return {
      ...sp,
      i0,
      i1,
      meanL0,
      effectiveComplianceLen: meanL0 * (sp.complianceRatio || 1.0),
      currentStrain: 0,
    };
  });

  const segStrainArray = new Float32Array(SEG_COUNT);
  const lineDef = FASCIA_LINE_DEFS.find((d) => d.id === lineId);

  const mat = new THREE.ShaderMaterial({
    vertexShader: FASCIA_SHEET_VERTEX,
    fragmentShader: FASCIA_SHEET_FRAGMENT,
    uniforms: {
      uBoneMats: sharedThemeUniforms.uBoneMats,
      uDarkTheme: sharedThemeUniforms.uDarkTheme,
      uTime: sharedThemeUniforms.uTime,
      uBaseOpacity: { value: lineDef ? lineDef.baseOpacity : 0.9 },
      uSegStrain: { value: segStrainArray },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = `fascia:${id}`;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  mesh.userData = { sheetId: id, lineId };

  const rawStepStrain = new Float32Array(nv);
  const spanBlended = new Float32Array(nv);
  const habitBaseCache = new Map();
  const tmpBaseVec = new THREE.Vector3();
  const tmpBaseNext = new THREE.Vector3();

  const getHabitBaseline = (presetId) => {
    let base = habitBaseCache.get(presetId);
    if (!base) {
      const zeroMats = getHabitZeroBoneMats(presetId);
      const stepLens = fiberSamples.map((pts) => {
        const arr = new Float32Array(nv);
        for (let iv = 0; iv < nv; iv++) {
          skinWorldPoint(pts[iv].restPos, pts[iv].idx, pts[iv].w, zeroMats, tmpBaseVec);
          skinWorldPoint(pts[iv + 1].restPos, pts[iv + 1].idx, pts[iv + 1].w, zeroMats, tmpBaseNext);
          arr[iv] = Math.max(1e-5, tmpBaseVec.distanceTo(tmpBaseNext));
        }
        return arr;
      });
      const spanMeanL0 = spanInfos.map((sp) => {
        let s = 0;
        for (let su = 0; su < stepLens.length; su++) {
          for (let iv = sp.i0; iv < sp.i1; iv++) s += stepLens[su][iv];
        }
        return s / stepLens.length;
      });
      base = { stepLens, spanMeanL0 };
      habitBaseCache.set(presetId, base);
    }
    return base;
  };

  const updateStrain = (boneMats, motionParams = null) => {
    for (let su = 0; su < fiberSamples.length; su++) {
      const pts = fiberSamples[su];
      for (let iv = 0; iv <= nv; iv++) {
        const p = pts[iv];
        skinWorldPoint(p.restPos, p.idx, p.w, boneMats, p.curPos);
      }
    }

    const isHabit = Boolean(motionParams && motionParams.isHabitComparison);
    const habitBase = isHabit ? getHabitBaseline(motionParams.presetId) : null;
    const baseStepRef = habitBase ? habitBase.stepLens : restStepLen;

    for (let iv = 0; iv < nv; iv++) {
      let dL0 = 0;
      let dL1 = 0;
      for (let su = 0; su < fiberSamples.length; su++) {
        dL0 += baseStepRef[su][iv];
        dL1 += fiberSamples[su][iv].curPos.distanceTo(fiberSamples[su][iv + 1].curPos);
      }
      rawStepStrain[iv] = (dL1 - dL0) / Math.max(1e-5, dL0);
    }

    for (let sIdx = 0; sIdx < spanInfos.length; sIdx++) {
      const sp = spanInfos[sIdx];
      let curSum = 0;
      for (let su = 0; su < fiberSamples.length; su++) {
        const pts = fiberSamples[su];
        for (let iv = sp.i0; iv < sp.i1; iv++) {
          curSum += pts[iv].curPos.distanceTo(pts[iv + 1].curPos);
        }
      }
      const meanL1 = curSum / fiberSamples.length;
      const refL0 = habitBase ? habitBase.spanMeanL0[sIdx] : sp.meanL0;
      const geomStrain = (meanL1 - refL0) / Math.max(1e-4, sp.effectiveComplianceLen);

      let spanTensionStrain;
      let stepOffset = 0;
      if (isHabit) {
        const targetS = getHabitSpanTargetStrain(
          motionParams.presetId,
          id,
          sp.id,
          motionParams.habitLoad || 0,
        );
        if (targetS !== null) {
          spanTensionStrain = targetS + geomStrain * 0.18;
          stepOffset = targetS;
        } else {
          spanTensionStrain = geomStrain * 0.55;
        }
      } else {
        const coupled = sp.coupledStrain && motionParams ? sp.coupledStrain(motionParams) : 0;
        spanTensionStrain = geomStrain + coupled;
        stepOffset = coupled;
      }

      sp.currentStrain = spanTensionStrain;

      for (let iv = sp.i0; iv < sp.i1; iv++) {
        spanBlended[iv] = spanTensionStrain * 0.78 + (rawStepStrain[iv] * (isHabit ? 0.35 : 1.0) + stepOffset) * 0.22;
      }
    }

    for (let s = 0; s < SEG_COUNT; s++) {
      const centerIv = ((s + 0.5) / SEG_COUNT) * nv;
      let acc = 0;
      let wSum = 0;
      for (let d = -2; d <= 2; d++) {
        const j = Math.max(0, Math.min(nv - 1, Math.round(centerIv) + d));
        const w = 1 / (1 + Math.abs(d) * 0.7);
        acc += spanBlended[j] * w;
        wSum += w;
      }
      segStrainArray[s] = acc / wSum;
    }
  };

  const getSpanStrain = (spanId) => {
    const found = spanInfos.find((s) => s.id === spanId);
    return found ? found.currentStrain : 0;
  };

  return {
    id,
    lineId,
    mesh,
    material: mat,
    spanInfos,
    updateStrain,
    getSpanStrain,
  };
}

function evalProfileTable(table, v) {
  if (v <= table[0].v) return { ...table[0] };
  if (v >= table[table.length - 1].v) return { ...table[table.length - 1] };
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / Math.max(1e-6, b.v - a.v);
      const st = t * t * (3 - 2 * t);
      const out = {};
      for (const key of Object.keys(a)) {
        if (typeof a[key] === 'number' && typeof b[key] === 'number') {
          out[key] = a[key] + (b[key] - a[key]) * st;
        } else {
          out[key] = t < 0.5 ? a[key] : b[key];
        }
      }
      return out;
    }
  }
  return { ...table[table.length - 1] };
}

function mirrorThetaToLeft(thetaR) {
  let th = Math.PI - thetaR;
  while (th > Math.PI) th -= Math.PI * 2;
  while (th < -Math.PI) th += Math.PI * 2;
  return th;
}

// -----------------------------------------------------------------------------
// 5. 全11アナトミートレイン連続3D筋膜シート群の生成
// -----------------------------------------------------------------------------
export function createFasciaSheetsSystem(envelope, sharedThemeUniforms) {
  const group = new THREE.Group();
  group.name = 'fascia-continuum-sheets';
  const sheets = [];
  const byId = new Map();

  const registerSheet = (sh) => {
    sheets.push(sh);
    byId.set(sh.id, sh);
    group.add(sh.mesh);
  };

  // ===========================================================================
  // 【1】ラテラル・ライン（LL: 足底あぶみ〜腓骨筋膜〜ITB・TFL〜脇腹〜ろっ骨〜首X字）
  // ===========================================================================
  const LL_PROFILE_R = [
    { v: 0.00, y: -3.24, thLeg: 0.35, thTor: Math.PI, span: 0.16, off: 0.005, fType: 1.0, yBr: 0, ret: 0 },
    { v: 0.04, y: -3.21, thLeg: Math.PI - 0.15, thTor: Math.PI, span: 0.18, off: 0.005, fType: 1.0, yBr: 0, ret: 0 },
    { v: 0.09, y: -3.05, thLeg: Math.PI + 0.28, thTor: Math.PI, span: 0.20, off: 0.0055, fType: 1.0, yBr: 0, ret: 1.0 },
    { v: 0.18, y: -2.42, thLeg: Math.PI + 0.06, thTor: Math.PI, span: 0.28, off: 0.0055, fType: 0.35, yBr: 0, ret: 0 },
    { v: 0.25, y: -1.67, thLeg: Math.PI - 0.04, thTor: Math.PI, span: 0.25, off: 0.006, fType: 0.9, yBr: 0, ret: 0.5 },
    { v: 0.35, y: -0.88, thLeg: Math.PI - 0.02, thTor: Math.PI, span: 0.26, off: 0.0065, fType: 1.0, yBr: 0, ret: 0 },
    { v: 0.45, y: -0.04, thLeg: Math.PI + 0.02, thTor: Math.PI + 0.02, span: 0.38, off: 0.007, fType: 0.95, yBr: 0.25, ret: 0 },
    { v: 0.52, y: +0.26, thLeg: Math.PI - 0.02, thTor: Math.PI - 0.02, span: 0.62, off: 0.007, fType: 0.55, yBr: 0.95, ret: 0 },
    { v: 0.57, y: +0.54, thLeg: Math.PI, thTor: Math.PI - 0.02, span: 0.60, off: 0.0068, fType: 0.85, yBr: 0.50, ret: 0.4 },
    { v: 0.68, y: +0.88, thLeg: Math.PI, thTor: Math.PI - 0.03, span: 0.58, off: 0.0065, fType: 2.0, yBr: 0, ret: 0 },
    { v: 0.77, y: +1.18, thLeg: Math.PI, thTor: Math.PI - 0.02, span: 0.56, off: 0.0065, fType: 2.0, yBr: 0, ret: 0 },
    { v: 0.89, y: +1.64, thLeg: Math.PI, thTor: Math.PI - 0.01, span: 0.50, off: 0.0065, fType: 2.0, yBr: 0, ret: 0 },
    { v: 1.00, y: +2.08, thLeg: Math.PI, thTor: Math.PI, span: 0.34, off: 0.006, fType: 1.8, yBr: 0, ret: 0 },
  ];

  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    registerSheet(
      buildSheetMesh({
        id: `ll-main-${side.toLowerCase()}`,
        lineId: 'LL',
        nu: 24,
        nv: 112,
        renderOrder: 7,
        alphaScale: 1.0,
        spans: [
          {
            id: 'fibular',
            v0: 0.0,
            v1: 0.25,
            complianceRatio: 0.14,
            coupledStrain: (mp) => (isR ? (mp.runStrikeR || 0) * 0.08 : 0),
          },
          {
            id: 'tfl-itb',
            v0: 0.25,
            v1: 0.57,
            complianceRatio: 0.33,
            coupledStrain: (mp) => (isR ? (mp.crossLegR || 0) * 0.09 + (mp.runStrikeR || 0) * 0.06 : 0),
          },
          { id: 'oblique', v0: 0.57, v1: 0.78, complianceRatio: 0.94 },
          { id: 'intercostal', v0: 0.78, v1: 1.0, complianceRatio: 0.90 },
        ],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(LL_PROFILE_R, v);
          const thLegR = p.thLeg - uNorm * p.span;
          const thTorR = p.thTor - uNorm * p.span;
          const thLeg = isR ? thLegR : mirrorThetaToLeft(thLegR);
          const thTor = isR ? thTorR : mirrorThetaToLeft(thTorR);

          const pos = new THREE.Vector3();
          if (v < 0.075) {
            const tStirrup = v / 0.075;
            const sSign = isR ? -1 : +1;
            const xMid = sSign * THREE.MathUtils.lerp(0.22, 0.45, tStirrup);
            const zMid = THREE.MathUtils.lerp(0.15, -0.14, tStirrup) + uNorm * 0.040;
            const yArch = THREE.MathUtils.lerp(-3.24, -3.08, Math.pow(tStirrup, 1.6));
            pos.set(xMid, yArch, zMid);
            const B_FT = isR ? BONE.FOOT_R : BONE.FOOT_L;
            const B_SH = isR ? BONE.SHANK_R : BONE.SHANK_L;
            const wSh = smoothstep(0.35, 1.0, tStirrup);
            return {
              pos,
              skin: makeWeights([
                [B_FT, 1 - wSh],
                [B_SH, wSh],
              ]),
              fiberType: p.fType,
              yBranch: 0,
              retinaculum: 0,
            };
          }

          envelope.sampleContinuum(side, p.y, thLeg, thTor, p.off, pos);
          return {
            pos,
            skin: getBodyChainSkin(side, p.y),
            fiberType: p.fType,
            yBranch: p.yBr,
            retinaculum: p.ret,
          };
        },
        sharedThemeUniforms,
      }),
    );

    registerSheet(
      buildSheetMesh({
        id: `ll-neck-scm-${side.toLowerCase()}`,
        lineId: 'LL',
        nu: 12,
        nv: 40,
        renderOrder: 7,
        alphaScale: 0.94,
        spans: [{ id: 'neck-scm', v0: 0, v1: 1, complianceRatio: 0.75 }],
        stationEvalFn: (uNorm, v) => {
          const y = THREE.MathUtils.lerp(+2.12, +2.72, v);
          const thR = THREE.MathUtils.lerp(Math.PI * 0.62, Math.PI * 1.10, v) - uNorm * 0.16;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleTorso(y, th, 0.0065);
          return {
            pos,
            skin: getBodyChainSkin(side, y),
            fiberType: 1.0,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    registerSheet(
      buildSheetMesh({
        id: `ll-neck-spl-${side.toLowerCase()}`,
        lineId: 'LL',
        nu: 12,
        nv: 40,
        renderOrder: 7,
        alphaScale: 0.92,
        spans: [{ id: 'neck-spl', v0: 0, v1: 1, complianceRatio: 0.75 }],
        stationEvalFn: (uNorm, v) => {
          const y = THREE.MathUtils.lerp(+2.04, +2.73, v);
          const thR = THREE.MathUtils.lerp(Math.PI * 1.46, Math.PI * 1.12, v) - uNorm * 0.16;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleTorso(y, th, 0.0055);
          return {
            pos,
            skin: getBodyChainSkin(side, y),
            fiberType: 0.85,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【2】ディープ・フロント・ライン（DFL: 後脛骨〜内転〜腸腰・腰方形〜横隔膜〜首奥・あご）
  // ===========================================================================
  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;

    // A) DFL下部：足底深層〜内果後方〜後脛骨筋膜シート
    registerSheet(
      buildSheetMesh({
        id: `dfl-tibpost-${side.toLowerCase()}`,
        lineId: 'DFL',
        nu: 10,
        nv: 44,
        renderOrder: 4,
        alphaScale: 0.88,
        spans: [
          {
            id: 'tibpost',
            v0: 0,
            v1: 1,
            complianceRatio: 0.55,
            coupledStrain: (mp) => (mp.plantarLoad || 0) * 0.125,
          },
        ],
        stationEvalFn: (uNorm, v) => {
          const y = THREE.MathUtils.lerp(-3.21, -1.66, v);
          if (v < 0.14) {
            const t = v / 0.14;
            const x = sSign * THREE.MathUtils.lerp(0.28, 0.25, t) + uNorm * 0.025;
            const z = THREE.MathUtils.lerp(0.10, -0.11, t);
            const B_FT = isR ? BONE.FOOT_R : BONE.FOOT_L;
            const B_SH = isR ? BONE.SHANK_R : BONE.SHANK_L;
            const wSh = smoothstep(0.3, 1.0, t);
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: makeWeights([
                [B_FT, 1 - wSh],
                [B_SH, wSh],
              ]),
              fiberType: 0.9,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          const { cx, cz } = getLegAxisCenter(isR, y);
          const x = cx - sSign * 0.042 + uNorm * 0.032;
          const z = cz - 0.022 + uNorm * 0.018;
          return {
            pos: new THREE.Vector3(x, y, z),
            skin: getBodyChainSkin(side, y),
            fiberType: 0.7,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // B) DFL中部：内転筋膜〜骨盤底〜腸腰筋膜シート
    const DFL_CORE_TABLE = [
      { v: 0.00, y: -1.52, ax: 0.22, xHalf: 0.030, z: -0.02, zHalf: 0.045 },
      { v: 0.28, y: -0.82, ax: 0.16, xHalf: 0.048, z: +0.01, zHalf: 0.065 },
      { v: 0.56, y: -0.06, ax: 0.055, xHalf: 0.042, z: +0.06, zHalf: 0.058 },
      { v: 0.76, y: +0.44, ax: 0.125, xHalf: 0.052, z: +0.01, zHalf: 0.042 },
      { v: 1.00, y: +1.10, ax: 0.082, xHalf: 0.036, z: -0.03, zHalf: 0.032 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `dfl-adductor-psoas-${side.toLowerCase()}`,
        lineId: 'DFL',
        nu: 16,
        nv: 72,
        renderOrder: 4,
        alphaScale: 0.90,
        spans: [
          {
            id: 'adductor',
            v0: 0.0,
            v1: 0.56,
            complianceRatio: 0.36,
            coupledStrain: (mp) => (isR ? -(mp.crossLegR || 0) * 0.08 : 0),
          },
          {
            id: 'iliopsoas',
            v0: 0.56,
            v1: 1.0,
            complianceRatio: 0.72,
            coupledStrain: (mp) => -(mp.sitAmount || 0) * 0.165 - (mp.swayBack || 0) * 0.11,
          },
        ],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(DFL_CORE_TABLE, v);
          const x = sSign * (p.ax + uNorm * p.xHalf);
          const z = p.z + uNorm * p.zHalf;
          const pos = new THREE.Vector3(x, p.y, z);
          const B_FEM = isR ? BONE.FEMUR_R : BONE.FEMUR_L;
          if (v <= 0.68) {
            const wPelvis = smoothstep(0.28, 0.64, v);
            return {
              pos,
              skin: makeWeights([
                [B_FEM, 1 - wPelvis],
                [BONE.PELVIS, wPelvis],
              ]),
              fiberType: 0.6,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos,
            skin: getBodyChainSkin(side, p.y),
            fiberType: 0.5,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // C) 腰方形筋膜シート
    registerSheet(
      buildSheetMesh({
        id: `dfl-ql-${side.toLowerCase()}`,
        lineId: 'DFL',
        nu: 12,
        nv: 36,
        renderOrder: 4,
        alphaScale: 0.90,
        spans: [{ id: 'ql', v0: 0, v1: 1, complianceRatio: 0.80 }],
        stationEvalFn: (uNorm, v) => {
          const y = THREE.MathUtils.lerp(+0.50, +1.15, v);
          const xCenter = sSign * THREE.MathUtils.lerp(0.24, 0.21, v);
          const halfW = THREE.MathUtils.lerp(0.11, 0.09, v);
          const x = xCenter + sSign * uNorm * halfW;
          const z = THREE.MathUtils.lerp(-0.11, -0.10, v) - Math.abs(uNorm) * 0.015;
          const wLum = smoothstep(0.05, 0.55, v) * (1 - smoothstep(0.55, 0.95, v));
          const wPel = 1 - smoothstep(0.05, 0.55, v);
          const wTho = smoothstep(0.50, 0.96, v);
          return {
            pos: new THREE.Vector3(x, y, z),
            skin: makeWeights([
              [BONE.PELVIS, wPel],
              [BONE.LUMBAR, wLum],
              [BONE.THORAX_LOW, wTho],
            ]),
            fiberType: 0.75,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // D) DFL上部：縦隔・気管前筋膜〜舌骨上下筋膜〜咬筋・側頭筋膜（あご・こめかみ連続シート！）
    registerSheet(
      buildSheetMesh({
        id: `dfl-neck-jaw-${side.toLowerCase()}`,
        lineId: 'DFL',
        nu: 12,
        nv: 46,
        renderOrder: 4,
        alphaScale: 0.88,
        spans: [
          {
            id: 'jaw-neck',
            v0: 0,
            v1: 1,
            complianceRatio: 0.72,
            coupledStrain: (mp) => -(mp.jawClench || 0) * 0.135,
          },
        ],
        stationEvalFn: (uNorm, v) => {
          const y = THREE.MathUtils.lerp(+1.88, +2.88, v);
          let x = 0;
          let z = 0;
          if (v < 0.56) {
            // 胸骨裏〜頸部深層〜舌骨・下顎内側
            const t = v / 0.56;
            x = sSign * (THREE.MathUtils.lerp(0.06, 0.12, t) + uNorm * 0.038);
            z = THREE.MathUtils.lerp(+0.03, +0.05, t) - Math.abs(uNorm) * 0.012;
          } else {
            // 下顎角 -> 頬骨弓・咬筋膜 -> こめかみ側頭筋膜ファン
            const t = (v - 0.56) / 0.44;
            const thR = THREE.MathUtils.lerp(Math.PI * 0.86, Math.PI * 0.98, t) - uNorm * THREE.MathUtils.lerp(0.11, 0.24, t);
            const th = isR ? thR : mirrorThetaToLeft(thR);
            const surf = envelope.sampleTorso(y, th, 0.004);
            x = surf.x;
            z = surf.z;
          }
          return {
            pos: new THREE.Vector3(x, y, z),
            skin: getBodyChainSkin(side, y),
            fiberType: v > 0.56 ? 0.9 : 0.6,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // E) 横隔膜ドーム膜
  registerSheet(
    buildSheetMesh({
      id: 'dfl-diaphragm',
      lineId: 'DFL',
      nu: 28,
      nv: 24,
      renderOrder: 4,
      alphaScale: 0.78,
      spans: [
        {
          id: 'diaphragm',
          v0: 0,
          v1: 1,
          complianceRatio: 0.88,
          coupledStrain: (mp) => -(mp.diaphragmSlump || 0) * 0.14,
        },
      ],
      stationEvalFn: (uNorm, v) => {
        const angle = uNorm * Math.PI;
        const r = 1 - v * 0.86;
        const rx = 0.36 * r;
        const rz = 0.19 * r;
        const domeLift = Math.sin(v * Math.PI * 0.5) * 0.19;
        const asym = -Math.cos(angle) * 0.014 * Math.sin(v * Math.PI);
        const x = rx * Math.cos(angle);
        const z = -0.03 + rz * Math.sin(angle);
        const y = +1.15 + domeLift + asym;
        return {
          pos: new THREE.Vector3(x, y, z),
          skin: makeWeights([
            [BONE.THORAX_LOW, 0.84],
            [BONE.LUMBAR, 0.16 * (1 - v)],
          ]),
          fiberType: 0.4,
          yBranch: 0,
          retinaculum: 0,
        };
      },
      sharedThemeUniforms,
    }),
  );

  // ===========================================================================
  // 【3】スパイラル・ライン（SPL: 2系統の全身たすき掛けらせんシート）
  // ===========================================================================
  for (const sys of ['RtoL', 'LtoR']) {
    const startRight = sys === 'RtoL';
    const legSide = startRight ? 'R' : 'L';
    const isLegR = legSide === 'R';

    const SPL_TABLE = [
      { v: 0.00, y: -3.20, thLegR: 0.45, thTorR: 0, span: 0.16, off: 0.0095, fType: 1.0 },
      { v: 0.12, y: -2.42, thLegR: Math.PI * 0.62, thTorR: 0, span: 0.22, off: 0.0095, fType: 0.6 },
      { v: 0.23, y: -1.66, thLegR: Math.PI * 0.95, thTorR: 0, span: 0.22, off: 0.010, fType: 1.0 },
      { v: 0.35, y: -0.85, thLegR: Math.PI * 0.98, thTorR: 0, span: 0.22, off: 0.0105, fType: 1.0 },
      { v: 0.45, y: -0.02, thLegR: Math.PI * 0.86, thTorR: Math.PI * 0.86, span: 0.22, off: 0.0105, fType: 0.9 },
      { v: 0.52, y: +0.28, thLegR: Math.PI * 0.76, thTorR: Math.PI * 0.76, span: 0.24, off: 0.0105, fType: 0.9 },
      { v: 0.61, y: +0.76, thLegR: Math.PI * 0.50, thTorR: Math.PI * 0.50, span: 0.25, off: 0.0105, fType: 2.0 },
      { v: 0.71, y: +1.22, thLegR: 0, thTorR: Math.PI * 0.18, span: 0.26, off: 0.0105, fType: 2.0 },
      { v: 0.80, y: +1.64, thLegR: 0, thTorR: -Math.PI * 0.06, span: 0.25, off: 0.010, fType: 0.8 },
      { v: 0.89, y: +2.02, thLegR: 0, thTorR: -Math.PI * 0.46, span: 0.22, off: 0.010, fType: 0.8 },
      { v: 1.00, y: +2.71, thLegR: 0, thTorR: -Math.PI * 0.84, span: 0.18, off: 0.010, fType: 0.9 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `spl-${sys.toLowerCase()}`,
        lineId: 'SPL',
        nu: 16,
        nv: 96,
        renderOrder: 8,
        alphaScale: 0.92,
        spans: [
          { id: 'spl-leg', v0: 0.0, v1: 0.52, complianceRatio: 0.48 },
          {
            id: 'spl-sling',
            v0: 0.52,
            v1: 0.88,
            complianceRatio: 0.68,
            coupledStrain: (mp) =>
              startRight
                ? (mp.crossLegR || 0) * 0.08 + (mp.runStrikeR || 0) * 0.09
                : 0,
          },
          { id: 'spl-upper', v0: 0.88, v1: 1.0, complianceRatio: 0.80 },
        ],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(SPL_TABLE, v);
          const thLeg = isLegR ? p.thLegR - uNorm * p.span : mirrorThetaToLeft(p.thLegR - uNorm * p.span);
          const thTor = isLegR ? p.thTorR - uNorm * p.span : mirrorThetaToLeft(p.thTorR - uNorm * p.span);
          const pos = envelope.sampleContinuum(legSide, p.y, thLeg, thTor, p.off);
          // 肩甲骨内側縁付近（v ≈ 0.80..0.90）は反対側 GIRDLE の前方突出にも連動させる！
          if (v > 0.76 && v < 0.92) {
            const oppGirdle = startRight ? BONE.GIRDLE_L : BONE.GIRDLE_R;
            const wG = Math.sin(((v - 0.76) / 0.16) * Math.PI) * 0.55;
            return {
              pos,
              skin: makeWeights([
                [oppGirdle, wG],
                [BONE.THORAX_HIGH, 1 - wG],
              ]),
              fiberType: p.fType,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos,
            skin: getBodyChainSkin(legSide, p.y),
            fiberType: p.fType,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【4】スーパーフィシャル・バック・ライン（SBL: 足底腱膜〜背中〜頭頂帽状腱膜〜眉上おでこ）
  // ===========================================================================
  const SBL_TABLE_R = [
    { v: 0.00, y: -3.25, thLeg: -Math.PI * 0.5, thTor: -Math.PI * 0.5, span: 0.22, off: 0.006, fType: 1.0 },
    { v: 0.07, y: -3.12, thLeg: -Math.PI * 0.52, thTor: -Math.PI * 0.5, span: 0.18, off: 0.006, fType: 1.0 },
    { v: 0.16, y: -2.35, thLeg: -Math.PI * 0.52, thTor: -Math.PI * 0.5, span: 0.30, off: 0.0065, fType: 0.5 },
    { v: 0.25, y: -1.62, thLeg: -Math.PI * 0.52, thTor: -Math.PI * 0.5, span: 0.26, off: 0.0065, fType: 0.8 },
    { v: 0.37, y: -0.78, thLeg: -Math.PI * 0.54, thTor: -Math.PI * 0.54, span: 0.32, off: 0.0065, fType: 0.5 },
    { v: 0.48, y: -0.16, thLeg: -Math.PI * 0.58, thTor: -Math.PI * 0.60, span: 0.26, off: 0.007, fType: 1.0 },
    { v: 0.58, y: +0.62, thLeg: -Math.PI * 0.5, thTor: -Math.PI * 0.60, span: 0.24, off: 0.007, fType: 1.0 },
    { v: 0.72, y: +1.56, thLeg: -Math.PI * 0.5, thTor: -Math.PI * 0.59, span: 0.20, off: 0.007, fType: 0.6 },
    { v: 0.84, y: +2.44, thLeg: -Math.PI * 0.5, thTor: -Math.PI * 0.58, span: 0.18, off: 0.0065, fType: 0.8 },
    { v: 0.90, y: +2.82, thLeg: -Math.PI * 0.5, thTor: -Math.PI * 0.57, span: 0.22, off: 0.006, fType: 1.0 },
    // 頭頂〜おでこ眉上へ帽状腱膜を連続オーバーラップ！
    { v: 1.00, y: +2.92, thLeg: -Math.PI * 0.5, thTor: +Math.PI * 0.56, span: 0.22, off: 0.006, fType: 1.0 },
  ];

  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;
    registerSheet(
      buildSheetMesh({
        id: `sbl-${side.toLowerCase()}`,
        lineId: 'SBL',
        nu: 16,
        nv: 100,
        renderOrder: 5,
        alphaScale: 0.94,
        spans: [
          {
            id: 'sbl-plantar',
            v0: 0.0,
            v1: 0.07,
            complianceRatio: 0.55,
            coupledStrain: (mp) => (mp.plantarLoad || 0) * 0.14,
          },
          {
            id: 'sbl-calf',
            v0: 0.07,
            v1: 0.25,
            complianceRatio: 0.72,
            coupledStrain: (mp) => -(mp.sitAmount || 0) * 0.14,
          },
          {
            id: 'sbl-ham',
            v0: 0.25,
            v1: 0.48,
            complianceRatio: 0.85,
            coupledStrain: (mp) => -(mp.sitAmount || 0) * 0.31,
          },
          { id: 'sbl-lumbar', v0: 0.48, v1: 0.68, complianceRatio: 1.18 },
          { id: 'sbl-upperback', v0: 0.68, v1: 0.88, complianceRatio: 0.82 },
          {
            id: 'sbl-scalp',
            v0: 0.88,
            v1: 1.0,
            complianceRatio: 0.75,
            coupledStrain: (mp) => (mp.scalpPull || 0) * 0.135,
          },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.06) {
            const t = v / 0.06;
            const x = sSign * (0.34 + uNorm * 0.055);
            const z = THREE.MathUtils.lerp(+0.11, -0.17, t);
            const y = -3.265 + 0.014 * Math.sin(t * Math.PI);
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: getBodyChainSkin(side, y, 'foot'),
              fiberType: 1.0,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          if (v > 0.88) {
            // 後頭隆起 -> 頭頂帽状腱膜 -> 眉上（前頭骨）への頭蓋ドームアーチ
            const tCap = (v - 0.88) / 0.12;
            const archAng = THREE.MathUtils.lerp(-Math.PI * 0.42, +Math.PI * 0.42, tCap);
            const x = sSign * (0.058 + uNorm * 0.048);
            const y = 2.81 + Math.cos(archAng) * 0.285;
            const z = -0.04 + Math.sin(archAng) * 0.215;
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: makeWeights([[BONE.HEAD, 1]]),
              fiberType: 1.0,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          const p = evalProfileTable(SBL_TABLE_R, v);
          const thLegR = p.thLeg - uNorm * p.span;
          const thTorR = p.thTor - uNorm * p.span * 0.55;
          const thLeg = isR ? thLegR : mirrorThetaToLeft(thLegR);
          const thTor = isR ? thTorR : mirrorThetaToLeft(thTorR);
          const pos = envelope.sampleContinuum(side, p.y, thLeg, thTor, p.off);
          // 坐骨結節〜仙結節靭帯ゾーン（v = 0.38..0.54）：大腿骨から骨盤（坐骨結節）へ解剖学的に連続バインドし座位の角折れを防止
          if (v >= 0.38 && v <= 0.54) {
            const B_FEM = isR ? BONE.FEMUR_R : BONE.FEMUR_L;
            const wPelvis = smoothstep(0.38, 0.49, v);
            return {
              pos,
              skin: makeWeights([
                [B_FEM, 1 - wPelvis],
                [BONE.PELVIS, wPelvis],
              ]),
              fiberType: p.fType,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos,
            skin: getBodyChainSkin(side, p.y),
            fiberType: p.fType,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【5】スーパーフィシャル・フロント・ライン（SFL: すね前〜前もも〜腹直筋鞘〜胸骨〜首前）
  // ===========================================================================
  const SFL_TABLE_R = [
    { v: 0.00, y: -3.18, thLeg: Math.PI * 0.52, thTor: Math.PI * 0.5, span: 0.20, off: 0.006, fType: 0.8 },
    { v: 0.16, y: -2.35, thLeg: Math.PI * 0.56, thTor: Math.PI * 0.5, span: 0.24, off: 0.0065, fType: 0.6 },
    { v: 0.27, y: -1.60, thLeg: Math.PI * 0.50, thTor: Math.PI * 0.5, span: 0.22, off: 0.007, fType: 1.0 },
    { v: 0.40, y: -0.72, thLeg: Math.PI * 0.52, thTor: Math.PI * 0.5, span: 0.30, off: 0.007, fType: 0.5 },
    { v: 0.50, y: -0.02, thLeg: Math.PI * 0.58, thTor: Math.PI * 0.58, span: 0.22, off: 0.007, fType: 0.8 },
    { v: 0.56, y: +0.32, thLeg: Math.PI * 0.5, thTor: Math.PI * 0.57, span: 0.16, off: 0.007, fType: 1.0 },
    { v: 0.74, y: +1.22, thLeg: Math.PI * 0.5, thTor: Math.PI * 0.57, span: 0.17, off: 0.007, fType: 1.0 },
    { v: 0.84, y: +2.06, thLeg: Math.PI * 0.5, thTor: Math.PI * 0.55, span: 0.12, off: 0.007, fType: 1.0 },
    { v: 1.00, y: +2.71, thLeg: Math.PI * 0.5, thTor: Math.PI * 1.08, span: 0.14, off: 0.008, fType: 0.9 },
  ];

  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    registerSheet(
      buildSheetMesh({
        id: `sfl-${side.toLowerCase()}`,
        lineId: 'SFL',
        nu: 14,
        nv: 88,
        renderOrder: 6,
        alphaScale: 0.92,
        spans: [
          { id: 'sfl-shin', v0: 0.0, v1: 0.27, complianceRatio: 0.68 },
          {
            id: 'sfl-quad',
            v0: 0.27,
            v1: 0.52,
            complianceRatio: 0.55,
            coupledStrain: (mp) => -(mp.swayBack || 0) * 0.085,
          },
          { id: 'sfl-abs', v0: 0.52, v1: 0.80, complianceRatio: 1.05 },
          { id: 'sfl-chest-neck', v0: 0.80, v1: 1.0, complianceRatio: 0.68 },
        ],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(SFL_TABLE_R, v);
          const thLegR = p.thLeg - uNorm * p.span;
          const thTorR = p.thTor - uNorm * p.span * 0.55;
          const thLeg = isR ? thLegR : mirrorThetaToLeft(thLegR);
          const thTor = isR ? thTorR : mirrorThetaToLeft(thTorR);
          const pos = envelope.sampleContinuum(side, p.y, thLeg, thTor, p.off);
          return {
            pos,
            skin: getBodyChainSkin(side, p.y),
            fiberType: p.fType,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【6〜9】アーム4ライン（DFAL, SFAL, DBAL, SBAL: 肩甲帯〜上腕〜前腕〜手指まで連続！）
  // ===========================================================================
  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;
    const B_GIRDLE = isR ? BONE.GIRDLE_R : BONE.GIRDLE_L;

    // -------------------------------------------------------------------------
    // 【6】DFAL: 深前アーム・ライン（第3〜5肋骨 ➔ 小胸筋膜・烏口突起 ➔ 上腕二頭筋膜 ➔ 橈骨・母指球）
    // -------------------------------------------------------------------------
    const DFAL_ARM_TABLE = [
      { v: 0.22, y: +1.94, thR: Math.PI * 0.62, span: 0.16, radW: 0.8 },
      { v: 0.36, y: +1.64, thR: Math.PI * 0.59, span: 0.24, radW: 0.82 },
      { v: 0.48, y: +1.36, thR: Math.PI * 0.58, span: 0.28, radW: 0.85 },
      { v: 0.64, y: +0.90, thR: Math.PI * 0.65, span: 0.24, radW: 0.92 },
      { v: 0.84, y: +0.10, thR: Math.PI * 0.88, span: 0.24, radW: 1.0 },
      { v: 1.00, y: -0.18, thR: Math.PI * 0.82, span: 0.26, radW: 1.0 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `dfal-${side.toLowerCase()}`,
        lineId: 'DFAL',
        nu: 14,
        nv: 76,
        renderOrder: 7,
        alphaScale: 0.95,
        spans: [
          {
            id: 'dfal-pec',
            v0: 0.0,
            v1: 0.24,
            complianceRatio: 0.72,
            coupledStrain: (mp) => {
              const prot = isR ? mp.girdleProtractR || 0 : mp.girdleProtractL || 0;
              const elev = isR ? mp.girdleElevateR || 0 : mp.girdleElevateL || 0;
              if (elev > 12) return ((elev - 12) / 10) * 0.11;
              return -Math.max(0, prot / 18) * 0.125;
            },
          },
          {
            id: 'dfal-arm',
            v0: 0.24,
            v1: 1.0,
            complianceRatio: 0.78,
            coupledStrain: (mp) => {
              const elb = isR ? mp.elbowFlexR || 0 : mp.elbowFlexL || 0;
              const elev = isR ? mp.girdleElevateR || 0 : mp.girdleElevateL || 0;
              const fw = isR ? mp.forearmWorkR || 0 : 0;
              if (elev > 12) return ((elev - 12) / 10) * 0.09;
              return -(Math.max(0, elb - 22) / 70) * 0.105 - fw * 0.085;
            },
          },
        ],
        stationEvalFn: (uNorm, v) => {
          const B_HUM = isR ? BONE.HUMERUS_R : BONE.HUMERUS_L;
          // 烏口突起の解剖学的ステーション座標（uNorm: -1 が外側・下部、+1 が内側・上部で肋骨ファン・上腕シートと向きを完全一致させ折れ・ねじれゼロ！）
          const pCoracoid = new THREE.Vector3(
            sSign * (0.50 - uNorm * 0.038),
            +1.96 + uNorm * 0.012,
            +0.072 + (1 - uNorm * uNorm) * 0.010,
          );
          if (v <= 0.22) {
            // 小胸筋膜ファン：第3〜5肋骨前面(THORAX_HIGH) ➔ 烏口突起(GIRDLE)
            const t = v / 0.22;
            const st = smoothstep(0, 1, t);
            const yRib = THREE.MathUtils.lerp(1.61 + uNorm * 0.12, 1.92 + uNorm * 0.015, st);
            const thRibR = THREE.MathUtils.lerp(Math.PI * 0.68 - uNorm * 0.07, Math.PI * 0.76 - uNorm * 0.045, st);
            const pRib = envelope.sampleTorso(
              yRib,
              isR ? thRibR : mirrorThetaToLeft(thRibR),
              0.0065,
            );
            const pos = pRib.lerp(pCoracoid, st);
            return {
              pos,
              skin: makeWeights([
                [BONE.THORAX_HIGH, 1 - st],
                [B_GIRDLE, st],
              ]),
              fiberType: 0.9,
              yBranch: (1 - st) * 0.65,
              retinaculum: 0,
            };
          }
          const p = evalProfileTable(DFAL_ARM_TABLE, v);
          const thR = p.thR - uNorm * p.span;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pArm = envelope.sampleArm(isR, p.y, th, 0.0055);
          if (v < 0.36) {
            // 烏口突起(GIRDLE) ➔ 上腕二頭筋短頭腱〜筋腹(HUMERUS) への滑らかな移行帯（ツイスト完全ゼロ！）
            const tHum = smoothstep(0.22, 0.36, v);
            const pos = pCoracoid.lerp(pArm, tHum);
            return {
              pos,
              skin: makeWeights([
                [B_GIRDLE, 1 - tHum],
                [B_HUM, tHum],
              ]),
              fiberType: 0.85,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos: pArm,
            skin: getArmChainSkin(isR, p.y, p.radW),
            fiberType: v > 0.64 ? 1.0 : 0.7,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.90 ? 0.7 : 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // -------------------------------------------------------------------------
    // 【7】SFAL: 表前アーム・ライン（鎖骨・胸骨・大胸筋膜 ➔ 肘内側上顆 ➔ 手根屈筋膜・手掌腱膜）
    // -------------------------------------------------------------------------
    const SFAL_ARM_TABLE = [
      { v: 0.28, y: +1.82, thR: Math.PI * 0.45, span: 0.26, radW: 0.3 },
      { v: 0.58, y: +0.93, thR: Math.PI * 0.16, span: 0.24, radW: 0.25 },
      { v: 0.84, y: +0.05, thR: Math.PI * 0.46, span: 0.30, radW: 0.55 },
      { v: 1.00, y: -0.24, thR: Math.PI * 0.50, span: 0.34, radW: 0.6 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `sfal-${side.toLowerCase()}`,
        lineId: 'SFAL',
        nu: 14,
        nv: 76,
        renderOrder: 8,
        alphaScale: 0.90,
        spans: [
          { id: 'sfal-pec', v0: 0.0, v1: 0.30, complianceRatio: 0.58 },
          {
            id: 'sfal-flex',
            v0: 0.30,
            v1: 1.0,
            complianceRatio: 0.66,
            coupledStrain: (mp) => (isR ? -(mp.forearmWorkR || 0) * 0.105 : 0),
          },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            // 大胸筋膜ファン：胸骨・鎖骨内側(THORAX_HIGH) ➔ 上腕骨大結節稜(HUMERUS)
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yChest = THREE.MathUtils.lerp(1.74 + uNorm * 0.24, 1.82, st);
            const thTorR = THREE.MathUtils.lerp(Math.PI * 0.55, Math.PI * 0.80, st);
            const pChest = envelope.sampleTorso(
              yChest,
              isR ? thTorR : mirrorThetaToLeft(thTorR),
              0.009,
            );
            const pArm = envelope.sampleArm(
              isR,
              1.82,
              isR ? Math.PI * 0.45 - uNorm * 0.26 : mirrorThetaToLeft(Math.PI * 0.45 - uNorm * 0.26),
              0.007,
            );
            const pos = pChest.lerp(pArm, st);
            const B_HUM = isR ? BONE.HUMERUS_R : BONE.HUMERUS_L;
            return {
              pos,
              skin: makeWeights([
                [BONE.THORAX_HIGH, 1 - st],
                [B_GIRDLE, Math.sin(st * Math.PI) * 0.25],
                [B_HUM, st],
              ]),
              fiberType: 0.85,
              yBranch: 1 - st,
              retinaculum: 0,
            };
          }
          const p = evalProfileTable(SFAL_ARM_TABLE, v);
          const thR = p.thR - uNorm * p.span;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleArm(isR, p.y, th, 0.007);
          return {
            pos,
            skin: getArmChainSkin(isR, p.y, p.radW),
            fiberType: v > 0.82 ? 1.0 : 0.65,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.89 ? 1.0 : 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // -------------------------------------------------------------------------
    // 【8】DBAL: 深後アーム・ライン（胸椎棘突起 ➔ 菱形筋膜・肩甲骨内側 ➔ 腱板・三頭筋膜 ➔ 尺骨・小指球）
    // -------------------------------------------------------------------------
    const DBAL_ARM_TABLE = [
      { v: 0.28, y: +1.92, thR: -Math.PI * 0.56, span: 0.26, radW: 0.15 },
      { v: 0.58, y: +0.92, thR: -Math.PI * 0.44, span: 0.24, radW: 0.0 },
      { v: 0.86, y: +0.04, thR: -Math.PI * 0.16, span: 0.22, radW: 0.0 },
      { v: 1.00, y: -0.22, thR: -Math.PI * 0.12, span: 0.24, radW: 0.1 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `dbal-${side.toLowerCase()}`,
        lineId: 'DBAL',
        nu: 14,
        nv: 76,
        renderOrder: 6,
        alphaScale: 0.94,
        spans: [
          { id: 'dbal-rhomboid', v0: 0.0, v1: 0.28, complianceRatio: 1.32 },
          { id: 'dbal-ulnar', v0: 0.28, v1: 1.0, complianceRatio: 0.78 },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            // 菱形筋膜〜棘下筋膜スパン：胸椎棘突起(THORAX_HIGH) ➔ 肩甲骨内側縁〜肩甲背側(GIRDLE)
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yBack = THREE.MathUtils.lerp(1.94 + uNorm * 0.18, 1.92, st);
            const thTorR = THREE.MathUtils.lerp(-Math.PI * 0.52, -Math.PI * 0.80, st);
            const pSpine = envelope.sampleTorso(
              yBack,
              isR ? thTorR : mirrorThetaToLeft(thTorR),
              0.007,
            );
            const pArm = envelope.sampleArm(
              isR,
              1.92,
              isR ? -Math.PI * 0.56 - uNorm * 0.26 : mirrorThetaToLeft(-Math.PI * 0.56 - uNorm * 0.26),
              0.006,
            );
            const pos = pSpine.lerp(pArm, Math.pow(st, 1.35));
            const wGirdle = smoothstep(0.28, 0.88, t);
            return {
              pos,
              skin: makeWeights([
                [BONE.THORAX_HIGH, 1 - wGirdle],
                [B_GIRDLE, wGirdle],
              ]),
              fiberType: 0.85,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          const p = evalProfileTable(DBAL_ARM_TABLE, v);
          const thR = p.thR - uNorm * p.span;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleArm(isR, p.y, th, 0.0055);
          return {
            pos,
            skin: getArmChainSkin(isR, p.y, p.radW),
            fiberType: v > 0.58 ? 0.95 : 0.65,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );

    // -------------------------------------------------------------------------
    // 【9】SBAL: 表後アーム・ライン（後頭骨・胸椎 ➔ 僧帽筋膜・肩峰 ➔ 三角筋膜・外側上顆 ➔ 手背伸筋膜）
    // -------------------------------------------------------------------------
    const SBAL_ARM_TABLE = [
      { v: 0.28, y: +2.04, thR: Math.PI * 1.02, span: 0.34, radW: 0.5 },
      { v: 0.58, y: +0.93, thR: Math.PI * 1.06, span: 0.24, radW: 0.6 },
      { v: 0.85, y: +0.05, thR: Math.PI * 1.46, span: 0.28, radW: 0.72 },
      { v: 1.00, y: -0.24, thR: Math.PI * 1.50, span: 0.32, radW: 0.75 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `sbal-${side.toLowerCase()}`,
        lineId: 'SBAL',
        nu: 14,
        nv: 78,
        renderOrder: 8,
        alphaScale: 0.90,
        spans: [
          { id: 'sbal-deltoid', v0: 0.0, v1: 0.52, complianceRatio: 0.58 },
          {
            id: 'sbal-extensor',
            v0: 0.52,
            v1: 1.0,
            complianceRatio: 0.62,
            coupledStrain: (mp) =>
              isR
                ? ((mp.pronationR || 0) / 90) * 0.135
                : ((mp.pronationL || 0) / 90) * 0.11,
          },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            // 僧帽筋膜ファン：後頭骨・頸胸椎棘突起 ➔ 肩甲棘・肩峰(GIRDLE)
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yTrap = THREE.MathUtils.lerp(2.18 + uNorm * 0.32, 2.04, st);
            const thTorR = THREE.MathUtils.lerp(Math.PI * 1.48, Math.PI * 1.06, st);
            const pNeckBack = envelope.sampleTorso(
              yTrap,
              isR ? thTorR : mirrorThetaToLeft(thTorR),
              0.009,
            );
            const pAcrom = envelope.sampleArm(
              isR,
              2.04,
              isR ? Math.PI * 1.02 - uNorm * 0.34 : mirrorThetaToLeft(Math.PI * 1.02 - uNorm * 0.34),
              0.007,
            );
            const pos = pNeckBack.lerp(pAcrom, st);
            const baseSkin = getBodyChainSkin(side, yTrap);
            return {
              pos,
              skin: makeWeights([
                [baseSkin.idx[0], (1 - st) * baseSkin.w[0]],
                [baseSkin.idx[1], (1 - st) * baseSkin.w[1]],
                [B_GIRDLE, st],
              ]),
              fiberType: 0.75,
              yBranch: 1 - st,
              retinaculum: 0,
            };
          }
          const p = evalProfileTable(SBAL_ARM_TABLE, v);
          const thR = p.thR - uNorm * p.span;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleArm(isR, p.y, th, 0.007);
          return {
            pos,
            skin: getArmChainSkin(isR, p.y, p.radW),
            fiberType: v > 0.58 ? 0.95 : 0.7,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.89 ? 1.0 : 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【10】バック・ファンクショナル・ライン（BFL: 広背筋膜〜胸腰筋膜交差〜反対側大殿筋・外側広筋膜）
  // ===========================================================================
  for (const sys of ['RtoL', 'LtoR']) {
    // 'RtoL': 右上腕・広背筋膜(R) ➔ 仙骨・胸腰筋膜正中交差 ➔ 左大殿筋・左大腿外側広筋膜(L)
    const armIsR = sys === 'RtoL';
    const legSide = armIsR ? 'L' : 'R';
    const isLegR = legSide === 'R';
    const B_HUM_ARM = armIsR ? BONE.HUMERUS_R : BONE.HUMERUS_L;
    const B_GIRD_ARM = armIsR ? BONE.GIRDLE_R : BONE.GIRDLE_L;

    const BFL_TABLE = [
      // v=0.00: 反対側（L）大腿骨中下部外側（外側広筋膜）
      { v: 0.00, y: -0.95, thLegL: -Math.PI * 0.10, thTorR: 0, span: 0.22, off: 0.011 },
      // v=0.24: 反対側（L）大殿筋表層膜
      { v: 0.24, y: -0.06, thLegL: -Math.PI * 0.34, thTorR: -Math.PI * 0.34, span: 0.28, off: 0.011 },
      // v=0.46: 仙骨〜胸腰筋膜正中交差（θ = -0.50π 背面中央！）
      { v: 0.46, y: +0.46, thLegL: -Math.PI * 0.50, thTorR: -Math.PI * 0.50, span: 0.24, off: 0.011 },
      // v=0.74: 元の側（R）広背筋膜わき腹後方（θ = -0.82π 右背外側）
      { v: 0.74, y: +1.34, thLegL: 0, thTorR: -Math.PI * 0.82, span: 0.28, off: 0.011 },
      // v=1.00: 元の側（R）上腕骨結節間溝（広背筋腱付着部）
      { v: 1.00, y: +1.82, thLegL: 0, thTorR: -Math.PI * 0.94, span: 0.20, off: 0.010 },
    ];

    registerSheet(
      buildSheetMesh({
        id: `bfl-${sys.toLowerCase()}`,
        lineId: 'BFL',
        nu: 14,
        nv: 80,
        renderOrder: 9,
        alphaScale: 0.92,
        spans: [{ id: 'bfl-diag', v0: 0, v1: 1, complianceRatio: 0.62 }],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(BFL_TABLE, v);
          if (v > 0.80) {
            const tArm = smoothstep(0.80, 1.0, v);
            const thTor = armIsR ? p.thTorR - uNorm * p.span : mirrorThetaToLeft(p.thTorR - uNorm * p.span);
            const pLat = envelope.sampleTorso(p.y, thTor, p.off);
            const pHum = envelope.sampleArm(
              armIsR,
              1.82,
              armIsR ? -Math.PI * 0.35 - uNorm * 0.22 : mirrorThetaToLeft(-Math.PI * 0.35 - uNorm * 0.22),
              0.008,
            );
            const pos = pLat.lerp(pHum, tArm);
            return {
              pos,
              skin: makeWeights([
                [BONE.THORAX_HIGH, 1 - tArm],
                [B_GIRD_ARM, Math.sin(tArm * Math.PI) * 0.25],
                [B_HUM_ARM, tArm],
              ]),
              fiberType: 1.0,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          const thLeg = isLegR ? mirrorThetaToLeft(p.thLegL - uNorm * p.span) : p.thLegL - uNorm * p.span;
          const thTor = armIsR ? p.thTorR - uNorm * p.span : mirrorThetaToLeft(p.thTorR - uNorm * p.span);
          const pos = envelope.sampleContinuum(legSide, p.y, thLeg, thTor, p.off);
          return {
            pos,
            skin: getBodyChainSkin(legSide, p.y),
            fiberType: v > 0.36 && v < 0.58 ? 1.0 : 0.75,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【11】フロント・ファンクショナル・ライン（FFL: 大胸筋下部〜腹直筋鞘・恥骨交差〜反対側長内転筋膜）
  // ===========================================================================
  for (const sys of ['RtoL', 'LtoR']) {
    // 'RtoL': 右上腕・大胸筋下部(R) ➔ 腹直筋鞘・恥骨結合正中交差 ➔ 左長内転筋膜(L)
    const armIsR = sys === 'RtoL';
    const legSide = armIsR ? 'L' : 'R';
    const sLeg = legSide === 'R' ? -1 : +1;
    const B_FEM_LEG = legSide === 'R' ? BONE.FEMUR_R : BONE.FEMUR_L;
    const B_HUM_ARM = armIsR ? BONE.HUMERUS_R : BONE.HUMERUS_L;
    const B_GIRD_ARM = armIsR ? BONE.GIRDLE_R : BONE.GIRDLE_L;

    registerSheet(
      buildSheetMesh({
        id: `ffl-${sys.toLowerCase()}`,
        lineId: 'FFL',
        nu: 14,
        nv: 76,
        renderOrder: 9,
        alphaScale: 0.92,
        spans: [{ id: 'ffl-diag', v0: 0, v1: 1, complianceRatio: 0.62 }],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.34) {
            // 反対側大腿骨粗線（内もも中央） ➔ 恥骨結合前面 (+Z)
            const t = v / 0.34;
            const st = smoothstep(0, 1, t);
            const y = THREE.MathUtils.lerp(-0.92, -0.04, st);
            const x = THREE.MathUtils.lerp(sLeg * 0.21, 0.0, st) + uNorm * 0.042;
            const z = THREE.MathUtils.lerp(+0.03, +0.16, st) + Math.abs(uNorm) * 0.01;
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: makeWeights([
                [B_FEM_LEG, 1 - st],
                [BONE.PELVIS, st],
              ]),
              fiberType: 0.9,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          if (v < 0.78) {
            // 恥骨結合 ➔ 腹直筋鞘外側縁 ➔ 第5・6肋軟骨（元の側 R）
            const t = (v - 0.34) / 0.44;
            const y = THREE.MathUtils.lerp(-0.04, +1.52, t);
            const thTorR = THREE.MathUtils.lerp(Math.PI * 0.50, Math.PI * 0.68, t) - uNorm * 0.16;
            const thTor = armIsR ? thTorR : mirrorThetaToLeft(thTorR);
            const pos = envelope.sampleTorso(y, thTor, 0.011);
            return {
              pos,
              skin: getBodyChainSkin(armIsR ? 'R' : 'L', y),
              fiberType: 1.0,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          // 大胸筋下部肋骨部 ➔ 上腕骨大結節稜
          const tArm = smoothstep(0.78, 1.0, v);
          const y = THREE.MathUtils.lerp(+1.52, +1.80, tArm);
          const thTorR = THREE.MathUtils.lerp(Math.PI * 0.68, Math.PI * 0.82, tArm) - uNorm * 0.18;
          const pChest = envelope.sampleTorso(y, armIsR ? thTorR : mirrorThetaToLeft(thTorR), 0.011);
          const pHum = envelope.sampleArm(
            armIsR,
            1.80,
            armIsR ? Math.PI * 0.46 - uNorm * 0.22 : mirrorThetaToLeft(Math.PI * 0.46 - uNorm * 0.22),
            0.008,
          );
          const pos = pChest.lerp(pHum, tArm);
          return {
            pos,
            skin: makeWeights([
              [BONE.THORAX_HIGH, 1 - tArm],
              [B_GIRD_ARM, Math.sin(tArm * Math.PI) * 0.25],
              [B_HUM_ARM, tArm],
            ]),
            fiberType: 0.9,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedThemeUniforms,
      }),
    );
  }

  // ===========================================================================
  // 6. ピン留め部（筋膜の癒着・付着ポイント）ゴールドピン生成
  // ===========================================================================
  const stationsGroup = new THREE.Group();
  stationsGroup.name = 'bony-stations';
  const pinCoreGeom = new THREE.SphereGeometry(0.017, 14, 12);
  const pinRingGeom = new THREE.TorusGeometry(0.028, 0.0042, 8, 22);
  const pinCoreMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C49A45'),
    roughness: 0.34,
    metalness: 0.35,
    emissive: new THREE.Color('#5A4114'),
    emissiveIntensity: 0.28,
  });
  const pinRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#B88E3E'),
    transparent: true,
    opacity: 0.78,
  });

  const stationNodes = BONY_STATIONS.map((st) => {
    const holder = new THREE.Group();
    holder.name = `station:${st.id}`;
    const core = new THREE.Mesh(pinCoreGeom, pinCoreMat);
    const ring = new THREE.Mesh(pinRingGeom, pinRingMat);
    core.renderOrder = 3;
    ring.renderOrder = 3;
    holder.add(core, ring);
    holder.position.set(st.pos[0], st.pos[1], st.pos[2]);
    stationsGroup.add(holder);
    return {
      def: st,
      holder,
      ring,
      restPos: new THREE.Vector3(st.pos[0], st.pos[1], st.pos[2]),
    };
  });
  group.add(stationsGroup);

  const activeLines = new Set(FASCIA_LINE_DEFS.filter((d) => d.defaultOn).map((d) => d.id));
  let showStations = true;

  const syncVisibility = () => {
    for (const sh of sheets) {
      sh.mesh.visible = activeLines.has(sh.lineId);
    }
    for (const node of stationNodes) {
      const relevant = node.def.lines.some((lid) => activeLines.has(lid));
      node.holder.visible = showStations && relevant;
    }
  };
  syncVisibility();

  // ---------------------------------------------------------------------------
  // 毎フレーム更新 ＆ 全26スパン・リアルタイム伸縮率メーター集計
  // ---------------------------------------------------------------------------
  const update = (boneMats, cameraQuat, motionParams = null) => {
    // 全シート非常に軽量（合計 <0.4ms）なため常時更新し、全26メーターがいつでも即座に正確応答する
    for (const sh of sheets) {
      sh.updateStrain(boneMats, motionParams);
    }

    if (showStations) {
      for (const node of stationNodes) {
        if (!node.holder.visible) continue;
        node.holder.position.copy(node.restPos).applyMatrix4(boneMats[node.def.bone]);
        if (cameraQuat) node.ring.quaternion.copy(cameraQuat);
      }
    }

    const llR = byId.get('ll-main-r');
    const llL = byId.get('ll-main-l');
    const neckScmR = byId.get('ll-neck-scm-r');
    const neckSplR = byId.get('ll-neck-spl-r');

    const dflTibR = byId.get('dfl-tibpost-r');
    const dflAddR = byId.get('dfl-adductor-psoas-r');
    const dflQlR = byId.get('dfl-ql-r');
    const dflDia = byId.get('dfl-diaphragm');
    const dflJawR = byId.get('dfl-neck-jaw-r');

    const sblR = byId.get('sbl-r');
    const sflR = byId.get('sfl-r');
    const splR = byId.get('spl-rtol');

    const dfalR = byId.get('dfal-r');
    const sfalR = byId.get('sfal-r');
    const dbalR = byId.get('dbal-r');
    const sbalR = byId.get('sbal-r');
    const bflR = byId.get('bfl-rtol');
    const fflR = byId.get('ffl-rtol');

    const isOverhead = motionParams && motionParams.presetId === 'overhead-reach';

    return {
      tflItbR: llR ? llR.getSpanStrain('tfl-itb') : 0,
      tflItbL: llL ? llL.getSpanStrain('tfl-itb') : 0,
      fibularR: llR ? llR.getSpanStrain('fibular') : 0,
      obliqueQlR:
        (llR ? llR.getSpanStrain('oblique') : 0) * 0.65 +
        (dflQlR ? dflQlR.getSpanStrain('ql') : 0) * 0.35,
      obliqueRibL:
        (llL ? llL.getSpanStrain('oblique') : 0) * 0.72 +
        (llL ? llL.getSpanStrain('intercostal') : 0) * 0.28,
      neckXR:
        ((neckScmR ? neckScmR.getSpanStrain('neck-scm') : 0) +
          (neckSplR ? neckSplR.getSpanStrain('neck-spl') : 0)) *
        0.5,

      adductorR: dflAddR ? dflAddR.getSpanStrain('adductor') : 0,
      dflIliopsoas: dflAddR ? dflAddR.getSpanStrain('iliopsoas') : 0,
      dflDiaphragm: dflDia ? dflDia.getSpanStrain('diaphragm') : 0,
      dflJawNeck: dflJawR ? dflJawR.getSpanStrain('jaw-neck') : 0,
      dflTibPost: dflTibR ? dflTibR.getSpanStrain('tibpost') : 0,

      sblPlantar: sblR ? sblR.getSpanStrain('sbl-plantar') : 0,
      sblHamCalf: sblR
        ? sblR.getSpanStrain('sbl-ham') * 0.6 + sblR.getSpanStrain('sbl-calf') * 0.4
        : 0,
      sblLumbar: sblR ? sblR.getSpanStrain('sbl-lumbar') : 0,
      sblUpperBack: sblR ? sblR.getSpanStrain('sbl-upperback') : 0,
      sblScalp: sblR ? sblR.getSpanStrain('sbl-scalp') : 0,

      sflQuadShin: sflR
        ? sflR.getSpanStrain('sfl-quad') * 0.65 + sflR.getSpanStrain('sfl-shin') * 0.35
        : 0,
      sflAbs: sflR ? sflR.getSpanStrain('sfl-abs') : 0,
      sflChestNeck: sflR ? sflR.getSpanStrain('sfl-chest-neck') : 0,

      splSlingR: splR ? splR.getSpanStrain('spl-sling') : 0,

      dfalPecThumbR: dfalR
        ? dfalR.getSpanStrain('dfal-pec') * 0.55 + dfalR.getSpanStrain('dfal-arm') * 0.45
        : 0,
      sfalPecFlexR: sfalR
        ? sfalR.getSpanStrain('sfal-pec') * 0.50 + sfalR.getSpanStrain('sfal-flex') * 0.50
        : 0,
      dbalRhomboidR: dbalR
        ? dbalR.getSpanStrain('dbal-rhomboid') * 0.68 + dbalR.getSpanStrain('dbal-ulnar') * 0.32
        : 0,
      sbalTrapExtR: sbalR
        ? isOverhead
          ? sbalR.getSpanStrain('sbal-deltoid')
          : sbalR.getSpanStrain('sbal-extensor') * 0.76 + sbalR.getSpanStrain('sbal-deltoid') * 0.24
        : 0,

      bflLatGluteR: bflR ? bflR.getSpanStrain('bfl-diag') : 0,
      fflPecAddR: fflR ? fflR.getSpanStrain('ffl-diag') : 0,
    };
  };

  return {
    group,
    sheets,
    setLineVisible(lineId, visible) {
      if (visible) activeLines.add(lineId);
      else activeLines.delete(lineId);
      syncVisibility();
    },
    setOnlyLines(lineIds = []) {
      activeLines.clear();
      for (const id of lineIds) activeLines.add(id);
      syncVisibility();
    },
    isLineVisible(lineId) {
      return activeLines.has(lineId);
    },
    setStationsVisible(v) {
      showStations = Boolean(v);
      syncVisibility();
    },
    isStationsVisible() {
      return showStations;
    },
    update,
  };
}
