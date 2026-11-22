import * as THREE from 'three';
export const SELFCARE_GUIDE_VERSION = '20261122a';
export const R_BALL = 0.102;
export const R_ROLLER = 0.096;
export const L_ROLLER = 0.38;
const noRaycast = () => {};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth01 = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-6));
  return t * t * (3 - 2 * t);
};
export const TOOL_DEFS = Object.freeze({
  hand: Object.freeze({
    id: 'hand',
    label: '🤲 指でやる',
    shortTag: '［指でケア］',
    delicateBadge: '🤲 指でやさしくケア（強い器具は使いません）',
  }),
  ball: Object.freeze({
    id: 'ball',
    label: '🎾 ボール',
    shortTag: '［ボール］',
  }),
  roller: Object.freeze({
    id: 'roller',
    label: '🛞 ローラー',
    shortTag: '［ローラー］',
  }),
});
export const TOOL_ORDER = Object.freeze(['hand', 'ball', 'roller']);
const DELICATE_HAND_ONLY_PATTERNS = [
  /^sternocleidomastoid$/,
  /^scalenus-/,
  /^platysma$/,
  /^longus-(colli|capitis)$/,
  /^(infrahyoid|suprahyoid|sternohyoid|sternothyroid|omohyoid|thyrohyoid|mylohyoid|geniohyoid|digastric|stylohyoid)$/,
  /^(masseter|temporalis|medial-pterygoid|lateral-pterygoid|zygomaticus-major|zygomaticus-minor|frontalis|orbicularis-oculi|orbicularis-oris|buccinator)$/,
  /^(pectoralis-minor|subclavius|subscapularis|diaphragm|transversus-thoracis)$/,
  /^(psoas-major|psoas-minor|iliacus)$/,
  /^(scm-neck-front|jaw-hyoid|pec-minor-r|sternum-clavicle|diaphragm-rib|groin-psoas)$/,
];
const HAND_WRIST_FOREARM_PATTERNS = [
  /^(abductor-pollicis|flexor-pollicis|opponens-pollicis|adductor-pollicis)/,
  /^(flexor-carpi|extensor-carpi|palmaris|flexor-digitorum-superficialis|flexor-digitorum-profundus|extensor-digitorum|extensor-indicis|extensor-digiti-minimi)/,
  /^(brachioradialis|pronator-teres|pronator-quadratus|supinator|anconeus)/,
  /^(abductor-digiti-minimi-hand|flexor-digiti-minimi-brevis-hand|opponens-digiti-minimi-hand|lumbricals-hand|palmar-interossei|dorsal-interossei-hand)$/,
  /^(thumb-wrist-r|forearm-inner-r)$/,
];
const PLANTAR_FOOT_PATTERNS = [
  /^(plantar|flexor-digitorum-brevis|abductor-hallucis|abductor-digiti-minimi-foot|quadratus-plantae|flexor-hallucis|adductor-hallucis|lumbricals-foot|tibialis-posterior)/,
  /^plantar-sole-r$/,
];
const ROLLER_DEFAULT_PATTERNS = [
  /^(rectus-femoris|vastus-lateralis|vastus-medialis|vastus-intermedius|sartorius)$/,
  /^(tensor-fasciae-latae|adductor-longus|adductor-magnus|adductor-brevis|adductor-minimus|pectineus|gracilis)$/,
  /^(biceps-femoris|semitendinosus|semimembranosus)$/,
  /^(gastrocnemius|soleus|calcaneal-tendon|plantaris|tibialis-anterior|fibularis-longus|fibularis-brevis|fibularis-tertius|extensor-digitorum-longus)$/,
  /^(external-oblique|latissimus-dorsi|longissimus|iliocostalis|spinalis|erector-spinae|biceps-brachii|triceps-brachii|brachialis|rectus-abdominis)$/,
  /^(front-thigh-shin|outer-hip-r|inner-thigh-r|fibula-outer-r|flank-r)$/,
];
function matchesAny(id, patterns) {
  return patterns.some((re) => re.test(id));
}
/**
 * 対象部位ID（筋肉ID または fascia-only の zoomKey）から許可される道具リストと初期推奨道具を返す
 * @param {string} targetKeyOrMuscleId
 * @returns {{ allowedTools: string[], defaultTool: 'hand'|'ball'|'roller', isDelicate: boolean }}
 */
export function getAllowedToolsAndDefault(targetKeyOrMuscleId) {
  const id = String(targetKeyOrMuscleId || '').trim().toLowerCase();
  if (!id) {
    const list = ['hand', 'ball', 'roller'];
    return { allowedTools: list, allowed: list, defaultTool: 'ball', isDelicate: false };
  }
  if (matchesAny(id, DELICATE_HAND_ONLY_PATTERNS)) {
    const list = ['hand'];
    return { allowedTools: list, allowed: list, defaultTool: 'hand', isDelicate: true };
  }
  if (matchesAny(id, HAND_WRIST_FOREARM_PATTERNS)) {
    const list = ['hand', 'ball'];
    return { allowedTools: list, allowed: list, defaultTool: 'hand', isDelicate: false };
  }
  if (matchesAny(id, PLANTAR_FOOT_PATTERNS)) {
    const list = ['hand', 'ball'];
    return { allowedTools: list, allowed: list, defaultTool: 'ball', isDelicate: false };
  }
  if (matchesAny(id, ROLLER_DEFAULT_PATTERNS)) {
    const list = ['hand', 'ball', 'roller'];
    return { allowedTools: list, allowed: list, defaultTool: 'roller', isDelicate: false };
  }
  const list = ['hand', 'ball', 'roller'];
  return { allowedTools: list, allowed: list, defaultTool: 'ball', isDelicate: false };
}
/**
 * 対象部位と選択ツールから、3Dハンド形状・モーション・支持面パネル・スケール・日本語1行ガイドを解決する
 */
