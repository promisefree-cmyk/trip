import * as THREE from 'three';
export const BONE = Object.freeze({
  PELVIS: 0,
  LUMBAR: 1,
  THORAX_LOW: 2,
  THORAX_HIGH: 3,
  NECK: 4,
  HEAD: 5,
  FEMUR_R: 6,
  SHANK_R: 7,
  FOOT_R: 8,
  FEMUR_L: 9,
  SHANK_L: 10,
  FOOT_L: 11,
  GIRDLE_R: 12,
  HUMERUS_R: 13,
  ULNA_R: 14,
  RADIUS_R: 15,
  HAND_R: 16,
  GIRDLE_L: 17,
  HUMERUS_L: 18,
  ULNA_L: 19,
  RADIUS_L: 20,
  HAND_L: 21,
});
export const BONY_STATIONS = [
  { id: 'mt5-r', label: '右 第5中足骨底（足の外側）', pos: [-0.48, -3.22, +0.02], bone: BONE.FOOT_R, lines: ['LL'] },
  { id: 'mt1-r', label: '右 第1中足骨底（足裏あぶみ・土踏まず）', pos: [-0.29, -3.18, +0.15], bone: BONE.FOOT_R, lines: ['LL', 'SPL', 'SFL', 'DFL'] },
  { id: 'calc-r', label: '右 踵骨（かかとの付着部）', pos: [-0.34, -3.20, -0.18], bone: BONE.FOOT_R, lines: ['SBL'] },
  { id: 'mal-r', label: '右 外果（外くるぶし後方）', pos: [-0.44, -3.06, -0.20], bone: BONE.SHANK_R, lines: ['LL'] },
  { id: 'mmal-r', label: '右 内果後方（内くるぶし深層）', pos: [-0.25, -3.02, -0.12], bone: BONE.SHANK_R, lines: ['DFL'] },
  { id: 'fib-r', label: '右 腓骨頭（すね外側の上端）', pos: [-0.43, -1.72, -0.19], bone: BONE.SHANK_R, lines: ['LL', 'SPL'] },
  { id: 'gerdy-r', label: '右 ガーディ結節（腸脛靱帯の下端）', pos: [-0.41, -1.66, -0.05], bone: BONE.SHANK_R, lines: ['LL', 'SPL'] },
  { id: 'tibtub-r', label: '右 脛骨粗面（ひざ皿の下）', pos: [-0.31, -1.70, +0.11], bone: BONE.SHANK_R, lines: ['SFL'] },
  { id: 'gt-r', label: '右 大転子（太もも外側のピン留め部）', pos: [-0.56, -0.04, -0.10], bone: BONE.FEMUR_R, lines: ['LL', 'BFL'] },
  { id: 'ltroc-r', label: '右 小転子（腸腰筋膜の付着部）', pos: [-0.22, -0.16, -0.06], bone: BONE.FEMUR_R, lines: ['DFL'] },
  { id: 'asis-r', label: '右 上前腸骨棘（骨盤の前かど）', pos: [-0.38, +0.26, +0.16], bone: BONE.PELVIS, lines: ['LL', 'SPL', 'SFL'] },
  { id: 'crest-r', label: '右 腸骨稜（骨盤の上の縁）', pos: [-0.50, +0.56, -0.06], bone: BONE.PELVIS, lines: ['LL', 'DFL'] },
  { id: 'mt5-l', label: '左 第5中足骨底（足の外側）', pos: [+0.48, -3.22, +0.02], bone: BONE.FOOT_L, lines: ['LL'] },
  { id: 'calc-l', label: '左 踵骨（かかとの付着部）', pos: [+0.34, -3.20, -0.18], bone: BONE.FOOT_L, lines: ['SBL'] },
  { id: 'mal-l', label: '左 外果（外くるぶし後方）', pos: [+0.44, -3.06, -0.20], bone: BONE.SHANK_L, lines: ['LL'] },
  { id: 'fib-l', label: '左 腓骨頭（すね外側の上端）', pos: [+0.43, -1.72, -0.19], bone: BONE.SHANK_L, lines: ['LL', 'SPL'] },
  { id: 'gerdy-l', label: '左 ガーディ結節（腸脛靱帯の下端）', pos: [+0.41, -1.66, -0.05], bone: BONE.SHANK_L, lines: ['LL', 'SPL'] },
  { id: 'gt-l', label: '左 大転子（太もも外側のピン留め部）', pos: [+0.56, -0.04, -0.10], bone: BONE.FEMUR_L, lines: ['LL', 'BFL'] },
  { id: 'asis-l', label: '左 上前腸骨棘（骨盤の前かど）', pos: [+0.38, +0.26, +0.16], bone: BONE.PELVIS, lines: ['LL', 'SPL', 'SFL'] },
  { id: 'crest-l', label: '左 腸骨稜（骨盤の上の縁）', pos: [+0.50, +0.56, -0.06], bone: BONE.PELVIS, lines: ['LL', 'DFL'] },
  { id: 'pubis', label: '恥骨結合（お腹・内もものピン留め部）', pos: [0.0, -0.06, +0.14], bone: BONE.PELVIS, lines: ['DFL', 'SFL', 'FFL'] },
  { id: 'sacrum-tlf', label: '仙骨〜胸腰筋膜（背面のピン留め部）', pos: [0.0, +0.34, -0.18], bone: BONE.PELVIS, lines: ['SBL', 'BFL'] },
  { id: 'isch-r', label: '右 坐骨結節（もも裏筋膜の付着部）', pos: [-0.16, -0.18, -0.18], bone: BONE.PELVIS, lines: ['SBL'] },
  { id: 'isch-l', label: '左 坐骨結節（もも裏筋膜の付着部）', pos: [+0.16, -0.18, -0.18], bone: BONE.PELVIS, lines: ['SBL'] },
  { id: 'xiphoid', label: 'みぞおち・剣状突起（横隔膜と腹直筋の付着部）', pos: [0.0, +1.36, +0.18], bone: BONE.THORAX_LOW, lines: ['SFL', 'DFL', 'FFL'] },
  { id: 'rib10-r', label: '右 下部ろっ骨（第10肋骨外側）', pos: [-0.51, +1.18, -0.06], bone: BONE.THORAX_LOW, lines: ['LL', 'DFL', 'SPL'] },
  { id: 'rib10-l', label: '左 下部ろっ骨（第10肋骨外側）', pos: [+0.51, +1.18, -0.06], bone: BONE.THORAX_LOW, lines: ['LL', 'DFL', 'SPL'] },
  { id: 'rib4-r', label: '右 第3〜5ろっ骨前面（小胸筋膜の付着部）', pos: [-0.30, +1.68, +0.16], bone: BONE.THORAX_HIGH, lines: ['DFAL', 'SFAL', 'FFL'] },
  { id: 'rib4-l', label: '左 第3〜5ろっ骨前面（小胸筋膜の付着部）', pos: [+0.30, +1.68, +0.16], bone: BONE.THORAX_HIGH, lines: ['DFAL', 'SFAL', 'FFL'] },
  { id: 'clav-r', label: '右 鎖骨・胸骨柄（首前の付着部）', pos: [-0.09, +2.14, +0.14], bone: BONE.THORAX_HIGH, lines: ['LL', 'SFL', 'SFAL'] },
  { id: 'clav-l', label: '左 鎖骨・胸骨柄（首前の付着部）', pos: [+0.09, +2.14, +0.14], bone: BONE.THORAX_HIGH, lines: ['LL', 'SFL', 'SFAL'] },
  { id: 't4-spinous', label: '上部胸椎棘突起（菱形・僧帽筋膜の付着部）', pos: [0.0, +1.86, -0.21], bone: BONE.THORAX_HIGH, lines: ['DBAL', 'SBAL', 'SPL'] },
  { id: 'mast-r', label: '右 乳様突起（耳のうしろの骨）', pos: [-0.21, +2.72, -0.08], bone: BONE.HEAD, lines: ['LL', 'SPL', 'SFL', 'DFL'] },
  { id: 'mast-l', label: '左 乳様突起（耳のうしろの骨）', pos: [+0.21, +2.72, -0.08], bone: BONE.HEAD, lines: ['LL', 'SPL', 'SFL', 'DFL'] },
  { id: 'inion', label: '後頭隆起（首うしろ〜頭皮腱膜の付着部）', pos: [0.0, +2.74, -0.19], bone: BONE.HEAD, lines: ['SBL', 'SBAL'] },
  { id: 'brow', label: '眉の上・前頭骨（バック・ライン上端）', pos: [0.0, +2.92, +0.16], bone: BONE.HEAD, lines: ['SBL'] },
  { id: 'mandible-ang', label: '下あご角・舌骨（深層あごラインの付着部）', pos: [-0.13, +2.56, +0.06], bone: BONE.HEAD, lines: ['DFL'] },
  { id: 'coracoid-r', label: '右 烏口突起（鎖骨下のピン留め部）', pos: [-0.50, +1.96, +0.06], bone: BONE.GIRDLE_R, lines: ['DFAL'] },
  { id: 'acromion-r', label: '右 肩峰・肩甲棘（肩の屋根）', pos: [-0.71, +2.08, -0.10], bone: BONE.GIRDLE_R, lines: ['SBAL'] },
  { id: 'medscap-r', label: '右 肩甲骨内側縁（背中側の付着部）', pos: [-0.27, +1.80, -0.22], bone: BONE.GIRDLE_R, lines: ['DBAL', 'SPL'] },
  { id: 'humcrest-r', label: '右 上腕骨結節稜（広背・大胸筋膜の付着部）', pos: [-0.75, +1.82, -0.02], bone: BONE.HUMERUS_R, lines: ['SFAL', 'BFL', 'FFL'] },
  { id: 'medepi-r', label: '右 内側上顆（肘の内側の付着部）', pos: [-0.79, +0.93, -0.11], bone: BONE.HUMERUS_R, lines: ['SFAL'] },
  { id: 'latepi-r', label: '右 外側上顆（肘の外側の付着部）', pos: [-0.94, +0.93, -0.12], bone: BONE.HUMERUS_R, lines: ['SBAL'] },
  { id: 'thenar-r', label: '右 橈骨茎状突起〜母指球（親指側の付着部）', pos: [-1.06, -0.12, +0.12], bone: BONE.HAND_R, lines: ['DFAL', 'SFAL'] },
  { id: 'hypothenar-r', label: '右 尺骨頭〜小指球（小指側の付着部）', pos: [-1.02, -0.16, +0.03], bone: BONE.HAND_R, lines: ['DBAL', 'SBAL'] },
  { id: 'coracoid-l', label: '左 烏口突起（鎖骨下のピン留め部）', pos: [+0.50, +1.96, +0.06], bone: BONE.GIRDLE_L, lines: ['DFAL'] },
  { id: 'acromion-l', label: '左 肩峰・肩甲棘（肩の屋根）', pos: [+0.71, +2.08, -0.10], bone: BONE.GIRDLE_L, lines: ['SBAL'] },
  { id: 'medscap-l', label: '左 肩甲骨内側縁（背中側の付着部）', pos: [+0.27, +1.80, -0.22], bone: BONE.GIRDLE_L, lines: ['DBAL', 'SPL'] },
  { id: 'thenar-l', label: '左 橈骨茎状突起〜母指球', pos: [+1.06, -0.12, +0.12], bone: BONE.HAND_L, lines: ['DFAL', 'SFAL'] },
];
export const FASCIA_LINE_DEFS = [
  { id: 'LL', name: 'ラテラル・ライン（体側・腸脛靱帯）', shortName: 'ラテラル（体側）', group: '体幹・脚の基本5ライン', subtitle: '足底あぶみ〜腓骨筋膜〜腸脛靱帯・大腿筋膜張筋膜〜脇腹〜ろっ骨〜首のX字帯', defaultOn: true, baseOpacity: 1.0, accentHex: '#0284C7' },
  { id: 'DFL', name: 'ディープ・フロント（体の芯・内もも〜横隔膜〜あご）', shortName: 'ディープ・フロント', group: '体幹・脚の基本5ライン', subtitle: '土踏まず奥〜内転筋膜〜腸腰筋膜・腰方形筋膜〜横隔膜ドーム〜首の奥・あご', defaultOn: true, baseOpacity: 0.84, accentHex: '#0D9488' },
  { id: 'SBL', name: 'バック・ライン（足裏〜もも裏〜背中〜おでこ）', shortName: 'バック（背面）', group: '体幹・脚の基本5ライン', subtitle: '足底腱膜〜アキレス腱〜もも裏〜胸腰筋膜〜背骨わき〜頭頂の帽状腱膜〜眉上', defaultOn: true, baseOpacity: 0.92, accentHex: '#0369A1' },
  { id: 'SFL', name: 'フロント・ライン（すね前〜前もも〜お腹〜首前）', shortName: 'フロント（前面）', group: '体幹・脚の基本5ライン', subtitle: '前脛骨筋膜〜大腿四頭筋膜〜腹直筋鞘・白線〜胸骨筋膜〜胸鎖乳突筋膜', defaultOn: true, baseOpacity: 0.92, accentHex: '#0891B2' },
  { id: 'SPL', name: 'スパイラル・ライン（全身を巻くらせんの帯）', shortName: 'スパイラル（らせん）', group: '体幹・脚の基本5ライン', subtitle: '後頭骨〜反対の肩甲骨・わき下〜おへそ斜め交差〜骨盤前〜腸脛靱帯〜足裏', defaultOn: true, baseOpacity: 0.92, accentHex: '#2563EB' },
  { id: 'DFAL', name: '深前アーム・ライン（鎖骨下・小胸筋膜〜力こぶ〜親指）', shortName: '深前アーム（親指）', group: '肩・腕・手のアーム4ライン', subtitle: 'ろっ骨前〜小胸筋膜（烏口突起）〜力こぶの膜〜前腕の親指側〜母指球', defaultOn: true, baseOpacity: 0.95, accentHex: '#0EA5E9' },
  { id: 'SFAL', name: '表前アーム・ライン（大胸筋膜〜肘内側〜手のひら）', shortName: '表前アーム（手のひら）', group: '肩・腕・手のアーム4ライン', subtitle: '鎖骨・胸骨（大胸筋膜）〜腕の内側〜肘の内側〜手首を曲げる膜〜手のひら', defaultOn: true, baseOpacity: 0.90, accentHex: '#06B6D4' },
  { id: 'DBAL', name: '深後アーム・ライン（肩甲骨のあいだ〜二の腕裏〜小指）', shortName: '深後アーム（肩甲骨内）', group: '肩・腕・手のアーム4ライン', subtitle: '背骨〜菱形筋膜（肩甲骨の内側）〜肩の深層膜〜二の腕うしろ〜尺骨〜小指側', defaultOn: true, baseOpacity: 0.94, accentHex: '#3B82F6' },
  { id: 'SBAL', name: '表後アーム・ライン（肩上〜三角筋膜〜肘外側〜手首甲）', shortName: '表後アーム（肘外・手甲）', group: '肩・腕・手のアーム4ライン', subtitle: '後頭骨・背骨（僧帽筋膜）〜肩峰・三角筋膜〜肘の外側〜手首の甲〜指の背', defaultOn: true, baseOpacity: 0.90, accentHex: '#6366F1' },
  { id: 'BFL', name: 'バック機能ライン（わき下・広背筋膜〜反対のお尻横）', shortName: 'バック機能（背面対角）', group: '対角スイング機能2ライン', subtitle: '腕の付け根〜広背筋膜〜腰のひし形膜を斜めに横断〜反対側の大殿筋・外もも', defaultOn: true, baseOpacity: 0.92, accentHex: '#1D4ED8' },
  { id: 'FFL', name: 'フロント機能ライン（胸の下部〜恥骨〜反対の内もも）', shortName: 'フロント機能（前面対角）', group: '対角スイング機能2ライン', subtitle: '腕の付け根〜大胸筋下部〜腹直筋鞘・恥骨を斜めに横断〜反対側の内もも膜', defaultOn: true, baseOpacity: 0.92, accentHex: '#14B8A6' },
];
const ARM_MUSCLE_SET = new Set([
  'deltoid', 'supraspinatus', 'infraspinatus', 'teres-minor', 'teres-major', 'subscapularis',
  'biceps-brachii', 'brachialis', 'coracobrachialis', 'triceps-brachii', 'anconeus',
  'brachioradialis', 'pronator-teres', 'flexor-carpi-radialis', 'palmaris-longus',
  'flexor-carpi-ulnaris', 'flexor-digitorum-superficialis', 'flexor-digitorum-profundus',
  'flexor-pollicis-longus', 'pronator-quadratus', 'supinator', 'extensor-carpi-radialis-longus',
  'extensor-carpi-radialis-brevis', 'extensor-digitorum', 'extensor-digiti-minimi',
  'extensor-carpi-ulnaris', 'abductor-pollicis-longus', 'extensor-pollicis-brevis',
  'extensor-pollicis-longus', 'extensor-indicis', 'abductor-pollicis-brevis',
  'flexor-pollicis-brevis', 'opponens-pollicis', 'adductor-pollicis',
  'abductor-digiti-minimi-hand', 'flexor-digiti-minimi-brevis-hand',
  'opponens-digiti-minimi-hand', 'lumbricals-hand', 'palmar-interossei', 'dorsal-interossei-hand',
]);
function isArmBoneId(id = '') {
  return /(humerus|radius|ulna|carpal|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|thumb|finger|hand)/.test(id);
}
function smoothstep(e0, e1, x) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
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
function getTorsoAxisCenter(y) {
  let cz = -0.04;
  if (y < 0.55) cz = -0.045;
  else if (y < 2.05) cz = -0.035;
  else if (y < 2.50) cz = -0.055;
  else cz = -0.045;
  return { cx: 0, cz };
}
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
    const rx = 0.052;
    const rz = 0.036;
    return (rx * rz) / Math.hypot(rx * sinT, rz * cosT);
  }
  if (y < 0.92) {
    const t = (y - 0.02) / 0.90;
    return THREE.MathUtils.lerp(0.046, 0.084, t);
  }
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
  const pLegTmp = new THREE.Vector3();
  const pTorTmp = new THREE.Vector3();
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
      this.sampleLeg(isRight, y, thetaLeg, offset, pLegTmp);
      this.sampleTorso(y, thetaTorso, offset, pTorTmp);
      out.lerpVectors(pLegTmp, pTorTmp, t);
      if (isRight) {
        out.x = Math.min(out.x, THREE.MathUtils.lerp(pLegTmp.x, pTorTmp.x, t) - 0.002);
      } else {
        out.x = Math.max(out.x, THREE.MathUtils.lerp(pLegTmp.x, pTorTmp.x, t) + 0.002);
      }
      return out;
    },
  };
}