// =============================================================================
// fascia.js — 筋膜シート（面）と腱膜ブリッジによる「縮み横じわ・伸び縦スジ」の可視化
// 担当: シェーダー / 3D筋膜シート生成 / アニメーション
//
// 公開 API（CONTRACT.md 準拠）
//   createFascia({ THREE, scene, getMeshes, getCenter, getBasis }) => {
//     showLine(line, { side = 'both' } = {}),
//     showHabit(habit, lines),
//     showStep(step, lines),
//     showMuscleChain(chainSpec),
//     addFasciaSheetBridge(bridges, sideMode, opts),
//     showTriggerPoint(muscleId, side = 'both'),
//     clearTriggerPoint(),
//     showReleaseTool(config),
//     clearReleaseTool(),
//     triggerXRayScan(opts),
//     setProgress(p),
//     clear(),
//     update(time, delta),
//     dispose(),
//   }
//
// 座標系: Y 上向き / 正面 +Z / 身体の左 = +X・右 = -X。すべてワールド座標で扱う。
//
// 実装方針
//   - 細い線・ワイヤー・チューブは一切使わず、筋肉表面を包む半透明筋膜シース（OVERLAY）と、
//     隣接する筋肉同士が骨駅をまたいで連続する幅広3D筋膜・腱膜シート（SHEET: 幅 4.8cm〜13.6cm）の「面」で表現する。
//   - 全身の筋膜シート図鑑（line）等の非動作時は、揺れ・赤⇄青色変化ゼロの1色静止解剖図シートとしてピタッと表示する。
//   - 動作・クセ（habit）およびセルフケア時は実際の動きに合わせて伸縮・リリース器具をアニメーションする。
//   - 短縮（縮み）＝ 寄るアコーディオン横じわ（深紅ルビー Role1 ／ ローズクリムゾン Role2）
//   - 伸張（伸び）＝ ピンと張る縦コラーゲンスジ（ロイヤルコバルト Role3 ／ セルリアンスカイ Role4）
//   - 黄色・アンバー発光ゼロ。全シェーダーで厳密な Premultiplied Alpha（clamp(col,0,1)*alpha）を出力し骨の白飛びを防止。
// =============================================================================

import * as posture from './posture.js?v=20261118c';
import {
  createSelfCareGuide3D,
  sampleSurfaceStrokeByRaycaster,
  resolveCareProfile,
} from './selfcare_guide3d.js?v=20261118c';

const POSE_GLSL =
  typeof posture.POSE_GLSL === 'string' && posture.POSE_GLSL.includes('poseDeform')
    ? posture.POSE_GLSL
    : /* glsl */ `
      vec3 poseDeform(vec3 wp) { return wp; }
      vec3 poseDeformNormal(vec3 wp, vec3 n) { return n; }
    `;
const poseUniforms = posture.poseUniforms && typeof posture.poseUniforms === 'object' ? posture.poseUniforms : {};
const getRigRole = typeof posture.getRigRole === 'function' ? posture.getRigRole : null;
const deformPoint = typeof posture.deformPoint === 'function' ? posture.deformPoint : (p) => p.clone();

/** 駅ノードの最大数（インスタンス数） */
const MAX_NODES = 160;
/** 筋膜シートジオメトリキャッシュの上限（超えたら古いものから dispose） */
const GEO_CACHE_LIMIT = 96;
/** 3D筋膜シートの横方向・縦方向分割数（幅 4.8cm〜13.6cm の滑らかな曲面リボン） */
const SHEET_NU = 9;
const SHEET_NV = 13;

/** デフォルトの深層筋 ID 集合（setLayerFilter で MUSCLE_LAYERS が渡される前のフォールバック） */
const DEFAULT_DEEP_MUSCLE_IDS = new Set([
  // DFL（ディープ・フロント・ライン）
  'tibialis-posterior',
  'flexor-hallucis-longus',
  'flexor-digitorum-longus',
  'popliteus',
  'adductor-magnus',
  'adductor-brevis',
  'adductor-longus',
  'pectineus',
  'obturator-internus',
  'obturator-externus',
  'pelvic-floor',
  'levator-ani',
  'iliacus',
  'psoas-major',
  'psoas-minor',
  'quadratus-lumborum',
  'diaphragm',
  'transversus-thoracis',
  'transversus-abdominis',
  'scalenus-anterior',
  'scalenus-medius',
  'scalenus-posterior',
  'longus-colli',
  'longus-capitis',
  'infrahyoid',
  'sternohyoid',
  'sternothyroid',
  'omohyoid',
  'suprahyoid',
  'mylohyoid',
  'geniohyoid',
  'digastric',
  'medial-pterygoid',
  'lateral-pterygoid',
  // DFAL / DBAL（ディープ・アーム・ライン）
  'pectoralis-minor',
  'subclavius',
  'coracobrachialis',
  'brachialis',
  'supinator',
  'pronator-teres',
  'pronator-quadratus',
  'rhomboid-major',
  'rhomboid-minor',
  'levator-scapulae',
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'subscapularis',
  // 体幹・殿部・背部の深層安定筋群
  'piriformis',
  'gluteus-minimus',
  'gemellus-superior',
  'gemellus-inferior',
  'quadratus-femoris',
  'internal-oblique',
  'internal-intercostals',
  'multifidus',
  'rotatores',
  'semispinalis',
  'semispinalis-capitis',
  'semispinalis-cervicis',
  'splenius-cervicis',
  'suboccipital',
  'rectus-capitis-posterior-major',
  'rectus-capitis-posterior-minor',
  'obliquus-capitis-superior',
  'obliquus-capitis-inferior',
  'vastus-intermedius',
  'soleus',
  'plantaris',
]);

// 進行（setProgress）の区間: 縮みしわ(0.0〜0.35) → 斜めスパイラルねじれ(0.35〜0.75) → ねじれロック固定(0.62〜0.98)
const PHASE = {
  wrinkle: [0.0, 0.35],
  twist: [0.35, 0.75],
  lock: [0.62, 0.98],
};

// -----------------------------------------------------------------------------
// GLSL 共通部品
// -----------------------------------------------------------------------------
const GLSL_NOISE = /* glsl */ `
  float fxHash(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  // 3D バリューノイズ（軽量）
  float fxNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(fxHash(i), fxHash(i + vec3(1.0, 0.0, 0.0)), f.x);
    float b = mix(fxHash(i + vec3(0.0, 1.0, 0.0)), fxHash(i + vec3(1.0, 1.0, 0.0)), f.x);
    float c = mix(fxHash(i + vec3(0.0, 0.0, 1.0)), fxHash(i + vec3(1.0, 0.0, 1.0)), f.x);
    float d = mix(fxHash(i + vec3(0.0, 1.0, 1.0)), fxHash(i + vec3(1.0, 1.0, 1.0)), f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
  }
`;

// -----------------------------------------------------------------------------
// ① 筋膜シースオーバーレイ（面による4段階ロール表現 ＋ 筋膜シート図鑑の1色静止解剖図シート）
//    - Role 1: 🔴 shortenCore（深紅ルビー #6B0F1A〜#DC2626 / 寄る深い横じわ）
//    - Role 2: 🌹 shortenLinked（鮮やかなローズクリムゾン #9F1239〜#F43F5E / 寄る横じわ）
//    - Role 3: 🔵 lengthenAntagonist（ロイヤルコバルト #1E3A8A〜#1D4ED8 / ピンと張る縦スジ）
//    - Role 4: 🩵 lengthenLinked（セルリアンスカイ #075985〜#0284C7 / ピンと張る縦スジ）
//    - Role 0: 筋膜シート単体表示（uColor ベースの落ち着いた1色半透明解剖図シート・完全静止）
// -----------------------------------------------------------------------------
const OVERLAY_VS = /* glsl */ `
  uniform float uInflate;
  uniform float uSize;
  uniform float uWrinkle;
  uniform float uStretch;
  uniform float uTwistVis;
  uniform float uRole;
  uniform float uTierWeight;
  uniform float uLineWave;
  uniform float uContractCycle;
  uniform float uTime;
  uniform vec3 uAxisL;
  uniform vec3 uAxisR;
  uniform vec3 uCenterL;
  uniform vec3 uCenterR;
  uniform vec2 uSide;
  varying vec3 vWPos;
  varying vec3 vWNormal;
  ${POSE_GLSL}
  void main() {
    vec3 n = normalize((vec4(normalMatrix * normal, 0.0) * viewMatrix).xyz);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz + n * uInflate;

    float isL = step(0.0, wp.x);
    float chirV = mix(-1.0, 1.0, isL);
    float sideW = mix(uSide.y, uSide.x, smoothstep(-0.012, 0.012, wp.x));
    vec3 axis = normalize(mix(uAxisR, uAxisL, isL));
    vec3 ctr = mix(uCenterR, uCenterL, isL);
    float s = dot(wp.xyz - ctr, axis);
    float sNorm = clamp(s / max(uSize * 0.68, 0.14), -1.0, 1.0);
    float belly = max(0.0, 1.0 - sNorm * sNorm);

    // 姿勢反復サイクル（uContractCycle）と同期した伸縮変位（静止モード時は 0 で完全静止）
    float cyc = clamp(uContractCycle, 0.0, 1.0);
    float coreBoost = (uRole > 0.5 && uRole < 1.5) ? 1.0 : 0.72;

    float effWrinkle = uWrinkle;
    float effStretch = uStretch;

    // 短縮筋: 両端(±1)から筋腹中央(0)へ対称に引き込み ＋ 横アコーディオン膨隆
    vec3 radVec = (wp.xyz - ctr) - axis * s;
    vec3 swirlTangent = cross(axis, radVec);
    vec3 twistShift = swirlTangent * (sNorm * belly * 0.11 * uTwistVis * coreBoost * chirV * sideW);
    vec3 contractShift = -axis * (sNorm * (0.015 + 0.006 * uTwistVis) * effWrinkle * coreBoost * (0.38 + 0.62 * cyc) * sideW);
    float accordionRipple = 0.0;
    float bulge = uInflate + (
      (0.0085 + 0.0045 * uTwistVis) * effWrinkle * coreBoost * belly * (0.32 + 0.68 * cyc)
      + accordionRipple
      - 0.0024 * effStretch * belly * (0.35 + 0.65 * cyc)
    ) * sideW;
    // 伸張筋: 中央から両端へ対称にピンと引き伸ばされる変位
    vec3 stretchShift = axis * (sNorm * 0.013 * effStretch * (0.35 + 0.65 * cyc) * sideW);

    vec3 shiftedRest = wp.xyz + contractShift + twistShift + stretchShift;
    vec3 defN = poseDeformNormal(shiftedRest, n);
    vec3 defP = poseDeform(shiftedRest) + defN * bulge;
    vWNormal = defN;
    gl_Position = projectionMatrix * viewMatrix * vec4(defP, 1.0);
  }
`;