export function resolveCareProfile(targetKeyOrMuscleId, requestedTool = null, fallbackPartName = '') {
  const id = String(targetKeyOrMuscleId || '').trim().toLowerCase();
  const rule = getAllowedToolsAndDefault(id);
  const rawReq = String(requestedTool || '').trim().toLowerCase();
  const normalizedReq = rawReq === 'pole' ? 'roller' : rawReq;
  const tool = rule.allowedTools.includes(normalizedReq) ? normalizedReq : rule.defaultTool;
  let handPose = 'fingers';
  let motion = tool === 'hand' ? 'stroke' : tool === 'roller' ? 'roll' : 'circle';
  let supportSurface = 'none';
  let scale = 1.0;
  let strokeSpan = 1.0;
  let guideText = '';
  const partLabel = fallbackPartName || '気になる場所';
  if (matchesAny(id, HAND_WRIST_FOREARM_PATTERNS)) {
    handPose = 'thumb';
    scale = /pollicis|thumb-wrist/.test(id) ? 0.90 : 0.95;
    strokeSpan = /pollicis|thumb-wrist/.test(id) ? 0.65 : 0.82;
    supportSurface = 'none';
    if (tool === 'hand') {
      motion = 'glide';
      guideText = /pollicis|thumb-wrist/.test(id)
        ? '親指の腹でふくらみを押さえたまま、反対の手首をゆっくり反らしたり曲げたりします（30秒）'
        : '親指の腹で気持ちいい場所を押さえたまま、手首をゆっくり反らしたり曲げたりします（30秒）';
    } else {
      motion = 'roll';
      guideText = /pollicis|thumb-wrist/.test(id)
        ? '親指の付け根のふくらみにボールを当て、やさしくコロコロ転がします（30秒）'
        : '前腕の気持ちいい場所にボールを当て、手首の力を抜いてコロコロ転がします（30秒）';
    }
  }
  else if (/^(pectoralis-minor|subclavius|pec-minor-r|sternum-clavicle)$/.test(id)) {
    handPose = 'fingers';
    motion = 'stroke';
    supportSurface = 'none';
    scale = 0.92;
    strokeSpan = 0.85;
    guideText = /sternum-clavicle/.test(id)
      ? '4本の指の腹を胸の真ん中にそっと添え、鎖骨の下に沿ってやさしくさすり流します（30秒）'
      : '4本の指の腹を鎖骨の下のくぼみに添え、胸の真ん中から肩先へやさしくさすり流します（30秒）';
  }
  else if (/^(sternocleidomastoid|scalenus-|platysma|longus-|scm-neck-front)/.test(id)) {
    handPose = 'fingers';
    motion = 'stroke';
    supportSurface = 'none';
    scale = 0.86;
    strokeSpan = 0.76;
    guideText = '4本の指を耳の下から鎖骨の上へそっと添え、皮膚をやさしくなで下ろします（※強く押しません）';
  }
  else if (/^(masseter|temporalis|medial-pterygoid|lateral-pterygoid|mylohyoid|digastric|jaw-hyoid)/.test(id)) {
    handPose = 'fingers';
    motion = 'circle';
    supportSurface = 'none';
    scale = 0.82;
    strokeSpan = 0.65;
    guideText = '奥歯の力を抜いて少し隙間をあけ、指の腹であご横からこめかみをくるくるゆるめます（30秒）';
  }
  else if (/^(diaphragm|transversus-thoracis|diaphragm-rib)$/.test(id)) {
    handPose = 'fingers';
    motion = 'circle';
    supportSurface = 'none';
    scale = 0.92;
    strokeSpan = 0.72;
    guideText = 'ろっ骨の下のやわらかい部分に4本の指をそっと添え、息をゆっくり吐きながらゆるめます（30秒）';
  }
  else if (/^(psoas-major|psoas-minor|iliacus|groin-psoas)$/.test(id)) {
    handPose = 'fingers';
    motion = 'circle';
    supportSurface = 'none';
    scale = 0.94;
    strokeSpan = 0.72;
    guideText = 'ひざを軽く曲げてお腹の力を抜き、脚の付け根の少し内側に指を添えて深呼吸しながらゆるめます（30秒）';
  }
  else if (/^(rhomboid-major|rhomboid-minor|between-scapula|infraspinatus|teres-minor|teres-major|trapezius|levator-scapulae)$/.test(id)) {
    handPose = 'fingers';
    scale = 0.94;
    strokeSpan = 0.90;
    supportSurface = 'none';
    if (tool === 'ball') {
      motion = /rhomboid|between-scapula/.test(id) ? 'roll' : 'circle';
      guideText = /rhomboid|between-scapula/.test(id)
        ? '肩甲骨の内側（背中のあいだ）にボールを当て、上下に小さく転がしてほぐします（30秒）'
        : '肩甲骨まわりにボールを当て、痛気持ちいい強さでくるくるほぐします（30秒）';
    } else if (tool === 'roller') {
      motion = 'roll';
      guideText = '背中の上側にローラーを当て、肩甲骨のあいだをゆっくり上下に転がします（30秒）';
    } else {
      motion = 'circle';
      guideText = '反対の手を前から肩越しに回し、指先で肩甲骨まわりを押さえながら肩をゆっくり回します（30秒）';
    }
  }
  else if (/^(splenius-|semispinalis|rectus-capitis-posterior|obliquus-capitis)/.test(id)) {
    handPose = 'thumb';
    scale = 0.86;
    strokeSpan = 0.68;
    supportSurface = 'none';
    if (tool === 'ball') {
      motion = 'circle';
      guideText = '頭のうしろのくぼみにボールを当て、深呼吸しながら小さくくるくるゆるめます（30秒）';
    } else if (tool === 'roller') {
      motion = 'roll';
      guideText = '首のうしろから頭の付け根にローラーを当て、やさしく上下に転がします（30秒）';
    } else {
      motion = 'circle';
      guideText = '両手の親指を頭のうしろのくぼみに添え、深呼吸しながら小さく円を描いてゆるめます（30秒）';
    }
  }
  else if (matchesAny(id, PLANTAR_FOOT_PATTERNS)) {
    handPose = 'thumb';
    scale = 0.86;
    strokeSpan = 0.88;
    supportSurface = 'none';
    if (tool === 'ball') {
      motion = 'roll';
      guideText = '土踏まずからかかと前にボールを当て、前後にコロコロ転がしてほぐします（30秒）';
    } else {
      motion = 'glide';
      guideText = 'イスに座って土踏まずを親指の腹で押さえたまま、足の指と足首をゆっくり動かします（30秒）';
    }
  }
  else if (/^(rectus-femoris|vastus-|sartorius|tensor-fasciae-latae|adductor-|pectineus|gracilis|front-thigh-shin|outer-hip-r|inner-thigh-r)/.test(id)) {
    handPose = 'fingers';
    scale = 0.96;
    strokeSpan = 1.02;
    supportSurface = 'none';
    const areaJa = /tensor-fasciae|vastus-lateralis|outer-hip/.test(id)
      ? '骨盤の横から外もも'
      : /adductor|pectineus|gracilis|inner-thigh/.test(id)
        ? '内もも'
        : '太ももの前側';
    if (tool === 'roller') {
      motion = 'roll';
      guideText = `${areaJa}にローラーを当て、ひざへ向けてゆっくり往復転がします（30秒）`;
    } else if (tool === 'ball') {
      motion = 'circle';
      guideText = `${areaJa}の硬い場所にボールを当て、小さく円を描いてほぐします（30秒）`;
    } else {
      motion = 'stroke';
      guideText = `座った姿勢で${areaJa}に4本の指の腹を添え、ひざへ向けてやさしくさすり流します（30秒）`;
    }
  }
  else if (/^(external-oblique|internal-oblique|quadratus-lumborum|latissimus-dorsi|serratus-anterior|flank-r|armpit-lat-r|chest-oblique-sling)$/.test(id)) {
    handPose = 'fingers';
    scale = 0.94;
    strokeSpan = 0.90;
    supportSurface = 'none';
    const areaJa = /latissimus|armpit/.test(id) ? 'わきの下の後ろ側' : /chest-oblique/.test(id) ? '胸の外側からろっ骨横' : '脇腹';
    if (tool === 'roller') {
      motion = 'roll';
      guideText = `片腕を上げて${areaJa}を伸ばし、ローラーを当ててやさしく上下に転がします（30秒）`;
    } else if (tool === 'ball') {
      motion = 'circle';
      guideText = `片腕を上げて${areaJa}を伸ばし、ボールを当てて小さくくるくるほぐします（30秒）`;
    } else {
      motion = 'stroke';
      guideText = `片腕を頭の上へ上げて${areaJa}を伸ばし、4本の指の腹でろっ骨から骨盤へさすり流します（30秒）`;
    }
  }
  else if (/^(gluteus-|piriformis|biceps-femoris|semitendinosus|semimembranosus|ischium-ham)/.test(id)) {
    handPose = 'thumb';
    scale = 0.96;
    strokeSpan = 0.94;
    supportSurface = 'none';
    const isHam = /femoris|semitendinosus|semimembranosus|ischium-ham/.test(id);
    if (tool === 'roller') {
      motion = 'roll';
      guideText = isHam
        ? 'もも裏にローラーを当て、お尻の下からひざ裏の手前までゆっくり転がします（30秒）'
        : 'お尻の筋肉にローラーを当て、ゆっくり前後に転がしてゆるめます（30秒）';
    } else if (tool === 'ball') {
      motion = 'circle';
      guideText = isHam
        ? 'もも裏の付け根にボールを当て、小さく円を描くようにほぐします（30秒）'
        : 'お尻のえくぼ周りにボールを当て、呼吸を止めずに小さく円を描いてゆるめます（30秒）';
    } else {
      motion = 'circle';
      guideText = isHam
        ? 'イスに座ってもも裏に両手の指を添え、ひざを軽く動かしながらやさしくほぐします（30秒）'
        : 'お尻のえくぼの周りに親指を添え、体重を左右にゆらしながらやさしくゆるめます（30秒）';
    }
  }
  else if (/^(gastrocnemius|soleus|calcaneal-tendon|tibialis-anterior|fibularis-|fibula-outer-r)/.test(id)) {
    handPose = /tibialis|fibularis|fibula/.test(id) ? 'thumb' : 'fingers';
    scale = 0.92;
    strokeSpan = 0.94;
    supportSurface = 'none';
    const isShin = /tibialis|fibularis|fibula/.test(id);
    if (tool === 'roller') {
      motion = 'roll';
      guideText = isShin
        ? 'すねの外側にローラーを当て、足首の力を抜いてゆっくり往復転がします（30秒）'
        : 'ふくらはぎにローラーを当て、足首からひざ下までゆっくり転がします（30秒）';
    } else if (tool === 'ball') {
      motion = 'roll';
      guideText = isShin
        ? 'すねの外側にボールを当て、足首をゆっくり動かしながらコロコロほぐします（30秒）'
        : 'ふくらはぎにボールを当て、足首からひざ下へコロコロ転がしてほぐします（30秒）';
    } else {
      motion = isShin ? 'glide' : 'stroke';
      guideText = isShin
        ? 'イスに座ってすねの外側を親指で押さえたまま、足首をゆっくり反らしたり曲げたりします（30秒）'
        : 'イスに座ってふくらはぎを両手の指で包み、足首からひざ裏へ向けてやさしくさすり上げます（30秒）';
    }
  }
  else {
    const isArm = /biceps-brachii|triceps-brachii|brachialis|deltoid/.test(id);
    handPose = 'fingers';
    scale = isArm ? 0.86 : 0.92;
    strokeSpan = 0.88;
    supportSurface = 'none';
    if (tool === 'roller') {
      motion = 'roll';
      guideText = `${partLabel}にローラーを当て、呼吸を続けながらゆっくり前後に転がします（30秒）`;
    } else if (tool === 'ball') {
      motion = 'circle';
      guideText = `${partLabel}にボールを当て、痛気持ちいい強さでくるくるゆるめます（30秒）`;
    } else {
      motion = 'stroke';
      guideText = `${partLabel}に4本の指の腹をそっと添え、筋膜の流れに沿ってやさしくさすり流します（30秒）`;
    }
  }
  return {
    id,
    tool,
    allowedTools: rule.allowedTools,
    defaultTool: rule.defaultTool,
    isDelicate: rule.isDelicate,
    handPose,
    motion,
    supportSurface,
    scale,
    strokeSpan,
    guideText,
    toolLabel: TOOL_DEFS[tool]?.label || TOOL_DEFS.ball.label,
    shortTag: TOOL_DEFS[tool]?.shortTag || TOOL_DEFS.ball.shortTag,
  };
}
function sminCubic(a, b, k) {
  if (k <= 1e-6) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * h * k * (1.0 / 6.0);
}
function clampVal(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function sdCapsule2D(px, py, ax, ay, bx, by, rA, rB) {
  const bax = bx - ax;
  const bay = by - ay;
  const pax = px - ax;
  const pay = py - ay;
  const lenSq = bax * bax + bay * bay || 1e-8;
  const h = clampVal((pax * bax + pay * bay) / lenSq, 0.0, 1.0);
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const r = rA + (rB - rA) * h;
  return Math.sqrt(dx * dx + dy * dy) - r;
}
function sdRoundBox2D(px, py, cx, cy, hx, hy, rad) {
  const dx = Math.abs(px - cx) - hx;
  const dy = Math.abs(py - cy) - hy;
  const ox = Math.max(dx, 0.0);
  const oy = Math.max(dy, 0.0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0.0) - rad;
}
function sdOrientedRoundBox2D(px, py, cx, cy, hx, hy, rad, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const rx = (px - cx) * c + (py - cy) * s;
  const ry = -(px - cx) * s + (py - cy) * c;
  return sdRoundBox2D(rx, ry, 0.0, 0.0, hx, hy, rad);
}
/**
 * 2DシルエットSDFから「パーツの継ぎ目ゼロ・単一閉曲面」の滑らかな3Dピローアイコンメッシュを生成
 * Dual Surface Nets ＋ 固定長TypedArray版Taubin体積保存スムージングにより高速・完全一体成形を実現
 */
function buildSeamlessPillowedHandGeometry({
  sdf2D,
  archZFn,
  rEdge = 0.0094,
  domeAmp = 0.0054,
  bounds,
  nx = 56,
  ny = 66,
  nz = 28,
  smoothPasses = 6,
}) {
  const [minX, maxX, minY, maxY, minZ, maxZ] = bounds;
  const dx = (maxX - minX) / nx;
  const dy = (maxY - minY) / ny;
  const dz = (maxZ - minZ) / nz;
  const sx = nx + 1;
  const sy = ny + 1;
  const sz = nz + 1;
  const strideY = sx;
  const strideZ = sx * sy;
  const n2D = sx * sy;
  const d2Grid = new Float32Array(n2D);
  const zMidGrid = new Float32Array(n2D);
  const rLocGrid = new Float32Array(n2D);
  for (let iy = 0; iy <= ny; iy++) {
    const y = minY + iy * dy;
    const rowOff = iy * sx;
    for (let ix = 0; ix <= nx; ix++) {
      const x = minX + ix * dx;
      const idx2 = rowOff + ix;
      const d2 = sdf2D(x, y);
      d2Grid[idx2] = d2;
      zMidGrid[idx2] = archZFn(x, y);
      const inward = Math.max(0.0, -d2);
      rLocGrid[idx2] = rEdge + domeAmp * (1.0 - Math.exp(-inward / 0.022));
    }
  }
  const vals = new Float32Array(n2D * sz);
  for (let iz = 0; iz <= nz; iz++) {
    const z = minZ + iz * dz;
    const zOff = iz * strideZ;
    for (let i2 = 0; i2 < n2D; i2++) {
      const ox = Math.max(d2Grid[i2], 0.0);
      const zRel = Math.abs(z - zMidGrid[i2]);
      vals[zOff + i2] = Math.sqrt(ox * ox + zRel * zRel) - rLocGrid[i2];
    }
  }
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const cStrideY = nx;
  const cStrideZ = nx * ny;
  const vertPos = [];
  const cOffX = [0, 1, 0, 1, 0, 1, 0, 1];
  const cOffY = [0, 0, 1, 1, 0, 0, 1, 1];
  const cOffZ = [0, 0, 0, 0, 1, 1, 1, 1];
  const eA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
  const eB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
  const cVal = new Float32Array(8);
  const cX = new Float32Array(8);
  const cY = new Float32Array(8);
  const cZ = new Float32Array(8);
  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        let mask = 0;
        const base = ix + iy * strideY + iz * strideZ;
        for (let c = 0; c < 8; c++) {
          const v = vals[base + cOffX[c] + cOffY[c] * strideY + cOffZ[c] * strideZ];
          cVal[c] = v;
          if (v < 0) mask |= 1 << c;
          cX[c] = minX + (ix + cOffX[c]) * dx;
          cY[c] = minY + (iy + cOffY[c]) * dy;
          cZ[c] = minZ + (iz + cOffZ[c]) * dz;
        }
        if (mask === 0 || mask === 255) continue;
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        let cnt = 0;
        for (let e = 0; e < 12; e++) {
          const a = eA[e];
          const b = eB[e];
          const va = cVal[a];
          const vb = cVal[b];
          if (va < 0 !== vb < 0) {
            const t = va / (va - vb);
            sumX += cX[a] + (cX[b] - cX[a]) * t;
            sumY += cY[a] + (cY[b] - cY[a]) * t;
            sumZ += cZ[a] + (cZ[b] - cZ[a]) * t;
            cnt++;
          }
        }
        cellVert[ix + iy * cStrideY + iz * cStrideZ] = vertPos.length / 3;
        vertPos.push(sumX / cnt, sumY / cnt, sumZ / cnt);
      }
    }
  }
  const indices = [];
  const emitQuad = (c0, c1, c2, c3, flip) => {
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) return;
    if (flip) indices.push(c0, c1, c2, c0, c2, c3);
    else indices.push(c0, c2, c1, c0, c3, c2);
  };
  for (let iz = 1; iz < nz; iz++) {
    for (let iy = 1; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const v0 = vals[ix + iy * strideY + iz * strideZ];
        const v1 = vals[ix + 1 + iy * strideY + iz * strideZ];
        if (v0 < 0 !== v1 < 0) {
          emitQuad(
            cellVert[ix + (iy - 1) * cStrideY + (iz - 1) * cStrideZ],
            cellVert[ix + iy * cStrideY + (iz - 1) * cStrideZ],
            cellVert[ix + iy * cStrideY + iz * cStrideZ],
            cellVert[ix + (iy - 1) * cStrideY + iz * cStrideZ],
            v0 < 0,
          );
        }
      }
    }
  }
  for (let iz = 1; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 1; ix < nx; ix++) {
        const v0 = vals[ix + iy * strideY + iz * strideZ];
        const v1 = vals[ix + (iy + 1) * strideY + iz * strideZ];
        if (v0 < 0 !== v1 < 0) {
          emitQuad(
            cellVert[ix - 1 + iy * cStrideY + (iz - 1) * cStrideZ],
            cellVert[ix - 1 + iy * cStrideY + iz * cStrideZ],
            cellVert[ix + iy * cStrideY + iz * cStrideZ],
            cellVert[ix + iy * cStrideY + (iz - 1) * cStrideZ],
            v0 < 0,
          );
        }
      }
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 1; iy < ny; iy++) {
      for (let ix = 1; ix < nx; ix++) {
        const v0 = vals[ix + iy * strideY + iz * strideZ];
        const v1 = vals[ix + iy * strideY + (iz + 1) * strideZ];
        if (v0 < 0 !== v1 < 0) {
          emitQuad(
            cellVert[ix - 1 + (iy - 1) * cStrideY + iz * cStrideZ],
            cellVert[ix + (iy - 1) * cStrideY + iz * cStrideZ],
            cellVert[ix + iy * cStrideY + iz * cStrideZ],
            cellVert[ix - 1 + iy * cStrideY + iz * cStrideZ],
            v0 < 0,
          );
        }
      }
    }
  }
  const vCount = vertPos.length / 3;
  const MAX_NB = 12;
  const nbTable = new Int32Array(vCount * MAX_NB);
  const nbCount = new Uint8Array(vCount);
  const linkVerts = (a, b) => {
    const ca = nbCount[a];
    if (ca < MAX_NB) {
      const baseA = a * MAX_NB;
      let dup = false;
      for (let k = 0; k < ca; k++) {
        if (nbTable[baseA + k] === b) {
          dup = true;
          break;
        }
      }
      if (!dup) {
        nbTable[baseA + ca] = b;
        nbCount[a] = ca + 1;
      }
    }
    const cb = nbCount[b];
    if (cb < MAX_NB) {
      const baseB = b * MAX_NB;
      let dup = false;
      for (let k = 0; k < cb; k++) {
        if (nbTable[baseB + k] === a) {
          dup = true;
          break;
        }
      }
      if (!dup) {
        nbTable[baseB + cb] = a;
        nbCount[b] = cb + 1;
      }
    }
  };
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    linkVerts(i0, i1);
    linkVerts(i1, i2);
    linkVerts(i2, i0);
  }
  const posA = new Float32Array(vertPos);
  const posB = new Float32Array(vertPos.length);
  const relaxStep = (src, dst, w) => {
    for (let v = 0; v < vCount; v++) {
      const n = nbCount[v];
      const v3 = v * 3;
      if (!n) {
        dst[v3] = src[v3];
        dst[v3 + 1] = src[v3 + 1];
        dst[v3 + 2] = src[v3 + 2];
        continue;
      }
      const base = v * MAX_NB;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (let k = 0; k < n; k++) {
        const u3 = nbTable[base + k] * 3;
        ax += src[u3];
        ay += src[u3 + 1];
        az += src[u3 + 2];
      }
      const inv = 1.0 / n;
      dst[v3] = src[v3] + w * (ax * inv - src[v3]);
      dst[v3 + 1] = src[v3 + 1] + w * (ay * inv - src[v3 + 1]);
      dst[v3 + 2] = src[v3 + 2] + w * (az * inv - src[v3 + 2]);
    }
  };
  for (let p = 0; p < smoothPasses; p++) {
    relaxStep(posA, posB, 0.50);
    relaxStep(posB, posA, -0.52);
  }
  for (let v = 0; v < vCount; v++) {
    const zIdx = v * 3 + 2;
    if (posA[zIdx] < 0.002) posA[zIdx] = 0.002;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function mirrorGeometryX(srcGeo) {
  const geo = srcGeo.clone();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, -pos.getX(i));
  }
  const norm = geo.attributes.normal;
  if (norm) {
    for (let i = 0; i < norm.count; i++) {
      norm.setX(i, -norm.getX(i));
    }
  }
  if (geo.index) {
    const arr = geo.index.array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    geo.index.needsUpdate = true;
  }
  geo.computeVertexNormals();
  return geo;
}
function cloneGroupMirroredX(srcGroup) {
  const dst = new THREE.Group();
  dst.name = `${srcGroup.name}-mirrored`;
  const geoCache = new Map();
  for (const child of srcGroup.children) {
    if (child.isMesh) {
      let mirroredGeo = geoCache.get(child.geometry);
      if (!mirroredGeo) {
        mirroredGeo = mirrorGeometryX(child.geometry);
        geoCache.set(child.geometry, mirroredGeo);
      }
      const m = new THREE.Mesh(mirroredGeo, child.material);
      m.position.set(-child.position.x, child.position.y, child.position.z);
      m.rotation.set(child.rotation.x, -child.rotation.y, -child.rotation.z);
      m.renderOrder = child.renderOrder;
      m.raycast = noRaycast;
      m.frustumCulled = false;
      dst.add(m);
    }
  }
  return dst;
}
/**
 * シンプル一体成形 3Dハンドアイコン：
 *   - 'thumb'（👆 1点ピンポイント押しアイコン：継ぎ目ゼロ単一メッシュ）
 *   - 'fingers'（🤚 指の腹さすり・円ほぐしアイコン：継ぎ目ゼロ単一メッシュ）
 * ローカル座標: (0,0,0) = 体表接触点, +Z = 外向き法線, +Y = ストローク進行方向, +X = 横軸
 */
function buildSculptedHands() {
  const velvetHandMat = new THREE.MeshStandardMaterial({
    color: 0xf4cba4,
    emissive: 0x854d2b,
    emissiveIntensity: 0.16,
    roughness: 0.80,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  velvetHandMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHandLocalPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHandLocalPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHandLocalPos;')
      .replace(
        '#include <dithering_fragment>',
        `
        float tipDist = length(vHandLocalPos - vec3(0.0, 0.010, 0.024));
        float tipGlow = smoothstep(0.115, 0.014, tipDist);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.48, 0.36), tipGlow * 0.42);
        float ndv = abs(dot(normalize(vNormal), normalize(vViewPosition)));
        float rimEdge = smoothstep(0.38, 0.04, ndv);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.68 + vec3(0.15, 0.08, 0.04), rimEdge * 0.36);
        #include <dithering_fragment>
        `,
      );
  };
  const outlineHandMat = new THREE.MeshBasicMaterial({
    color: 0x523624,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  });
  outlineHandMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed += normalize(normal) * 0.0046;',
    );
  };
  const addHandWithOutline = (group, geo) => {
    const outlineMesh = new THREE.Mesh(geo, outlineHandMat);
    outlineMesh.renderOrder = 51;
    outlineMesh.raycast = noRaycast;
    outlineMesh.frustumCulled = false;
    const bodyMesh = new THREE.Mesh(geo, velvetHandMat);
    bodyMesh.renderOrder = 52;
    bodyMesh.raycast = noRaycast;
    bodyMesh.frustumCulled = false;
    group.add(outlineMesh, bodyMesh);
  };
  const HAND_SCALE_THUMB = 1.76;
  const HAND_SCALE_FINGERS = 1.92;
  const thumbPoseGroup = new THREE.Group();
  thumbPoseGroup.name = 'hand-pose-thumb';
  const geoThumbPress = buildSeamlessPillowedHandGeometry({
    rEdge: 0.0094,
    domeAmp: 0.0056,
    bounds: [-0.034, 0.126, -0.146, 0.038, -0.006, 0.120],
    nx: 46,
    ny: 54,
    nz: 22,
    smoothPasses: 6,
    sdf2D: (x, y) => {
      const dPalm = sdOrientedRoundBox2D(x, y, 0.048, -0.086, 0.018, 0.009, 0.026, -0.34);
      const f1 = sdCapsule2D(x, y, 0.036, -0.056, 0.043, -0.024, 0.0028, 0.0022);
      const f2 = sdCapsule2D(x, y, 0.055, -0.062, 0.063, -0.026, 0.0030, 0.0023);
      const f3 = sdCapsule2D(x, y, 0.074, -0.070, 0.082, -0.036, 0.0028, 0.0021);
      const f4 = sdCapsule2D(x, y, 0.091, -0.081, 0.098, -0.051, 0.0022, 0.0017);
      const dFingers = sminCubic(sminCubic(f1, f2, 0.004), sminCubic(f3, f4, 0.004), 0.004);
      const dBody = sminCubic(dPalm, dFingers, 0.009);
      const t1 = sdCapsule2D(x, y, 0.020, -0.092, 0.007, -0.042, 0.0115, 0.0066);
      const t2 = sdCapsule2D(x, y, 0.007, -0.042, 0.0, 0.004, 0.0066, 0.0056);
      const dThumb = sminCubic(t1, t2, 0.008);
      return sminCubic(dBody, dThumb, 0.014);
    },
    archZFn: (x, y) => {
      const dx = Math.max(0.0, x);
      const dy = Math.max(0.0, 0.006 - y);
      return 0.013 + 0.34 * dx + 0.28 * dy;
    },
  });
  geoThumbPress.scale(HAND_SCALE_THUMB, HAND_SCALE_THUMB, HAND_SCALE_THUMB);
  addHandWithOutline(thumbPoseGroup, geoThumbPress);
  const fingersPoseGroup = new THREE.Group();
  fingersPoseGroup.name = 'hand-pose-fingers';
  const geoOpenHand = buildSeamlessPillowedHandGeometry({
    rEdge: 0.0092,
    domeAmp: 0.0052,
    bounds: [-0.086, 0.058, -0.138, 0.030, -0.005, 0.096],
    nx: 46,
    ny: 54,
    nz: 22,
    smoothPasses: 6,
    sdf2D: (x, y) => {
      const dPalm = sdRoundBox2D(x, y, 0.0, -0.084, 0.012, 0.008, 0.026);
      const f1 = sdCapsule2D(x, y, -0.033, -0.062, -0.032, -0.002, 0.0018, 0.0012);
      const f2 = sdCapsule2D(x, y, -0.011, -0.062, -0.011, 0.010, 0.0022, 0.0015);
      const f3 = sdCapsule2D(x, y, 0.011, -0.062, 0.011, 0.002, 0.0018, 0.0012);
      const f4 = sdCapsule2D(x, y, 0.033, -0.065, 0.033, -0.014, 0.0012, 0.0008);
      let d = sminCubic(dPalm, Math.min(f1, f2, f3, f4), 0.008);
      const dThumb = sdCapsule2D(x, y, -0.028, -0.094, -0.062, -0.044, 0.0032, 0.0018);
      d = sminCubic(d, dThumb, 0.012);
      return d;
    },
    archZFn: (x, y) => {
      const back = Math.max(0.0, -0.005 - y);
      return 0.013 + 0.32 * back + 0.22 * Math.abs(x);
    },
  });
  geoOpenHand.scale(HAND_SCALE_FINGERS, HAND_SCALE_FINGERS, HAND_SCALE_FINGERS);
  addHandWithOutline(fingersPoseGroup, geoOpenHand);
  const thumbPoseGroupL = cloneGroupMirroredX(thumbPoseGroup);
  const fingersPoseGroupL = cloneGroupMirroredX(fingersPoseGroup);
  return { thumbPoseGroup, fingersPoseGroup, thumbPoseGroupL, fingersPoseGroupL };
}
/**
 * 角丸・半透明の支持面ガイドパネル（床マット / 壁面 / イス座面・テーブル天板）を生成
 * ウォームサンド #E6DDD0 (面 opacity: 0.30) + 細枠エッジ (opacity: 0.58)
 */