const OVERLAY_FS = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uProgress;
  uniform float uSize;
  uniform float uRole;         // 0: ライン経線シース, 1: 🔴shortenCore, 2: 🌹shortenLinked, 3: 🔵lengthenAntagonist, 4: 🩵lengthenLinked
  uniform float uTierWeight;   // 各段階の重み 0..1
  uniform float uLineWave;     // -1(伸び縦スジ) .. +1(縮み横じわ) ライン経線呼吸波
  uniform float uLayerAlpha;   // 2層シースルー／表層・深層フィルタ係数 0..1
  uniform float uFiber;
  uniform float uWrinkle;
  uniform float uStretch;
  uniform float uYore;
  uniform float uTwistAmt;
  uniform float uTwistVis;
  uniform float uLock;
  uniform float uLockMax;
  uniform float uRelease;
  uniform float uSelected;
  uniform float uHasSpot;
  uniform float uContractCycle;
  uniform vec3 uColor;
  // 黄色・アンバー完全ゼロの4段階レッド／ブルー筋膜パレット（Linear sRGB）
  uniform vec3 uCoreDark;        // #6B0F1A 深いボルドールビー陰影
  uniform vec3 uCoreMid;         // #B91C1C 深紅ルビー
  uniform vec3 uCoreHot;         // #DC2626 コアクリムゾンレッド
  uniform vec3 uCoreRose;        // #F87171 横じわ尾根のソフトコーラルローズ
  uniform vec3 uLinkRedDark;     // #9F1239 深いローズクリムゾン陰影
  uniform vec3 uLinkRedMid;      // #E11D48 鮮やかなローズクリムゾン
  uniform vec3 uLinkRedBright;   // #F43F5E ブライトローズレッド
  uniform vec3 uLinkRedRidge;    // #FDA4AF 連動横じわ尾根のローズピンク
  uniform vec3 uAntagBlueDark;   // #1E3A8A 深いロイヤルコバルト陰影
  uniform vec3 uAntagBlueMid;    // #1D4ED8 ロイヤルコバルトブルー
  uniform vec3 uAntagBlueRidge;  // #93C5FD 縦スジコラーゲンハイライト
  uniform vec3 uLinkBlueDark;    // #075985 深いセルリアン陰影
  uniform vec3 uLinkBlueMid;     // #0284C7 セルリアンスカイブルー
  uniform vec3 uLinkBlueRidge;   // #7DD3FC 連動縦スジスカイハイライト
  uniform vec3 uAxisL;
  uniform vec3 uAxisR;
  uniform vec3 uCenterL;
  uniform vec3 uCenterR;
  uniform vec3 uLockOrigL;
  uniform vec3 uLockOrigR;
  uniform vec4 uLockRange;
  uniform vec2 uSide;
  varying vec3 vWPos;
  varying vec3 vWNormal;

  ${GLSL_NOISE}

  float fxLine(float x, float w) {
    float d = abs(fract(x + 0.5) - 0.5);
    float fw = max(fwidth(x), 1e-4);
    return 1.0 - smoothstep(w, w + fw * 1.5, d);
  }

  vec3 fxPerturb(vec3 pos, vec3 n, float h) {
    vec3 dpx = dFdx(pos);
    vec3 dpy = dFdy(pos);
    float dhx = dFdx(h);
    float dhy = dFdy(h);
    vec3 r1 = cross(dpy, n);
    vec3 r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    return normalize(abs(det) * n - grad);
  }

  void main() {
    if (uLayerAlpha <= 0.001) discard;

    float isL = step(0.0, vWPos.x);
    float sideW = max(mix(uSide.y, uSide.x, smoothstep(-0.012, 0.012, vWPos.x)), step(0.5, uSelected));
    float chir = mix(-1.0, 1.0, isL);

    vec3 axis = normalize(mix(uAxisR, uAxisL, isL));
    vec3 ctr = mix(uCenterR, uCenterL, isL);
    vec3 N = normalize(vWNormal);
    vec3 V = normalize(cameraPosition - vWPos);

    vec3 r = vWPos - ctr;
    float s = dot(r, axis);
    vec3 up = abs(axis.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 b1 = normalize(cross(axis, up));
    vec3 b2 = cross(axis, b1);
    float c1 = dot(r, b1);
    float c2 = dot(r, b2);
    float wA = pow(abs(dot(N, b2)), 2.0) + 1e-3;
    float wB = pow(abs(dot(N, b1)), 2.0) + 1e-3;
    float tc = (c1 * wA + c2 * wB) / (wA + wB);

    float n1 = fxNoise(vWPos * 5.0);
    float facing = clamp(dot(N, V), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.20);
    vec3 L = normalize(V * 0.7 + vec3(0.2, 0.75, 0.3));
    float dif0 = max(dot(N, L), 0.0);

    float relAmt = clamp(uRelease, 0.0, 1.0);
    float prog = clamp(uProgress, 0.0, 1.0);

    float cyc = clamp(uContractCycle, 0.0, 1.0);

    // 筋の長軸方向正規化座標: 0 = 筋腹中央、±1 = 両端の腱・骨付着部
    float sNorm = clamp(s / max(uSize * 0.68, 0.14), -1.0, 1.0);
    float absS = abs(sNorm);
    float bellyFocus = clamp(1.0 - (0.32 + 0.22 * cyc) * absS * absS, 0.0, 1.0);
    // 両端は3D筋膜シート（SHEET）へ滑らかに溶け込むフェザーマスク
    float endBellyMask = 1.0 - 0.38 * smoothstep(0.82, 1.0, absS);

    float lockAmt = 0.0;
    float lockAge = 0.0;
    if (uLockMax > 0.001) {
      vec3 org = mix(uLockOrigR, uLockOrigL, isL);
      vec2 nf = mix(uLockRange.xy, uLockRange.zw, isL);
      float d = distance(vWPos, org) + (fxNoise(vWPos * 9.0) - 0.5) * 0.12;
      float front = mix(nf.x - 0.04, nf.y + 0.05, uLock);
      lockAmt = smoothstep(front + 0.04, front - 0.04, d) * uLockMax * (1.0 - 0.78 * relAmt);
      lockAge = clamp((front - d) / max(0.35 * (nf.y - nf.x), 0.06), 0.0, 1.0);
    }

    vec3 col = vec3(0.0);
    float rawAlpha = 0.0;
    float tierW = clamp(uTierWeight, 0.0, 1.0);
    float fiberLong = fxLine(tc * 36.0 + n1 * 0.12, 0.16);

    // Proposal A: 人工ストライプ（横じわ・縦スジ）0%、和紙に滲む水彩ハニーアンバー＆水彩テラコッタ表現
    float paperGrain = (fxNoise(vWPos * 11.0) - 0.5) * 0.10 + (n1 - 0.5) * 0.08;
    float washLight = clamp(0.36 + 0.44 * bellyFocus + 0.24 * dif0 + paperGrain, 0.0, 1.0);
    vec3 reliefSage = mix(vec3(0.42, 0.56, 0.44), vec3(0.76, 0.84, 0.74), clamp(0.45 + 0.35 * dif0 + 0.20 * bellyFocus, 0.0, 1.0));

    // ---- Role 0: 全身の筋膜シート図鑑（line モード等）の水彩1色解剖シート ----
    if (uRole < 0.5) {
      float nonSpotSheet = (uHasSpot > 0.5 && uSelected < 0.5) ? 0.28 : 1.0;
      float sheetMask = uFiber * nonSpotSheet;
      if (sheetMask > 0.001) {
        vec3 shadeCol = uColor * 0.68;
        vec3 midCol   = mix(uColor, vec3(0.96, 0.93, 0.86), 0.18);
        vec3 edgeInk  = uColor * 0.42;
        vec3 sheetCol = mix(shadeCol, midCol, washLight);
        sheetCol = mix(sheetCol, edgeInk, rim * 0.36);
        col = sheetCol;
        rawAlpha = sheetMask * (0.66 + 0.14 * bellyFocus + 0.14 * rim) * endBellyMask;
      }
    }

    // ---- Role 1: 🍯 shortenCore（1番縮んで固い中心の筋膜：濃い水彩ハニーアンバー）----
    else if (uRole < 1.5) {
      float wStr = max(uWrinkle, tierW * 0.94);
      float coreWash = clamp(0.46 * bellyFocus + 0.28 * dif0 + 0.16 * cyc + 0.14 * lockAge + paperGrain, 0.0, 1.0);
      vec3 wCol = mix(uCoreDark, uCoreMid, smoothstep(0.08, 0.58, coreWash));
      wCol = mix(wCol, uCoreHot, smoothstep(0.35, 0.88, coreWash));
      wCol = mix(wCol, uCoreRose, clamp(0.28 * bellyFocus * dif0, 0.0, 0.42));
      // 水彩絵の具のフチ溜まり（エッジの繊細な琥珀輪郭）
      wCol = mix(wCol, uCoreDark * 0.78, rim * 0.38);

      if (relAmt > 0.001) {
        wCol = mix(wCol, reliefSage, clamp(relAmt * 0.82, 0.0, 0.85));
      }
      col = wCol;
      rawAlpha = clamp(wStr * (0.76 + 0.10 * bellyFocus + 0.12 * rim) * endBellyMask, 0.0, 0.88);
    }

    // ---- Role 2: 🌼 shortenLinked（連動して縮む周辺の筋膜：明るい水彩アンバー）----
    else if (uRole < 2.5) {
      float lStr = max(max(uWrinkle, uYore), tierW * 0.88);
      float ambMix = clamp(0.44 * bellyFocus + 0.32 * dif0 + 0.16 * cyc + paperGrain, 0.0, 1.0);
      vec3 rCol = mix(uLinkRedDark, uLinkRedMid, smoothstep(0.06, 0.62, ambMix));
      rCol = mix(rCol, uLinkRedBright, smoothstep(0.38, 0.90, ambMix));
      rCol = mix(rCol, uLinkRedRidge, clamp(0.22 * bellyFocus * dif0, 0.0, 0.34));
      rCol = mix(rCol, uLinkRedDark * 0.82, rim * 0.34);

      if (relAmt > 0.001) {
        rCol = mix(rCol, reliefSage, clamp(relAmt * 0.78, 0.0, 0.82));
      }
      col = rCol;
      rawAlpha = clamp(lStr * (0.64 + 0.10 * bellyFocus + 0.12 * rim) * endBellyMask, 0.0, 0.78);
    }

    // ---- Role 3: 🏺 lengthenAntagonist（反対側で引き伸ばされる筋膜：水彩テラコッタコーラル）----
    else if (uRole < 3.5) {
      float sStr = max(uStretch, tierW * 0.92);
      float terraMix = clamp(0.42 * bellyFocus + 0.36 * dif0 + 0.14 * cyc + paperGrain, 0.0, 1.0);
      vec3 bCol = mix(uAntagBlueDark, uAntagBlueMid, smoothstep(0.08, 0.68, terraMix));
      bCol = mix(bCol, uAntagBlueRidge, clamp(0.30 * dif0 + 0.16 * bellyFocus, 0.0, 0.46));
      bCol = mix(bCol, uAntagBlueDark * 0.80, rim * 0.36);

      col = bCol;
      rawAlpha = clamp(sStr * (0.70 + 0.10 * bellyFocus + 0.12 * rim) * endBellyMask, 0.0, 0.84);
    }

    // ---- Role 4: 🌸 lengthenLinked（シート延長で張る筋膜：淡い水彩コーラルローズ）----
    else {
      float cStr = max(uStretch, tierW * 0.86);
      float coralMix = clamp(0.40 * bellyFocus + 0.38 * dif0 + paperGrain, 0.0, 1.0);
      vec3 iCol = mix(uLinkBlueDark, uLinkBlueMid, smoothstep(0.08, 0.70, coralMix));
      iCol = mix(iCol, uLinkBlueRidge, clamp(0.28 * dif0 + 0.14 * bellyFocus, 0.0, 0.42));
      iCol = mix(iCol, uLinkBlueDark * 0.82, rim * 0.32);

      col = iCol;
      rawAlpha = clamp(cStr * (0.56 + 0.10 * bellyFocus + 0.12 * rim) * endBellyMask, 0.0, 0.72);
    }

    // 選択・スポットライト強調（水彩ゴールドアンバーの柔らかな輪郭ハイライト）
    if (uSelected > 0.5) {
      float selRim = pow(1.0 - facing, 1.85);
      vec3 targetRim = (uRole < 0.5)
        ? mix(uColor, vec3(0.95, 0.90, 0.78), 0.42)
        : (uRole >= 2.5)
          ? uAntagBlueRidge
          : uCoreRose;
      targetRim = mix(targetRim, reliefSage, relAmt * 0.78);
      col = mix(col, targetRim, clamp(0.20 + 0.38 * selRim, 0.0, 0.68));
      rawAlpha = max(rawAlpha, clamp(0.64 + 0.24 * selRim, 0.0, 0.88));
    }

    float nonSelDim = (uHasSpot > 0.5 && uSelected < 0.5) ? 0.84 : 1.0;
    vec3 clampedCol = clamp(col, 0.0, 1.0);
    float alpha = clamp(rawAlpha * 1.16 * sideW * uFade * nonSelDim * uLayerAlpha, 0.0, 0.94);
    gl_FragColor = vec4(clampedCol, alpha);
    #include <colorspace_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`;

// -----------------------------------------------------------------------------
// ② 骨駅をまたぐ3D筋膜・腱膜シート（Fascia Sheet Bridge: 幅 4.8cm〜13.6cm の曲面膜）
//    線・ワイヤー表現を全廃し、筋肉Aの筋膜シースから筋肉Bの筋膜シースへ「面」のまま連続接続する。
//    uModeA / uModeB: -1 = 短縮（寄る横じわ） / +1 = 伸張（ピンと張る縦スジ） / 0 = 中立膜
// -----------------------------------------------------------------------------
const SHEET_VS = /* glsl */ `
  uniform float uTime;
  uniform float uContractCycle;
  uniform float uModeA;
  uniform float uModeB;
  varying vec2 vUv;
  varying vec3 vWPos;
  varying vec3 vWNormal;
  ${POSE_GLSL}
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);

    float cyc = clamp(uContractCycle, 0.0, 1.0);
    float mLocal = mix(uModeA, uModeB, smoothstep(0.15, 0.85, uv.y));
    float shortW = clamp(-mLocal, 0.0, 1.0);
    float longW  = clamp(mLocal, 0.0, 1.0);
    float spanEnv = sin(uv.y * 3.14159265);

    // 短縮シートは横方向のアコーディオン波ひだで立体的にたわみ、伸張シートはピンと張る
    float wavePleat = 0.0;
    float tautPull  = -0.0005 * longW * spanEnv;
    vec3 restP = wp.xyz + n * (wavePleat + tautPull);

    vWNormal = poseDeformNormal(restP, n);
    vec3 defP = poseDeform(restP);
    vWPos = defP;
    gl_Position = projectionMatrix * viewMatrix * vec4(defP, 1.0);
  }
`;

const SHEET_FS = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uRidgeA;
  uniform vec3 uRidgeB;
  uniform float uModeA;
  uniform float uModeB;
  uniform float uAlpha;
  uniform float uLayerAlpha;
  uniform float uTime;
  uniform float uFade;
  uniform float uProgress;
  uniform float uContractCycle;
  varying vec2 vUv;
  varying vec3 vWPos;
  varying vec3 vWNormal;

  ${GLSL_NOISE}

  float fxSheetLine(float x, float w) {
    float d = abs(fract(x + 0.5) - 0.5);
    float fw = max(fwidth(x), 1e-4);
    return 1.0 - smoothstep(w, w + fw * 1.5, d);
  }

  vec3 fxSheetPerturb(vec3 pos, vec3 n, float h) {
    vec3 dpx = dFdx(pos);
    vec3 dpy = dFdy(pos);
    float dhx = dFdx(h);
    float dhy = dFdy(h);
    vec3 r1 = cross(dpy, n);
    vec3 r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    return normalize(abs(det) * n - grad);
  }

  void main() {
    if (uLayerAlpha <= 0.001) discard;

    // シート両側端 15% と両筋肉へのオーバーラップ端 14% を滑らかにフェザー透過し、筋肉シースと一体に見せる
    float edgeU = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x);
    float edgeV = smoothstep(0.0, 0.14, vUv.y) * smoothstep(0.0, 0.14, 1.0 - vUv.y);
    if (edgeU * edgeV <= 0.002) discard;

    vec3 N = normalize(vWNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWPos);
    float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.0);
    vec3 L = normalize(V * 0.7 + vec3(0.2, 0.75, 0.3));

    float cyc = clamp(uContractCycle, 0.0, 1.0);

    float tV = smoothstep(0.12, 0.88, vUv.y);
    vec3 baseCol = mix(uColorA, uColorB, tV);
    vec3 ridgeCol = mix(uRidgeA, uRidgeB, tV);

    float n1 = fxNoise(vWPos * 7.5);
    float dif = max(dot(N, L), 0.0);
    float centerBand = sin(vUv.x * 3.14159265);
    float wash = clamp(0.38 + 0.38 * dif + 0.18 * centerBand + (n1 - 0.5) * 0.10, 0.0, 1.0);

    vec3 col = mix(baseCol * 0.78, baseCol * 1.04, wash);
    col = mix(col, ridgeCol, clamp(0.24 * dif * centerBand, 0.0, 0.36));
    col = mix(col, baseCol * 0.58, rim * 0.34);

    float texAlpha = 0.62 + 0.14 * centerBand + 0.14 * rim;
    vec3 clampedCol = clamp(col, 0.0, 1.0);
    float alpha = clamp(texAlpha * edgeU * edgeV * uAlpha * uLayerAlpha * uFade, 0.0, 0.84);
    gl_FragColor = vec4(clampedCol, alpha);
    #include <colorspace_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`;

// -----------------------------------------------------------------------------
// ③ トリガーポイント核マーカー（オンデマンド1点スポットライト時のみ表示・黄色ゼロの深紅クリムゾン）
// -----------------------------------------------------------------------------
const NODE_VS = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aColor;
  attribute float aD;
  uniform float uScale;
  uniform float uTime;
  varying vec3 vColor;
  varying float vFlash;
  varying vec3 vWPos;
  varying vec3 vWNormal;
  varying vec2 vViewN;
  void main() {
    float pulse = 0.0;
    vFlash = pulse;
    vColor = aColor;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vec3 p = aOffset + n * uScale * (1.0 + 0.30 * pulse);
    vWPos = p;
    vWNormal = n;
    vViewN = (viewMatrix * vec4(n, 0.0)).xy;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const NODE_FS = /* glsl */ `
  uniform float uHalo;
  uniform float uFade;
  uniform float uTime;
  varying vec3 vColor;
  varying float vFlash;
  varying vec3 vWPos;
  varying vec3 vWNormal;
  varying vec2 vViewN;
  void main() {
    vec3 N = normalize(vWNormal);
    vec3 V = normalize(cameraPosition - vWPos);
    float f = abs(dot(N, V));
    float rad = clamp(length(vViewN), 0.0, 1.0);
    float ang = atan(vViewN.y, vViewN.x);
    float spiral = 0.5 + 0.5 * sin(ang * 3.0 - rad * 10.5);
    float spiralSharp = smoothstep(0.24, 0.86, spiral);

    vec3 deepRuby   = vec3(0.42, 0.14, 0.10);
    vec3 crimson    = vec3(0.73, 0.35, 0.28);
    vec3 roseCrest  = vec3(0.90, 0.65, 0.59);
    vec3 softPearl  = vec3(0.99, 0.95, 0.92);

    vec3 col;
    float a;
    if (uHalo > 0.5) {
      float ring = smoothstep(0.14, 0.42, f) * (1.0 - smoothstep(0.48, 0.82, f));
      float vortexMask = clamp(ring * (0.52 + 0.48 * spiralSharp) + pow(f, 2.0) * 0.20, 0.0, 1.0);
      col = mix(crimson, roseCrest, clamp(0.48 * spiralSharp + 0.38 * vFlash, 0.0, 1.0));
      a = vortexMask * (0.56 + 0.24 * vFlash);
    } else {
      a = 0.92;
      col = mix(deepRuby, crimson, clamp(0.35 + 0.65 * f, 0.0, 1.0));
      col = mix(col, roseCrest, clamp(0.42 * spiralSharp + 0.28 * (1.0 - f), 0.0, 1.0));
      col = mix(col, softPearl, pow(f, 2.5) * (0.38 + 0.30 * vFlash));
    }
    vec3 clampedCol = clamp(col, 0.0, 1.0);
    float alpha = clamp(a * uFade, 0.0, 0.94);
    gl_FragColor = vec4(clampedCol, alpha);
    #include <colorspace_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`;

// -----------------------------------------------------------------------------
// 小物
// -----------------------------------------------------------------------------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-6));
  return t * t * (3 - 2 * t);
};
const opp = (s) => (s === 'L' ? 'R' : 'L');
const noRaycast = () => {};

// =============================================================================
export function createFascia({ THREE, scene, getMeshes, getCenter, getBasis }) {
  const root = new THREE.Group();
  root.name = 'fascia-fx';
  root.raycast = noRaycast;
  scene.add(root);

  // ---- 全マテリアル共有 uniform（水彩テラコッタレッド＝縮み × 水彩ミネラルブルー＝伸び）----
  const shared = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uLockG: { value: 0 },
    uProgress: { value: 0 },
    uHasSpot: { value: 0 },
    // 1. 🔴 shortenCore（主役・1番縮んで硬い中心の筋肉・筋膜：水彩テラコッタレッド）
    uCoreDark: { value: new THREE.Color('#752C1E') },
    uCoreMid: { value: new THREE.Color('#B95C48') },
    uCoreHot: { value: new THREE.Color('#CC6F5B') },
    uCoreRose: { value: new THREE.Color('#E5A898') },
    // 2. 🌸 shortenLinked（連動して一緒に縮む周辺の筋肉・筋膜：水彩コーラルレッド）
    uLinkRedDark: { value: new THREE.Color('#8F3E2E') },
    uLinkRedMid: { value: new THREE.Color('#CA7562') },
    uLinkRedBright: { value: new THREE.Color('#D88977') },
    uLinkRedRidge: { value: new THREE.Color('#EBB7A9') },
    // 3. 🔵 lengthenAntagonist（反対側で引き伸ばされる筋肉・筋膜：水彩ミネラルブルー）
    uAntagBlueDark: { value: new THREE.Color('#264C69') },
    uAntagBlueMid: { value: new THREE.Color('#4F84AA') },
    uAntagBlueRidge: { value: new THREE.Color('#9DC1DB') },
    // 4. 💧 lengthenLinked（連動して張る周辺の筋肉・筋膜：水彩ソフトブルー）
    uLinkBlueDark: { value: new THREE.Color('#355D7B') },
    uLinkBlueMid: { value: new THREE.Color('#6A99BA') },
    uLinkBlueRidge: { value: new THREE.Color('#B4D0E4') },
  };

  // 厳密な Premultiplied Alpha 合成（clampedCol * alpha 出力により骨上の加算白飛びを 0% に抑える）
  const PREMUL = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    toneMapped: false,
  };

  // ---------------------------------------------------------------------------
  // 状態 ＆ 2層（surface / deep）フィルタ管理
  // ---------------------------------------------------------------------------
  const state = {
    mode: null, // 'line' | 'habit' | 'step' | 'chain' | null
    line: null,
    habit: null,
    chainSpec: null,
    chainSeedId: null,
    progress: 0,
    twist: 0.5,
    layerMode: 'see-through', // 'see-through' | 'surface' | 'deep'
    customMuscleLayers: new Map(), // id -> 'surface' | 'deep'
    sheets: [], // { mesh, mat, u, geo, fromId, toId, ratioA, ratioB, lineId }
    muscles: new Map(), // id -> entry
    targetNodes: [], // { rawPos, color, d, rigRole }
    nodeCount: 0,
    spotMuscleId: null,
    muscleOverlayVisible: true,
    paused: false,
  };
  const activeGeos = new Set();

  const resolveMuscleLayer = (id) => {
    const custom = state.customMuscleLayers.get(id);
    if (custom === 'surface' || custom === 'deep') return custom;
    if (DEFAULT_DEEP_MUSCLE_IDS.has(id)) return 'deep';
    return 'surface';
  };

  // ---------------------------------------------------------------------------
  // 解析キャッシュ: 筋の左右別 重心・主軸(PCA)・両端付着部ポール（ワールド座標）
  // ---------------------------------------------------------------------------
  const analysisCache = new Map();
  const poleCache = new Map();
  const tmpV = new THREE.Vector3();

  const safeMeshes = (id) => {
    try {
      const list = getMeshes(id);
      return Array.isArray(list) ? list.filter((m) => m && m.isMesh && m.geometry) : [];
    } catch (e) {
      return [];
    }
  };

  /** center / axis / radius から setLockGeometry 用の軽量サンプル点列を作る */
  function synthSamples(center, axis, radius) {
    const arr = new Float32Array(21);
    const steps = [-0.9, -0.6, -0.3, 0.0, 0.3, 0.6, 0.9];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i] * radius;
      const o = i * 3;
      arr[o]     = center.x + axis.x * s;
      arr[o + 1] = center.y + axis.y * s;
      arr[o + 2] = center.z + axis.z * s;
    }
    return arr;
  }

  /** viewer から渡された getBasis または mesh.userData.atlasBasis を左右別解析データへ正規化 */
  function normalizeBasis(id, raw, meshes) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.L && raw.R && raw.L.center && raw.L.axis && raw.R.center && raw.R.axis) {
      const rL = Number.isFinite(raw.L.radius) ? raw.L.radius : (Number.isFinite(raw.size) ? raw.size : 0.25);
      const rR = Number.isFinite(raw.R.radius) ? raw.R.radius : (Number.isFinite(raw.size) ? raw.size : 0.25);
      const L = {
        center: raw.L.center.clone(),
        axis: raw.L.axis.clone().normalize(),
        radius: rL,
        samples: raw.L.samples instanceof Float32Array ? raw.L.samples : synthSamples(raw.L.center, raw.L.axis, rL),
      };
      const R = {
        center: raw.R.center.clone(),
        axis: raw.R.axis.clone().normalize(),
        radius: rR,
        samples: raw.R.samples instanceof Float32Array ? raw.R.samples : synthSamples(raw.R.center, raw.R.axis, rR),
      };
      return { L, R, size: Math.max(rL, rR) };
    }
    if (raw.center && raw.axis) {
      const spanLen = raw.span ? Math.abs((raw.span.y ?? 0.15) - (raw.span.x ?? -0.15)) : 0.3;
      const bSphereR = meshes?.[0]?.geometry?.boundingSphere?.radius || 0;
      const radius = Math.max(spanLen * 0.55, bSphereR * 0.5, 0.12);
      const cL = centerOf(id, 'L') || new THREE.Vector3(Math.abs(raw.center.x), raw.center.y, raw.center.z);
      const cR = centerOf(id, 'R') || new THREE.Vector3(-Math.abs(raw.center.x), raw.center.y, raw.center.z);
      const axL = new THREE.Vector3(raw.axis.x, raw.axis.y, raw.axis.z).normalize();
      if (Math.abs(axL.y) > 0.25) {
        if (axL.y < 0) axL.negate();
      } else if (axL.x < 0) {
        axL.negate();
      }
      const axR = axL.clone().setX(-axL.x);
      return {
        L: { center: cL, axis: axL, radius, samples: synthSamples(cL, axL, radius) },
        R: { center: cR, axis: axR, radius, samples: synthSamples(cR, axR, radius) },
        size: radius,
      };
    }
    return null;
  }

  function pca(arr) {
    const n = arr.length / 3;
    if (n < 6) return null;
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < arr.length; i += 3) { mx += arr[i]; my += arr[i + 1]; mz += arr[i + 2]; }
    mx /= n; my /= n; mz /= n;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0, rad = 0;
    for (let i = 0; i < arr.length; i += 3) {
      const dx = arr[i] - mx, dy = arr[i + 1] - my, dz = arr[i + 2] - mz;
      xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz;
      rad = Math.max(rad, dx * dx + dy * dy + dz * dz);
    }
    let vx = 0.3, vy = 1.0, vz = 0.2;
    for (let it = 0; it < 18; it++) {
      const nx = xx * vx + xy * vy + xz * vz;
      const ny = xy * vx + yy * vy + yz * vz;
      const nz = xz * vx + yz * vy + zz * vz;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) { vx = 0; vy = 1; vz = 0; break; }
      vx = nx / l; vy = ny / l; vz = nz / l;
    }
    const center = new THREE.Vector3(mx, my, mz);
    const axis = new THREE.Vector3(vx, vy, vz).normalize();
    if (Math.abs(axis.y) > 0.25) {
      if (axis.y < 0) axis.negate();
    } else {
      const out = Math.sign(center.x) || 1;
      if (axis.x * out < 0) axis.negate();
    }
    return { center, axis, radius: Math.sqrt(rad), samples: Float32Array.from(arr) };
  }

  function mirrorStats(st) {
    const s = st.samples.slice();
    for (let i = 0; i < s.length; i += 3) s[i] = -s[i];
    return {
      center: st.center.clone().setX(-st.center.x),
      axis: st.axis.clone().setX(-st.axis.x),
      radius: st.radius,
      samples: s,
    };
  }

  function analyze(id) {
    if (analysisCache.has(id)) return analysisCache.get(id);
    const meshes = safeMeshes(id);

    let extBasis = null;
    if (typeof getBasis === 'function') {
      try {
        extBasis = getBasis(id);
      } catch (e) {
        extBasis = null;
      }
    }
    if (!extBasis && meshes[0]?.userData?.atlasBasis) {
      extBasis = meshes[0].userData.atlasBasis;
    }
    const normalized = normalizeBasis(id, extBasis, meshes);
    if (normalized) {
      analysisCache.set(id, normalized);
      return normalized;
    }

    const L = [], R = [];
    for (const mesh of meshes) {
      const pos = mesh.geometry.attributes.position;
      if (!pos) continue;
      mesh.updateWorldMatrix(true, false);
      const step = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += step) {
        tmpV.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        (tmpV.x >= 0 ? L : R).push(tmpV.x, tmpV.y, tmpV.z);
      }
    }
    const sl = pca(L), sr = pca(R);
    let res = null;
    if (sl || sr) {
      res = { L: sl || mirrorStats(sr), R: sr || mirrorStats(sl) };
      res.size = Math.max(res.L.radius, res.R.radius);
    }
    analysisCache.set(id, res);
    return res;
  }

  /** 経路用の中心点（viewer の getCenter を優先、null はスキップ） */
  function centerOf(id, side) {
    let c = null;
    try {
      c = getCenter(id, side);
    } catch (e) {
      c = null;
    }
    if (c && Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)) return c.clone();
    return null;
  }

  /**
   * 指定した筋肉・体側の両端（腱・骨付着部ポール）のレストポーズ3D座標を算出・キャッシュする
   */
  function computeMusclePoles(id, side = 'L') {
    const s = side === 'R' ? 'R' : 'L';
    const key = `${id}|${s}`;
    if (poleCache.has(key)) return poleCache.get(key);

    const an = analyze(id);
    if (!an) {
      poleCache.set(key, null);
      return null;
    }
    const st = an[s] || an.L;
    const axis = st.axis;
    const ctr = st.center;
    const meshes = safeMeshes(id);

    const pts = [];
    const pTmp = new THREE.Vector3();
    for (const mesh of meshes) {
      const pos = mesh.geometry?.attributes?.position;
      if (!pos) continue;
      mesh.updateWorldMatrix(true, false);
      const step = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += step) {
        pTmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (s === 'L' && pTmp.x >= -0.025) pts.push(pTmp.clone());
        else if (s === 'R' && pTmp.x <= 0.025) pts.push(pTmp.clone());
      }
    }
    if (pts.length < 6) {
      for (const mesh of meshes) {
        const pos = mesh.geometry?.attributes?.position;
        if (!pos) continue;
        mesh.updateWorldMatrix(true, false);
        const step = Math.max(1, Math.floor(pos.count / 300));
        for (let i = 0; i < pos.count; i += step) {
          pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
        }
      }
    }

    let poleA = null;
    let poleB = null;
    if (pts.length >= 4) {
      let sMin = Infinity;
      let sMax = -Infinity;
      const projs = pts.map((p) => {
        const sv = pTmp.copy(p).sub(ctr).dot(axis);
        if (sv < sMin) sMin = sv;
        if (sv > sMax) sMax = sv;
        return { p, sv };
      });
      const span = Math.max(sMax - sMin, 0.02);
      const sumA = new THREE.Vector3();
      const sumB = new THREE.Vector3();
      let cntA = 0;
      let cntB = 0;
      for (const item of projs) {
        const u = (item.sv - sMin) / span;
        if (u <= 0.16) {
          sumA.add(item.p);
          cntA++;
        }
        if (u >= 0.84) {
          sumB.add(item.p);
          cntB++;
        }
      }
      if (cntA > 0) poleA = sumA.divideScalar(cntA);
      if (cntB > 0) poleB = sumB.divideScalar(cntB);
    }

    if (!poleA) poleA = ctr.clone().addScaledVector(axis, -st.radius * 0.78);
    if (!poleB) poleB = ctr.clone().addScaledVector(axis, st.radius * 0.78);

    const sampleStride = Math.max(1, Math.floor(pts.length / 72));
    const samples = pts.length
      ? pts.filter((_, idx) => idx % sampleStride === 0)
      : [poleA.clone(), poleB.clone()];

    const out = { poleA, poleB, center: ctr.clone(), samples };
    poleCache.set(key, out);
    return out;
  }

  // ---------------------------------------------------------------------------
  // ジオメトリキャッシュ ＆ 3D筋膜・腱膜シート生成（buildFasciaSheetGeometry）
  // ---------------------------------------------------------------------------
  const geoCache = new Map();
  const sideVertCache = new Map();

  function cacheGet(key) {
    const v = geoCache.get(key);
    if (v) {
      geoCache.delete(key);
      geoCache.set(key, v);
    }
    return v;
  }
  function cacheSet(key, v) {
    geoCache.set(key, v);
    if (geoCache.size <= GEO_CACHE_LIMIT) return;
    for (const [k, item] of geoCache) {
      if (geoCache.size <= GEO_CACHE_LIMIT) break;
      if (activeGeos.has(item.geo)) continue;
      item.geo.dispose();
      geoCache.delete(k);
    }
  }

  /** 指定した筋肉・体側のワールド座標頂点群（最大約420点）と重心をキャッシュして返す */
  function getMuscleSideVerts(id, side = 'L') {
    const s = side === 'R' ? 'R' : 'L';
    const key = `${id}|${s}`;
    if (sideVertCache.has(key)) return sideVertCache.get(key);

    const meshes = safeMeshes(id);
    if (!meshes.length) {
      sideVertCache.set(key, null);
      return null;
    }

    const pts = [];
    const pTmp = new THREE.Vector3();
    for (const mesh of meshes) {
      const pos = mesh.geometry?.attributes?.position;
      if (!pos) continue;
      mesh.updateWorldMatrix(true, false);
      const stride = Math.max(1, Math.floor(pos.count / 520));
      for (let i = 0; i < pos.count; i += stride) {
        pTmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (s === 'L' && pTmp.x >= -0.025) pts.push(pTmp.clone());
        else if (s === 'R' && pTmp.x <= 0.025) pts.push(pTmp.clone());
      }
    }
    if (pts.length < 8) {
      for (const mesh of meshes) {
        const pos = mesh.geometry?.attributes?.position;
        if (!pos) continue;
        mesh.updateWorldMatrix(true, false);
        const stride = Math.max(1, Math.floor(pos.count / 360));
        for (let i = 0; i < pos.count; i += stride) {
          pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
        }
      }
    }
    if (pts.length < 4) {
      sideVertCache.set(key, null);
      return null;
    }

    const center = new THREE.Vector3();
    for (const p of pts) center.add(p);
    center.divideScalar(pts.length);

    const out = { pts, center };
    sideVertCache.set(key, out);
    return out;
  }

  /** 筋肉Aと筋肉Bをつなぐ骨駅位置における解剖学的な体表外向き単位法線を求める */
  function computeOutwardNormal(idA, idB, mid) {
    const pairStr = `${idA}|${idB}`;
    const isPlantar = /plantar|flexor-digitorum-brevis|abductor-hallucis|quadratus-plantae|flexor-hallucis-brevis|adductor-hallucis/.test(pairStr);
    const isHeelWrap = isPlantar && /gastrocnemius|soleus|calcaneal|plantaris|tibialis-posterior|flexor-hallucis-longus/.test(pairStr);
    if (isHeelWrap) {
      return new THREE.Vector3(mid.x * 0.18, -0.62, -0.76).normalize();
    }
    if (isPlantar || mid.y < -3.08) {
      return new THREE.Vector3(mid.x * 0.22, -0.94, mid.z * 0.18).normalize();
    }
    if (/occipitofrontalis|epicranial|temporalis/.test(pairStr) || mid.y > 2.96) {
      const skullOut = new THREE.Vector3(mid.x * 0.85, Math.max(0.15, (mid.y - 2.76) * 1.4), mid.z);
      if (skullOut.lengthSq() > 1e-6) return skullOut.normalize();
    }
    const isLateral = /fibularis|tensor-fasciae-latae|gluteus-medius|gluteus-minimus|deltoid|vastus-lateralis|external-oblique|internal-oblique|serratus-anterior/.test(pairStr);
    const isPosterior =
      mid.z < -0.016 ||
      /gastrocnemius|soleus|biceps-femoris|semitendinosus|semimembranosus|gluteus-maximus|latissimus|longissimus|iliocostalis|multifidus|spinalis|semispinalis|splenius|trapezius|rhomboid|levator-scapulae|infraspinatus|teres|triceps|erector/.test(pairStr);

    const sx = Math.sign(mid.x) || 1;
    if (isLateral && Math.abs(mid.x) > 0.14) {
      return new THREE.Vector3(
        sx * Math.max(Math.abs(mid.x), 0.78),
        0,
        isPosterior ? Math.min(mid.z * 0.65, -0.16) : Math.max(mid.z * 0.65, 0.22),
      ).normalize();
    }
    if (isPosterior) {
      return new THREE.Vector3(
        Math.abs(mid.x) > 0.16 ? sx * Math.max(Math.abs(mid.x) * 0.62, 0.28) : mid.x * 0.35,
        0,
        Math.min(mid.z, -0.68),
      ).normalize();
    }
    return new THREE.Vector3(
      Math.abs(mid.x) > 0.16 ? sx * Math.max(Math.abs(mid.x) * 0.62, 0.28) : mid.x * 0.35,
      0,
      Math.max(mid.z, 0.68),
    ).normalize();
  }

  /** 筋肉Aと筋肉Bの関節またぎを滑らかに追従させる統合ボーンリグ役割ベクトル */
  function bridgeRigRole(idA, idB) {
    if (!getRigRole) return new THREE.Vector4(-1, -1, -1, -1);
    const rA = getRigRole(idA, 'muscle');
    const rB = getRigRole(idB, 'muscle');
    if (!rA || !rB) return new THREE.Vector4(-1, -1, -1, -1);

    const hipMode = rA.x === 0 && rB.x === 0 ? 0 : (rA.x === 1 && rB.x === 1 ? 1 : 2);
    const kneeMode = rA.y === 0 && rB.y === 0 ? 0 : (rA.y === 1 && rB.y === 1 ? 1 : 2);
    const armMode =
      rA.z === 0 && rB.z === 0
        ? 0
        : rA.z === 1 && rB.z === 1
          ? 1
          : rA.z === 2 && rB.z === 2
            ? 2
            : 3;
    const wA = rA.w, wB = rB.w;
    const forearmMode =
      wA === 0 && wB === 0
        ? 0
        : wA === 4 && wB === 4
          ? 4
          : wA >= 3 && wB >= 3
            ? 5
            : wA > 2.05 || wB > 2.05
              ? 2.5
              : wA === 1 && wB === 1
                ? 1
                : 2;
    return new THREE.Vector4(hipMode, kneeMode, armMode, forearmMode);
  }

  /**
   * 隣接する筋肉Aと筋肉Bの対向する付着境界頂点クラスタ（上位18%）を解析し、
   * 骨や関節の表層を包む幅広の3D筋膜・腱膜シート（幅 4.8cm〜13.6cm = halfW 0.024〜0.068）を生成する
   */
  function buildFasciaSheetGeometry(idA, idB, sA, sB, maxDist = 0.28) {
    const ck = `sheet|${idA}|${idB}|${sA}|${sB}|${maxDist.toFixed(3)}`;
    const hit = cacheGet(ck);
    if (hit) return hit;

    const cloudA = getMuscleSideVerts(idA, sA);
    const cloudB = getMuscleSideVerts(idB, sB);
    if (!cloudA || !cloudB) return null;

    const ptsA = cloudA.pts;
    const ptsB = cloudB.pts;
    const minDistA = new Float32Array(ptsA.length);
    const minDistB = new Float32Array(ptsB.length);
    minDistB.fill(Infinity);
    let bestDistSq = Infinity;

    for (let ia = 0; ia < ptsA.length; ia++) {
      const va = ptsA[ia];
      let dMinA = Infinity;
      for (let ib = 0; ib < ptsB.length; ib++) {
        const dSq = va.distanceToSquared(ptsB[ib]);
        if (dSq < dMinA) dMinA = dSq;
        if (dSq < minDistB[ib]) minDistB[ib] = dSq;
        if (dSq < bestDistSq) bestDistSq = dSq;
      }
      minDistA[ia] = dMinA;
    }

    const bestDist = Math.sqrt(bestDistSq);
    if (!Number.isFinite(bestDist) || bestDist > maxDist) return null;

    const pickTopCluster = (pts, distSqArr) => {
      const idx = pts.map((_, i) => i).sort((i, j) => distSqArr[i] - distSqArr[j]);
      const k = Math.min(48, Math.max(6, Math.ceil(pts.length * 0.18)));
      const cluster = [];
      const sum = new THREE.Vector3();
      for (let i = 0; i < k && i < idx.length; i++) {
        const p = pts[idx[i]];
        cluster.push(p);
        sum.add(p);
      }
      return { cluster, centroid: sum.divideScalar(Math.max(1, cluster.length)) };
    };

    const { cluster: boundA, centroid: pA0 } = pickTopCluster(ptsA, minDistA);
    const { cluster: boundB, centroid: pB0 } = pickTopCluster(ptsB, minDistB);
    const mid0 = pA0.clone().lerp(pB0, 0.5);
    const outN = computeOutwardNormal(idA, idB, mid0);

    // 境界頂点群の筋外膜（表層）側82パーセンタイル位置へアンカーを持ち上げ、骨や腱深部へのめり込みをゼロにする
    const outerSurfaceOffset = (cluster, refPt) => {
      const projs = cluster.map((p) => pTmpProj(p, refPt, outN)).sort((a, b) => a - b);
      const qIdx = Math.min(projs.length - 1, Math.floor(projs.length * 0.82));
      return Math.min(0.030, Math.max(0.0, projs[qIdx] || 0));
    };
    const pTmpProj = (p, ref, n) => (p.x - ref.x) * n.x + (p.y - ref.y) * n.y + (p.z - ref.z) * n.z;

    const pA = pA0.clone().addScaledVector(outN, outerSurfaceOffset(boundA, pA0));
    const pB = pB0.clone().addScaledVector(outN, outerSurfaceOffset(boundB, pB0));

    const macroDir = cloudB.center.clone().sub(cloudA.center);
    macroDir.addScaledVector(outN, -macroDir.dot(outN));
    if (macroDir.lengthSq() < 1e-6) macroDir.set(0, 1, 0);
    else macroDir.normalize();

    const chord = pB.clone().sub(pA);
    const tanChord = chord.clone().addScaledVector(outN, -chord.dot(outN));
    const dirAB = new THREE.Vector3();
    if (tanChord.length() < 0.026 || tanChord.dot(macroDir) < 0) {
      dirAB.copy(macroDir);
      // 同一骨稜で付着点が重なる場合もシートがねじれないよう各筋腹側へわずかに広げる
      pA.addScaledVector(dirAB, -0.020);
      pB.addScaledVector(dirAB, 0.020);
    } else {
      dirAB.copy(tanChord).normalize();
    }

    const rawSpan = Math.max(0.036, pA.distanceTo(pB));
    const overlap = Math.min(0.028, Math.max(0.014, rawSpan * 0.16));
    const startA = pA.clone().addScaledVector(dirAB, -overlap);
    const endB = pB.clone().addScaledVector(dirAB, overlap);
    const midS = startA.clone().lerp(endB, 0.5);
    const totalSpan = Math.max(0.05, startA.distanceTo(endB));

    const latAxis = new THREE.Vector3().crossVectors(dirAB, outN);
    if (latAxis.lengthSq() < 1e-6) {
      latAxis.set(1, 0, 0).addScaledVector(outN, -outN.x);
    }
    if (latAxis.lengthSq() < 1e-6) latAxis.set(0, 0, 1);
    latAxis.normalize();

    const measureHalfWidth = (cluster, refPt) => {
      const coords = cluster.map((p) => (p.x - refPt.x) * latAxis.x + (p.y - refPt.y) * latAxis.y + (p.z - refPt.z) * latAxis.z).sort((a, b) => a - b);
      if (coords.length < 2) return 0.034;
      const lo = coords[Math.floor(coords.length * 0.10)];
      const hi = coords[Math.min(coords.length - 1, Math.floor(coords.length * 0.90))];
      const halfSpread = (hi - lo) * 0.58;
      return Math.min(0.068, Math.max(0.024, halfSpread));
    };

    const halfWA = measureHalfWidth(boundA, pA0);
    const halfWB = measureHalfWidth(boundB, pB0);

    const vCount = SHEET_NU * SHEET_NV;
    const positions = new Float32Array(vCount * 3);
    const uvs = new Float32Array(vCount * 2);
    const indices = [];

    const spinePt = new THREE.Vector3();
    const archPeak = 0.0052 + Math.min(0.0075, totalSpan * 0.038);

    for (let iv = 0; iv < SHEET_NV; iv++) {
      const v = iv / (SHEET_NV - 1);
      const sv = v * v * (3 - 2 * v);
      const arch = 0.0030 + archPeak * Math.sin(v * Math.PI);
      spinePt.copy(startA).lerp(endB, v);
      // 中間制御点で自然な関節包の丸みを付与
      spinePt.y += (midS.y - spinePt.y) * 0.08 * Math.sin(v * Math.PI);
      spinePt.addScaledVector(outN, arch);

      const hw = (halfWA + (halfWB - halfWA) * sv) * (1.0 - 0.05 * Math.sin(v * Math.PI));

      for (let iu = 0; iu < SHEET_NU; iu++) {
        const u = iu / (SHEET_NU - 1);
        const s = u * 2.0 - 1.0; // -1 .. +1
        const wrapDrop = -0.0042 * s * s;
        const idx = iv * SHEET_NU + iu;
        const px = spinePt.x + latAxis.x * (s * hw) + outN.x * wrapDrop;
        const py = spinePt.y + latAxis.y * (s * hw) + outN.y * wrapDrop;
        const pz = spinePt.z + latAxis.z * (s * hw) + outN.z * wrapDrop;
        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;
        uvs[idx * 2] = u;
        uvs[idx * 2 + 1] = v;
      }
    }

    for (let iv = 0; iv < SHEET_NV - 1; iv++) {
      for (let iu = 0; iu < SHEET_NU - 1; iu++) {
        const a = iv * SHEET_NU + iu;
        const b = a + 1;
        const c = a + SHEET_NU;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const item = { geo, halfWA, halfWB, span: totalSpan };
    cacheSet(ck, item);
    return item;
  }

  // ---------------------------------------------------------------------------
  // 3D筋膜シート用マテリアル・Mesh プール
  // ---------------------------------------------------------------------------
  const sheetMatPool = [];
  const sheetMeshPool = [];

  function makeSheetMaterial() {
    const u = {
      ...poseUniforms,
      uContractCycle: poseUniforms.uContractCycle || { value: 0 },
      uRigRole: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uColorA: { value: new THREE.Color('#CC6F5B') },
      uColorB: { value: new THREE.Color('#CC6F5B') },
      uRidgeA: { value: new THREE.Color('#E5A898') },
      uRidgeB: { value: new THREE.Color('#E5A898') },
      uModeA: { value: -1 },
      uModeB: { value: -1 },
      uAlpha: { value: 0.78 },
      uLayerAlpha: { value: 1 },
      uTime: shared.uTime,
      uFade: shared.uFade,
      uProgress: shared.uProgress,
    };
    return new THREE.ShaderMaterial({
      ...PREMUL,
      uniforms: u,
      vertexShader: SHEET_VS,
      fragmentShader: SHEET_FS,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  }

  function acquireSheetMesh(geo, mat, renderOrder = 5) {
    let m = sheetMeshPool.pop();
    if (!m) {
      m = new THREE.Mesh(geo, mat);
      m.raycast = noRaycast;
      m.frustumCulled = false;
    } else {
      m.geometry = geo;
      m.material = mat;
    }
    m.renderOrder = renderOrder;
    m.visible = true;
    root.add(m);
    activeGeos.add(geo);
    return m;
  }

  // ---------------------------------------------------------------------------
  // 急所コアマーカー（オンデマンド1点スポットライト時のみ使用）
  // ---------------------------------------------------------------------------
  let nodeGeo = null, nodeCore = null, nodeHalo = null;
  let aOffset = null, aColor = null, aD = null;

  function ensureNodes() {
    if (nodeGeo) return;
    const base = new THREE.IcosahedronGeometry(1, 2);
    nodeGeo = new THREE.InstancedBufferGeometry();
    nodeGeo.setAttribute('position', base.attributes.position);
    nodeGeo.setAttribute('normal', base.attributes.normal);
    aOffset = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES * 3), 3);
    aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES * 3), 3);
    aD = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES), 1);
    [aOffset, aColor, aD].forEach((a) => a.setUsage(THREE.DynamicDrawUsage));
    nodeGeo.setAttribute('aOffset', aOffset);
    nodeGeo.setAttribute('aColor', aColor);
    nodeGeo.setAttribute('aD', aD);
    nodeGeo.instanceCount = 0;
    const mk = (scale, halo) =>
      new THREE.ShaderMaterial({
        ...PREMUL,
        uniforms: {
          uScale: { value: scale },
          uHalo: { value: halo ? 1 : 0 },
          uTime: shared.uTime,
          uFade: shared.uFade,
        },
        vertexShader: NODE_VS,
        fragmentShader: NODE_FS,
        depthTest: false,
      });
    nodeHalo = new THREE.Mesh(nodeGeo, mk(0.054, true));
    nodeCore = new THREE.Mesh(nodeGeo, mk(0.023, false));
    for (const [m, ro] of [[nodeHalo, 23], [nodeCore, 24]]) {
      m.frustumCulled = false;
      m.raycast = noRaycast;
      m.renderOrder = ro;
      m.visible = false;
      root.add(m);
    }
  }

  function pushNode(p, color, d = 0, rigRole = null) {
    if (!p || state.targetNodes.length >= MAX_NODES) return;
    const colObj =
      color && color.isColor
        ? color.clone()
        : new THREE.Color(typeof color === 'string' || typeof color === 'number' ? color : '#CC6F5B');
    state.targetNodes.push({
      rawPos: p.clone(),
      color: colObj,
      d: Number.isFinite(d) ? d : 0,
      rigRole,
    });
  }

  function updateNodes() {
    if (!nodeGeo || !state.targetNodes.length) return;
    const count = Math.min(MAX_NODES, state.targetNodes.length);
    for (let i = 0; i < count; i++) {
      const n = state.targetNodes[i];
      const def = deformPoint(n.rawPos, n.rigRole, false);
      aOffset.setXYZ(i, def.x, def.y, def.z);
    }
    aOffset.needsUpdate = true;
  }

  function commitNodes() {
    const count = Math.min(MAX_NODES, state.targetNodes.length);
    state.nodeCount = count;
    if (!count) {
      if (nodeCore) nodeCore.visible = false;
      if (nodeHalo) nodeHalo.visible = false;
      if (nodeGeo) nodeGeo.instanceCount = 0;
      return;
    }
    ensureNodes();
    for (let i = 0; i < count; i++) {
      const n = state.targetNodes[i];
      aColor.setXYZ(i, n.color.r, n.color.g, n.color.b);
      aD.setX(i, n.d);
    }
    aColor.needsUpdate = true;
    aD.needsUpdate = true;
    nodeGeo.instanceCount = count;
    updateNodes();
    const showNodes = !releaseState.active && state.muscleOverlayVisible;
    nodeCore.visible = showNodes;
    nodeHalo.visible = showNodes;
  }

  // ---------------------------------------------------------------------------
  // 筋膜シースオーバーレイ（マテリアル・Mesh はプール）
  // ---------------------------------------------------------------------------
  const ovMatPool = [];
  const ovMeshPool = [];

  function makeOverlayMaterial() {
    const V3 = THREE.Vector3;
    const u = {
      ...poseUniforms,
      uContractCycle: poseUniforms.uContractCycle || { value: 0 },
      uRigRole: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uRole: { value: 0 },
      uTierWeight: { value: 0 },
      uLineWave: { value: 0 },
      uLayerAlpha: { value: 1 },
      uSize: { value: 0.3 },
      uFiber: { value: 0 },
      uWrinkle: { value: 0 },
      uStretch: { value: 0 },
      uYore: { value: 0 },
      uTwistAmt: { value: 0 },
      uTwistVis: { value: 0 },
      uLock: { value: 0 },
      uLockMax: { value: 0 },
      uRelease: { value: 0 },
      uSelected: { value: 0 },
      uInflate: { value: 0.0014 },
      uColor: { value: new THREE.Color() },
      uAxisL: { value: new V3(0, 1, 0) },
      uAxisR: { value: new V3(0, 1, 0) },
      uCenterL: { value: new V3() },
      uCenterR: { value: new V3() },
      uLockOrigL: { value: new V3() },
      uLockOrigR: { value: new V3() },
      uLockRange: { value: new THREE.Vector4(0, 1, 0, 1) },
      uSide: { value: new THREE.Vector2(1, 1) },
      uTime: shared.uTime,
      uFade: shared.uFade,
      uProgress: shared.uProgress,
      uHasSpot: shared.uHasSpot,
      uCoreDark: shared.uCoreDark,
      uCoreMid: shared.uCoreMid,
      uCoreHot: shared.uCoreHot,
      uCoreRose: shared.uCoreRose,
      uLinkRedDark: shared.uLinkRedDark,
      uLinkRedMid: shared.uLinkRedMid,
      uLinkRedBright: shared.uLinkRedBright,
      uLinkRedRidge: shared.uLinkRedRidge,
      uAntagBlueDark: shared.uAntagBlueDark,
      uAntagBlueMid: shared.uAntagBlueMid,
      uAntagBlueRidge: shared.uAntagBlueRidge,
      uLinkBlueDark: shared.uLinkBlueDark,
      uLinkBlueMid: shared.uLinkBlueMid,
      uLinkBlueRidge: shared.uLinkBlueRidge,
    };
    return new THREE.ShaderMaterial({
      ...PREMUL,
      uniforms: u,
      vertexShader: OVERLAY_VS,
      fragmentShader: OVERLAY_FS,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }

  function resetOverlayUniforms(u) {
    if (u.uRigRole && u.uRigRole.value) u.uRigRole.value.set(-1, -1, -1, -1);
    u.uRole.value = 0;
    u.uTierWeight.value = 0;
    u.uLineWave.value = 0;
    u.uLayerAlpha.value = 1;
    u.uFiber.value = 0;
    u.uWrinkle.value = 0;
    u.uStretch.value = 0;
    u.uYore.value = 0;
    u.uTwistAmt.value = 0;
    u.uTwistVis.value = 0;
    u.uLock.value = 0;
    u.uLockMax.value = 0;
    u.uRelease.value = 0;
    u.uSelected.value = 0;
    u.uInflate.value = 0.0024;
    u.uSide.value.set(1, 1);
  }

  /** 筋 1 つ分のエントリを作る（同じ ID は 1 つにまとめる） */
  function addMuscle(id) {
    if (state.muscles.has(id)) return state.muscles.get(id);
    const meshes = safeMeshes(id).filter((m) => m.geometry.attributes.normal && !m.isInstancedMesh);
    const an = analyze(id);
    if (!meshes.length || !an) return null;
    const mat = ovMatPool.pop() || makeOverlayMaterial();
    const u = mat.uniforms;
    resetOverlayUniforms(u);
    const rigRole = getRigRole ? getRigRole(id, 'muscle') : null;
    if (rigRole && u.uRigRole && u.uRigRole.value) {
      u.uRigRole.value.copy(rigRole);
    }
    const fasciaLayer = resolveMuscleLayer(id);
    const renderOrder = fasciaLayer === 'deep' ? 4 : 6;
    u.uSize.value = an.size;
    u.uAxisL.value.copy(an.L.axis);
    u.uAxisR.value.copy(an.R.axis);
    u.uCenterL.value.copy(an.L.center);
    u.uCenterR.value.copy(an.R.center);
    const overlays = [];
    for (const src of meshes) {
      let m = ovMeshPool.pop();
      if (!m) {
        m = new THREE.Mesh(src.geometry, mat);
        m.matrixAutoUpdate = false;
        m.matrixWorldAutoUpdate = false;
        m.raycast = noRaycast;
        m.frustumCulled = false;
      } else {
        m.geometry = src.geometry;
        m.material = mat;
      }
      m.frustumCulled = false;
      m.renderOrder = renderOrder;
      m.visible = true;
      src.updateWorldMatrix(true, false);
      m.matrixWorld.copy(src.matrixWorld);
      m.userData.src = src;
      root.add(m);
      overlays.push(m);
    }
    const entry = {
      id,
      an,
      mat,
      u,
      overlays,
      meshes,
      fasciaLayer,
      role: 0, // 0: line sheath, 1: shortenCore, 2: shortenLinked, 3: lengthenAntagonist, 4: lengthenLinked
      tierWeight: 0,
      trackRatio: 0,
      onLine: false,
      focus: false,
      lockStart: null,
      lockEnd: null,
      lockMax: 0,
      lockNow: 0,
      seed: Math.random() * 10,
    };
    state.muscles.set(id, entry);
    return entry;
  }

  /** 祖先まで含めて表示中か */
  const isShown = (o) => {
    for (let x = o; x; x = x.parent) if (!x.visible) return false;
    return true;
  };

  /** 静止モード（isBusy=false）でも即座に表示・ワールド行列が一致するよう同期 */
  function syncMeshVisibility() {
    const showOv = state.muscleOverlayVisible;
    for (const e of state.muscles.values()) {
      const layerVis = showOv && e.u.uLayerAlpha.value > 0.001;
      for (const m of e.overlays) {
        const src = m.userData.src;
        if (!src) continue;
        m.matrixWorld.copy(src.matrixWorld);
        m.visible = layerVis && isShown(src);
      }
    }
    for (const sh of state.sheets) {
      sh.mesh.visible = showOv && sh.u.uLayerAlpha.value > 0.001;
    }
    if (nodeCore && nodeHalo) {
      const showNodes = showOv && state.nodeCount > 0 && !releaseState.active;
      nodeCore.visible = showNodes;
      nodeHalo.visible = showNodes;
    }
  }

  /**
   * 現在の layerMode ('see-through' | 'surface' | 'deep') に応じて各筋膜シースと3D筋膜シートの透明度を更新
   */
  function applyLayerFilter() {
    let hasActiveDeep = false;
    for (const e of state.muscles.values()) {
      e.fasciaLayer = resolveMuscleLayer(e.id);
      const ro = e.fasciaLayer === 'deep' ? 4 : 6;
      for (const m of e.overlays) m.renderOrder = ro;
      if (e.fasciaLayer === 'deep' && (e.role > 0 || e.onLine || e.id === state.spotMuscleId)) {
        hasActiveDeep = true;
      }
    }

    for (const e of state.muscles.values()) {
      let layerAlpha = 1.0;
      if (state.layerMode === 'surface') {
        layerAlpha = e.fasciaLayer === 'deep' ? 0.0 : 1.0;
      } else if (state.layerMode === 'deep') {
        layerAlpha = e.fasciaLayer === 'surface' ? 0.14 : 1.0;
      } else {
        // 'see-through': 深層筋がアクティブな時は表層オーバーレイを半透明ベールに抑え、奥の深層筋を鮮明に透視させる
        layerAlpha = hasActiveDeep && e.fasciaLayer === 'surface' ? 0.56 : 1.0;
      }
      e.u.uLayerAlpha.value = layerAlpha;
    }

    for (const sh of state.sheets) {
      const lA = sh.fromId ? resolveMuscleLayer(sh.fromId) : 'surface';
      const lB = sh.toId ? resolveMuscleLayer(sh.toId) : 'surface';
      const bothDeep = lA === 'deep' && lB === 'deep';
      const anyDeep = lA === 'deep' || lB === 'deep';
      let sAlpha = 1.0;
      if (state.layerMode === 'surface' && anyDeep) {
        sAlpha = 0.0;
      } else if (state.layerMode === 'deep' && !anyDeep) {
        sAlpha = 0.14;
      } else if (state.layerMode === 'see-through' && hasActiveDeep && !anyDeep) {
        sAlpha = 0.58;
      }
      sh.u.uLayerAlpha.value = sAlpha;
      sh.mesh.renderOrder = bothDeep ? 4 : 5;
    }
    syncMeshVisibility();
  }

  /**
   * 2層シースルー＆切り替えモードを fascia オーバーレイへ同期する公開 API
   * @param {'see-through'|'surface'|'deep'} mode
   * @param {Record<string, 'surface'|'deep'> | Map<string, 'surface'|'deep'>} [muscleLayers]
   */
  function setLayerFilter(mode, muscleLayers = null) {
    if (mode === 'see-through' || mode === 'surface' || mode === 'deep') {
      state.layerMode = mode;
    }
    if (muscleLayers) {
      state.customMuscleLayers.clear();
      if (muscleLayers instanceof Map) {
        for (const [id, lv] of muscleLayers.entries()) {
          if (lv === 'surface' || lv === 'deep') state.customMuscleLayers.set(id, lv);
        }
      } else if (typeof muscleLayers === 'object') {
        for (const [id, lv] of Object.entries(muscleLayers)) {
          if (lv === 'surface' || lv === 'deep') state.customMuscleLayers.set(id, lv);
        }
      }
    }
    applyLayerFilter();
  }

  // ---------------------------------------------------------------------------
  // 筋肉エントリの役割に応じた3D筋膜シート色・尾根色・縮み/伸びモード
  // ---------------------------------------------------------------------------
  const PURE_WHITE = new THREE.Color(1, 1, 1);
  const tmpLineColA = new THREE.Color();
  const tmpLineColB = new THREE.Color();
  const tmpLineRidgeA = new THREE.Color();
  const tmpLineRidgeB = new THREE.Color();

  function roleSheetStyle(entry) {
    if (!entry) {
      return {
        col: shared.uLinkRedMid.value,
        ridge: shared.uLinkRedRidge.value,
        mode: -0.75,
        alpha: 0.74,
      };
    }
    if (entry.role === 1) {
      return {
        col: shared.uCoreHot.value,
        ridge: shared.uCoreRose.value,
        mode: -1.0,
        alpha: 0.84,
      };
    }
    if (entry.role === 2) {
      return {
        col: shared.uLinkRedMid.value,
        ridge: shared.uLinkRedRidge.value,
        mode: -0.82,
        alpha: 0.76,
      };
    }
    if (entry.role === 3) {
      return {
        col: shared.uAntagBlueMid.value,
        ridge: shared.uAntagBlueRidge.value,
        mode: 1.0,
        alpha: 0.80,
      };
    }
    if (entry.role === 4) {
      return {
        col: shared.uLinkBlueMid.value,
        ridge: shared.uLinkBlueRidge.value,
        mode: 0.78,
        alpha: 0.68,
      };
    }
    const baseCol = entry.u?.uColor?.value || shared.uLinkBlueMid.value;
    return {
      col: baseCol.clone().multiplyScalar(0.86),
      ridge: baseCol.clone().lerp(PURE_WHITE, 0.38),
      mode: 0.35,
      alpha: 0.80,
    };
  }

  /** 現在の各筋肉の role（または line モードの1色解剖図カラー）に合わせて全3D筋膜シートを同期 */
  function syncSheetUniforms() {
    if (state.mode === 'line') {
      const fallbackHex = state.line?.color || '#CFA058';
      for (const sh of state.sheets) {
        const eA = state.muscles.get(sh.fromId);
        const eB = state.muscles.get(sh.toId);
        if (eA?.u?.uColor?.value) tmpLineColA.copy(eA.u.uColor.value);
        else tmpLineColA.set(fallbackHex);
        if (eB?.u?.uColor?.value) tmpLineColB.copy(eB.u.uColor.value);
        else tmpLineColB.set(fallbackHex);

        tmpLineRidgeA.copy(tmpLineColA).lerp(PURE_WHITE, 0.38);
        tmpLineRidgeB.copy(tmpLineColB).lerp(PURE_WHITE, 0.38);
        tmpLineColA.multiplyScalar(0.86);
        tmpLineColB.multiplyScalar(0.86);

        sh.u.uColorA.value.copy(tmpLineColA);
        sh.u.uColorB.value.copy(tmpLineColB);
        sh.u.uRidgeA.value.copy(tmpLineRidgeA);
        sh.u.uRidgeB.value.copy(tmpLineRidgeB);
        sh.u.uModeA.value = 0.35;
        sh.u.uModeB.value = 0.35;
        sh.u.uAlpha.value = 0.80;
      }
      return;
    }
    for (const sh of state.sheets) {
      const eA = state.muscles.get(sh.fromId);
      const eB = state.muscles.get(sh.toId);
      const stA = roleSheetStyle(eA);
      const stB = roleSheetStyle(eB);
      sh.u.uColorA.value.copy(stA.col);
      sh.u.uColorB.value.copy(stB.col);
      sh.u.uRidgeA.value.copy(stA.ridge);
      sh.u.uRidgeB.value.copy(stB.ridge);
      sh.u.uModeA.value = stA.mode;
      sh.u.uModeB.value = stB.mode;
      sh.u.uAlpha.value = (stA.alpha + stB.alpha) * 0.5;
    }
  }

  /**
   * 同一ライン上の隣接アクティブ筋ペア、または解剖学的に隣接する付着部ペアから
   * 3D筋膜シート接続仕様 [{ from, to, crossSide }] を自動抽出する
   */
  function autoExtractBridges(linesList = []) {
    const activeIds = [];
    for (const [id, e] of state.muscles.entries()) {
      if (e.role >= 1) activeIds.push(id);
    }
    if (activeIds.length < 2) return [];
    const activeSet = new Set(activeIds);
    const seen = new Set();
    const out = [];

    const pushBridge = (from, to, crossSide = false) => {
      if (!from || !to || from === to) return;
      const pairKey = from < to ? `${from}|${to}|${crossSide ? 1 : 0}` : `${to}|${from}|${crossSide ? 1 : 0}`;
      if (seen.has(pairKey)) return;
      const pA = computeMusclePoles(from, 'L');
      const pB = computeMusclePoles(to, crossSide ? 'R' : 'L');
      if (!pA || !pB) return;
      const minD = Math.min(
        pA.poleA.distanceTo(pB.poleA),
        pA.poleA.distanceTo(pB.poleB),
        pA.poleB.distanceTo(pB.poleA),
        pA.poleB.distanceTo(pB.poleB),
      );
      if (minD > 0.52) return;
      seen.add(pairKey);
      out.push({ from, to, crossSide: Boolean(crossSide) });
    };

    for (const line of linesList || []) {
      if (!line || !Array.isArray(line.track)) continue;
      const seq = line.track;
      const cross = line.side === 'cross';
      const crossAt = Array.isArray(line.crossAt) ? new Set(line.crossAt) : null;
      const stationSide = [];
      let cur = 'L';
      for (let i = 0; i < seq.length; i++) {
        if (cross && crossAt && crossAt.has(i)) cur = opp(cur);
        stationSide.push(cur);
        if (cross && !crossAt) cur = opp(cur);
      }
      for (let i = 0; i < seq.length - 1; i++) {
        const a = seq[i];
        if (!activeSet.has(a)) continue;
        for (let step = 1; step <= 2 && i + step < seq.length; step++) {
          const b = seq[i + step];
          if (!activeSet.has(b)) continue;
          pushBridge(a, b, stationSide[i] !== stationSide[i + step]);
          break;
        }
      }
    }

    if (out.length === 0) {
      for (let i = 0; i < activeIds.length; i++) {
        const idA = activeIds[i];
        const pA = computeMusclePoles(idA, 'L');
        if (!pA) continue;
        const candidates = [];
        for (let j = i + 1; j < activeIds.length; j++) {
          const idB = activeIds[j];
          const pB = computeMusclePoles(idB, 'L');
          if (!pB) continue;
          const dSame = Math.min(
            pA.poleA.distanceTo(pB.poleA),
            pA.poleA.distanceTo(pB.poleB),
            pA.poleB.distanceTo(pB.poleA),
            pA.poleB.distanceTo(pB.poleB),
          );
          if (dSame <= 0.30) {
            candidates.push({ idB, d: dSame, cross: false });
          }
        }
        candidates.sort((x, y) => x.d - y.d);
        for (const c of candidates.slice(0, 2)) {
          pushBridge(idA, c.idB, c.cross);
        }
      }
    }

    return out;
  }

  /**
   * 隣接する筋肉Aと筋肉Bが骨駅をまたぐ区間に、細い線ではなく幅広の3D筋膜・腱膜シート（幅 4.8cm〜13.6cm）を張り、
   * 筋肉表面の筋膜シースと連続した1枚の膜として可視化する
   * @param {Array<{ from: string, to: string, crossSide?: boolean, ratioA?: number, ratioB?: number }>} bridges
   * @param {'L'|'R'|'both'} [sideMode='both']
   * @param {{ maxDist?: number, lineId?: string }} [opts]
   */
  function addFasciaSheetBridge(bridges, sideMode = 'both', opts = {}) {
    if (!Array.isArray(bridges) || !bridges.length) return;
    const sides = sideMode === 'L' || sideMode === 'R' ? [sideMode] : ['L', 'R'];
    const maxDist = Number.isFinite(opts?.maxDist) ? opts.maxDist : 0.28;
    const lineId = opts?.lineId || '';

    for (const br of bridges) {
      if (!br || !br.from || !br.to || br.from === br.to) continue;
      const fromEntry = state.muscles.get(br.from) || addMuscle(br.from);
      const toEntry = state.muscles.get(br.to) || addMuscle(br.to);
      if (!fromEntry || !toEntry) continue;

      const stA = roleSheetStyle(fromEntry);
      const stB = roleSheetStyle(toEntry);
      const rigRole = bridgeRigRole(br.from, br.to);

      for (const sA of sides) {
        const isCross = Boolean(br.crossSide || br.crossSides);
        const sB = isCross ? opp(sA) : sA;
        const built = buildFasciaSheetGeometry(br.from, br.to, sA, sB, maxDist);
        if (!built) continue;

        const mat = sheetMatPool.pop() || makeSheetMaterial();
        const u = mat.uniforms;
        u.uRigRole.value.copy(rigRole);
        u.uColorA.value.copy(stA.col);
        u.uColorB.value.copy(stB.col);
        u.uRidgeA.value.copy(stA.ridge);
        u.uRidgeB.value.copy(stB.ridge);
        u.uModeA.value = stA.mode;
        u.uModeB.value = stB.mode;
        u.uAlpha.value = (stA.alpha + stB.alpha) * 0.5;
        u.uLayerAlpha.value = 1.0;

        const lA = resolveMuscleLayer(br.from);
        const lB = resolveMuscleLayer(br.to);
        const renderOrder = lA === 'deep' && lB === 'deep' ? 4 : 5;
        const mesh = acquireSheetMesh(built.geo, mat, renderOrder);

        state.sheets.push({
          mesh,
          mat,
          u,
          geo: built.geo,
          fromId: br.from,
          toId: br.to,
          sideA: sA,
          sideB: sB,
          ratioA: Number.isFinite(br.ratioA) ? br.ratioA : (fromEntry.trackRatio || 0),
          ratioB: Number.isFinite(br.ratioB) ? br.ratioB : (toEntry.trackRatio || 0),
          lineId,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 公開 API
  // ---------------------------------------------------------------------------
  /**
   * ライン 1 本の連続筋膜経線を「面（筋肉シース＋駅間3D筋膜シート）」で表示し、
   * 揺れ・色変化ゼロの落ち着いた1色解剖図シートとしてピタッと静止表示する
   */
  function showLine(line, { side = 'both' } = {}) {
    clear();
    if (!line || !Array.isArray(line.track) || !line.track.length) return;
    state.mode = 'line';
    state.line = line;
    const color = new THREE.Color(line.color || '#CFA058');
    const pathSides = side === 'L' || side === 'R' ? [side] : ['L', 'R'];
    const cross = line.side === 'cross';
    const crossAt = Array.isArray(line.crossAt) ? new Set(line.crossAt) : null;

    const sideOf = new Map();
    const ratioOf = new Map();
    const bridgeSeen = new Set();
    const lineBridges = [];

    const registerSequence = (seq) => {
      if (!Array.isArray(seq) || seq.length < 1) return;
      const denom = Math.max(1, seq.length - 1);
      for (const startSide of pathSides) {
        let curSide = startSide;
        const stationSides = [];
        for (let i = 0; i < seq.length; i++) {
          const id = seq[i];
          if (cross && crossAt && crossAt.has(i)) curSide = opp(curSide);
          stationSides.push(curSide);
          const sObj = sideOf.get(id) || { L: 0, R: 0 };
          sObj[curSide] = 1;
          sideOf.set(id, sObj);
          if (!ratioOf.has(id)) ratioOf.set(id, i / denom);
          if (cross && !crossAt) curSide = opp(curSide);
        }

        if (startSide === pathSides[0]) {
          for (let i = 0; i < seq.length - 1; i++) {
            const from = seq[i];
            const to = seq[i + 1];
            if (!from || !to || from === to) continue;
            const crossPair = stationSides[i] !== stationSides[i + 1];
            const key = from < to ? `${from}|${to}|${crossPair ? 1 : 0}` : `${to}|${from}|${crossPair ? 1 : 0}`;
            if (bridgeSeen.has(key)) continue;
            bridgeSeen.add(key);
            lineBridges.push({
              from,
              to,
              crossSide: crossPair,
              ratioA: i / denom,
              ratioB: (i + 1) / denom,
            });
          }
        }
      }
    };

    registerSequence(line.track);
    if (Array.isArray(line.path) && line.path.length >= 2) {
      registerSequence(line.path);
    }

    for (const id of new Set([...(line.track || []), ...(line.path || [])])) {
      const e = addMuscle(id);
      if (!e) continue;
      e.onLine = true;
      e.role = 0;
      e.trackRatio = ratioOf.get(id) ?? 0;
      e.u.uColor.value.copy(color);
      const s = sideOf.get(id) || { L: side !== 'R' ? 1 : 0, R: side !== 'L' ? 1 : 0 };
      e.u.uSide.value.set(s.L, s.R);
    }

    addFasciaSheetBridge(lineBridges, side, { maxDist: 0.30, lineId: line.id || '' });

    shared.uFade.value = 1.0;
    applyLayerFilter();
    apply();
  }

  /** habit.lines に対応するライン object を取り出す */
  function resolveLines(habit, lines) {
    let pool = [];
    if (Array.isArray(lines)) pool = lines.filter((l) => l && typeof l === 'object');
    else if (lines && typeof lines === 'object') pool = Object.values(lines).filter((l) => l && typeof l === 'object');
    const byId = new Map(pool.map((l) => [l.id, l]));
    const out = (habit?.lines || []).map((id) => byId.get(id)).filter(Boolean);
    return out.length ? out : pool;
  }

  /**
   * 4段階レッド／ブルー役割割り当てヘルパー
   * 明示指定（shortenCore / shortenLinked / lengthenAntagonist / lengthenLinked）と従来指定（shorten / yore / lengthen）の両方に対応
   */
  function assignFourTierRoles(spec, sideVec, lineColor, linesList = []) {
    const coreIds = Array.isArray(spec.shortenCore) && spec.shortenCore.length
      ? spec.shortenCore
      : (spec.shorten || []);
    const coreSet = new Set(coreIds);

    const rawLinkedShort = Array.isArray(spec.shortenLinked)
      ? spec.shortenLinked
      : [...(spec.yore || []), ...(spec.chain || [])];
    const linkedShortIds = rawLinkedShort.filter((id) => id && !coreSet.has(id) && !(spec.lengthen || []).includes(id));
    const linkedShortSet = new Set(linkedShortIds);

    let antagIds = [];
    let linkedLongIds = [];
    if (Array.isArray(spec.lengthenAntagonist) && spec.lengthenAntagonist.length) {
      antagIds = spec.lengthenAntagonist.filter((id) => id && !coreSet.has(id) && !linkedShortSet.has(id));
      const antagSet = new Set(antagIds);
      linkedLongIds = (spec.lengthenLinked || []).filter(
        (id) => id && !coreSet.has(id) && !linkedShortSet.has(id) && !antagSet.has(id),
      );
    } else {
      const rawLong = (spec.lengthen || []).filter((id) => id && !coreSet.has(id) && !linkedShortSet.has(id));
      if (Array.isArray(spec.lengthenLinked) && spec.lengthenLinked.length) {
        antagIds = rawLong;
        const antagSet = new Set(antagIds);
        linkedLongIds = spec.lengthenLinked.filter(
          (id) => id && !coreSet.has(id) && !linkedShortSet.has(id) && !antagSet.has(id),
        );
      } else if (rawLong.length >= 3) {
        antagIds = rawLong.slice(0, 2);
        linkedLongIds = rawLong.slice(2);
      } else {
        antagIds = rawLong;
        const antagSet = new Set(antagIds);
        const extraCool = new Set();
        for (const ln of linesList || []) {
          const tr = ln?.track || [];
          for (let i = 0; i < tr.length; i++) {
            if (!antagSet.has(tr[i])) continue;
            for (const nb of [tr[i - 1], tr[i + 1]]) {
              if (nb && !coreSet.has(nb) && !linkedShortSet.has(nb) && !antagSet.has(nb)) {
                extraCool.add(nb);
              }
            }
          }
        }
        linkedLongIds = [...extraCool].slice(0, 2);
      }
    }

    const setup = (id, role, weight) => {
      const e = addMuscle(id);
      if (!e) return null;
      e.u.uColor.value.copy(lineColor);
      e.u.uSide.value.copy(sideVec);
      if (role > 0 && (e.role === 0 || role < e.role)) {
        e.role = role;
        e.tierWeight = weight;
      }
      return e;
    };

    for (const id of coreIds) {
      setup(id, 1, id === spec.seedId ? 1.0 : 0.96);
    }
    for (const id of linkedShortIds) {
      setup(id, 2, 0.76);
    }
    for (const id of antagIds) {
      setup(id, 3, 0.94);
    }
    for (const id of linkedLongIds) {
      setup(id, 4, 0.70);
    }
    return { coreIds, linkedShortIds, antagIds, linkedLongIds, setup };
  }

  /** 姿勢のクセによる4段階筋膜シース（縮み横じわ・伸び縦スジ）＆ 駅間3D筋膜シートの可視化 */
  function showHabit(habit, lines) {
    clear();
    if (!habit) return;
    state.mode = 'habit';
    state.habit = habit;
    state.twist = clamp01(Number.isFinite(habit.twist) ? habit.twist : 0.5);
    const hs = habit.side === 'L' || habit.side === 'R' ? habit.side : 'both';
    const sideVec = new THREE.Vector2(hs === 'R' ? 0 : 1, hs === 'L' ? 0 : 1);
    const ls = resolveLines(habit, lines);
    const mainLine = ls[0] || null;
    const lineColor = new THREE.Color(mainLine?.color || '#CFA058');

    const { setup } = assignFourTierRoles(habit, sideVec, lineColor, ls);

    const chain = (habit.chain || []).map((id) => setup(id, 0, 0)).filter(Boolean);
    const n = chain.length;
    const [l0, l1] = PHASE.lock;
    const span = Math.max(0.18, l1 - l0 - 0.08);
    chain.forEach((e, i) => {
      e.lockStart = l0 + (span * i) / Math.max(1, n);
      e.lockEnd = Math.min(1.0, e.lockStart + span / Math.max(1, n) + 0.12);
      e.lockMax = e.role === 1 ? 0.96 : 0.72;
      setLockGeometry(e, e.role === 1 ? null : (i > 0 ? chain[i - 1] : null), e.role === 1);
    });

    for (const e of state.muscles.values()) {
      if (e.role === 1) {
        e.lockStart = e.lockStart != null ? Math.min(e.lockStart, 0.60) : 0.60;
        e.lockEnd = e.lockEnd != null ? Math.min(e.lockEnd, 0.95) : 0.94;
        e.lockMax = 0.96;
        setLockGeometry(e, null, true);
      } else if (e.lockStart == null && e.role >= 2) {
        e.lockStart = 0.80;
        e.lockEnd = 1.0;
        e.lockMax = e.role === 2 ? 0.58 : 0.28;
        setLockGeometry(e, null, true);
      }
    }

    const bridges =
      Array.isArray(habit.stationBridges) && habit.stationBridges.length
        ? habit.stationBridges
        : Array.isArray(habit.bridges) && habit.bridges.length
          ? habit.bridges
          : autoExtractBridges(ls);
    addFasciaSheetBridge(bridges, hs);

    shared.uFade.value = 0;
    applyLayerFilter();
    apply();
  }

  /** ストーリー1ステップ表示（4段階筋膜シース＋駅間3D筋膜シート） */
  function showStep(step, lines) {
    clear();
    if (!step) return;
    state.mode = 'step';
    state.twist = 0.45;
    let lineObj = null;
    if (step.line && typeof step.line === 'object') {
      lineObj = step.line;
    } else if (typeof step.line === 'string' && lines) {
      const pool = Array.isArray(lines) ? lines : Object.values(lines);
      lineObj = pool.find((l) => l && l.id === step.line) || null;
    }
    const lineColor = new THREE.Color(lineObj?.color || '#CFA058');
    const sideVec = new THREE.Vector2(1, 1);
    const ls = lineObj ? [lineObj] : [];

    const { setup } = assignFourTierRoles(step, sideVec, lineColor, ls);
    for (const id of step.focus || []) {
      const e = setup(id, 0, 0);
      if (e) e.focus = true;
    }

    const bridges =
      Array.isArray(step.stationBridges) && step.stationBridges.length
        ? step.stationBridges
        : Array.isArray(step.bridges) && step.bridges.length
          ? step.bridges
          : autoExtractBridges(ls);
    addFasciaSheetBridge(bridges, 'both');

    shared.uFade.value = 1.0;
    applyLayerFilter();
    apply();
  }

  /**
   * 筋肉タップ連動：4段階レッド／ブルー筋膜シース ＋ 駅間3D筋膜シートを即座に点灯する公開 API
   */
  function showMuscleChain(chainSpec) {
    clear();
    if (!chainSpec || typeof chainSpec !== 'object') return;
    state.mode = 'chain';
    state.chainSpec = chainSpec;
    state.chainSeedId = chainSpec.seedId || chainSpec.shortenCore?.[0] || null;
    state.twist = 0.52;

    const side = chainSpec.side === 'L' || chainSpec.side === 'R' ? chainSpec.side : 'both';
    const sideVec = new THREE.Vector2(side === 'R' ? 0 : 1, side === 'L' ? 0 : 1);
    const lineColor = new THREE.Color('#CC6F5B');
    const coreList = Array.isArray(chainSpec.shortenCore) && chainSpec.shortenCore.length
      ? chainSpec.shortenCore
      : (chainSpec.seedId ? [chainSpec.seedId] : (chainSpec.shorten || []));

    assignFourTierRoles(
      { ...chainSpec, shortenCore: coreList },
      sideVec,
      lineColor,
      Array.isArray(chainSpec.lines) ? chainSpec.lines : [],
    );

    for (const e of state.muscles.values()) {
      if (e.role === 1) {
        e.lockMax = e.id === state.chainSeedId ? 0.90 : 0.74;
        e.lockNow = e.id === state.chainSeedId ? 0.62 : 0.42;
        setLockGeometry(e, null, true);
      }
    }

    const bridges =
      Array.isArray(chainSpec.bridges) && chainSpec.bridges.length
        ? chainSpec.bridges
        : Array.isArray(chainSpec.stationBridges) && chainSpec.stationBridges.length
          ? chainSpec.stationBridges
          : autoExtractBridges(Array.isArray(chainSpec.lines) ? chainSpec.lines : []);
    addFasciaSheetBridge(bridges, side);

    shared.uFade.value = 1.0;
    applyLayerFilter();
    apply();
  }

  /**
   * オンデマンド1点集中スポットライト API（黄色・アンバー完全排除の深紅クリムゾン核）
   */
  function showTriggerPoint(muscleId, side = 'both') {
    if (!muscleId) {
      clearTriggerPoint();
      return;
    }
    state.targetNodes = [];
    state.nodeCount = 0;
    state.spotMuscleId = muscleId;

    let e = state.muscles.get(muscleId);
    if (!e) {
      e = addMuscle(muscleId);
      if (e) {
        e.role = 1;
        e.tierWeight = 1.0;
        e.u.uColor.value.set('#CC6F5B');
      }
    } else if (e.role === 0) {
      e.role = 1;
      e.tierWeight = 0.96;
    }
    if (e && !e.lockMax) {
      e.lockMax = 0.96;
      setLockGeometry(e, null, true);
    }
    if (!state.mode) {
      state.mode = 'chain';
      shared.uFade.value = 1;
    }
    applyLayerFilter();
    apply();
    if (e) {
      if (e.role >= 3) {
        e.u.uStretch.value = Math.max(e.u.uStretch.value, 0.94);
        e.u.uWrinkle.value = 0.0;
      } else {
        e.u.uWrinkle.value = Math.max(e.u.uWrinkle.value, 0.96);
        e.u.uStretch.value = 0.0;
        e.u.uTwistVis.value = Math.max(e.u.uTwistVis.value, 0.85);
        e.u.uTwistAmt.value = Math.max(e.u.uTwistAmt.value, 0.70);
        e.lockNow = Math.max(e.lockNow, 0.76);
        e.u.uLock.value = e.lockNow;
        e.u.uLockMax.value = Math.max(e.lockMax || 0, 0.94);
      }
      e.u.uSelected.value = 1.0;
      e.u.uSide.value.set(1, 1);
    }

    const rigRole = getRigRole ? getRigRole(muscleId, 'muscle') : null;
    const effectiveSide =
      side === 'L' || side === 'R'
        ? side
        : state.habit && (state.habit.side === 'L' || state.habit.side === 'R')
          ? state.habit.side
          : 'both';

    if (effectiveSide === 'L' || effectiveSide === 'R') {
      const pos = centerOf(muscleId, effectiveSide) || e?.an?.[effectiveSide]?.center || centerOf(muscleId, 'both');
      if (pos) pushNode(pos, '#CC6F5B', 0, rigRole);
    } else {
      const posL = centerOf(muscleId, 'L') || e?.an?.L?.center;
      const posR = centerOf(muscleId, 'R') || e?.an?.R?.center;
      if (posL && posR) {
        if (posL.distanceTo(posR) < 0.08) {
          pushNode(posL, '#CC6F5B', 0, rigRole);
        } else {
          pushNode(posL, '#CC6F5B', 0, rigRole);
          pushNode(posR, '#B95C48', 0.35, rigRole);
        }
      } else {
        const pos = posL || posR || centerOf(muscleId, 'both');
        if (pos) pushNode(pos, '#CC6F5B', 0, rigRole);
      }
    }
    commitNodes();
  }

  function clearTriggerPoint() {
    state.spotMuscleId = null;
    state.targetNodes = [];
    state.nodeCount = 0;
    commitNodes();
    if (state.mode) {
      applyLayerFilter();
      apply();
    }
  }

  // ---------------------------------------------------------------------------
  // ⑤ レントゲン・スキャンプレーン（X-Ray Scan Sweep: 1.2秒で通過する青い透視スキャン光）
  // ---------------------------------------------------------------------------
  let scanGroup = null;
  let scanRingMesh = null;
  let scanGlowMesh = null;
  let scanDiscMesh = null;
  const scanState = {
    active: false,
    elapsed: 0,
    duration: 1.2,
    yStart: 1.65,
    yEnd: -1.55,
    x: 0,
    z: 0,
    scale: 1.0,
  };

  function ensureXRayScan() {
    if (scanGroup) return;
    scanGroup = new THREE.Group();
    scanGroup.name = 'xray-scan-sweep';
    scanGroup.raycast = noRaycast;
    scanGroup.visible = false;

    const ringGeo = new THREE.TorusGeometry(0.54, 0.0048, 12, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xb87d2b,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    scanRingMesh = new THREE.Mesh(ringGeo, ringMat);
    scanRingMesh.raycast = noRaycast;
    scanRingMesh.frustumCulled = false;
    scanRingMesh.renderOrder = 29;

    const glowGeo = new THREE.TorusGeometry(0.545, 0.016, 12, 64);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xcfa058,
      transparent: true,
      opacity: 0.36,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    scanGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    scanGlowMesh.raycast = noRaycast;
    scanGlowMesh.frustumCulled = false;
    scanGlowMesh.renderOrder = 28;

    const discGeo = new THREE.RingGeometry(0.08, 0.54, 48);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xdfb56c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.14,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    scanDiscMesh = new THREE.Mesh(discGeo, discMat);
    scanDiscMesh.raycast = noRaycast;
    scanDiscMesh.frustumCulled = false;
    scanDiscMesh.renderOrder = 27;

    scanGroup.add(scanDiscMesh, scanGlowMesh, scanRingMesh);
    root.add(scanGroup);
  }

  /**
   * 頭から足先へ（または対象部位の上下を）青いレントゲンスキャン光のリングが1.2秒かけて通過する演出
   */
  function triggerXRayScan(opts = {}) {
    ensureXRayScan();
    scanState.active = true;
    scanState.elapsed = 0;
    scanState.duration = Math.max(0.3, Number(opts.duration) || 1.2);
    scanState.yStart = Number.isFinite(opts.yStart) ? opts.yStart : 1.65;
    scanState.yEnd = Number.isFinite(opts.yEnd) ? opts.yEnd : -1.55;
    scanState.x = Number.isFinite(opts.x) ? opts.x : 0;
    scanState.z = Number.isFinite(opts.z) ? opts.z : 0;
    scanState.scale = Number.isFinite(opts.scale) ? opts.scale : 1.0;
    scanGroup.visible = true;
    updateXRayScan(0);
  }

  function updateXRayScan(dt) {
    if (!scanState.active || !scanGroup) return;
    scanState.elapsed += dt;
    const u = clamp01(scanState.elapsed / scanState.duration);
    if (u >= 1.0) {
      scanState.active = false;
      scanGroup.visible = false;
      return;
    }
    const easeU = u * u * (3 - 2 * u);
    const y = scanState.yStart + (scanState.yEnd - scanState.yStart) * easeU;
    const env = Math.sin(u * Math.PI); // 両端で滑らかにフェードイン・アウト
    const bodyWidthFactor = 0.72 + 0.34 * Math.exp(-Math.pow((y - 0.35) / 0.85, 2));
    const sc = scanState.scale * bodyWidthFactor;
    scanGroup.position.set(scanState.x, y, scanState.z);
    scanGroup.scale.set(sc, 1, sc * 0.78);
    if (scanRingMesh) scanRingMesh.material.opacity = 0.88 * env;
    if (scanGlowMesh) scanGlowMesh.material.opacity = 0.42 * env;
    if (scanDiscMesh) scanDiscMesh.material.opacity = 0.16 * env;
  }

  // ---------------------------------------------------------------------------
  // ⑥ 3Dセルフケア・マッサージエンジン統合（サロン3Dハンド / ボール / ローラー / 支持面パネル / Raycaster表面吸着）
  // ---------------------------------------------------------------------------
  let selfCareGuide = null;

  const releaseState = {
    active: false,
    muscleId: null,
    strokeTarget: null,
    side: 'R',
    tool: 'ball',
    motion: 'roll',
    elapsed: 0,
    rigRole: null,
  };

  const TRUNK_SURFACE_ENVELOPE_IDS = [
    'pectoralis-major',
    'latissimus-dorsi',
    'trapezius',
    'serratus-anterior',
    'rectus-abdominis',
    'external-oblique',
    'sternocleidomastoid',
    'masseter',
    'temporalis',
    'splenius-capitis',
  ];

  const LEG_SURFACE_ENVELOPE_IDS = [
    'gluteus-maximus',
    'gluteus-medius',
    'tensor-fasciae-latae',
    'rectus-femoris',
    'vastus-lateralis',
    'vastus-medialis',
    'sartorius',
    'adductor-longus',
    'gracilis',
    'biceps-femoris',
    'semitendinosus',
    'gastrocnemius',
    'soleus',
    'tibialis-anterior',
    'fibularis-longus',
    'flexor-digitorum-brevis',
    'abductor-hallucis',
    'abductor-digiti-minimi-foot',
  ];

  const ARM_SURFACE_ENVELOPE_IDS = [
    'deltoid',
    'biceps-brachii',
    'triceps-brachii',
    'brachialis',
    'brachioradialis',
    'flexor-carpi-radialis',
    'flexor-carpi-ulnaris',
    'flexor-digitorum-superficialis',
    'extensor-carpi-radialis-longus',
    'extensor-digitorum',
    'pronator-teres',
    'abductor-pollicis-brevis',
  ];

  function ensureReleaseTools() {
    if (!selfCareGuide) {
      selfCareGuide = createSelfCareGuide3D({ parent: root });
    }
  }

  /**
   * 対象筋（muscleId）の解剖学的位置に応じて、THREE.Raycaster でレスト体表外殻の7点曲線と法線を取得する
   */
  function computeReleaseKinematics(muscleId, strokeTarget, side, strokeSpan = 1.0) {
    const an = analyze(muscleId);
    const effSide =
      side === 'L' || side === 'R'
        ? side
        : state.habit && (state.habit.side === 'L' || state.habit.side === 'R')
          ? state.habit.side
          : 'R';

    const cStart =
      centerOf(muscleId, effSide) ||
      an?.[effSide]?.center?.clone() ||
      centerOf(muscleId, 'both') ||
      new THREE.Vector3(0, 0.5, 0.12);

    const sx = effSide === 'L' ? 1 : -1;
    const rigRole = getRigRole ? getRigRole(muscleId, 'muscle') : null;
    const isArmTarget = Boolean(rigRole && rigRole.z > 0.5);
    const isLegTarget = Boolean(rigRole && rigRole.x > 0.5 && rigRole.x < 2.5);

    const isPlantarFoot =
      /^(plantar|flexor-digitorum-brevis|abductor-hallucis|abductor-digiti-minimi-foot|quadratus-plantae|flexor-hallucis-brevis)/.test(
        muscleId,
      );
    const isThenarHand =
      /^(abductor-pollicis|flexor-pollicis-brevis|opponens-pollicis|adductor-pollicis)/.test(muscleId);
    const isForearmVolar =
      /^(flexor-carpi|palmaris|flexor-digitorum-superficialis|flexor-digitorum-profundus|pronator)/.test(muscleId);
    const isForearmRadial = /^brachioradialis$/.test(muscleId);
    const isForearmDorsal = /^(extensor-carpi|extensor-digitorum|supinator)/.test(muscleId);
    const isSubClavicle = /^(pectoralis-minor|subclavius)$/.test(muscleId);
    const isBetweenScapula = /^(rhomboid-major|rhomboid-minor)$/.test(muscleId);
    const isFlankRib = /^(external-oblique|internal-oblique|serratus-anterior)$/.test(muscleId);
    const isFrontThigh = /^(rectus-femoris|vastus-medialis|vastus-intermedius|sartorius)$/.test(muscleId);
    const isOuterHipThigh = /^(tensor-fasciae-latae|vastus-lateralis|fibularis)/.test(muscleId);
    const isGluteLateral = /^(gluteus-medius|gluteus-minimus)$/.test(muscleId);
    const isBackMuscle =
      /gastrocnemius|soleus|biceps-femoris|semitendinosus|semimembranosus|gluteus-maximus|piriformis|latissimus|longissimus|iliocostalis|multifidus|spinalis|quadratus-lumborum|trapezius|levator-scapulae|infraspinatus|supraspinatus|teres|subscapularis|splenius|semispinalis|occipitalis|rectus-capitis-posterior|obliquus-capitis|calcaneal|popliteus|tibialis-posterior|triceps/.test(
        muscleId,
      );

    const outDirRest = new THREE.Vector3(0, 0, 1);
    const strokeDirRest = new THREE.Vector3(0, 1, 0);
    let spanLen = Math.min(0.48, Math.max(0.24, (an?.size || 0.32) * 0.82)) * strokeSpan;

    if (isPlantarFoot) {
      outDirRest.set(0, -1, 0);
      strokeDirRest.set(0, 0, 1);
      spanLen = 0.24 * strokeSpan;
    } else if (isThenarHand) {
      outDirRest.set(sx * 0.34, -0.06, 0.94).normalize();
      strokeDirRest.set(sx * 0.24, -0.95, 0.16).normalize();
      spanLen = 0.14 * strokeSpan;
    } else if (isForearmVolar) {
      outDirRest.set(sx * 0.18, 0.0, 0.98).normalize();
      const ax = (an?.[effSide]?.axis || new THREE.Vector3(sx * 0.16, -0.97, 0.16)).clone().normalize();
      strokeDirRest.copy(ax);
      spanLen = 0.26 * strokeSpan;
    } else if (isForearmRadial) {
      outDirRest.set(sx * 0.72, 0.04, 0.69).normalize();
      const ax = (an?.[effSide]?.axis || new THREE.Vector3(sx * 0.16, -0.97, 0.16)).clone().normalize();
      strokeDirRest.copy(ax);
      spanLen = 0.26 * strokeSpan;
    } else if (isForearmDorsal) {
      outDirRest.set(sx * 0.56, 0.0, -0.83).normalize();
      const ax = (an?.[effSide]?.axis || new THREE.Vector3(sx * 0.16, -0.97, 0.16)).clone().normalize();
      strokeDirRest.copy(ax);
      spanLen = 0.26 * strokeSpan;
    } else if (isSubClavicle) {
      outDirRest.set(sx * 0.22, 0.20, 0.95).normalize();
      strokeDirRest.set(sx * 0.88, 0.34, -0.22).normalize();
      spanLen = 0.26 * strokeSpan;
    } else if (isBetweenScapula) {
      outDirRest.set(sx * 0.18, 0.06, -0.98).normalize();
      strokeDirRest.set(0, 1, 0);
      spanLen = 0.30 * strokeSpan;
    } else if (isFlankRib) {
      outDirRest.set(sx * 0.90, 0.04, 0.43).normalize();
      strokeDirRest.set(0, -1, 0);
      spanLen = 0.30 * strokeSpan;
    } else if (isFrontThigh) {
      outDirRest.set(sx * 0.14, 0.0, 0.99).normalize();
      strokeDirRest.set(0, -1, 0);
      spanLen = 0.44 * strokeSpan;
    } else if (isOuterHipThigh) {
      outDirRest.set(sx * 0.94, 0.0, 0.34).normalize();
      strokeDirRest.set(0, -1, 0);
      spanLen = 0.38 * strokeSpan;
    } else if (isGluteLateral) {
      outDirRest.set(sx * 0.84, 0.08, -0.53).normalize();
      strokeDirRest.set(0, -1, 0);
      spanLen = 0.28 * strokeSpan;
    } else if (isBackMuscle) {
      outDirRest.set(cStart.x * 0.7, 0.04, -0.82);
      if (/latissimus|teres|quadratus-lumborum|infraspinatus/.test(muscleId)) {
        outDirRest.x = sx * Math.max(Math.abs(outDirRest.x), 0.56);
      }
      outDirRest.normalize();
      const ax = (an?.[effSide]?.axis || new THREE.Vector3(0, 1, 0)).clone().normalize();
      strokeDirRest.copy(ax);
    } else {
      outDirRest.set(sx * Math.min(Math.max(Math.abs(cStart.x) * 0.5, 0.18), 0.48), 0.04, 0.86).normalize();
      const ax = (an?.[effSide]?.axis || new THREE.Vector3(0, 1, 0)).clone().normalize();
      strokeDirRest.copy(ax);
    }

    // 候補メッシュの収集（体幹・下肢ケア時にレストの垂れた腕メッシュに誤ヒットするのを完全排除！）
    const candidateIdSet = new Set([muscleId]);
    if (strokeTarget && !isArmTarget) {
      const targetRig = getRigRole ? getRigRole(strokeTarget, 'muscle') : null;
      if (!targetRig || targetRig.z <= 0.5) candidateIdSet.add(strokeTarget);
    }
    if (isPlantarFoot) {
      for (const id of [
        'flexor-digitorum-brevis',
        'abductor-hallucis',
        'abductor-digiti-minimi-foot',
        effSide === 'L' ? 'left-calcaneus' : 'right-calcaneus',
        effSide === 'L' ? 'left-first-metatarsal-bone' : 'right-first-metatarsal-bone',
        effSide === 'L' ? 'left-fifth-metatarsal-bone' : 'right-fifth-metatarsal-bone',
      ]) {
        candidateIdSet.add(id);
      }
    } else if (isArmTarget) {
      for (const id of ARM_SURFACE_ENVELOPE_IDS) candidateIdSet.add(id);
    } else if (isLegTarget) {
      for (const id of LEG_SURFACE_ENVELOPE_IDS) candidateIdSet.add(id);
    } else {
      for (const id of TRUNK_SURFACE_ENVELOPE_IDS) candidateIdSet.add(id);
    }

    const candidateMeshes = [];
    for (const cid of candidateIdSet) {
      for (const m of safeMeshes(cid)) {
        candidateMeshes.push(m);
      }
    }

    const raySample = sampleSurfaceStrokeByRaycaster({
      centerRest: cStart,
      strokeDirRest,
      outDirRest,
      spanLen,
      candidateMeshes,
      effSide,
      sampleCount: 7,
      fallbackOffset: 0.085,
      surfaceClearance: 0.010,
    });

    return {
      effSide,
      rigRole,
      pointsRest: raySample.pointsRest,
      normalsRest: raySample.normalsRest,
    };
  }

  const _normProbeRest = new THREE.Vector3();

  /**
   * 3Dセルフケアガイド（🤲サロン3Dハンド・🎾テニスボール・🛞フォームローラー＋半透明支持面パネル）を表示し、
   * 対象部位の体表曲面にピタッと吸着したアニメーションを開始する
   */
  function showReleaseTool(config = {}) {
    if (!config || (typeof config === 'object' && config.enabled === false)) {
      clearReleaseTool();
      return;
    }
    const cfg = typeof config === 'string' ? { muscleId: config } : config;
    const muscleId =
      cfg.muscleId ||
      cfg.muscle ||
      state.spotMuscleId ||
      state.chainSeedId ||
      state.habit?.triggerPoints?.[0]?.id ||
      state.habit?.shortenCore?.[0] ||
      state.habit?.shorten?.[0] ||
      null;
    if (!muscleId) return;

    ensureReleaseTools();

    const side = cfg.side || state.habit?.side || state.chainSpec?.side || 'both';
    const profile = resolveCareProfile(muscleId, cfg.tool);
    const tool = profile.tool;
    const motion = cfg.motion && ['stroke', 'circle', 'roll', 'cross', 'glide', 'press'].includes(cfg.motion)
      ? cfg.motion
      : profile.motion;
    const speed = Math.max(0.2, Math.min(3.0, Number(cfg.speed) || 1.0));
    const scale = Number.isFinite(Number(cfg.scale)) && Number(cfg.scale) !== 1.0
      ? Number(cfg.scale)
      : profile.scale;
    const strokeSpan = Number.isFinite(Number(cfg.strokeSpan))
      ? Number(cfg.strokeSpan) * profile.strokeSpan
      : profile.strokeSpan;

    if (state.spotMuscleId !== muscleId) {
      showTriggerPoint(muscleId, side);
    }

    const kin = computeReleaseKinematics(muscleId, cfg.strokeTarget, side, strokeSpan);

    releaseState.active = true;
    releaseState.muscleId = muscleId;
    releaseState.strokeTarget = cfg.strokeTarget || null;
    releaseState.side = kin.effSide;
    releaseState.tool = tool;
    releaseState.motion = motion;
    releaseState.elapsed = 0;
    releaseState.rigRole = kin.rigRole;

    const rigRole = kin.rigRole;
    selfCareGuide.show({
      targetId: muscleId,
      tool,
      handPose: cfg.handPose || profile.handPose,
      motion,
      supportSurface: cfg.supportSurface !== undefined ? cfg.supportSurface : profile.supportSurface,
      effSide: kin.effSide,
      speed,
      scale,
      strokeSpan,
      pointsRest: kin.pointsRest,
      normalsRest: kin.normalsRest,
      transformFn: (restPt, restNorm, _idx, outPt, outNorm) => {
        const pDef = deformPoint(restPt, rigRole, false);
        outPt.copy(pDef);
        _normProbeRest.copy(restPt).addScaledVector(restNorm, 0.045);
        const nTipDef = deformPoint(_normProbeRest, rigRole, false);
        outNorm.copy(nTipDef).sub(pDef);
        if (outNorm.lengthSq() < 1e-8) outNorm.copy(restNorm);
        else outNorm.normalize();
      },
    });

    if (nodeCore) nodeCore.visible = false;
    if (nodeHalo) nodeHalo.visible = false;



    updateReleaseTool(shared.uTime.value, 0);
  }

  /**
   * 3Dリリース器具と緩和グロウを消去して通常状態へ戻す
   */
  function clearReleaseTool() {
    releaseState.active = false;
    releaseState.muscleId = null;
    releaseState.strokeTarget = null;
    releaseState.elapsed = 0;
    selfCareGuide?.clear();
    if (state.nodeCount > 0 && state.muscleOverlayVisible) {
      if (nodeCore) nodeCore.visible = true;
      if (nodeHalo) nodeHalo.visible = true;
    }
    for (const e of state.muscles.values()) {
      if (e.u.uRelease) e.u.uRelease.value = 0;
    }
  }

  function updateReleaseTool(t, dt) {
    if (!releaseState.active || !selfCareGuide) return;
    releaseState.elapsed += dt;
    selfCareGuide.update(t, dt);

    // 対象筋肉（muscleId ＆ strokeTarget）の赤い緊張に対して穏やかな緩和グロウ（uRelease）を反映
    const relaxProgress = clamp01(releaseState.elapsed / 3.2) * (0.72 + 0.24 * (0.5 + 0.5 * Math.sin(t * 1.8)));
    const entryMain = state.muscles.get(releaseState.muscleId);
    if (entryMain && entryMain.u.uRelease) {
      entryMain.u.uRelease.value = relaxProgress;
    }
    if (releaseState.strokeTarget) {
      const entrySub = state.muscles.get(releaseState.strokeTarget);
      if (entrySub && entrySub.u.uRelease) {
        entrySub.u.uRelease.value = relaxProgress * 0.75;
      }
    }
  }

  /** 固まりの広がり始め（前の chain 筋の中心）と、到達距離の範囲を求める */
  function setLockGeometry(e, prev, fromCenter = false) {
    const u = e.u;
    const range = [0, 1, 0, 1];
    ['R', 'L'].forEach((s, si) => {
      const a = e.an[s];
      let org;
      if (prev) org = prev.an[s].center.clone();
      else if (fromCenter) org = a.center.clone();
      else org = a.center.clone().addScaledVector(a.axis, -a.radius * 0.75); // 下端（足側）から
      let near = Infinity, far = 0;
      const sm = a.samples;
      for (let i = 0; i < sm.length; i += 3) {
        const d = Math.hypot(sm[i] - org.x, sm[i + 1] - org.y, sm[i + 2] - org.z);
        if (d < near) near = d;
        if (d > far) far = d;
      }
      if (!Number.isFinite(near)) { near = 0; far = 1; }
      range[si * 2] = near;
      range[si * 2 + 1] = Math.max(far, near + 0.05);
      (s === 'L' ? u.uLockOrigL : u.uLockOrigR).value.copy(org);
    });
    u.uLockRange.value.set(range[0], range[1], range[2], range[3]);
  }

  /** 0..1 の進行と 4段階レッド／ブルー役割（role 0..4）および line 1色静止解剖図シートを uniform に反映 */
  function apply() {
    const p = state.progress;
    shared.uProgress.value = p;
    shared.uHasSpot.value = state.spotMuscleId ? 1.0 : 0.0;

    if (state.mode === 'habit') {
      const tw = Math.max(0.45, state.twist);
      const W = smooth(PHASE.wrinkle[0], PHASE.wrinkle[1], p); // 0.0〜0.35: アコーディオン収縮しわ立ち上がり
      const T = smooth(PHASE.twist[0], PHASE.twist[1], p);     // 0.35〜0.75: 斜めスパイラルねじれ繊維重畳
      const LG = smooth(PHASE.lock[0], PHASE.lock[1], p);      // 0.62〜0.98: ガチガチのねじれロック固定
      const S = smooth(0.0, 0.88, p);                          // 0.0〜0.88: 拮抗・連動筋膜の縦ピン張り伸張増加
      shared.uLockG.value = LG;

      for (const e of state.muscles.values()) {
        const u = e.u;
        const isSpot = e.id === state.spotMuscleId;
        const role = e.role || 0;
        u.uRole.value = role;
        u.uLineWave.value = 0;
        u.uSelected.value = isSpot ? 1.0 : 0.0;

        if (role === 1) {
          // 1. 🔴 shortenCore（主役・1番縮んで硬い核の筋肉: 深紅ルビー＋深いアコーディオン横じわ）
          u.uInflate.value = 0.0028;
          u.uTierWeight.value = clamp01(Math.max(e.tierWeight || 0.95, 0.90 + 0.10 * W));
          u.uWrinkle.value = isSpot ? 0.98 : 0.56 + 0.44 * W;
          u.uStretch.value = 0;
          u.uYore.value = 0.30 + 0.65 * T;
          u.uTwistVis.value = isSpot
            ? Math.max(0.86, T * (0.68 + 0.32 * tw))
            : 0.36 + 0.64 * T * (0.65 + 0.35 * tw);
          u.uTwistAmt.value = (0.30 + 0.70 * T) * tw;
          u.uFiber.value = 0;
        } else if (role === 2) {
          // 2. 🌹 shortenLinked（連動して縮む第2段階の赤い筋肉: ローズクリムゾン＋横じわ）
          u.uInflate.value = 0.0024;
          u.uTierWeight.value = clamp01(0.56 + 0.28 * Math.max(0.40, 0.65 * W + 0.35 * T));
          u.uWrinkle.value = 0.42 + 0.38 * W;
          u.uStretch.value = 0;
          u.uYore.value = 0.46 + 0.32 * T;
          u.uTwistVis.value = 0.24 + 0.46 * T * (0.55 + 0.45 * tw);
          u.uTwistAmt.value = (0.20 + 0.56 * T) * tw;
          u.uFiber.value = 0;
        } else if (role === 3) {
          // 3. 🔵 lengthenAntagonist（反対側でピンと張る主伸張筋: ロイヤルコバルト＋縦スジ）
          u.uInflate.value = 0.0018;
          u.uTierWeight.value = clamp01(Math.max(e.tierWeight || 0.90, 0.85 + 0.15 * S));
          u.uWrinkle.value = 0;
          u.uStretch.value = isSpot ? 0.96 : 0.56 + 0.42 * S;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = (0.08 + 0.24 * T) * tw;
          u.uFiber.value = 0;
        } else if (role === 4) {
          // 4. 🩵 lengthenLinked（連動して張る第2段階の青い筋肉: セルリアンスカイ＋縦スジ）
          u.uInflate.value = 0.0018;
          u.uTierWeight.value = clamp01(0.48 + 0.24 * Math.max(0.38, S));
          u.uWrinkle.value = 0;
          u.uStretch.value = 0.40 + 0.28 * S;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = 0.06 * tw;
          u.uFiber.value = 0;
        } else {
          u.uInflate.value = 0.0012;
          u.uTierWeight.value = 0;
          u.uWrinkle.value = 0;
          u.uStretch.value = 0;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = 0;
          u.uFiber.value = e.onLine ? 0.62 * (1 - 0.35 * LG) : 0;
        }

        const rawLock = e.lockStart != null ? smooth(e.lockStart, e.lockEnd, p) : 0;
        e.lockNow = isSpot && role <= 2 ? Math.max(rawLock, 0.76) : rawLock;
        u.uLock.value = e.lockNow;
        u.uLockMax.value = e.lockNow > 0 ? Math.max(e.lockMax || 0, isSpot && role <= 2 ? 0.94 : 0) : 0;
      }
      syncSheetUniforms();
    } else if (state.mode === 'step' || state.mode === 'chain') {
      const isChain = state.mode === 'chain';
      shared.uLockG.value = isChain ? 0.56 : 0.45;
      shared.uProgress.value = isChain ? 0.78 : 0.72;

      for (const e of state.muscles.values()) {
        const u = e.u;
        const isSpot = e.id === state.spotMuscleId;
        const isSeed = isSpot || (isChain && e.id === state.chainSeedId);
        const role = e.role || 0;
        u.uRole.value = role;
        u.uLineWave.value = 0;
        u.uSelected.value = isSpot ? 1.0 : 0.0;

        if (role === 1) {
          u.uInflate.value = 0.0028;
          u.uTierWeight.value = isSeed ? 1.0 : clamp01(e.tierWeight || 0.94);
          u.uWrinkle.value = isSeed ? 0.98 : 0.92;
          u.uStretch.value = 0;
          u.uYore.value = 0.68;
          u.uTwistVis.value = isSeed ? 0.82 : 0.68;
          u.uTwistAmt.value = 0.62;
          u.uFiber.value = 0;
          e.lockNow = isSeed ? 0.64 : 0.42;
          u.uLock.value = e.lockNow;
          u.uLockMax.value = isSeed ? 0.92 : 0.76;
        } else if (role === 2) {
          u.uInflate.value = 0.0024;
          u.uTierWeight.value = clamp01(e.tierWeight || 0.76);
          u.uWrinkle.value = 0.66;
          u.uStretch.value = 0;
          u.uYore.value = 0.66;
          u.uTwistVis.value = 0.44;
          u.uTwistAmt.value = 0.46;
          u.uFiber.value = 0;
          e.lockNow = 0.18;
          u.uLock.value = 0.18;
          u.uLockMax.value = 0.42;
        } else if (role === 3) {
          u.uInflate.value = 0.0018;
          u.uTierWeight.value = clamp01(e.tierWeight || 0.92);
          u.uWrinkle.value = 0;
          u.uStretch.value = isSpot ? 0.96 : 0.90;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = 0.16;
          u.uFiber.value = 0;
          e.lockNow = 0;
          u.uLock.value = 0;
          u.uLockMax.value = 0;
        } else if (role === 4) {
          u.uInflate.value = 0.0018;
          u.uTierWeight.value = clamp01(e.tierWeight || 0.68);
          u.uWrinkle.value = 0;
          u.uStretch.value = 0.58;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = 0.08;
          u.uFiber.value = 0;
          e.lockNow = 0;
          u.uLock.value = 0;
          u.uLockMax.value = 0;
        } else {
          u.uInflate.value = 0.0012;
          u.uTierWeight.value = 0;
          u.uWrinkle.value = 0;
          u.uStretch.value = 0;
          u.uYore.value = 0;
          u.uTwistVis.value = 0;
          u.uTwistAmt.value = 0;
          u.uFiber.value = e.focus || e.onLine ? 0.62 : 0;
          e.lockNow = 0;
          u.uLock.value = 0;
          u.uLockMax.value = 0;
        }
      }
      syncSheetUniforms();
    } else if (state.mode === 'line') {
      shared.uLockG.value = 0;
      shared.uProgress.value = 0;
      for (const e of state.muscles.values()) {
        const u = e.u;
        const isSpot = e.id === state.spotMuscleId;
        u.uRole.value = 0;
        u.uLineWave.value = 0;
        u.uInflate.value = 0.0012;
        u.uTierWeight.value = 0;
        u.uSelected.value = isSpot ? 1.0 : 0.0;
        u.uWrinkle.value = 0;
        u.uStretch.value = 0;
        u.uYore.value = 0;
        u.uTwistVis.value = 0;
        u.uTwistAmt.value = 0;
        u.uFiber.value = isSpot ? 0.52 : 1.0;
        e.lockNow = 0;
        u.uLock.value = 0;
        u.uLockMax.value = 0;
      }
      syncSheetUniforms();
    }
    syncMeshVisibility();
    updateNodes();
  }

  /** 0..1 癖を続けた時間（しわ → ねじれ → 固まり） */
  function setProgress(p) {
    state.progress = clamp01(Number(p) || 0);
    apply();
  }

  /** 追加筋膜シース・駅間3D筋膜シート・マーカーを完全に元へ戻す */
  const EMPTY_POOL_GEO = new THREE.BufferGeometry();

  function clear() {
    for (const sh of state.sheets) {
      root.remove(sh.mesh);
      sh.mesh.geometry = EMPTY_POOL_GEO;
      sheetMeshPool.push(sh.mesh);
      sheetMatPool.push(sh.mat);
    }
    state.sheets.length = 0;
    for (const e of state.muscles.values()) {
      for (const m of e.overlays) {
        root.remove(m);
        m.geometry = EMPTY_POOL_GEO;
        m.userData.src = null;
        ovMeshPool.push(m);
      }
      ovMatPool.push(e.mat);
    }
    state.muscles.clear();
    state.spotMuscleId = null;
    state.targetNodes.length = 0;
    state.nodeCount = 0;
    if (nodeGeo) {
      nodeGeo.instanceCount = 0;
      nodeCore.visible = nodeHalo.visible = false;
    }
    activeGeos.clear();
    clearReleaseTool();
    scanState.active = false;
    scanState.elapsed = 0;
    if (scanGroup) scanGroup.visible = false;
    state.mode = null;
    state.line = null;
    state.habit = null;
    state.chainSpec = null;
    state.chainSeedId = null;
    shared.uFade.value = 0;
    shared.uLockG.value = 0;
    shared.uProgress.value = 0;
    shared.uHasSpot.value = 0;
  }

  /** 毎フレーム（main.js → viewer.onFrame から） */
  function update(time, delta) {
    const rawDt = Math.min(0.1, Math.max(0, Number.isFinite(delta) ? delta : 1 / 60));
    const dt = state.paused ? 0 : rawDt;
    if (!state.paused) {
      shared.uTime.value = Number.isFinite(time) ? time : shared.uTime.value + rawDt;
    }
    const t = shared.uTime.value;
    updateXRayScan(dt);
    updateReleaseTool(t, dt);
    if (!state.mode) return;

    shared.uFade.value = Math.min(1, shared.uFade.value + rawDt / 0.65);

    syncMeshVisibility();

    // 急所ターゲットマーカーを現在の姿勢変形（deformPoint）に追従させて更新
    updateNodes();
  }

  function setMuscleOverlayVisible(visible) {
    state.muscleOverlayVisible = Boolean(visible);
    syncMeshVisibility();
  }

  function setPaused(paused) {
    state.paused = Boolean(paused);
  }

  /** 完全破棄（任意） */
  function dispose() {
    clear();
    for (const item of geoCache.values()) item.geo.dispose();
    geoCache.clear();
    sideVertCache.clear();
    for (const m of sheetMatPool) m.dispose();
    sheetMatPool.length = 0;
    sheetMeshPool.length = 0;
    for (const m of ovMatPool) m.dispose();
    ovMatPool.length = 0;
    ovMeshPool.length = 0;
    if (nodeGeo) {
      nodeGeo.dispose();
      nodeCore.material.dispose();
      nodeHalo.material.dispose();
      nodeGeo = nodeCore = nodeHalo = null;
    }
    selfCareGuide?.dispose?.();
    selfCareGuide = null;
    if (scanGroup) {
      scanGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    scanGroup = scanRingMesh = scanGlowMesh = scanDiscMesh = null;
    analysisCache.clear();
    poleCache.clear();
    scene.remove(root);
  }

  return {
    showLine,
    showHabit,
    showStep,
    showMuscleChain,
    setLayerFilter,
    getLayerFilter: () => state.layerMode,
    setMuscleOverlayVisible,
    setPaused,
    addFasciaSheetBridge,
    showTriggerPoint,
    clearTriggerPoint,
    showReleaseTool,
    clearReleaseTool,
    triggerXRayScan,
    setProgress,
    isBusy: () =>
      Boolean(
        releaseState.active ||
        scanState.active ||
        state.mode === 'habit' ||
        (state.mode && shared.uFade.value < 0.99),
      ),
    clear,
    update,
    dispose,
  };
}