function buildSupportSurfacePanel() {
  const group = new THREE.Group();
  group.name = 'support-surface-panel';
  group.visible = false;
  const w = 0.68;
  const h = 0.72;
  const r = 0.085;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const panelGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
    curveSegments: 14,
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xe6ddd0,
    emissive: 0xbfb29f,
    emissiveIntensity: 0.12,
    roughness: 0.72,
    metalness: 0.0,
    transparent: true,
    opacity: 0.30,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
  });
  const panelMesh = new THREE.Mesh(panelGeo, panelMat);
  panelMesh.renderOrder = 26;
  panelMesh.raycast = noRaycast;
  panelMesh.frustumCulled = false;
  group.add(panelMesh);
  const borderPts2D = shape.getPoints(56);
  const borderPts3D = borderPts2D.map((pt) => new THREE.Vector3(pt.x, pt.y, 0.001));
  const borderCurve = new THREE.CatmullRomCurve3(borderPts3D, true);
  const borderGeo = new THREE.TubeGeometry(borderCurve, 72, 0.0034, 6, true);
  const borderMat = new THREE.MeshBasicMaterial({
    color: 0xbcae9a,
    transparent: true,
    opacity: 0.58,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.renderOrder = 27;
  borderMesh.raycast = noRaycast;
  borderMesh.frustumCulled = false;
  group.add(borderMesh);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0xc9bcab,
    transparent: true,
    opacity: 0.24,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  for (const gy of [-hh * 0.42, hh * 0.42]) {
    const gGeo = new THREE.PlaneGeometry(w * 0.82, 0.0028);
    const gMesh = new THREE.Mesh(gGeo, gridMat);
    gMesh.position.set(0, gy, 0.0015);
    gMesh.renderOrder = 27;
    gMesh.raycast = noRaycast;
    gMesh.frustumCulled = false;
    group.add(gMesh);
  }
  return { group, panelMat, borderMat };
}
/**
 * モーション方向インジケーター（往復フロー矢印 / 円弧矢印 / 押圧ターゲットリング＋滑走矢印）を生成
 */
function buildMotionIndicators() {
  const root = new THREE.Group();
  root.name = 'motion-indicators';
  const strokeGroup = new THREE.Group();
  const chevrons = [0, 1, 2].map((ci) => {
    const taper = 1.0 - ci * 0.11;
    const hw = 0.046 * taper;
    const tipY = 0.024 * taper;
    const tailY = -0.012 * taper;
    const chevCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-hw, tailY, 0),
        new THREE.Vector3(-hw * 0.46, tipY * 0.42, 0.001),
        new THREE.Vector3(0, tipY, 0.002),
        new THREE.Vector3(hw * 0.46, tipY * 0.42, 0.001),
        new THREE.Vector3(hw, tailY, 0),
      ],
      false,
      'centripetal',
      0.5,
    );
    const rTube = 0.0058 * (1.0 - ci * 0.06);
    const chevGeo = new THREE.TubeGeometry(chevCurve, 24, rTube, 8, false);
    const chevMat = new THREE.MeshStandardMaterial({
      color: ci === 1 ? 0xe58e7a : 0xd19c50,
      emissive: ci === 1 ? 0xa34f3c : 0x8f6220,
      emissiveIntensity: 0.28,
      roughness: 0.36,
      transparent: true,
      opacity: 0.88 - ci * 0.12,
      depthTest: true,
      depthWrite: false,
    });
    const grp = new THREE.Group();
    const baseY = 0.078 + ci * 0.042;
    grp.position.set(0, baseY, 0.016 + ci * 0.001);
    grp.userData.baseY = baseY;
    grp.userData.mat = chevMat;
    const m = new THREE.Mesh(chevGeo, chevMat);
    m.renderOrder = 54;
    m.raycast = noRaycast;
    m.frustumCulled = false;
    grp.add(m);
    strokeGroup.add(grp);
    return grp;
  });
  root.add(strokeGroup);
  const circleGroup = new THREE.Group();
  circleGroup.visible = false;
  const arcMat = new THREE.MeshStandardMaterial({
    color: 0xd99452,
    emissive: 0x915822,
    emissiveIntensity: 0.28,
    roughness: 0.36,
    transparent: true,
    opacity: 0.88,
    depthTest: true,
    depthWrite: false,
  });
  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const startA = sideIdx * Math.PI + 0.32;
    const endA = sideIdx * Math.PI + Math.PI - 0.32;
    const arcPts = [];
    const rArc = 0.082;
    for (let k = 0; k <= 18; k++) {
      const a = startA + ((endA - startA) * k) / 18;
      arcPts.push(new THREE.Vector3(Math.cos(a) * rArc, Math.sin(a) * rArc, 0.015));
    }
    const arcGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 22, 0.0052, 8, false);
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.renderOrder = 54;
    arcMesh.raycast = noRaycast;
    arcMesh.frustumCulled = false;
    circleGroup.add(arcMesh);
    const coneGeo = new THREE.ConeGeometry(0.013, 0.025, 10);
    const coneMesh = new THREE.Mesh(coneGeo, arcMat);
    const tipPt = arcPts[arcPts.length - 1];
    const prevPt = arcPts[arcPts.length - 2];
    const dir = tipPt.clone().sub(prevPt).normalize();
    coneMesh.position.copy(tipPt);
    coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    coneMesh.renderOrder = 54;
    coneMesh.raycast = noRaycast;
    coneMesh.frustumCulled = false;
    circleGroup.add(coneMesh);
  }
  root.add(circleGroup);
  const glideGroup = new THREE.Group();
  glideGroup.visible = false;
  const holdRingGeo = new THREE.TorusGeometry(0.052, 0.0058, 12, 48);
  const holdRingMat = new THREE.MeshStandardMaterial({
    color: 0xe3856f,
    emissive: 0xa14430,
    emissiveIntensity: 0.30,
    roughness: 0.34,
    transparent: true,
    opacity: 0.92,
    depthTest: true,
    depthWrite: false,
  });
  const holdRingMesh = new THREE.Mesh(holdRingGeo, holdRingMat);
  holdRingMesh.position.z = 0.014;
  holdRingMesh.renderOrder = 54;
  holdRingMesh.raycast = noRaycast;
  holdRingMesh.frustumCulled = false;
  glideGroup.add(holdRingMesh);
  const glideArrows = [-1, 1].map((dirSign) => {
    const gMat = new THREE.MeshStandardMaterial({
      color: 0xd49b4b,
      emissive: 0x8f5e1c,
      emissiveIntensity: 0.28,
      roughness: 0.36,
      transparent: true,
      opacity: 0.88,
      depthTest: true,
      depthWrite: false,
    });
    const gGrp = new THREE.Group();
    const centerY = dirSign > 0 ? 0.134 : 0.088;
    const shaftGeo = new THREE.CylinderGeometry(0.0040, 0.0040, 0.026, 8);
    const shaft = new THREE.Mesh(shaftGeo, gMat);
    shaft.position.set(0, centerY - dirSign * 0.006, 0.016);
    shaft.renderOrder = 54;
    shaft.raycast = noRaycast;
    shaft.frustumCulled = false;
    const headGeo = new THREE.ConeGeometry(0.012, 0.024, 10);
    const head = new THREE.Mesh(headGeo, gMat);
    head.position.set(0, centerY + dirSign * 0.014, 0.016);
    if (dirSign < 0) head.rotation.z = Math.PI;
    head.renderOrder = 54;
    head.raycast = noRaycast;
    head.frustumCulled = false;
    gGrp.add(shaft, head);
    gGrp.userData.dirSign = dirSign;
    gGrp.userData.mat = gMat;
    glideGroup.add(gGrp);
    return gGrp;
  });
  root.add(glideGroup);
  return {
    root,
    strokeGroup,
    chevrons,
    circleGroup,
    arcMat,
    glideGroup,
    holdRingMesh,
    holdRingMat,
    glideArrows,
  };
}
const sharedRaycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _basePt = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _normMat = new THREE.Matrix3();
/**
 * 外側 (center + outDir * 0.85) から -outDir 方向へ THREE.Raycaster を飛ばし、
 * ストローク上の複数点（デフォルト7点）で最外殻メッシュとの正確な交点と法線を取得する
 */
export function sampleSurfaceStrokeByRaycaster({
  centerRest,
  strokeDirRest,
  outDirRest,
  spanLen = 0.36,
  candidateMeshes = [],
  meshes = [],
  effSide = 'R',
  sampleCount = 7,
  fallbackOffset = 0.018,
  surfaceClearance = 0.008,
}) {
  const nDir = outDirRest.clone().normalize();
  const sDir = strokeDirRest.clone();
  sDir.addScaledVector(nDir, -sDir.dot(nDir));
  if (sDir.lengthSq() < 1e-6) sDir.set(0, 1, 0);
  else sDir.normalize();
  const rawCandidates =
    Array.isArray(candidateMeshes) && candidateMeshes.length
      ? candidateMeshes
      : Array.isArray(meshes)
        ? meshes
        : [];
  const validMeshes = rawCandidates.filter((m) => m && m.isMesh && m.geometry);
  for (const m of validMeshes) {
    m.updateWorldMatrix(true, false);
  }
  const rawPts = [];
  const rawNormals = [];
  let hitCount = 0;
  sharedRaycaster.near = 0.01;
  sharedRaycaster.far = 1.65;
  _rayDir.copy(nDir).negate();
  for (let i = 0; i < sampleCount; i++) {
    const u = sampleCount > 1 ? i / (sampleCount - 1) : 0.5;
    const along = (u - 0.5) * spanLen;
    _basePt.copy(centerRest).addScaledVector(sDir, along);
    _rayOrigin.copy(_basePt).addScaledVector(nDir, 0.85);
    sharedRaycaster.set(_rayOrigin, _rayDir);
    let chosenHit = null;
    if (validMeshes.length > 0) {
      const hits = sharedRaycaster.intersectObjects(validMeshes, false);
      for (const h of hits) {
        if (effSide === 'L' && h.point.x < -0.06) continue;
        if (effSide === 'R' && h.point.x > 0.06) continue;
        const depthFromCenter = h.point.clone().sub(_basePt).dot(nDir);
        if (depthFromCenter < -0.22) continue;
        chosenHit = h;
        break;
      }
    }
    if (chosenHit) {
      hitCount++;
      const pt = chosenHit.point.clone().addScaledVector(nDir, surfaceClearance);
      if (chosenHit.face) {
        _normMat.getNormalMatrix(chosenHit.object.matrixWorld);
        _hitNormal.copy(chosenHit.face.normal).applyMatrix3(_normMat).normalize();
        if (_hitNormal.dot(nDir) < 0) _hitNormal.negate();
        _hitNormal.lerp(nDir, 0.38).normalize();
      } else {
        _hitNormal.copy(nDir);
      }
      rawPts.push(pt);
      rawNormals.push(_hitNormal.clone());
    } else {
      rawPts.push(_basePt.clone().addScaledVector(nDir, fallbackOffset));
      rawNormals.push(nDir.clone());
    }
  }
  if (hitCount > 0 && hitCount < sampleCount) {
    let avgProj = 0;
    for (let i = 0; i < sampleCount; i++) {
      const u = sampleCount > 1 ? i / (sampleCount - 1) : 0.5;
      const base = centerRest.clone().addScaledVector(sDir, (u - 0.5) * spanLen);
      avgProj += rawPts[i].clone().sub(base).dot(nDir);
    }
    avgProj /= sampleCount;
    for (let i = 0; i < sampleCount; i++) {
      const u = sampleCount > 1 ? i / (sampleCount - 1) : 0.5;
      const base = centerRest.clone().addScaledVector(sDir, (u - 0.5) * spanLen);
      const curProj = rawPts[i].clone().sub(base).dot(nDir);
      if (Math.abs(curProj - fallbackOffset) < 1e-4) {
        rawPts[i].copy(base).addScaledVector(nDir, avgProj);
      }
    }
  }
  const smoothPts = rawPts.map((p) => p.clone());
  const smoothNormals = rawNormals.map((n) => n.clone());
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < sampleCount - 1; i++) {
      smoothPts[i]
        .copy(rawPts[i - 1])
        .addScaledVector(rawPts[i], 2)
        .add(rawPts[i + 1])
        .multiplyScalar(0.25);
      smoothNormals[i]
        .copy(rawNormals[i - 1])
        .addScaledVector(rawNormals[i], 2)
        .add(rawNormals[i + 1])
        .normalize();
    }
    for (let i = 1; i < sampleCount - 1; i++) {
      rawPts[i].copy(smoothPts[i]);
      rawNormals[i].copy(smoothNormals[i]);
    }
  }
  return {
    pointsRest: smoothPts,
    normalsRest: smoothNormals,
    hitCount,
  };
}
/**
 * fascia-only.html 専用：オフスクリーン体表エンベロープ `envelope` から
 * `THREE.Raycaster` 用の高精度レスト体表プロキシメッシュ群を構築する（シーンには追加しない軽量コライダー）
 */
export function buildEnvelopeColliderMeshes(envelope) {
  if (!envelope) return [];
  const buildTubeCollider = (sampleFn, yMin, yMax, ny, nth) => {
    const pos = [];
    const idx = [];
    const vTmp = new THREE.Vector3();
    for (let iy = 0; iy <= ny; iy++) {
      const y = yMin + (iy / ny) * (yMax - yMin);
      for (let it = 0; it <= nth; it++) {
        const th = -Math.PI + (it / nth) * Math.PI * 2;
        sampleFn(y, th, vTmp);
        pos.push(vTmp.x, vTmp.y, vTmp.z);
      }
    }
    const stride = nth + 1;
    for (let iy = 0; iy < ny; iy++) {
      for (let it = 0; it < nth; it++) {
        const a = iy * stride + it;
        const b = (iy + 1) * stride + it;
        const c = (iy + 1) * stride + (it + 1);
        const d = iy * stride + (it + 1);
        idx.push(a, b, d, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.updateMatrixWorld(true);
    return mesh;
  };
  const torsoMesh = buildTubeCollider((y, th, out) => envelope.sampleTorso(y, th, 0.008, out), -0.26, 3.06, 48, 40);
  torsoMesh.name = 'torso';
  const legRMesh = buildTubeCollider((y, th, out) => envelope.sampleLeg(true, y, th, 0.007, out), -3.26, 0.14, 44, 32);
  legRMesh.name = 'legR';
  const legLMesh = buildTubeCollider((y, th, out) => envelope.sampleLeg(false, y, th, 0.007, out), -3.26, 0.14, 44, 32);
  legLMesh.name = 'legL';
  const armRMesh = buildTubeCollider((y, th, out) => envelope.sampleArm(true, y, th, 0.007, out), -0.34, 2.08, 36, 28);
  armRMesh.name = 'armR';
  const armLMesh = buildTubeCollider((y, th, out) => envelope.sampleArm(false, y, th, 0.007, out), -0.34, 2.08, 36, 28);
  armLMesh.name = 'armL';
  const buildSolePatch = (isRight) => {
    const s = isRight ? -1 : 1;
    const geo = new THREE.PlaneGeometry(0.24, 0.44, 8, 12);
    geo.rotateX(Math.PI / 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const arch = Math.exp(-Math.pow((lz - 0.01) / 0.11, 2)) * Math.max(0, 1 - Math.abs(lx + s * 0.03) * 6) * 0.024;
      posAttr.setXYZ(i, s * 0.33 + lx, -3.268 + arch, -0.02 + lz);
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.name = isRight ? 'soleR' : 'soleL';
    m.updateMatrixWorld(true);
    return m;
  };
  return [torsoMesh, legRMesh, legLMesh, armRMesh, armLMesh, buildSolePatch(true), buildSolePatch(false)];
}
export function createSelfCareGuide3D({ parent }) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'selfcare-guide-3d';
  rootGroup.raycast = noRaycast;
  rootGroup.visible = false;
  if (parent) parent.add(rootGroup);
  const toolRig = new THREE.Group();
  toolRig.name = 'selfcare-tool-rig';
  toolRig.raycast = noRaycast;
  rootGroup.add(toolRig);
  const supportPanel = buildSupportSurfacePanel();
  rootGroup.add(supportPanel.group);
  let guideTubeMesh = null;
  const guideTubeMat = new THREE.MeshBasicMaterial({
    color: 0xcfa058,
    transparent: true,
    opacity: 0.42,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  const ballToolGroup = new THREE.Group();
  ballToolGroup.name = 'tool-ball';
  const ballSpinGroup = new THREE.Group();
  ballSpinGroup.position.set(0, 0, R_BALL + 0.008);
  const ballGeo = new THREE.SphereGeometry(R_BALL, 40, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xd4a24c,
    emissive: 0x8f5b18,
    emissiveIntensity: 0.18,
    roughness: 0.46,
    metalness: 0.02,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.renderOrder = 50;
  ballMesh.raycast = noRaycast;
  ballMesh.frustumCulled = false;
  const seamPts = [];
  const SEAM_STEPS = 96;
  const rSeam = R_BALL * 1.006;
  for (let i = 0; i <= SEAM_STEPS; i++) {
    const t = (i / SEAM_STEPS) * Math.PI * 2;
    const sx = Math.cos(t) + 0.34 * Math.cos(3 * t);
    const sy = Math.sin(t) - 0.34 * Math.sin(3 * t);
    const sz = 1.12 * Math.sin(2 * t);
    seamPts.push(new THREE.Vector3(sx, sy, sz).normalize().multiplyScalar(rSeam));
  }
  const seamGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPts, true), 96, 0.008, 8, true);
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0xfaf8f4,
    emissive: 0xefe8dc,
    emissiveIntensity: 0.24,
    roughness: 0.40,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const seamMesh = new THREE.Mesh(seamGeo, seamMat);
  seamMesh.renderOrder = 51;
  seamMesh.raycast = noRaycast;
  seamMesh.frustumCulled = false;
  ballSpinGroup.add(ballMesh, seamMesh);
  ballToolGroup.add(ballSpinGroup);
  toolRig.add(ballToolGroup);
  const rollerToolGroup = new THREE.Group();
  rollerToolGroup.name = 'tool-roller';
  const rollerSpinGroup = new THREE.Group();
  rollerSpinGroup.position.set(0, 0, R_ROLLER + 0.010);
  const coreOuterGeo = new THREE.CylinderGeometry(R_ROLLER * 0.82, R_ROLLER * 0.82, L_ROLLER + 0.055, 36);
  coreOuterGeo.rotateZ(Math.PI / 2);
  const coreOuterMat = new THREE.MeshStandardMaterial({
    color: 0x5a4a3f,
    emissive: 0x3d3129,
    emissiveIntensity: 0.12,
    roughness: 0.52,
    metalness: 0.16,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const coreOuterMesh = new THREE.Mesh(coreOuterGeo, coreOuterMat);
  coreOuterMesh.renderOrder = 50;
  coreOuterMesh.raycast = noRaycast;
  coreOuterMesh.frustumCulled = false;
  rollerSpinGroup.add(coreOuterMesh);
  const coreHoleGeo = new THREE.CylinderGeometry(R_ROLLER * 0.56, R_ROLLER * 0.56, L_ROLLER + 0.060, 28);
  coreHoleGeo.rotateZ(Math.PI / 2);
  const coreHoleMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f28,
    roughness: 0.88,
    metalness: 0.04,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const coreHoleMesh = new THREE.Mesh(coreHoleGeo, coreHoleMat);
  coreHoleMesh.renderOrder = 50;
  coreHoleMesh.raycast = noRaycast;
  coreHoleMesh.frustumCulled = false;
  rollerSpinGroup.add(coreHoleMesh);
  const segWidth = (L_ROLLER - 0.055) / 4;
  const rollerBodyGeo = new THREE.CylinderGeometry(R_ROLLER, R_ROLLER, segWidth, 36);
  rollerBodyGeo.rotateZ(Math.PI / 2);
  const rollerBodyMat = new THREE.MeshStandardMaterial({
    color: 0xce7e6b,
    emissive: 0x8f4232,
    emissiveIntensity: 0.16,
    roughness: 0.46,
    metalness: 0.04,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const segInst = new THREE.InstancedMesh(rollerBodyGeo, rollerBodyMat, 4);
  segInst.renderOrder = 50;
  segInst.raycast = noRaycast;
  segInst.frustumCulled = false;
  const _rollerDummy = new THREE.Object3D();
  for (let si = 0; si < 4; si++) {
    const sx = -L_ROLLER * 0.375 + si * (L_ROLLER * 0.25);
    _rollerDummy.position.set(sx, 0, 0);
    _rollerDummy.rotation.set(0, 0, 0);
    _rollerDummy.updateMatrix();
    segInst.setMatrixAt(si, _rollerDummy.matrix);
  }
  segInst.instanceMatrix.needsUpdate = true;
  rollerSpinGroup.add(segInst);
  const bumpGeo = new THREE.BoxGeometry(segWidth * 0.72, 0.022, 0.017);
  const bumpMat = new THREE.MeshStandardMaterial({
    color: 0xe6a898,
    emissive: 0xa35847,
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.04,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  });
  const bumpInst = new THREE.InstancedMesh(bumpGeo, bumpMat, 32);
  bumpInst.renderOrder = 51;
  bumpInst.raycast = noRaycast;
  bumpInst.frustumCulled = false;
  let bumpIdx = 0;
  for (let si = 0; si < 4; si++) {
    const sx = -L_ROLLER * 0.375 + si * (L_ROLLER * 0.25);
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4 + (si % 2) * (Math.PI / 8);
      _rollerDummy.position.set(sx, Math.cos(ang) * R_ROLLER, Math.sin(ang) * R_ROLLER);
      _rollerDummy.rotation.set(ang, 0, 0);
      _rollerDummy.updateMatrix();
      bumpInst.setMatrixAt(bumpIdx++, _rollerDummy.matrix);
    }
  }
  bumpInst.instanceMatrix.needsUpdate = true;
  rollerSpinGroup.add(bumpInst);
  rollerToolGroup.add(rollerSpinGroup);
  toolRig.add(rollerToolGroup);
  const handToolGroup = new THREE.Group();
  handToolGroup.name = 'tool-hand';
  const { thumbPoseGroup, fingersPoseGroup, thumbPoseGroupL, fingersPoseGroupL } = buildSculptedHands();
  handToolGroup.add(thumbPoseGroup, fingersPoseGroup, thumbPoseGroupL, fingersPoseGroupL);
  toolRig.add(handToolGroup);
  const indicators = buildMotionIndicators();
  toolRig.add(indicators.root);
  const rippleGeo = new THREE.RingGeometry(0.068, 0.094, 40);
  const rippleMeshes = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd98a6c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.56,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const m = new THREE.Mesh(rippleGeo, mat);
    m.position.z = 0.006 + i * 0.001;
    m.renderOrder = 30;
    m.raycast = noRaycast;
    m.frustumCulled = false;
    toolRig.add(m);
    return m;
  });
  const st = {
    active: false,
    tool: 'ball',
    handPose: 'fingers',
    motion: 'roll',
    supportSurface: 'none',
    effSide: 'R',
    speed: 1.0,
    scale: 1.0,
    strokeSpan: 1.0,
    elapsed: 0,
    pointsRest: [],
    normalsRest: [],
    transformFn: null, // (restPt, restNormal, index, outPt, outNormal) => void
    deformedPts: Array.from({ length: 7 }, () => new THREE.Vector3()),
    deformedNormals: Array.from({ length: 7 }, () => new THREE.Vector3(0, 0, 1)),
    lastCurveHash: Infinity,
  };
  const curveTmp = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.1, 0),
  ]);
  const posOnCurve = new THREE.Vector3();
  const tanOnCurve = new THREE.Vector3();
  const normOnCurve = new THREE.Vector3();
  const bitanOnCurve = new THREE.Vector3();
  const midPosDef = new THREE.Vector3();
  const midNormDef = new THREE.Vector3();
  const midTanDef = new THREE.Vector3();
  const midBitanDef = new THREE.Vector3();
  const rotMatTmp = new THREE.Matrix4();
  const panelRotMatTmp = new THREE.Matrix4();
  const handWorldQuatTmp = new THREE.Quaternion();
  function sampleNormalAt(u, count, out) {
    if (count <= 1) return out.copy(st.deformedNormals[0]);
    const f = clamp01(u) * (count - 1);
    const i0 = Math.min(count - 1, Math.floor(f));
    const i1 = Math.min(count - 1, i0 + 1);
    const frac = f - i0;
    return out.copy(st.deformedNormals[i0]).lerp(st.deformedNormals[i1], frac).normalize();
  }
  /**
   * 3Dセルフケアガイドの表示を開始・切り替える
   */
  function show({
    targetId = '',
    tool = 'ball',
    handPose = null,
    motion = null,
    supportSurface = null,
    effSide = 'R',
    speed = 1.0,
    scale = null,
    strokeSpan = null,
    pointsRest = [],
    normalsRest = [],
    transformFn = null,
  } = {}) {
    const profile = resolveCareProfile(targetId, tool);
    st.active = true;
    st.tool = profile.tool;
    st.handPose = handPose || profile.handPose;
    st.motion = motion || profile.motion;
    st.supportSurface = 'none';
    st.effSide = effSide === 'L' ? 'L' : 'R';
    st.speed = Math.max(0.2, Math.min(3.0, Number(speed) || 1.0));
    st.scale = Math.max(0.45, Math.min(2.0, Number(scale) || profile.scale || 1.0));
    st.strokeSpan = Math.max(0.35, Math.min(2.2, Number(strokeSpan) || profile.strokeSpan || 1.0));
    st.elapsed = 0;
    st.pointsRest = pointsRest.map((p) => p.clone());
    st.normalsRest = normalsRest.map((n) => n.clone().normalize());
    st.transformFn = transformFn;
    st.lastCurveHash = Infinity;
    while (st.deformedPts.length < st.pointsRest.length) {
      st.deformedPts.push(new THREE.Vector3());
      st.deformedNormals.push(new THREE.Vector3(0, 0, 1));
    }
    ballToolGroup.visible = st.tool === 'ball';
    rollerToolGroup.visible = st.tool === 'roller';
    handToolGroup.visible = st.tool === 'hand';
    if (st.tool === 'hand') {
      const isLeft = st.effSide === 'L';
      thumbPoseGroup.visible = st.handPose === 'thumb' && isLeft;
      thumbPoseGroupL.visible = st.handPose === 'thumb' && !isLeft;
      fingersPoseGroup.visible = st.handPose !== 'thumb' && !isLeft;
      fingersPoseGroupL.visible = st.handPose !== 'thumb' && isLeft;
    }
    const isCircle = st.motion === 'circle' || st.motion === 'cross';
    const isGlide = st.motion === 'glide' || st.motion === 'press';
    indicators.strokeGroup.visible = !isCircle && !isGlide;
    indicators.circleGroup.visible = isCircle;
    indicators.glideGroup.visible = isGlide;
    const rippleMain = st.tool === 'hand' ? 0xe58b78 : st.tool === 'roller' ? 0xce7e6b : 0xcfa058;
    const rippleSub = st.tool === 'hand' ? 0xd49b4b : st.tool === 'roller' ? 0xb8624f : 0xb87d2b;
    rippleMeshes.forEach((m, idx) => {
      m.material.color.setHex(idx % 2 === 0 ? rippleMain : rippleSub);
    });
    supportPanel.group.visible = false;
    rootGroup.visible = true;
    update(0, 0);
    return profile;
  }
  /**
   * 毎フレーム更新（現在姿勢への軌道スナップ・器具自転・指バウンス・パネル追従）
   */
  function update(timeSec, dt = 0) {
    if (!st.active || !rootGroup.visible) return;
    const count = st.pointsRest.length;
    if (count < 2) return;
    st.elapsed += Math.max(0, dt);
    const t = Number.isFinite(timeSec) ? timeSec : st.elapsed;
    for (let i = 0; i < count; i++) {
      if (typeof st.transformFn === 'function') {
        st.transformFn(st.pointsRest[i], st.normalsRest[i], i, st.deformedPts[i], st.deformedNormals[i]);
      } else {
        st.deformedPts[i].copy(st.pointsRest[i]);
        st.deformedNormals[i].copy(st.normalsRest[i]);
      }
    }
    curveTmp.points = st.deformedPts.slice(0, count);
    curveTmp.updateArcLengths();
    const arcLen = Math.max(0.18, curveTmp.getLength());
    const pFirst = st.deformedPts[0];
    const pMid = st.deformedPts[Math.floor(count / 2)];
    const pLast = st.deformedPts[count - 1];
    const hash =
      pFirst.x * 13.1 + pFirst.y * 17.3 + pFirst.z * 19.7 +
      pMid.x * 23.1 + pMid.y * 29.3 + pMid.z * 31.7 +
      pLast.x * 37.1 + pLast.y * 41.3 + pLast.z * 43.7;
    const showGuideTube = st.motion === 'stroke' || st.motion === 'roll';
    if (showGuideTube && (!guideTubeMesh || Math.abs(hash - st.lastCurveHash) > 0.008)) {
      st.lastCurveHash = hash;
      const tubeGeo = new THREE.TubeGeometry(curveTmp, 28, 0.0068, 8, false);
      if (!guideTubeMesh) {
        guideTubeMesh = new THREE.Mesh(tubeGeo, guideTubeMat);
        guideTubeMesh.renderOrder = 28;
        guideTubeMesh.raycast = noRaycast;
        guideTubeMesh.frustumCulled = false;
        rootGroup.add(guideTubeMesh);
      } else {
        guideTubeMesh.geometry.dispose();
        guideTubeMesh.geometry = tubeGeo;
      }
    }
    if (guideTubeMesh) guideTubeMesh.visible = showGuideTube;
    supportPanel.group.visible = false;
    const spd = st.speed;
    let uParam = 0.5;
    let lateralOff = 0;
    let tangentOff = 0;
    let normalLift = 0;
    if (st.motion === 'stroke') {
      const rawPhase = (((t * 0.34 * spd) % 1.0) + 1.0) % 1.0;
      uParam = rawPhase < 0.78 ? smooth01(0.0, 0.78, rawPhase) : 1.0 - smooth01(0.78, 1.0, rawPhase);
      normalLift = rawPhase >= 0.78 ? Math.sin(((rawPhase - 0.78) / 0.22) * Math.PI) * 0.026 : 0.0;
    } else if (st.motion === 'circle') {
      const slowTravel = 0.5 + 0.16 * Math.sin(t * 0.65 * spd);
      uParam = slowTravel;
      const ang = t * 2.05 * spd;
      const rad = 0.036 * st.strokeSpan;
      lateralOff = Math.cos(ang) * rad;
      tangentOff = Math.sin(ang) * rad * 0.82;
    } else if (st.motion === 'cross') {
      uParam = 0.5 + 0.08 * Math.sin(t * 0.55 * spd);
      lateralOff = Math.sin(t * 2.2 * spd) * 0.044 * st.strokeSpan;
    } else if (st.motion === 'glide' || st.motion === 'press') {
      uParam = 0.48 + 0.03 * Math.sin(t * 0.9 * spd);
      const pressWave = 0.5 - 0.5 * Math.cos(t * 2.0 * spd);
      normalLift = -0.004 * pressWave;
    } else {
      const wave = Math.sin(t * 1.22 * spd);
      uParam = 0.5 + 0.44 * wave;
    }
    uParam = clamp01(uParam);
    curveTmp.getPointAt(uParam, posOnCurve);
    curveTmp.getTangentAt(uParam, tanOnCurve);
    sampleNormalAt(uParam, count, normOnCurve);
    tanOnCurve.addScaledVector(normOnCurve, -tanOnCurve.dot(normOnCurve));
    if (tanOnCurve.lengthSq() < 1e-6) tanOnCurve.set(0, 1, 0);
    else tanOnCurve.normalize();
    bitanOnCurve.crossVectors(tanOnCurve, normOnCurve);
    if (bitanOnCurve.lengthSq() < 1e-6) bitanOnCurve.set(1, 0, 0);
    else bitanOnCurve.normalize();
    tanOnCurve.crossVectors(normOnCurve, bitanOnCurve).normalize();
    posOnCurve
      .addScaledVector(bitanOnCurve, lateralOff)
      .addScaledVector(tanOnCurve, tangentOff)
      .addScaledVector(normOnCurve, normalLift);
    toolRig.position.copy(posOnCurve);
    rotMatTmp.makeBasis(bitanOnCurve, tanOnCurve, normOnCurve);
    toolRig.quaternion.setFromRotationMatrix(rotMatTmp);
    toolRig.scale.setScalar(st.scale);
    const distAlong = uParam * arcLen;
    if (st.tool === 'ball') {
      if (st.motion === 'circle') {
        const ang = t * 2.05 * spd;
        ballSpinGroup.rotation.x = -distAlong / (R_BALL * st.scale) + Math.sin(ang) * 0.95;
        ballSpinGroup.rotation.y = -Math.cos(ang) * 0.95;
      } else {
        ballSpinGroup.rotation.x = -distAlong / (R_BALL * st.scale);
        ballSpinGroup.rotation.y = (lateralOff / (R_BALL * st.scale)) * 0.8;
      }
    } else if (st.tool === 'roller') {
      rollerSpinGroup.rotation.x = -(distAlong + lateralOff * 0.5) / (R_ROLLER * st.scale);
    } else if (st.tool === 'hand') {
      const isLeft = st.effSide === 'L';
      const activeHand =
        st.handPose === 'thumb'
          ? isLeft
            ? thumbPoseGroup
            : thumbPoseGroupL
          : isLeft
            ? fingersPoseGroupL
            : fingersPoseGroup;
      if (st.handPose === 'thumb') {
        const outSignX = isLeft ? 1 : -1; // 右半身(x<0)なら画面左側(-X)の外側空間、左半身(x>0)なら右側(+X)の外側空間
        midTanDef.set(outSignX * 0.82, -0.12, 0.56);
        midTanDef.addScaledVector(normOnCurve, -midTanDef.dot(normOnCurve));
        let spinPhi = 0;
        if (midTanDef.lengthSq() > 1e-6) {
          midTanDef.normalize();
          const tx = midTanDef.dot(bitanOnCurve);
          const ty = midTanDef.dot(tanOnCurve);
          const palmRestAng = Math.atan2(-0.873, isLeft ? 0.487 : -0.487);
          spinPhi = Math.atan2(ty, tx) - palmRestAng;
        }
        const pWave =
          st.motion === 'glide' || st.motion === 'press'
            ? 0.5 - 0.5 * Math.cos(t * 2.0 * spd)
            : 0.5 + 0.5 * Math.sin(t * 2.05 * spd);
        activeHand.rotation.order = 'ZXY';
        activeHand.rotation.set(pWave * 0.035, 0, spinPhi);
        activeHand.position.z = -pWave * 0.002;
      } else {
        activeHand.rotation.order = 'XYZ';
        if (st.motion === 'circle') {
          const ang = t * 2.05 * spd;
          activeHand.rotation.set(Math.sin(ang) * 0.05, Math.cos(ang) * 0.05, 0);
          activeHand.position.z = 0;
        } else {
          activeHand.rotation.set(0.04 * Math.sin(t * 2.2 * spd), 0, 0);
          activeHand.position.z = 0;
        }
      }
    }
    if (indicators.strokeGroup.visible) {
      for (let ci = 0; ci < indicators.chevrons.length; ci++) {
        const ch = indicators.chevrons[ci];
        const flow = (((t * 0.95 * spd - ci * 0.24) % 1.0) + 1.0) % 1.0;
        const bell = Math.sin(flow * Math.PI);
        ch.position.y = ch.userData.baseY + flow * 0.022;
        const sc = 0.92 + 0.12 * bell;
        ch.scale.set(sc, sc, 1);
        ch.userData.mat.opacity = 0.20 + 0.70 * bell;
      }
    } else if (indicators.circleGroup.visible) {
      indicators.circleGroup.rotation.z = -t * 1.65 * spd;
      indicators.arcMat.opacity = 0.62 + 0.24 * Math.sin(t * 2.5 * spd);
    } else if (indicators.glideGroup.visible) {
      const gWave = Math.sin(t * 2.0 * spd);
      const holdPulse = 0.94 + 0.10 * (0.5 - 0.5 * Math.cos(t * 2.0 * spd));
      indicators.holdRingMesh.scale.set(holdPulse, holdPulse, 1);
      indicators.glideArrows.forEach((arr) => {
        const dirSign = arr.userData.dirSign;
        const activeDir = dirSign * gWave > 0 ? Math.abs(gWave) : 0.25;
        arr.position.y = dirSign * Math.max(0, dirSign * gWave) * 0.016;
        arr.userData.mat.opacity = 0.30 + 0.62 * activeDir;
      });
    }
    for (let i = 0; i < rippleMeshes.length; i++) {
      const rp = (((t * (st.tool === 'hand' ? 0.48 : 0.54) * spd + i / rippleMeshes.length) % 1.0) + 1.0) % 1.0;
      const rScale = 0.80 + rp * (st.tool === 'roller' ? 1.42 : st.tool === 'hand' ? 0.92 : 1.12);
      const baseOp = st.tool === 'hand' ? 0.52 : 0.64;
      const rAlpha = (1.0 - rp) * (baseOp - i * 0.11);
      const rm = rippleMeshes[i];
      rm.scale.set(st.tool === 'roller' ? rScale * 1.45 : rScale, rScale, 1);
      rm.material.opacity = Math.max(0, rAlpha);
    }
  }
  function clear() {
    st.active = false;
    rootGroup.visible = false;
    supportPanel.group.visible = false;
    if (guideTubeMesh) guideTubeMesh.visible = false;
  }
  function dispose() {
    clear();
    if (guideTubeMesh) {
      guideTubeMesh.geometry.dispose();
      guideTubeMesh = null;
    }
    rootGroup.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
        else o.material?.dispose?.();
      }
    });
    rootGroup.removeFromParent();
  }
  return {
    group: rootGroup,
    show,
    update,
    clear,
    dispose,
    isActive: () => st.active,
    getState: () => ({ ...st }),
  };
}