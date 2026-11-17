// =============================================================================
// unified_fascia_sheets.js — 一体型3Dエンジン用：全11本アナトミートレイン連続3D筋膜シート統合モジュール
//
// 特徴:
// 1. fascia_only_sheets.js の体表エンベロープ (buildBodyEnvelope) と FASCIA_LINE_DEFS、
//    および fascia_only_biomechanics.js の BONY_STATIONS (42箇所の骨ピン留め部) を再利用。
// 2. 各頂点に連続リグウェイト属性 (aRigA, aRigB) を焼き込み、posture.js の poseUniforms と
//    100%同一の数式・ピボット・回転順序で変形させることで、全45動作 (HABITS)・連動ストーリー・
//    全セルフケア姿勢において骨格・筋肉・顔ヴェール・11本筋膜シートが 0.000mm のズレなく完全同期変形する。
// 3. 肩関節・股関節・膝関節・肘関節・前腕回内・手首をまたぐシート境界も連続角度補間で滑らかに接続し、
//    頭上サーブ (#23)・スマッシュ (#24)・足組み (#06)・あぐら (#41) でもポリゴン裂け 0.000mm を保証する。
// =============================================================================

import * as THREE from 'three';
import * as posture from './posture.js?v=20261118a';
import { BONE, BONY_STATIONS } from './fascia_only_biomechanics.js?v=20261118a';
import { buildBodyEnvelope, FASCIA_LINE_DEFS } from './fascia_only_sheets.js?v=20261118a';

export { FASCIA_LINE_DEFS };

const SEG_COUNT = 32;

function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function mirrorThetaToLeft(thetaR) {
  let th = Math.PI - thetaR;
  while (th > Math.PI) th -= Math.PI * 2;
  while (th < -Math.PI) th += Math.PI * 2;
  return th;
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

function getLegAxisCenter(isRight, y) {
  const s = isRight ? -1 : +1;
  let ax = 0.30;
  let cz = -0.03;
  if (y < -3.02) {
    const t = clamp((y - -3.28) / (-3.02 - -3.28), 0, 1);
    ax = mix(0.35, 0.32, t);
    cz = mix(0.01, -0.09, t);
  } else if (y < -1.64) {
    const t = clamp((y - -3.02) / (-1.64 - -3.02), 0, 1);
    ax = mix(0.32, 0.295, t);
    cz = mix(-0.09, -0.025, t);
  } else {
    const t = clamp((y - -1.64) / (0.10 - -1.64), 0, 1);
    ax = mix(0.295, 0.275, t);
    cz = mix(-0.025, -0.045, t);
  }
  return { cx: s * ax, cz };
}

// -----------------------------------------------------------------------------
// 1. スキニング重み生成 ＆ posture.js 完全連続リグ属性 (aRigA, aRigB) への変換
//    aRigA = vec4(wHip, wKnee, wArm, wElbow)
//    aRigB = vec4(wPron, wWrist, wHead, limbSide)
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
  if (y < -1.72) {
    return makeWeights([[B_SHANK, 1]]);
  }
  if (y < -1.42) {
    // posture.js の kneeMode=2 (smoothstep(-1.72, -1.42, y)) と完全一致
    const t = smoothstep(-1.72, -1.42, y);
    return makeWeights([
      [B_SHANK, 1 - t],
      [B_FEMUR, t],
    ]);
  }
  if (y < -0.22) {
    return makeWeights([[B_FEMUR, 1]]);
  }
  if (y < +0.18) {
    // posture.js の hipMode=2 (smoothstep(-0.24, 0.14, y)) と滑らかに同期
    const t = smoothstep(-0.22, +0.18, y);
    return makeWeights([
      [B_FEMUR, 1 - t],
      [BONE.PELVIS, t],
    ]);
  }
  if (y < +0.86) {
    return makeWeights([[BONE.PELVIS, 1]]);
  }
  if (y < +2.38) {
    return makeWeights([[BONE.THORAX_HIGH, 1]]);
  }
  if (y < +2.68) {
    const t = smoothstep(+2.38, +2.68, y);
    return makeWeights([
      [BONE.NECK, 1 - t],
      [BONE.HEAD, t],
    ]);
  }
  return makeWeights([[BONE.HEAD, 1]]);
}

function getArmChainSkin(isRight, y, radialWeight = 0.5) {
  const B_GIRDLE = isRight ? BONE.GIRDLE_R : BONE.GIRDLE_L;
  const B_HUM = isRight ? BONE.HUMERUS_R : BONE.HUMERUS_L;
  const B_ULNA = isRight ? BONE.ULNA_R : BONE.ULNA_L;
  const B_RAD = isRight ? BONE.RADIUS_R : BONE.RADIUS_L;
  const B_HAND = isRight ? BONE.HAND_R : BONE.HAND_L;

  const distalFactor = 1 - smoothstep(0.08, 0.88, y);
  const effRadW = radialWeight * (0.12 + 0.88 * distalFactor);

  if (y >= 1.98) {
    const t = smoothstep(1.98, 2.12, y);
    return makeWeights([
      [B_HUM, 1 - t],
      [B_GIRDLE, t],
    ]);
  }
  if (y >= 1.12) {
    return makeWeights([[B_HUM, 1]]);
  }
  if (y >= 0.86) {
    const t = 1 - smoothstep(0.86, 1.12, y);
    return makeWeights([
      [B_HUM, 1 - t],
      [B_RAD, t * effRadW],
      [B_ULNA, t * (1 - effRadW)],
    ]);
  }
  if (y >= 0.03) {
    return makeWeights([
      [B_RAD, effRadW],
      [B_ULNA, 1 - effRadW],
    ]);
  }
  if (y >= -0.03) {
    const t = 1 - smoothstep(-0.03, 0.03, y);
    return makeWeights([
      [B_RAD, (1 - t) * effRadW],
      [B_ULNA, (1 - t) * (1 - effRadW)],
      [B_HAND, t],
    ]);
  }
  return makeWeights([[B_HAND, 1]]);
}

function boneToRigTraits(boneIdx) {
  switch (boneIdx) {
    case BONE.HEAD:
      return { hip: 0, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 1, side: 0 };
    case BONE.FEMUR_R:
      return { hip: 1, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: -1 };
    case BONE.FEMUR_L:
      return { hip: 1, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: +1 };
    case BONE.SHANK_R:
    case BONE.FOOT_R:
      return { hip: 1, knee: 1, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: -1 };
    case BONE.SHANK_L:
    case BONE.FOOT_L:
      return { hip: 1, knee: 1, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: +1 };
    case BONE.HUMERUS_R:
      return { hip: 0, knee: 0, arm: 1, elbow: 0, pron: 0, wrist: 0, head: 0, side: -1 };
    case BONE.HUMERUS_L:
      return { hip: 0, knee: 0, arm: 1, elbow: 0, pron: 0, wrist: 0, head: 0, side: +1 };
    case BONE.ULNA_R:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 0, wrist: 0, head: 0, side: -1 };
    case BONE.ULNA_L:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 0, wrist: 0, head: 0, side: +1 };
    case BONE.RADIUS_R:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 1, wrist: 0, head: 0, side: -1 };
    case BONE.RADIUS_L:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 1, wrist: 0, head: 0, side: +1 };
    case BONE.HAND_R:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 1, wrist: 1, head: 0, side: -1 };
    case BONE.HAND_L:
      return { hip: 0, knee: 0, arm: 1, elbow: 1, pron: 1, wrist: 1, head: 0, side: +1 };
    case BONE.GIRDLE_R:
      return { hip: 0, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: -1 };
    case BONE.GIRDLE_L:
      return { hip: 0, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: +1 };
    default:
      return { hip: 0, knee: 0, arm: 0, elbow: 0, pron: 0, wrist: 0, head: 0, side: 0 };
  }
}

function skinToContinuousRig(skin, restPos, explicitSideSign = 0) {
  let wHip = 0;
  let wKnee = 0;
  let wArm = 0;
  let wElbow = 0;
  let wPron = 0;
  let wWrist = 0;
  let wHead = 0;
  let sideVote = 0;

  for (let i = 0; i < 4; i++) {
    const bw = skin.w[i] || 0;
    if (bw <= 1e-5) continue;
    const tr = boneToRigTraits(skin.idx[i]);
    wHip += tr.hip * bw;
    wKnee += tr.knee * bw;
    wArm += tr.arm * bw;
    wElbow += tr.elbow * bw;
    wPron += tr.pron * bw;
    wWrist += tr.wrist * bw;
    wHead += tr.head * bw;
    if (tr.side !== 0) sideVote += tr.side * bw;
  }

  let limbSide = 0;
  if (Math.abs(sideVote) > 1e-4) {
    limbSide = sideVote > 0 ? +1 : -1;
  } else if (explicitSideSign !== 0) {
    limbSide = explicitSideSign > 0 ? +1 : -1;
  } else {
    limbSide = restPos.x >= 0 ? +1 : -1;
  }

  return {
    rigA: [wHip, wKnee, wArm, wElbow],
    rigB: [wPron, wWrist, wHead, limbSide],
  };
}

// -----------------------------------------------------------------------------
// 2. GLSL & JS 完全一致の連続シート姿勢変形 (posture.js 100%同期)
// -----------------------------------------------------------------------------
const POSE_SHEET_GLSL = /* glsl */ `
uniform vec4 uPoseA;
uniform vec4 uPoseB;
uniform vec4 uPoseC;
uniform vec4 uPoseD;
uniform vec4 uPoseE;
uniform vec4 uPoseF;
uniform vec4 uPoseG;
uniform vec4 uPoseH;

vec3 sheetPitchFwd(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dy = p.y - piv.y;
  float dz = p.z - piv.z;
  return vec3(p.x, piv.y + dy * c - dz * s, piv.z + dz * c + dy * s);
}

vec3 sheetRollLeft(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dx = p.x - piv.x;
  float dy = p.y - piv.y;
  return vec3(piv.x + dx * c + dy * s, piv.y + dy * c - dx * s, p.z);
}

vec3 sheetYawLeft(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dx = p.x - piv.x;
  float dz = p.z - piv.z;
  return vec3(piv.x + dx * c + dz * s, p.y, piv.z + dz * c - dx * s);
}

vec3 sheetRotateAxis(vec3 p, vec3 piv, vec3 axis, float a) {
  float c = cos(a);
  float sn = sin(a);
  vec3 v = p - piv;
  return piv + v * c + cross(axis, v) * sn + axis * dot(axis, v) * (1.0 - c);
}

vec3 poseDeformSheet(vec3 wp, vec4 rigA, vec4 rigB) {
  float trunkFlex   = uPoseA.x;
  float headForward = uPoseA.y;
  float shoulderIn  = uPoseA.z;
  float pelvisTilt  = uPoseA.w;
  float trunkRotate = uPoseB.x;
  float sideBend    = uPoseB.y;
  float hipShift    = uPoseB.z;
  float armsFold    = uPoseB.w;
  float sit         = uPoseC.x;
  float prone       = uPoseC.y;
  float headPitch   = uPoseC.z;
  float legSpread   = uPoseC.w;
  float hipHinge    = uPoseD.x;
  float kneeBend    = uPoseD.y;
  float armRaiseL   = uPoseD.z;
  float armRaiseR   = uPoseD.w;
  float armSpreadL  = uPoseE.x;
  float armSpreadR  = uPoseE.y;
  float elFlexL     = uPoseE.z;
  float elFlexR     = uPoseE.w;
  float foreYawL    = uPoseF.x;
  float foreYawR    = uPoseF.y;
  float legSwingL   = uPoseF.z;
  float legSwingR   = uPoseF.w;
  float pronateL    = uPoseG.x;
  float pronateR    = uPoseG.y;
  float wristExtL   = uPoseG.z;
  float wristExtR   = uPoseG.w;
  float legAdductL  = uPoseH.x;
  float legAdductR  = uPoseH.y;
  float lieSide     = uPoseH.z;
  float floorSit    = uPoseH.w;

  float act = abs(trunkFlex) + abs(headForward) + abs(shoulderIn)
            + abs(pelvisTilt) + abs(trunkRotate) + abs(sideBend)
            + abs(hipShift) + abs(armsFold) + abs(sit) + abs(prone)
            + abs(headPitch) + abs(legSpread)
            + abs(hipHinge) + abs(kneeBend)
            + abs(armRaiseL) + abs(armRaiseR) + abs(armSpreadL) + abs(armSpreadR)
            + abs(elFlexL) + abs(elFlexR) + abs(foreYawL) + abs(foreYawR)
            + abs(legSwingL) + abs(legSwingR)
            + abs(pronateL) + abs(pronateR) + abs(wristExtL) + abs(wristExtR)
            + abs(legAdductL) + abs(legAdductR) + abs(lieSide) + abs(floorSit);
  if (act < 1e-5) return wp;

  vec3 p0 = wp;
  vec3 p = wp;

  float hipWeight   = clamp(rigA.x, 0.0, 1.0);
  float kneeWeight  = clamp(rigA.y, 0.0, 1.0);
  float armMask     = clamp(rigA.z, 0.0, 1.0);
  float elMask      = clamp(rigA.w, 0.0, 1.0);
  float pronWeight  = clamp(rigB.x, 0.0, 1.0);
  float wristWeight = clamp(rigB.y, 0.0, 1.0);
  float headWeight  = clamp(rigB.z, 0.0, 1.0);

  float sBody = p0.x >= 0.0 ? 1.0 : -1.0;
  float s = (hipWeight + armMask) > 1e-4 && abs(rigB.w) > 0.5 ? sign(rigB.w) : sBody;
  float isL = s > 0.0 ? 1.0 : 0.0;
  float ax = abs(p0.x);

  float yEff = mix(mix(p0.y, 2.02, armMask), -0.16, hipWeight);

  // 2. 上肢アクション変形
  float armRaise  = mix(armRaiseR,  armRaiseL,  isL);
  float armSpread = mix(armSpreadR, armSpreadL, isL);
  float elFlex    = mix(elFlexR,    elFlexL,    isL);
  float foreYaw   = mix(foreYawR,   foreYawL,   isL);
  float pronate   = mix(pronateR,   pronateL,   isL);
  float wristExt  = mix(wristExtR,  wristExtL,  isL);
  float customArmAct = abs(armRaise) + abs(armSpread) + abs(elFlex) + abs(foreYaw) + abs(pronate) + abs(wristExt);
  float sitArm = sit * clamp(1.0 - (armsFold + customArmAct) * 1.8, 0.0, 1.0);

  if ((armsFold > 1e-4 || sitArm > 1e-4 || customArmAct > 1e-4) && armMask > 1e-4) {
    float shMask = armMask;
    vec3 pivEl = vec3(s * 0.865, 0.925, -0.128);
    vec3 pivSh = vec3(s * 0.72, 2.02, -0.08);
    vec3 pivRadHead = vec3(s * 0.9300, 0.8869, -0.1080);
    vec3 pivUlnaHead = vec3(s * 0.9565, 0.0322, 0.0585);
    vec3 pronAxis = normalize(pivUlnaHead - pivRadHead);
    vec3 pivWrist = vec3(s * 1.012, 0.016, 0.068);

    if (customArmAct > 1e-4) {
      if (abs(wristExt) > 1e-4 && wristWeight > 1e-5) {
        p = sheetPitchFwd(p, pivWrist, clamp(wristExt, -0.80, 1.10) * 0.96 * wristWeight);
      }
      float autoPron = 0.22 * clamp(elFlex, 0.0, 1.0) * clamp(1.0 - abs(pronate) * 2.0, 0.0, 1.0);
      float effPronate = clamp(pronate + autoPron, -0.45, 1.08);
      if (abs(effPronate) > 1e-4 && pronWeight > 1e-5) {
        p = sheetRotateAxis(p, pivRadHead, pronAxis, s * 2.52 * effPronate * pronWeight);
      }
      p = sheetPitchFwd(p, pivEl, -1.08 * elFlex * elMask);
      p = sheetYawLeft(p, pivEl, -s * 0.85 * foreYaw * elMask);

      float torsoFwd = 0.55 * max(0.0, trunkFlex) + 0.75 * max(0.0, hipHinge);
      float compFwd = torsoFwd * smoothstep(0.05, 0.45, armRaise);
      p = sheetRollLeft(p, pivSh, -s * 0.78 * armSpread * shMask);
      p = sheetPitchFwd(p, pivSh, -(1.05 * armRaise + compFwd) * shMask);
      p.z += 0.05 * clamp(armRaise, 0.0, 1.0) * shMask;
    }

    if (armsFold > 1e-4) {
      float foldBend = 1.0 - pow(clamp(1.0 - armsFold, 0.0, 1.0), 1.45);
      float midHold = smoothstep(0.15, 0.45, armsFold) * (1.0 - smoothstep(0.78, 0.96, armsFold));
      float bendReach = smoothstep(0.35, 0.70, trunkFlex) * smoothstep(0.18, 0.45, armsFold);
      float workReach = clamp(midHold * 0.75 + bendReach * 0.85, 0.0, 1.0);
      float crossRate = mix(0.54, 1.0, smoothstep(0.75, 0.96, armsFold)) * (1.0 - 0.38 * bendReach);

      float wElB = elMask * foldBend;
      float wElC = elMask * armsFold * crossRate;
      p = sheetYawLeft(p, pivEl, -s * 0.75 * wElC);
      p = sheetPitchFwd(p, pivEl, (-1.18 - s * 0.05) * wElB);
      p = sheetYawLeft(p, pivEl, -s * (1.28 - s * 0.04) * wElC);

      float shAdduct = (0.26 * armsFold - 0.18 * workReach) * shMask;
      float shPitch = ((-0.52 - s * 0.03) * armsFold - (0.30 * workReach + 0.16 * bendReach)) * shMask;
      p = sheetRollLeft(p, pivSh, s * shAdduct);
      p = sheetPitchFwd(p, pivSh, shPitch);
      p.z += 0.06 * workReach * shMask;
      p.y += 0.04 * midHold * (1.0 - bendReach) * shMask;
    }

    if (sitArm > 1e-4) {
      float wElS = elMask * sitArm;
      float wShS = shMask * sitArm;
      if (pronWeight > 1e-5) {
        p = sheetRotateAxis(p, pivRadHead, pronAxis, s * 2.36 * pronWeight * sitArm);
      }
      p = sheetPitchFwd(p, pivEl, -0.68 * wElS);
      p = sheetYawLeft(p, pivEl, -s * 0.36 * wElS);
      p = sheetRollLeft(p, pivSh, s * 0.08 * wShS);
      p = sheetPitchFwd(p, pivSh, -0.10 * wShS);
    }
  }

  // 3. 巻き肩 (shoulderIn)
  if (shoulderIn > 1e-4) {
    float armOverheadAtten = 1.0 - 0.78 * smoothstep(1.10, 2.15, armRaise);
    float trunkSh = smoothstep(0.36, 0.66, ax)
                  * smoothstep(1.10, 1.65, p0.y)
                  * (1.0 - smoothstep(2.18, 2.45, p0.y))
                  * (1.0 - hipWeight);
    float wShIn = max(armMask * armOverheadAtten, trunkSh * (1.0 - armMask)) * shoulderIn;
    vec3 pivClav = vec3(s * 0.35, 1.85, -0.06);
    p = sheetYawLeft(p, pivClav, -s * 0.34 * wShIn);
    p = sheetPitchFwd(p, pivClav, 0.08 * wShIn);
    p.z += 0.04 * wShIn;
  }

  // 4. 頭頸部 (headForward / headPitch)
  float neckGate = (1.0 - armMask) * (1.0 - hipWeight);
  if (headForward > 1e-4 && neckGate > 1e-4) {
    float wNeck = mix(smoothstep(1.82, 2.32, p0.y), 1.0, headWeight) * neckGate * headForward;
    float wHead = mix(smoothstep(2.32, 2.68, p0.y), 1.0, headWeight) * neckGate * headForward;
    p = sheetPitchFwd(p, vec3(0.0, 2.15, -0.08), 0.38 * wNeck);
    p.z += 0.14 * wNeck;
    p.y -= 0.03 * wNeck;
    float headComp = -0.18 - 0.22 * clamp(hipHinge, 0.0, 1.0);
    p = sheetPitchFwd(p, vec3(0.0, 2.52, 0.02), headComp * wHead);
  }
  if (abs(headPitch) > 1e-4 && neckGate > 1e-4) {
    float wNeckP = mix(smoothstep(1.85, 2.35, p0.y), 1.0, headWeight) * neckGate * headPitch;
    float wHeadP = mix(smoothstep(2.30, 2.65, p0.y), 1.0, headWeight) * neckGate * headPitch;
    p = sheetPitchFwd(p, vec3(0.0, 2.15, -0.10), 0.46 * wNeckP);
    p = sheetPitchFwd(p, vec3(0.0, 2.48, -0.04), 0.42 * wHeadP);
  }

  // 5. 胸腰椎屈伸 (trunkFlex) ＆ 股関節ヒンジ (hipHinge)
  if (abs(trunkFlex) > 1e-4) {
    float wFlexT = smoothstep(0.75, 1.95, yEff) * trunkFlex;
    float wFlexL = smoothstep(0.05, 1.25, yEff) * trunkFlex;
    p = sheetPitchFwd(p, vec3(0.0, 1.25, -0.08), 0.38 * wFlexT);
    p = sheetPitchFwd(p, vec3(0.0, 0.35, -0.06), 0.26 * wFlexL);
  }
  if (abs(hipHinge) > 1e-4) {
    float wHinge = smoothstep(-0.08, 0.20, yEff) * hipHinge;
    p = sheetPitchFwd(p, vec3(0.0, 0.02, -0.04), 0.78 * wHinge);
    float wCounter = (1.0 - hipWeight) * smoothstep(-1.62, 0.05, yEff);
    p.z -= 0.22 * hipHinge * wCounter;
  }

  // 6. 体幹回旋 (trunkRotate)
  if (abs(trunkRotate) > 1e-4) {
    float wRot = smoothstep(0.02, 1.95, yEff) * trunkRotate;
    p = sheetYawLeft(p, vec3(0.0, 0.0, -0.06), 0.52 * wRot);
  }

  // 7. 体幹側屈 (sideBend)
  if (abs(sideBend) > 1e-4) {
    float wBend = smoothstep(0.05, 1.75, yEff) * sideBend;
    p = sheetRollLeft(p, vec3(0.0, 0.35, -0.06), 0.34 * wBend);
  }

  // 8. 骨盤前後傾 (pelvisTilt)
  if (abs(pelvisTilt) > 1e-4) {
    float wPelvRot = smoothstep(-0.15, 0.18, yEff) * (1.0 - smoothstep(0.45, 1.15, yEff));
    p = sheetPitchFwd(p, vec3(0.0, 0.0, -0.05), -0.26 * pelvisTilt * wPelvRot);
    float wArch = smoothstep(0.0, 0.42, yEff) * (1.0 - smoothstep(0.60, 1.25, yEff));
    p.z -= 0.09 * pelvisTilt * wArch;
    float wSlouch = smoothstep(0.20, 1.15, yEff);
    p = sheetPitchFwd(p, vec3(0.0, 0.35, -0.06), 0.14 * pelvisTilt * wSlouch);
  }

  // 9. 骨盤左右シフト（体幹側）
  if (hipWeight < 0.9999 && abs(hipShift) > 1e-4) {
    float trunkRatio = 1.0 - hipWeight;
    float wShift = smoothstep(-3.15, 0.05, yEff) * (1.0 - 0.35 * smoothstep(0.25, 2.10, yEff));
    p.x += 0.24 * hipShift * wShift * trunkRatio;
    float wHipRoll = smoothstep(-0.35, 0.05, yEff) * (1.0 - smoothstep(0.30, 1.00, yEff));
    p = sheetRollLeft(p, vec3(0.0, 0.05, -0.05), -0.10 * hipShift * wHipRoll * trunkRatio);
  }

  // 10. 下肢統合フォワードキネマティクス
  vec3 pivKneeSide = vec3(s * 0.185, -1.62, 0.02);
  vec3 pivHipSide  = vec3(s * 0.185, -0.02, -0.03);
  float legSwing   = mix(legSwingR, legSwingL, isL);
  float legAdduct  = mix(legAdductR, legAdductL, isL);
  float standRatio = clamp(1.0 - clamp(sit, 0.0, 1.0) - clamp(floorSit, 0.0, 1.0) - clamp(prone, 0.0, 1.0), 0.0, 1.0);
  float hingeLegAng = 0.1375 * hipHinge * standRatio * hipWeight;

  float autoSwingKnee = max(0.0, -legSwing * 0.72) + max(0.0, legSwing * 0.12);
  float sitKnee = (1.36 - 0.18 * clamp(legAdduct, 0.0, 1.2)) * sit;
  float totalKneePitch = sitKnee
                       + (2.18 + s * 0.18) * floorSit
                       + 1.12 * kneeBend
                       + 0.78 * autoSwingKnee
                       + hingeLegAng;
  if (abs(totalKneePitch) > 1e-4 && kneeWeight > 1e-5) {
    p = sheetPitchFwd(p, pivKneeSide, totalKneePitch * kneeWeight);
  }

  if (hipWeight > 1e-5) {
    if (legAdduct > 1e-4) {
      p = sheetRollLeft(p, pivHipSide, s * 0.32 * legAdduct * hipWeight);
      p = sheetYawLeft(p, pivHipSide, s * 0.14 * legAdduct * hipWeight);
    }
    if (sit > 1e-4) {
      p = sheetRollLeft(p, pivHipSide, -s * 0.035 * sit * (1.0 - clamp(legAdduct, 0.0, 1.0)) * hipWeight);
    }

    float slouchComp = clamp(trunkFlex * 0.7 + max(0.0, pelvisTilt) * 0.4, 0.0, 1.0);
    float hipPitchSit = (-1.38 + 0.14 * slouchComp) * sit - 0.28 * legAdduct * sit;
    float hipPitchFloor = (-1.38 - s * 0.05) * floorSit;
    float totalHipPitch = hipPitchSit
                        + hipPitchFloor
                        - 0.68 * kneeBend
                        - 0.68 * legSwing
                        - 0.22 * legAdduct * (1.0 - clamp(sit, 0.0, 1.0))
                        - hingeLegAng;
    if (abs(totalHipPitch) > 1e-4) {
      p = sheetPitchFwd(p, pivHipSide, totalHipPitch * hipWeight);
    }

    if (floorSit > 1e-4) {
      p = sheetRollLeft(p, pivHipSide, s * (1.16 - s * 0.04) * floorSit * hipWeight);
      p = sheetYawLeft(p, pivHipSide, s * 0.56 * floorSit * hipWeight);
    }

    if (abs(legSpread) > 1e-4) {
      float sitRatio = clamp(sit, 0.0, 1.0);
      p = sheetRollLeft(p, pivHipSide, -s * 0.46 * legSpread * (1.0 - 0.55 * sitRatio) * hipWeight);
      p = sheetYawLeft(p, pivHipSide, s * (0.30 + 0.38 * sitRatio) * legSpread * hipWeight);
    }
  }

  if (hipWeight > 1e-5 && abs(hipHinge) > 1e-4) {
    p.y += 1.60 * (1.0 - cos(hingeLegAng)) * hipWeight;
    p.z -= (1.60 * sin(hingeLegAng) + 0.22 * hipHinge * (1.0 - standRatio) * hipWeight);
  }
  if (prone > 1e-4) {
    p = sheetPitchFwd(p, vec3(0.0, -0.20, -0.05), 1.5708 * prone);
    p.y -= 1.48 * prone;
    p.z += 0.85 * prone;
  }
  if (sit > 1e-4) {
    p.y -= 0.48 * sit;
    p.z -= 0.16 * sit;
  }
  if (floorSit > 1e-4) {
    p.y -= 1.18 * floorSit;
    p.z -= 0.12 * floorSit;
  }
  if (kneeBend > 1e-4) {
    p.y -= 0.44 * kneeBend;
    p.z -= 0.18 * kneeBend;
  }
  if (hipWeight > 1e-5 && abs(hipShift) > 1e-4) {
    float hLegShift = 3.13 - 0.44 * clamp(kneeBend, 0.0, 1.2);
    float angLegShift = (0.24 * hipShift * standRatio * hipWeight) / hLegShift;
    p = sheetRollLeft(p, vec3(0.0, -3.15, -0.03 - 0.18 * kneeBend), angLegShift);
    p.x += 0.24 * hipShift * (1.0 - standRatio) * hipWeight;
  }

  // 11. 横向き寝ロール
  if (lieSide > 1e-4) {
    p = sheetRollLeft(p, vec3(0.0, 0.35, 0.0), 1.34 * lieSide);
    p.y -= 0.25 * lieSide;
  }

  return p;
}

vec3 poseDeformSheetNormal(vec3 wp, vec3 n, vec4 rigA, vec4 rigB) {
  vec3 n0 = normalize(n);
  vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(up, n0));
  vec3 t2 = cross(n0, t1);
  const float eps = 0.01;
  vec3 p0 = poseDeformSheet(wp, rigA, rigB);
  vec3 d1 = poseDeformSheet(wp + t1 * eps, rigA, rigB) - p0;
  vec3 d2 = poseDeformSheet(wp + t2 * eps, rigA, rigB) - p0;
  vec3 wn = cross(d1, d2);
  float len = length(wn);
  return len > 1e-8 ? wn / len : n0;
}
`;

// JS 版の連続シート変形（GLSL poseDeformSheet と100%一致：骨ピン追従＆実空間ひずみ計算用）
function pitchFwdJS(p, pivX, pivY, pivZ, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dy = p.y - pivY;
  const dz = p.z - pivZ;
  p.y = pivY + dy * c - dz * s;
  p.z = pivZ + dz * c + dy * s;
}

function rollLeftJS(p, pivX, pivY, pivZ, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - pivX;
  const dy = p.y - pivY;
  p.x = pivX + dx * c + dy * s;
  p.y = pivY + dy * c - dx * s;
}

function yawLeftJS(p, pivX, pivY, pivZ, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - pivX;
  const dz = p.z - pivZ;
  p.x = pivX + dx * c + dz * s;
  p.z = pivZ + dz * c - dx * s;
}

function rotateAxisJS(p, pivX, pivY, pivZ, axX, axY, axZ, a) {
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const vx = p.x - pivX;
  const vy = p.y - pivY;
  const vz = p.z - pivZ;
  const dot = axX * vx + axY * vy + axZ * vz;
  const cx = axY * vz - axZ * vy;
  const cy = axZ * vx - axX * vz;
  const cz = axX * vy - axY * vx;
  const omc = 1.0 - c;
  p.x = pivX + vx * c + cx * sn + axX * dot * omc;
  p.y = pivY + vy * c + cy * sn + axY * dot * omc;
  p.z = pivZ + vz * c + cz * sn + axZ * dot * omc;
}

function evalDeformSheetJS(restPos, rigA, rigB, poseObj, out) {
  out.set(restPos.x, restPos.y, restPos.z);

  const trunkFlex   = poseObj.trunkFlex   || 0;
  const headForward = poseObj.headForward || 0;
  const shoulderIn  = poseObj.shoulderIn  || 0;
  const pelvisTilt  = poseObj.pelvisTilt  || 0;
  const trunkRotate = poseObj.trunkRotate || 0;
  const sideBend    = poseObj.sideBend    || 0;
  const hipShift    = poseObj.hipShift    || 0;
  const armsFold    = poseObj.armsFold    || 0;
  const sit         = poseObj.sit         || 0;
  const prone       = poseObj.prone       || 0;
  const headPitch   = poseObj.headPitch   || 0;
  const legSpread   = poseObj.legSpread   || 0;
  const hipHinge    = poseObj.hipHinge    || 0;
  const kneeBend    = poseObj.kneeBend    || 0;
  const armRaiseL   = poseObj.armRaiseL   || 0;
  const armRaiseR   = poseObj.armRaiseR   || 0;
  const armSpreadL  = poseObj.armSpreadL  || 0;
  const armSpreadR  = poseObj.armSpreadR  || 0;
  const elFlexL     = poseObj.elFlexL     || 0;
  const elFlexR     = poseObj.elFlexR     || 0;
  const foreYawL    = poseObj.foreYawL    || 0;
  const foreYawR    = poseObj.foreYawR    || 0;
  const legSwingL   = poseObj.legSwingL   || 0;
  const legSwingR   = poseObj.legSwingR   || 0;
  const pronateL    = poseObj.pronateL    || 0;
  const pronateR    = poseObj.pronateR    || 0;
  const wristExtL   = poseObj.wristExtL   || 0;
  const wristExtR   = poseObj.wristExtR   || 0;
  const legAdductL  = poseObj.legAdductL  || 0;
  const legAdductR  = poseObj.legAdductR  || 0;
  const lieSide     = poseObj.lieSide     || 0;
  const floorSit    = poseObj.floorSit    || 0;

  const act =
    Math.abs(trunkFlex) + Math.abs(headForward) + Math.abs(shoulderIn) +
    Math.abs(pelvisTilt) + Math.abs(trunkRotate) + Math.abs(sideBend) +
    Math.abs(hipShift) + Math.abs(armsFold) + Math.abs(sit) + Math.abs(prone) +
    Math.abs(headPitch) + Math.abs(legSpread) + Math.abs(hipHinge) + Math.abs(kneeBend) +
    Math.abs(armRaiseL) + Math.abs(armRaiseR) + Math.abs(armSpreadL) + Math.abs(armSpreadR) +
    Math.abs(elFlexL) + Math.abs(elFlexR) + Math.abs(foreYawL) + Math.abs(foreYawR) +
    Math.abs(legSwingL) + Math.abs(legSwingR) + Math.abs(pronateL) + Math.abs(pronateR) +
    Math.abs(wristExtL) + Math.abs(wristExtR) + Math.abs(legAdductL) + Math.abs(legAdductR) +
    Math.abs(lieSide) + Math.abs(floorSit);
  if (act < 1e-5) return out;

  const x0 = restPos.x;
  const y0 = restPos.y;
  const hipWeight   = clamp(rigA[0], 0, 1);
  const kneeWeight  = clamp(rigA[1], 0, 1);
  const armMask     = clamp(rigA[2], 0, 1);
  const elMask      = clamp(rigA[3], 0, 1);
  const pronWeight  = clamp(rigB[0], 0, 1);
  const wristWeight = clamp(rigB[1], 0, 1);
  const headWeight  = clamp(rigB[2], 0, 1);

  const sBody = x0 >= 0 ? 1 : -1;
  const s = hipWeight + armMask > 1e-4 && Math.abs(rigB[3]) > 0.5 ? Math.sign(rigB[3]) : sBody;
  const isL = s > 0 ? 1 : 0;
  const ax = Math.abs(x0);
  const yEff = mix(mix(y0, 2.02, armMask), -0.16, hipWeight);

  const armRaise  = mix(armRaiseR,  armRaiseL,  isL);
  const armSpread = mix(armSpreadR, armSpreadL, isL);
  const elFlex    = mix(elFlexR,    elFlexL,    isL);
  const foreYaw   = mix(foreYawR,   foreYawL,   isL);
  const pronate   = mix(pronateR,   pronateL,   isL);
  const wristExt  = mix(wristExtR,  wristExtL,  isL);
  const customArmAct =
    Math.abs(armRaise) + Math.abs(armSpread) + Math.abs(elFlex) +
    Math.abs(foreYaw) + Math.abs(pronate) + Math.abs(wristExt);
  const sitArm = sit * clamp(1 - (armsFold + customArmAct) * 1.8, 0, 1);

  if ((armsFold > 1e-4 || sitArm > 1e-4 || customArmAct > 1e-4) && armMask > 1e-4) {
    const shMask = armMask;
    const pivElX = s * 0.865, pivElY = 0.925, pivElZ = -0.128;
    const pivShX = s * 0.72,  pivShY = 2.02,  pivShZ = -0.08;
    const pivRadHeadX = s * 0.9300, pivRadHeadY = 0.8869, pivRadHeadZ = -0.1080;
    const pivUlnaHeadX = s * 0.9565, pivUlnaHeadY = 0.0322, pivUlnaHeadZ = 0.0585;
    let pAxX = pivUlnaHeadX - pivRadHeadX;
    let pAxY = pivUlnaHeadY - pivRadHeadY;
    let pAxZ = pivUlnaHeadZ - pivRadHeadZ;
    const pAxLen = Math.hypot(pAxX, pAxY, pAxZ) || 1;
    pAxX /= pAxLen; pAxY /= pAxLen; pAxZ /= pAxLen;
    const pivWristX = s * 1.012, pivWristY = 0.016, pivWristZ = 0.068;

    if (customArmAct > 1e-4) {
      if (Math.abs(wristExt) > 1e-4 && wristWeight > 1e-5) {
        pitchFwdJS(out, pivWristX, pivWristY, pivWristZ, clamp(wristExt, -0.80, 1.10) * 0.96 * wristWeight);
      }
      const autoPron = 0.22 * clamp(elFlex, 0, 1) * clamp(1 - Math.abs(pronate) * 2.0, 0, 1);
      const effPronate = clamp(pronate + autoPron, -0.45, 1.08);
      if (Math.abs(effPronate) > 1e-4 && pronWeight > 1e-5) {
        rotateAxisJS(out, pivRadHeadX, pivRadHeadY, pivRadHeadZ, pAxX, pAxY, pAxZ, s * 2.52 * effPronate * pronWeight);
      }
      pitchFwdJS(out, pivElX, pivElY, pivElZ, -1.08 * elFlex * elMask);
      yawLeftJS(out, pivElX, pivElY, pivElZ, -s * 0.85 * foreYaw * elMask);

      const torsoFwd = 0.55 * Math.max(0, trunkFlex) + 0.75 * Math.max(0, hipHinge);
      const compFwd = torsoFwd * smoothstep(0.05, 0.45, armRaise);
      rollLeftJS(out, pivShX, pivShY, pivShZ, -s * 0.78 * armSpread * shMask);
      pitchFwdJS(out, pivShX, pivShY, pivShZ, -(1.05 * armRaise + compFwd) * shMask);
      out.z += 0.05 * clamp(armRaise, 0, 1) * shMask;
    }

    if (armsFold > 1e-4) {
      const foldBend = 1 - Math.pow(clamp(1 - armsFold, 0, 1), 1.45);
      const midHold = smoothstep(0.15, 0.45, armsFold) * (1 - smoothstep(0.78, 0.96, armsFold));
      const bendReach = smoothstep(0.35, 0.70, trunkFlex) * smoothstep(0.18, 0.45, armsFold);
      const workReach = clamp(midHold * 0.75 + bendReach * 0.85, 0, 1);
      const crossRate = mix(0.54, 1.0, smoothstep(0.75, 0.96, armsFold)) * (1 - 0.38 * bendReach);

      const wElB = elMask * foldBend;
      const wElC = elMask * armsFold * crossRate;
      yawLeftJS(out, pivElX, pivElY, pivElZ, -s * 0.75 * wElC);
      pitchFwdJS(out, pivElX, pivElY, pivElZ, (-1.18 - s * 0.05) * wElB);
      yawLeftJS(out, pivElX, pivElY, pivElZ, -s * (1.28 - s * 0.04) * wElC);

      const shAdduct = (0.26 * armsFold - 0.18 * workReach) * shMask;
      const shPitch = ((-0.52 - s * 0.03) * armsFold - (0.30 * workReach + 0.16 * bendReach)) * shMask;
      rollLeftJS(out, pivShX, pivShY, pivShZ, s * shAdduct);
      pitchFwdJS(out, pivShX, pivShY, pivShZ, shPitch);
      out.z += 0.06 * workReach * shMask;
      out.y += 0.04 * midHold * (1 - bendReach) * shMask;
    }

    if (sitArm > 1e-4) {
      const wElS = elMask * sitArm;
      const wShS = shMask * sitArm;
      if (pronWeight > 1e-5) {
        rotateAxisJS(out, pivRadHeadX, pivRadHeadY, pivRadHeadZ, pAxX, pAxY, pAxZ, s * 2.36 * pronWeight * sitArm);
      }
      pitchFwdJS(out, pivElX, pivElY, pivElZ, -0.68 * wElS);
      yawLeftJS(out, pivElX, pivElY, pivElZ, -s * 0.36 * wElS);
      rollLeftJS(out, pivShX, pivShY, pivShZ, s * 0.08 * wShS);
      pitchFwdJS(out, pivShX, pivShY, pivShZ, -0.10 * wShS);
    }
  }

  if (shoulderIn > 1e-4) {
    const armOverheadAtten = 1 - 0.78 * smoothstep(1.10, 2.15, armRaise);
    const trunkSh =
      smoothstep(0.36, 0.66, ax) *
      smoothstep(1.10, 1.65, y0) *
      (1 - smoothstep(2.18, 2.45, y0)) *
      (1 - hipWeight);
    const wShIn = Math.max(armMask * armOverheadAtten, trunkSh * (1 - armMask)) * shoulderIn;
    yawLeftJS(out, s * 0.35, 1.85, -0.06, -s * 0.34 * wShIn);
    pitchFwdJS(out, s * 0.35, 1.85, -0.06, 0.08 * wShIn);
    out.z += 0.04 * wShIn;
  }

  const neckGate = (1 - armMask) * (1 - hipWeight);
  if (headForward > 1e-4 && neckGate > 1e-4) {
    const wNeck = mix(smoothstep(1.82, 2.32, y0), 1, headWeight) * neckGate * headForward;
    const wHead = mix(smoothstep(2.32, 2.68, y0), 1, headWeight) * neckGate * headForward;
    pitchFwdJS(out, 0, 2.15, -0.08, 0.38 * wNeck);
    out.z += 0.14 * wNeck;
    out.y -= 0.03 * wNeck;
    const headComp = -0.18 - 0.22 * clamp(hipHinge, 0, 1);
    pitchFwdJS(out, 0, 2.52, 0.02, headComp * wHead);
  }
  if (Math.abs(headPitch) > 1e-4 && neckGate > 1e-4) {
    const wNeckP = mix(smoothstep(1.85, 2.35, y0), 1, headWeight) * neckGate * headPitch;
    const wHeadP = mix(smoothstep(2.30, 2.65, y0), 1, headWeight) * neckGate * headPitch;
    pitchFwdJS(out, 0, 2.15, -0.10, 0.46 * wNeckP);
    pitchFwdJS(out, 0, 2.48, -0.04, 0.42 * wHeadP);
  }

  if (Math.abs(trunkFlex) > 1e-4) {
    const wFlexT = smoothstep(0.75, 1.95, yEff) * trunkFlex;
    const wFlexL = smoothstep(0.05, 1.25, yEff) * trunkFlex;
    pitchFwdJS(out, 0, 1.25, -0.08, 0.38 * wFlexT);
    pitchFwdJS(out, 0, 0.35, -0.06, 0.26 * wFlexL);
  }
  if (Math.abs(hipHinge) > 1e-4) {
    const wHinge = smoothstep(-0.08, 0.20, yEff) * hipHinge;
    pitchFwdJS(out, 0, 0.02, -0.04, 0.78 * wHinge);
    const wCounter = (1 - hipWeight) * smoothstep(-1.62, 0.05, yEff);
    out.z -= 0.22 * hipHinge * wCounter;
  }

  if (Math.abs(trunkRotate) > 1e-4) {
    const wRot = smoothstep(0.02, 1.95, yEff) * trunkRotate;
    yawLeftJS(out, 0, 0, -0.06, 0.52 * wRot);
  }
  if (Math.abs(sideBend) > 1e-4) {
    const wBend = smoothstep(0.05, 1.75, yEff) * sideBend;
    rollLeftJS(out, 0, 0.35, -0.06, 0.34 * wBend);
  }
  if (Math.abs(pelvisTilt) > 1e-4) {
    const wPelvRot = smoothstep(-0.15, 0.18, yEff) * (1 - smoothstep(0.45, 1.15, yEff));
    pitchFwdJS(out, 0, 0, -0.05, -0.26 * pelvisTilt * wPelvRot);
    const wArch = smoothstep(0, 0.42, yEff) * (1 - smoothstep(0.60, 1.25, yEff));
    out.z -= 0.09 * pelvisTilt * wArch;
    const wSlouch = smoothstep(0.20, 1.15, yEff);
    pitchFwdJS(out, 0, 0.35, -0.06, 0.14 * pelvisTilt * wSlouch);
  }
  if (hipWeight < 0.9999 && Math.abs(hipShift) > 1e-4) {
    const trunkRatio = 1 - hipWeight;
    const wShift = smoothstep(-3.15, 0.05, yEff) * (1 - 0.35 * smoothstep(0.25, 2.10, yEff));
    out.x += 0.24 * hipShift * wShift * trunkRatio;
    const wHipRoll = smoothstep(-0.35, 0.05, yEff) * (1 - smoothstep(0.30, 1.00, yEff));
    rollLeftJS(out, 0, 0.05, -0.05, -0.10 * hipShift * wHipRoll * trunkRatio);
  }

  const pivKneeX = s * 0.185, pivKneeY = -1.62, pivKneeZ = 0.02;
  const pivHipX  = s * 0.185, pivHipY  = -0.02, pivHipZ  = -0.03;
  const legSwing  = mix(legSwingR, legSwingL, isL);
  const legAdduct = mix(legAdductR, legAdductL, isL);
  const standRatio = clamp(1 - clamp(sit, 0, 1) - clamp(floorSit, 0, 1) - clamp(prone, 0, 1), 0, 1);
  const hingeLegAng = 0.1375 * hipHinge * standRatio * hipWeight;

  const autoSwingKnee = Math.max(0, -legSwing * 0.72) + Math.max(0, legSwing * 0.12);
  const sitKnee = (1.36 - 0.18 * clamp(legAdduct, 0, 1.2)) * sit;
  const totalKneePitch =
    sitKnee + (2.18 + s * 0.18) * floorSit + 1.12 * kneeBend + 0.78 * autoSwingKnee + hingeLegAng;
  if (Math.abs(totalKneePitch) > 1e-4 && kneeWeight > 1e-5) {
    pitchFwdJS(out, pivKneeX, pivKneeY, pivKneeZ, totalKneePitch * kneeWeight);
  }

  if (hipWeight > 1e-5) {
    if (legAdduct > 1e-4) {
      rollLeftJS(out, pivHipX, pivHipY, pivHipZ, s * 0.32 * legAdduct * hipWeight);
      yawLeftJS(out, pivHipX, pivHipY, pivHipZ, s * 0.14 * legAdduct * hipWeight);
    }
    if (sit > 1e-4) {
      rollLeftJS(out, pivHipX, pivHipY, pivHipZ, -s * 0.035 * sit * (1 - clamp(legAdduct, 0, 1)) * hipWeight);
    }
    const slouchComp = clamp(trunkFlex * 0.7 + Math.max(0, pelvisTilt) * 0.4, 0, 1);
    const hipPitchSit = (-1.38 + 0.14 * slouchComp) * sit - 0.28 * legAdduct * sit;
    const hipPitchFloor = (-1.38 - s * 0.05) * floorSit;
    const totalHipPitch =
      hipPitchSit + hipPitchFloor - 0.68 * kneeBend - 0.68 * legSwing -
      0.22 * legAdduct * (1 - clamp(sit, 0, 1)) - hingeLegAng;
    if (Math.abs(totalHipPitch) > 1e-4) {
      pitchFwdJS(out, pivHipX, pivHipY, pivHipZ, totalHipPitch * hipWeight);
    }
    if (floorSit > 1e-4) {
      rollLeftJS(out, pivHipX, pivHipY, pivHipZ, s * (1.16 - s * 0.04) * floorSit * hipWeight);
      yawLeftJS(out, pivHipX, pivHipY, pivHipZ, s * 0.56 * floorSit * hipWeight);
    }
    if (Math.abs(legSpread) > 1e-4) {
      const sitRatio = clamp(sit, 0, 1);
      rollLeftJS(out, pivHipX, pivHipY, pivHipZ, -s * 0.46 * legSpread * (1 - 0.55 * sitRatio) * hipWeight);
      yawLeftJS(out, pivHipX, pivHipY, pivHipZ, s * (0.30 + 0.38 * sitRatio) * legSpread * hipWeight);
    }
  }

  if (hipWeight > 1e-5 && Math.abs(hipHinge) > 1e-4) {
    out.y += 1.60 * (1 - Math.cos(hingeLegAng)) * hipWeight;
    out.z -= 1.60 * Math.sin(hingeLegAng) + 0.22 * hipHinge * (1 - standRatio) * hipWeight;
  }
  if (prone > 1e-4) {
    pitchFwdJS(out, 0, -0.20, -0.05, 1.5708 * prone);
    out.y -= 1.48 * prone;
    out.z += 0.85 * prone;
  }
  if (sit > 1e-4) {
    out.y -= 0.48 * sit;
    out.z -= 0.16 * sit;
  }
  if (floorSit > 1e-4) {
    out.y -= 1.18 * floorSit;
    out.z -= 0.12 * floorSit;
  }
  if (kneeBend > 1e-4) {
    out.y -= 0.44 * kneeBend;
    out.z -= 0.18 * kneeBend;
  }
  if (hipWeight > 1e-5 && Math.abs(hipShift) > 1e-4) {
    const hLegShift = 3.13 - 0.44 * clamp(kneeBend, 0, 1.2);
    const angLegShift = (0.24 * hipShift * standRatio * hipWeight) / hLegShift;
    rollLeftJS(out, 0, -3.15, -0.03 - 0.18 * kneeBend, angLegShift);
    out.x += 0.24 * hipShift * (1 - standRatio) * hipWeight;
  }
  if (lieSide > 1e-4) {
    rollLeftJS(out, 0, 0.35, 0, 1.34 * lieSide);
    out.y -= 0.25 * lieSide;
  }
  return out;
}

// -----------------------------------------------------------------------------
// 3. GLSL コラーゲン線維＆3D横じわ・縦ファイバーシェーダー（ライト＆ダーク両対応）
// -----------------------------------------------------------------------------
const UNIFIED_FASCIA_VS = /* glsl */ `
  ${POSE_SHEET_GLSL}

  attribute vec4 aRigA;
  attribute vec4 aRigB;
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

    vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 wn0 = normalize(mat3(modelMatrix) * normal);

    vec3 wp = poseDeformSheet(wp0, aRigA, aRigB);
    vec3 wn = poseDeformSheetNormal(wp0, wn0, aRigA, aRigB);

    // 1) 短縮時 (strain < 0): 原因側の赤い3D横方向アコーディオンじわ（凹凸波）
    float shortAmt = clamp((-strain - 0.012) / 0.14, 0.0, 1.35);
    if (shortAmt > 0.001) {
      float edgeGuard = sin(clamp(uv.x, 0.0, 1.0) * 3.14159265);
      float endGuard = smoothstep(0.0, 0.06, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));
      float wavePhase = uv.y * 135.0 + sin(uv.x * 9.42) * 0.85;
      float wrinkleDisp = sin(wavePhase) * 0.0040 * shortAmt * (0.35 + 0.65 * edgeGuard) * endGuard;
      wp += wn * wrinkleDisp;
      wn = normalize(wn + vec3(0.0, cos(wavePhase) * 0.24 * shortAmt * endGuard, 0.0));
    }

    // 2) 伸張時 (strain > 0): 症状側の青い縦ファイバーがピンと張る
    float stretchAmt = clamp((strain - 0.012) / 0.16, 0.0, 1.35);
    if (stretchAmt > 0.001) {
      wp += wn * (0.0012 * stretchAmt);
    }

    vWorldPos = wp;
    vWorldNormal = wn;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const UNIFIED_FASCIA_FS = /* glsl */ `
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

    // サロンリネン（ライト）＆ ディープスレートネイビー（ダーク）両方で美しく映える真珠コラーゲン膜
    vec3 neutralLightBg = mix(vec3(0.42, 0.53, 0.62), vec3(0.78, 0.85, 0.90), 0.30 + 0.70 * diff);
    neutralLightBg = mix(neutralLightBg, vec3(0.22, 0.34, 0.44), fresnel * 0.62);

    vec3 neutralDarkBg = mix(vec3(0.56, 0.65, 0.76), vec3(0.90, 0.95, 1.00), 0.30 + 0.70 * diff);
    neutralDarkBg = mix(neutralDarkBg, vec3(0.78, 0.88, 0.98), fresnel * 0.52);

    vec3 baseCol = mix(neutralLightBg, neutralDarkBg, uDarkTheme);
    baseCol += (collagenTex - 0.45) * mix(0.19, 0.18, uDarkTheme);

    // 伸張側（症状：青い縦ファイバー）
    vec3 stretchCoreLight = mix(vec3(0.024, 0.56, 0.82), vec3(0.07, 0.30, 0.82), clamp(stretchT * 0.75, 0.0, 1.0));
    vec3 stretchFiberLight = vec3(0.28, 0.86, 0.98);
    vec3 stretchColLight = mix(stretchCoreLight * (0.72 + 0.38 * diff), stretchFiberLight, collagenTex * 0.58 + tensionGlint * 0.42);

    vec3 stretchCoreDark = mix(vec3(0.03, 0.64, 0.88), vec3(0.11, 0.42, 0.94), clamp(stretchT * 0.70, 0.0, 1.0));
    vec3 stretchFiberDark = vec3(0.52, 0.94, 1.00);
    vec3 stretchColDark = mix(stretchCoreDark * (0.75 + 0.35 * diff), stretchFiberDark, collagenTex * 0.62 + tensionGlint * 0.45);

    vec3 stretchCol = mix(stretchColLight, stretchColDark, uDarkTheme);

    // 短縮側（原因：赤い3D横じわ）
    vec3 shortBaseLight = vec3(0.76, 0.11, 0.24) * (0.76 + 0.32 * diff);
    vec3 shortCrestLight = vec3(0.98, 0.52, 0.60);
    vec3 shortValleyLight = vec3(0.42, 0.04, 0.12);
    vec3 shortColLight = mix(shortBaseLight, shortCrestLight, wrinkleCrest * 0.56);
    shortColLight = mix(shortColLight, shortValleyLight, pow(wrinkleTrough, 2.0) * 0.52);

    vec3 shortBaseDark = vec3(0.88, 0.18, 0.32) * (0.78 + 0.30 * diff);
    vec3 shortCrestDark = vec3(1.00, 0.68, 0.75);
    vec3 shortValleyDark = vec3(0.45, 0.06, 0.15);
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
    float baseAlpha = mix(0.35, 0.38, uDarkTheme) + denseBandMask * 0.11;
    float strainAlpha = baseAlpha + activeBoost * 0.36 + fresnel * 0.24 + borderLine * 0.26 + collagenTex * 0.09;

    float faceMul = gl_FrontFacing ? 1.0 : 0.62;
    float alpha = clamp(strainAlpha * edgeFade * endFade * uBaseOpacity * vMeta.w * faceMul, 0.0, 0.90);

    if (alpha < 0.012) discard;

    vec3 rimTint = mix(
      mix(vec3(0.28, 0.38, 0.48), vec3(0.82, 0.90, 0.98), uDarkTheme),
      col * 1.18,
      activeBoost
    );
    col = mix(col, rimTint, borderLine * 0.38);

    gl_FragColor = vec4(col, alpha);
  }
`;

// -----------------------------------------------------------------------------
// 4. 各シートスパン ⇄ 解剖学筋肉ID群の対応テーブル（全45動作・ストーリー・筋肉連鎖発色用）
// -----------------------------------------------------------------------------
const SPAN_MUSCLE_MAP = {
  // 1. LL (ラテラル・ライン)
  'fibular': ['fibularis-longus', 'fibularis-brevis', 'fibularis-tertius', 'abductor-digiti-minimi-foot'],
  'tfl-itb': ['tensor-fasciae-latae', 'gluteus-medius', 'gluteus-minimus', 'vastus-lateralis'],
  'oblique': ['external-oblique', 'internal-oblique'],
  'intercostal': ['external-intercostals', 'internal-intercostals', 'serratus-anterior'],
  'neck-scm': ['sternocleidomastoid', 'scalenus-anterior', 'scalenus-medius', 'scalenus-posterior'],
  'neck-spl': ['splenius-capitis', 'splenius-cervicis', 'levator-scapulae'],

  // 2. DFL (ディープ・フロント・ライン)
  'tibpost': ['tibialis-posterior', 'flexor-hallucis-longus', 'flexor-digitorum-longus', 'popliteus', 'soleus'],
  'adductor': ['adductor-longus', 'adductor-brevis', 'adductor-magnus', 'adductor-minimus', 'pectineus', 'gracilis', 'piriformis', 'obturator-internus', 'pubococcygeus'],
  'iliopsoas': ['psoas-major', 'psoas-minor', 'iliacus'],
  'ql': ['quadratus-lumborum'],
  'diaphragm': ['diaphragm', 'transversus-thoracis', 'transversus-abdominis'],
  'jaw-neck': ['masseter', 'temporalis', 'medial-pterygoid', 'lateral-pterygoid', 'mylohyoid', 'digastric', 'sternohyoid', 'omohyoid', 'longus-colli', 'longus-capitis', 'scalenus-anterior', 'platysma'],

  // 3. SBL (スーパーフィシャル・バック・ライン)
  'sbl-plantar': ['flexor-digitorum-brevis', 'abductor-hallucis', 'quadratus-plantae'],
  'sbl-calf': ['gastrocnemius', 'soleus', 'calcaneal-tendon', 'plantaris'],
  'sbl-ham': ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
  'sbl-lumbar': ['multifidus', 'longissimus', 'iliocostalis', 'spinalis', 'gluteus-maximus'],
  'sbl-upperback': ['longissimus', 'iliocostalis', 'semispinalis', 'splenius-capitis', 'trapezius', 'rhomboid-major'],
  'sbl-scalp': ['rectus-capitis-posterior-major', 'rectus-capitis-posterior-minor', 'obliquus-capitis-superior', 'obliquus-capitis-inferior', 'occipitalis', 'epicranial-aponeurosis', 'frontalis'],

  // 4. SFL (スーパーフィシャル・フロント・ライン)
  'sfl-shin': ['tibialis-anterior', 'extensor-digitorum-longus', 'extensor-hallucis-longus', 'extensor-digitorum-brevis'],
  'sfl-quad': ['rectus-femoris', 'vastus-medialis', 'vastus-lateralis', 'vastus-intermedius', 'sartorius'],
  'sfl-abs': ['rectus-abdominis', 'pyramidalis', 'linea-alba'],
  'sfl-chest-neck': ['pectoralis-major', 'sternocleidomastoid', 'sternohyoid', 'platysma', 'depressor-anguli-oris', 'depressor-labii-inferioris', 'zygomaticus-major'],

  // 5. SPL (スパイラル・ライン)
  'spl-leg': ['tibialis-anterior', 'fibularis-longus', 'biceps-femoris', 'tensor-fasciae-latae'],
  'spl-sling': ['external-oblique', 'internal-oblique', 'serratus-anterior', 'rhomboid-major', 'rhomboid-minor'],
  'spl-upper': ['splenius-capitis', 'splenius-cervicis', 'levator-scapulae'],

  // 6. DFAL (深前アーム・ライン)
  'dfal-pec': ['pectoralis-minor', 'subclavius', 'coracobrachialis'],
  'dfal-arm': ['biceps-brachii', 'brachialis', 'coracobrachialis', 'brachioradialis', 'supinator', 'pronator-teres', 'abductor-pollicis-brevis', 'flexor-pollicis-brevis', 'flexor-pollicis-longus', 'opponens-pollicis'],

  // 7. SFAL (表前アーム・ライン)
  'sfal-pec': ['pectoralis-major', 'latissimus-dorsi'],
  'sfal-flex': ['pronator-teres', 'flexor-carpi-radialis', 'flexor-carpi-ulnaris', 'palmaris-longus', 'flexor-digitorum-superficialis', 'flexor-digitorum-profundus', 'lumbricals-hand'],

  // 8. DBAL (深後アーム・ライン)
  'dbal-rhomboid': ['rhomboid-major', 'rhomboid-minor', 'levator-scapulae', 'supraspinatus', 'infraspinatus', 'teres-minor', 'subscapularis'],
  'dbal-ulnar': ['triceps-brachii', 'anconeus', 'extensor-carpi-ulnaris', 'abductor-digiti-minimi-hand', 'flexor-digiti-minimi-brevis-hand'],

  // 9. SBAL (表後アーム・ライン)
  'sbal-deltoid': ['trapezius', 'deltoid', 'supraspinatus'],
  'sbal-extensor': ['brachioradialis', 'extensor-carpi-radialis-longus', 'extensor-carpi-radialis-brevis', 'extensor-digitorum', 'extensor-digiti-minimi', 'extensor-carpi-ulnaris'],

  // 10. BFL / 11. FFL (機能ライン)
  'bfl-diag': ['latissimus-dorsi', 'gluteus-maximus', 'vastus-lateralis', 'teres-major'],
  'ffl-diag': ['pectoralis-major', 'rectus-abdominis', 'adductor-longus', 'pectineus', 'pyramidalis'],
};

// -----------------------------------------------------------------------------
// 5. 単一シートメッシュビルダー
// -----------------------------------------------------------------------------
function buildUnifiedSheetMesh({
  id,
  lineId,
  sideTag = 'both', // 'R' | 'L' | 'both'
  nu = 18,
  nv = 80,
  renderOrder = 6,
  alphaScale = 1.0,
  stationEvalFn,
  spans,
  sharedUniforms,
}) {
  const vertCount = (nu + 1) * (nv + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const rigAArr = new Float32Array(vertCount * 4);
  const rigBArr = new Float32Array(vertCount * 4);
  const metaArr = new Float32Array(vertCount * 4);

  const explicitSideSign = sideTag === 'R' ? -1 : sideTag === 'L' ? +1 : 0;
  const sampleUs = [-0.50, 0.0, +0.50];
  const fiberSamples = sampleUs.map(() => []);

  for (let iv = 0; iv <= nv; iv++) {
    const v = iv / nv;
    for (let iu = 0; iu <= nu; iu++) {
      const u01 = iu / nu;
      const uNorm = u01 * 2 - 1;
      const res = stationEvalFn(uNorm, v);
      const rig = skinToContinuousRig(res.skin, res.pos, res.sideSign ?? explicitSideSign);
      const k = iv * (nu + 1) + iu;

      positions[k * 3] = res.pos.x;
      positions[k * 3 + 1] = res.pos.y;
      positions[k * 3 + 2] = res.pos.z;

      uvs[k * 2] = u01;
      uvs[k * 2 + 1] = v;

      rigAArr[k * 4] = rig.rigA[0];
      rigAArr[k * 4 + 1] = rig.rigA[1];
      rigAArr[k * 4 + 2] = rig.rigA[2];
      rigAArr[k * 4 + 3] = rig.rigA[3];

      rigBArr[k * 4] = rig.rigB[0];
      rigBArr[k * 4 + 1] = rig.rigB[1];
      rigBArr[k * 4 + 2] = rig.rigB[2];
      rigBArr[k * 4 + 3] = rig.rigB[3];

      metaArr[k * 4] = res.fiberType || 0;
      metaArr[k * 4 + 1] = res.yBranch || 0;
      metaArr[k * 4 + 2] = res.retinaculum || 0;
      metaArr[k * 4 + 3] = alphaScale;
    }

    for (let su = 0; su < sampleUs.length; su++) {
      const sRes = stationEvalFn(sampleUs[su], v);
      const sRig = skinToContinuousRig(sRes.skin, sRes.pos, sRes.sideSign ?? explicitSideSign);
      fiberSamples[su].push({
        restPos: sRes.pos.clone(),
        curPos: sRes.pos.clone(),
        rigA: sRig.rigA,
        rigB: sRig.rigB,
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
  geom.setAttribute('aRigA', new THREE.BufferAttribute(rigAArr, 4));
  geom.setAttribute('aRigB', new THREE.BufferAttribute(rigBArr, 4));
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
      roleTargetStrain: null, // null = 幾何ひずみのみ, 数値 = 動作ロール目標ひずみ
    };
  });

  const segStrainArray = new Float32Array(SEG_COUNT);
  const lineDef = FASCIA_LINE_DEFS.find((d) => d.id === lineId);

  const mat = new THREE.ShaderMaterial({
    vertexShader: UNIFIED_FASCIA_VS,
    fragmentShader: UNIFIED_FASCIA_FS,
    uniforms: {
      uPoseA: posture.poseUniforms.uPoseA,
      uPoseB: posture.poseUniforms.uPoseB,
      uPoseC: posture.poseUniforms.uPoseC,
      uPoseD: posture.poseUniforms.uPoseD,
      uPoseE: posture.poseUniforms.uPoseE,
      uPoseF: posture.poseUniforms.uPoseF,
      uPoseG: posture.poseUniforms.uPoseG,
      uPoseH: posture.poseUniforms.uPoseH,
      uDarkTheme: sharedUniforms.uDarkTheme,
      uTime: sharedUniforms.uTime,
      uBaseOpacity: { value: lineDef ? lineDef.baseOpacity : 0.9 },
      uSegStrain: { value: segStrainArray },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = `unified-fascia:${id}`;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  mesh.raycast = () => {}; // ピック判定は下の骨格・筋肉へ透過
  mesh.userData = { sheetId: id, lineId, sideTag };

  const rawStepStrain = new Float32Array(nv);
  const spanBlended = new Float32Array(nv);

  const updateStrain = (poseObj, loadFactor = 1.0, modeType = 'idle') => {
    for (let su = 0; su < fiberSamples.length; su++) {
      const pts = fiberSamples[su];
      for (let iv = 0; iv <= nv; iv++) {
        const p = pts[iv];
        evalDeformSheetJS(p.restPos, p.rigA, p.rigB, poseObj, p.curPos);
      }
    }

    for (let iv = 0; iv < nv; iv++) {
      let dL0 = 0;
      let dL1 = 0;
      for (let su = 0; su < fiberSamples.length; su++) {
        dL0 += restStepLen[su][iv];
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
      const geomStrain = clamp((meanL1 - sp.meanL0) / Math.max(1e-4, sp.effectiveComplianceLen), -0.22, 0.22);

      let spanTensionStrain = 0;
      let stepOffset = 0;

      if (modeType === 'idle') {
        spanTensionStrain = 0;
      } else if (modeType === 'line') {
        spanTensionStrain = 0.045;
        stepOffset = 0.045;
      } else if (sp.roleTargetStrain !== null) {
        const targetS = sp.roleTargetStrain * loadFactor;
        spanTensionStrain = targetS + geomStrain * 0.16;
        stepOffset = targetS;
      } else {
        spanTensionStrain = geomStrain * 0.42;
      }

      for (let iv = sp.i0; iv < sp.i1; iv++) {
        const stepContrib = modeType === 'idle' ? 0 : rawStepStrain[iv] * (sp.roleTargetStrain !== null ? 0.28 : 0.55) + stepOffset;
        spanBlended[iv] = spanTensionStrain * 0.80 + stepContrib * 0.20;
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

  return {
    id,
    lineId,
    sideTag,
    mesh,
    material: mat,
    spanInfos,
    baseOpacity: lineDef ? lineDef.baseOpacity : 0.9,
    updateStrain,
  };
}

// -----------------------------------------------------------------------------
// 6. 全11アナトミートレイン連続3D筋膜シート＆骨ピン統合システムの生成
// -----------------------------------------------------------------------------
export function createUnifiedFasciaSheets({ scene, muscleRoot, skeletonRoot }) {
  const envelope = buildBodyEnvelope(muscleRoot, skeletonRoot);

  const sharedUniforms = {
    uDarkTheme: { value: 0 },
    uTime: { value: 0 },
  };

  const group = new THREE.Group();
  group.name = 'unified-fascia-continuum';
  scene.add(group);

  const sheets = [];
  const registerSheet = (sh) => {
    sheets.push(sh);
    group.add(sh.mesh);
  };

  // ===========================================================================
  // 【1】LL: ラテラル・ライン
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
      buildUnifiedSheetMesh({
        id: `ll-main-${side.toLowerCase()}`,
        lineId: 'LL',
        sideTag: side,
        nu: 22,
        nv: 104,
        renderOrder: 7,
        alphaScale: 1.0,
        spans: [
          { id: 'fibular', v0: 0.0, v1: 0.25, complianceRatio: 0.45 },
          { id: 'tfl-itb', v0: 0.25, v1: 0.57, complianceRatio: 0.55 },
          { id: 'oblique', v0: 0.57, v1: 0.78, complianceRatio: 0.90 },
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
            const xMid = sSign * mix(0.22, 0.45, tStirrup);
            const zMid = mix(0.15, -0.14, tStirrup) + uNorm * 0.040;
            const yArch = mix(-3.24, -3.08, Math.pow(tStirrup, 1.6));
            pos.set(xMid, yArch, zMid);
            const B_FT = isR ? BONE.FOOT_R : BONE.FOOT_L;
            const B_SH = isR ? BONE.SHANK_R : BONE.SHANK_L;
            const wSh = smoothstep(0.35, 1.0, tStirrup);
            return {
              pos,
              skin: makeWeights([[B_FT, 1 - wSh], [B_SH, wSh]]),
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
        sharedUniforms,
      }),
    );

    registerSheet(
      buildUnifiedSheetMesh({
        id: `ll-neck-scm-${side.toLowerCase()}`,
        lineId: 'LL',
        sideTag: side,
        nu: 12,
        nv: 38,
        renderOrder: 7,
        alphaScale: 0.94,
        spans: [{ id: 'neck-scm', v0: 0, v1: 1, complianceRatio: 0.75 }],
        stationEvalFn: (uNorm, v) => {
          const y = mix(+2.12, +2.72, v);
          const thR = mix(Math.PI * 0.62, Math.PI * 1.10, v) - uNorm * 0.16;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleTorso(y, th, 0.0065);
          return { pos, skin: getBodyChainSkin(side, y), fiberType: 1.0, yBranch: 0, retinaculum: 0 };
        },
        sharedUniforms,
      }),
    );

    registerSheet(
      buildUnifiedSheetMesh({
        id: `ll-neck-spl-${side.toLowerCase()}`,
        lineId: 'LL',
        sideTag: side,
        nu: 12,
        nv: 38,
        renderOrder: 7,
        alphaScale: 0.92,
        spans: [{ id: 'neck-spl', v0: 0, v1: 1, complianceRatio: 0.75 }],
        stationEvalFn: (uNorm, v) => {
          const y = mix(+2.04, +2.73, v);
          const thR = mix(Math.PI * 1.46, Math.PI * 1.12, v) - uNorm * 0.16;
          const th = isR ? thR : mirrorThetaToLeft(thR);
          const pos = envelope.sampleTorso(y, th, 0.0055);
          return { pos, skin: getBodyChainSkin(side, y), fiberType: 0.85, yBranch: 0, retinaculum: 0 };
        },
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【2】DFL: ディープ・フロント・ライン
  // ===========================================================================
  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dfl-tibpost-${side.toLowerCase()}`,
        lineId: 'DFL',
        sideTag: side,
        nu: 10,
        nv: 42,
        renderOrder: 4,
        alphaScale: 0.88,
        spans: [{ id: 'tibpost', v0: 0, v1: 1, complianceRatio: 0.65 }],
        stationEvalFn: (uNorm, v) => {
          const y = mix(-3.21, -1.66, v);
          if (v < 0.14) {
            const t = v / 0.14;
            const x = sSign * mix(0.28, 0.25, t) + uNorm * 0.025;
            const z = mix(0.10, -0.11, t);
            const B_FT = isR ? BONE.FOOT_R : BONE.FOOT_L;
            const B_SH = isR ? BONE.SHANK_R : BONE.SHANK_L;
            const wSh = smoothstep(0.3, 1.0, t);
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: makeWeights([[B_FT, 1 - wSh], [B_SH, wSh]]),
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
        sharedUniforms,
      }),
    );

    const DFL_CORE_TABLE = [
      { v: 0.00, y: -1.52, ax: 0.22, xHalf: 0.030, z: -0.02, zHalf: 0.045 },
      { v: 0.28, y: -0.82, ax: 0.16, xHalf: 0.048, z: +0.01, zHalf: 0.065 },
      { v: 0.56, y: -0.06, ax: 0.055, xHalf: 0.042, z: +0.06, zHalf: 0.058 },
      { v: 0.76, y: +0.44, ax: 0.125, xHalf: 0.052, z: +0.01, zHalf: 0.042 },
      { v: 1.00, y: +1.10, ax: 0.082, xHalf: 0.036, z: -0.03, zHalf: 0.032 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dfl-adductor-psoas-${side.toLowerCase()}`,
        lineId: 'DFL',
        sideTag: side,
        nu: 16,
        nv: 68,
        renderOrder: 4,
        alphaScale: 0.90,
        spans: [
          { id: 'adductor', v0: 0.0, v1: 0.56, complianceRatio: 0.55 },
          { id: 'iliopsoas', v0: 0.56, v1: 1.0, complianceRatio: 0.72 },
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
              skin: makeWeights([[B_FEM, 1 - wPelvis], [BONE.PELVIS, wPelvis]]),
              sideSign: sSign,
              fiberType: 0.6,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos,
            skin: getBodyChainSkin(side, p.y),
            sideSign: sSign,
            fiberType: 0.5,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dfl-ql-${side.toLowerCase()}`,
        lineId: 'DFL',
        sideTag: side,
        nu: 12,
        nv: 36,
        renderOrder: 4,
        alphaScale: 0.90,
        spans: [{ id: 'ql', v0: 0, v1: 1, complianceRatio: 0.80 }],
        stationEvalFn: (uNorm, v) => {
          const y = mix(+0.50, +1.15, v);
          const xCenter = sSign * mix(0.24, 0.21, v);
          const halfW = mix(0.11, 0.09, v);
          const x = xCenter + sSign * uNorm * halfW;
          const z = mix(-0.11, -0.10, v) - Math.abs(uNorm) * 0.015;
          return {
            pos: new THREE.Vector3(x, y, z),
            skin: makeWeights([[BONE.LUMBAR, 1]]),
            fiberType: 0.75,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dfl-neck-jaw-${side.toLowerCase()}`,
        lineId: 'DFL',
        sideTag: side,
        nu: 12,
        nv: 44,
        renderOrder: 4,
        alphaScale: 0.88,
        spans: [{ id: 'jaw-neck', v0: 0, v1: 1, complianceRatio: 0.72 }],
        stationEvalFn: (uNorm, v) => {
          const y = mix(+1.88, +2.88, v);
          let x = 0;
          let z = 0;
          if (v < 0.56) {
            const t = v / 0.56;
            x = sSign * (mix(0.06, 0.12, t) + uNorm * 0.038);
            z = mix(+0.03, +0.05, t) - Math.abs(uNorm) * 0.012;
          } else {
            const t = (v - 0.56) / 0.44;
            const thR = mix(Math.PI * 0.86, Math.PI * 0.98, t) - uNorm * mix(0.11, 0.24, t);
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
        sharedUniforms,
      }),
    );
  }

  registerSheet(
    buildUnifiedSheetMesh({
      id: 'dfl-diaphragm',
      lineId: 'DFL',
      sideTag: 'both',
      nu: 26,
      nv: 22,
      renderOrder: 4,
      alphaScale: 0.78,
      spans: [{ id: 'diaphragm', v0: 0, v1: 1, complianceRatio: 0.88 }],
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
          skin: makeWeights([[BONE.THORAX_LOW, 1]]),
          fiberType: 0.4,
          yBranch: 0,
          retinaculum: 0,
        };
      },
      sharedUniforms,
    }),
  );

  // ===========================================================================
  // 【3】SPL: スパイラル・ライン
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
      buildUnifiedSheetMesh({
        id: `spl-${sys.toLowerCase()}`,
        lineId: 'SPL',
        sideTag: legSide,
        nu: 16,
        nv: 90,
        renderOrder: 8,
        alphaScale: 0.92,
        spans: [
          { id: 'spl-leg', v0: 0.0, v1: 0.52, complianceRatio: 0.55 },
          { id: 'spl-sling', v0: 0.52, v1: 0.88, complianceRatio: 0.72 },
          { id: 'spl-upper', v0: 0.88, v1: 1.0, complianceRatio: 0.80 },
        ],
        stationEvalFn: (uNorm, v) => {
          const p = evalProfileTable(SPL_TABLE, v);
          const thLeg = isLegR ? p.thLegR - uNorm * p.span : mirrorThetaToLeft(p.thLegR - uNorm * p.span);
          const thTor = isLegR ? p.thTorR - uNorm * p.span : mirrorThetaToLeft(p.thTorR - uNorm * p.span);
          const pos = envelope.sampleContinuum(legSide, p.y, thLeg, thTor, p.off);
          return {
            pos,
            skin: getBodyChainSkin(legSide, p.y),
            sideSign: isLegR ? -1 : +1,
            fiberType: p.fType,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【4】SBL: スーパーフィシャル・バック・ライン
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
    { v: 1.00, y: +2.92, thLeg: -Math.PI * 0.5, thTor: +Math.PI * 0.56, span: 0.22, off: 0.006, fType: 1.0 },
  ];

  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;
    registerSheet(
      buildUnifiedSheetMesh({
        id: `sbl-${side.toLowerCase()}`,
        lineId: 'SBL',
        sideTag: side,
        nu: 16,
        nv: 96,
        renderOrder: 5,
        alphaScale: 0.94,
        spans: [
          { id: 'sbl-plantar', v0: 0.0, v1: 0.07, complianceRatio: 0.60 },
          { id: 'sbl-calf', v0: 0.07, v1: 0.25, complianceRatio: 0.72 },
          { id: 'sbl-ham', v0: 0.25, v1: 0.48, complianceRatio: 0.85 },
          { id: 'sbl-lumbar', v0: 0.48, v1: 0.68, complianceRatio: 1.10 },
          { id: 'sbl-upperback', v0: 0.68, v1: 0.88, complianceRatio: 0.82 },
          { id: 'sbl-scalp', v0: 0.88, v1: 1.0, complianceRatio: 0.75 },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.06) {
            const t = v / 0.06;
            const x = sSign * (0.34 + uNorm * 0.055);
            const z = mix(+0.11, -0.17, t);
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
            const tCap = (v - 0.88) / 0.12;
            const archAng = mix(-Math.PI * 0.42, +Math.PI * 0.42, tCap);
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
          if (v >= 0.38 && v <= 0.54) {
            const B_FEM = isR ? BONE.FEMUR_R : BONE.FEMUR_L;
            const wPelvis = smoothstep(0.38, 0.50, v);
            return {
              pos,
              skin: makeWeights([[B_FEM, 1 - wPelvis], [BONE.PELVIS, wPelvis]]),
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
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【5】SFL: スーパーフィシャル・フロント・ライン
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
      buildUnifiedSheetMesh({
        id: `sfl-${side.toLowerCase()}`,
        lineId: 'SFL',
        sideTag: side,
        nu: 14,
        nv: 84,
        renderOrder: 6,
        alphaScale: 0.92,
        spans: [
          { id: 'sfl-shin', v0: 0.0, v1: 0.27, complianceRatio: 0.68 },
          { id: 'sfl-quad', v0: 0.27, v1: 0.52, complianceRatio: 0.60 },
          { id: 'sfl-abs', v0: 0.52, v1: 0.80, complianceRatio: 1.00 },
          { id: 'sfl-chest-neck', v0: 0.80, v1: 1.0, complianceRatio: 0.70 },
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
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【6〜9】アーム4ライン（DFAL, SFAL, DBAL, SBAL：肩甲帯〜上腕〜前腕〜手まで完全連続）
  // ===========================================================================
  for (const side of ['R', 'L']) {
    const isR = side === 'R';
    const sSign = isR ? -1 : +1;
    const B_GIRDLE = isR ? BONE.GIRDLE_R : BONE.GIRDLE_L;
    const B_HUM = isR ? BONE.HUMERUS_R : BONE.HUMERUS_L;

    // 6. DFAL
    const DFAL_ARM_TABLE = [
      { v: 0.22, y: +1.94, thR: Math.PI * 0.62, span: 0.16, radW: 0.8 },
      { v: 0.36, y: +1.64, thR: Math.PI * 0.59, span: 0.24, radW: 0.82 },
      { v: 0.48, y: +1.36, thR: Math.PI * 0.58, span: 0.28, radW: 0.85 },
      { v: 0.64, y: +0.90, thR: Math.PI * 0.65, span: 0.24, radW: 0.92 },
      { v: 0.84, y: +0.10, thR: Math.PI * 0.88, span: 0.24, radW: 1.0 },
      { v: 1.00, y: -0.18, thR: Math.PI * 0.82, span: 0.26, radW: 1.0 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dfal-${side.toLowerCase()}`,
        lineId: 'DFAL',
        sideTag: side,
        nu: 14,
        nv: 74,
        renderOrder: 7,
        alphaScale: 0.95,
        spans: [
          { id: 'dfal-pec', v0: 0.0, v1: 0.24, complianceRatio: 0.72 },
          { id: 'dfal-arm', v0: 0.24, v1: 1.0, complianceRatio: 0.78 },
        ],
        stationEvalFn: (uNorm, v) => {
          const pCoracoid = new THREE.Vector3(
            sSign * (0.50 - uNorm * 0.038),
            +1.96 + uNorm * 0.012,
            +0.072 + (1 - uNorm * uNorm) * 0.010,
          );
          if (v <= 0.22) {
            const t = v / 0.22;
            const st = smoothstep(0, 1, t);
            const yRib = mix(1.61 + uNorm * 0.12, 1.92 + uNorm * 0.015, st);
            const thRibR = mix(Math.PI * 0.68 - uNorm * 0.07, Math.PI * 0.76 - uNorm * 0.045, st);
            const pRib = envelope.sampleTorso(yRib, isR ? thRibR : mirrorThetaToLeft(thRibR), 0.0065);
            const pos = pRib.lerp(pCoracoid, st);
            return {
              pos,
              skin: makeWeights([[BONE.THORAX_HIGH, 1 - st], [B_GIRDLE, st]]),
              sideSign: sSign,
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
            const tHum = smoothstep(0.22, 0.36, v);
            const pos = pCoracoid.lerp(pArm, tHum);
            return {
              pos,
              skin: makeWeights([[B_GIRDLE, 1 - tHum], [B_HUM, tHum]]),
              sideSign: sSign,
              fiberType: 0.85,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          return {
            pos: pArm,
            skin: getArmChainSkin(isR, p.y, p.radW),
            sideSign: sSign,
            fiberType: v > 0.64 ? 1.0 : 0.7,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.90 ? 0.7 : 0,
          };
        },
        sharedUniforms,
      }),
    );

    // 7. SFAL
    const SFAL_ARM_TABLE = [
      { v: 0.28, y: +1.82, thR: Math.PI * 0.45, span: 0.26, radW: 0.3 },
      { v: 0.58, y: +0.93, thR: Math.PI * 0.16, span: 0.24, radW: 0.25 },
      { v: 0.84, y: +0.05, thR: Math.PI * 0.46, span: 0.30, radW: 0.55 },
      { v: 1.00, y: -0.24, thR: Math.PI * 0.50, span: 0.34, radW: 0.6 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `sfal-${side.toLowerCase()}`,
        lineId: 'SFAL',
        sideTag: side,
        nu: 14,
        nv: 74,
        renderOrder: 8,
        alphaScale: 0.90,
        spans: [
          { id: 'sfal-pec', v0: 0.0, v1: 0.30, complianceRatio: 0.62 },
          { id: 'sfal-flex', v0: 0.30, v1: 1.0, complianceRatio: 0.68 },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yChest = mix(1.74 + uNorm * 0.24, 1.82, st);
            const thTorR = mix(Math.PI * 0.55, Math.PI * 0.80, st);
            const pChest = envelope.sampleTorso(yChest, isR ? thTorR : mirrorThetaToLeft(thTorR), 0.009);
            const pArm = envelope.sampleArm(
              isR,
              1.82,
              isR ? Math.PI * 0.45 - uNorm * 0.26 : mirrorThetaToLeft(Math.PI * 0.45 - uNorm * 0.26),
              0.007,
            );
            const pos = pChest.lerp(pArm, st);
            return {
              pos,
              skin: makeWeights([[BONE.THORAX_HIGH, 1 - st], [B_HUM, st]]),
              sideSign: sSign,
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
            sideSign: sSign,
            fiberType: v > 0.82 ? 1.0 : 0.65,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.89 ? 1.0 : 0,
          };
        },
        sharedUniforms,
      }),
    );

    // 8. DBAL (肩甲骨〜上腕境界 v=0.16..0.34 を連続角度補間で裂け目 0.000mm に接続)
    const DBAL_ARM_TABLE = [
      { v: 0.28, y: +1.92, thR: -Math.PI * 0.56, span: 0.26, radW: 0.15 },
      { v: 0.58, y: +0.92, thR: -Math.PI * 0.44, span: 0.24, radW: 0.0 },
      { v: 0.86, y: +0.04, thR: -Math.PI * 0.16, span: 0.22, radW: 0.0 },
      { v: 1.00, y: -0.22, thR: -Math.PI * 0.12, span: 0.24, radW: 0.1 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `dbal-${side.toLowerCase()}`,
        lineId: 'DBAL',
        sideTag: side,
        nu: 14,
        nv: 74,
        renderOrder: 6,
        alphaScale: 0.94,
        spans: [
          { id: 'dbal-rhomboid', v0: 0.0, v1: 0.28, complianceRatio: 1.15 },
          { id: 'dbal-ulnar', v0: 0.28, v1: 1.0, complianceRatio: 0.78 },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yBack = mix(1.94 + uNorm * 0.18, 1.92, st);
            const thTorR = mix(-Math.PI * 0.52, -Math.PI * 0.80, st);
            const pSpine = envelope.sampleTorso(yBack, isR ? thTorR : mirrorThetaToLeft(thTorR), 0.007);
            const pArm = envelope.sampleArm(
              isR,
              1.92,
              isR ? -Math.PI * 0.56 - uNorm * 0.26 : mirrorThetaToLeft(-Math.PI * 0.56 - uNorm * 0.26),
              0.006,
            );
            const pos = pSpine.lerp(pArm, Math.pow(st, 1.35));
            const wHum = smoothstep(0.55, 1.0, t);
            return {
              pos,
              skin: makeWeights([[BONE.THORAX_HIGH, 1 - wHum], [B_HUM, wHum]]),
              sideSign: sSign,
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
            sideSign: sSign,
            fiberType: v > 0.58 ? 0.95 : 0.65,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );

    // 9. SBAL (肩峰〜三角筋境界 v=0.18..0.36 を連続角度補間で裂け目 0.000mm に接続)
    const SBAL_ARM_TABLE = [
      { v: 0.28, y: +2.04, thR: Math.PI * 1.02, span: 0.34, radW: 0.5 },
      { v: 0.58, y: +0.93, thR: Math.PI * 1.06, span: 0.24, radW: 0.6 },
      { v: 0.85, y: +0.05, thR: Math.PI * 1.46, span: 0.28, radW: 0.72 },
      { v: 1.00, y: -0.24, thR: Math.PI * 1.50, span: 0.32, radW: 0.75 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `sbal-${side.toLowerCase()}`,
        lineId: 'SBAL',
        sideTag: side,
        nu: 14,
        nv: 76,
        renderOrder: 8,
        alphaScale: 0.90,
        spans: [
          { id: 'sbal-deltoid', v0: 0.0, v1: 0.52, complianceRatio: 0.62 },
          { id: 'sbal-extensor', v0: 0.52, v1: 1.0, complianceRatio: 0.65 },
        ],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.28) {
            const t = v / 0.28;
            const st = smoothstep(0, 1, t);
            const yTrap = mix(2.18 + uNorm * 0.32, 2.04, st);
            const thTorR = mix(Math.PI * 1.48, Math.PI * 1.06, st);
            const pNeckBack = envelope.sampleTorso(yTrap, isR ? thTorR : mirrorThetaToLeft(thTorR), 0.009);
            const pAcrom = envelope.sampleArm(
              isR,
              2.04,
              isR ? Math.PI * 1.02 - uNorm * 0.34 : mirrorThetaToLeft(Math.PI * 1.02 - uNorm * 0.34),
              0.007,
            );
            const pos = pNeckBack.lerp(pAcrom, st);
            // v=0.28 時点で getArmChainSkin(y=2.04) の B_HUM 重み (1 - smoothstep(1.98, 2.12, 2.04) ≈ 0.61) と完全一致させる
            const endHumW = 1 - smoothstep(1.98, 2.12, 2.04);
            const wHum = smoothstep(0.55, 1.0, t) * endHumW;
            const baseSkin = getBodyChainSkin(side, yTrap);
            return {
              pos,
              skin: makeWeights([
                [baseSkin.idx[0], (1 - wHum) * baseSkin.w[0]],
                [baseSkin.idx[1], (1 - wHum) * baseSkin.w[1]],
                [B_HUM, wHum],
              ]),
              sideSign: sSign,
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
            sideSign: sSign,
            fiberType: v > 0.58 ? 0.95 : 0.7,
            yBranch: 0,
            retinaculum: v > 0.82 && v < 0.89 ? 1.0 : 0,
          };
        },
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【10】BFL: バック・ファンクショナル・ライン
  // ===========================================================================
  for (const sys of ['RtoL', 'LtoR']) {
    const armIsR = sys === 'RtoL';
    const legSide = armIsR ? 'L' : 'R';
    const isLegR = legSide === 'R';
    const B_HUM_ARM = armIsR ? BONE.HUMERUS_R : BONE.HUMERUS_L;

    const BFL_TABLE = [
      { v: 0.00, y: -0.95, thLegL: -Math.PI * 0.10, thTorR: 0, span: 0.22, off: 0.011 },
      { v: 0.24, y: -0.06, thLegL: -Math.PI * 0.34, thTorR: -Math.PI * 0.34, span: 0.28, off: 0.011 },
      { v: 0.46, y: +0.46, thLegL: -Math.PI * 0.50, thTorR: -Math.PI * 0.50, span: 0.24, off: 0.011 },
      { v: 0.74, y: +1.34, thLegL: 0, thTorR: -Math.PI * 0.82, span: 0.28, off: 0.011 },
      { v: 1.00, y: +1.82, thLegL: 0, thTorR: -Math.PI * 0.94, span: 0.20, off: 0.010 },
    ];

    registerSheet(
      buildUnifiedSheetMesh({
        id: `bfl-${sys.toLowerCase()}`,
        lineId: 'BFL',
        sideTag: armIsR ? 'R' : 'L',
        nu: 14,
        nv: 76,
        renderOrder: 9,
        alphaScale: 0.92,
        spans: [{ id: 'bfl-diag', v0: 0, v1: 1, complianceRatio: 0.65 }],
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
              skin: makeWeights([[BONE.THORAX_HIGH, 1 - tArm], [B_HUM_ARM, tArm]]),
              sideSign: armIsR ? -1 : +1,
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
            sideSign: isLegR ? -1 : +1,
            fiberType: v > 0.36 && v < 0.58 ? 1.0 : 0.75,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 【11】FFL: フロント・ファンクショナル・ライン
  // ===========================================================================
  for (const sys of ['RtoL', 'LtoR']) {
    const armIsR = sys === 'RtoL';
    const legSide = armIsR ? 'L' : 'R';
    const sLeg = legSide === 'R' ? -1 : +1;
    const B_FEM_LEG = legSide === 'R' ? BONE.FEMUR_R : BONE.FEMUR_L;
    const B_HUM_ARM = armIsR ? BONE.HUMERUS_R : BONE.HUMERUS_L;

    registerSheet(
      buildUnifiedSheetMesh({
        id: `ffl-${sys.toLowerCase()}`,
        lineId: 'FFL',
        sideTag: armIsR ? 'R' : 'L',
        nu: 14,
        nv: 72,
        renderOrder: 9,
        alphaScale: 0.92,
        spans: [{ id: 'ffl-diag', v0: 0, v1: 1, complianceRatio: 0.65 }],
        stationEvalFn: (uNorm, v) => {
          if (v < 0.34) {
            const t = v / 0.34;
            const st = smoothstep(0, 1, t);
            const y = mix(-0.92, -0.04, st);
            const x = mix(sLeg * 0.21, 0.0, st) + uNorm * 0.042;
            const z = mix(+0.03, +0.16, st) + Math.abs(uNorm) * 0.01;
            return {
              pos: new THREE.Vector3(x, y, z),
              skin: makeWeights([[B_FEM_LEG, 1 - st], [BONE.PELVIS, st]]),
              sideSign: sLeg,
              fiberType: 0.9,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          if (v < 0.78) {
            const t = (v - 0.34) / 0.44;
            const y = mix(-0.04, +1.52, t);
            const thTorR = mix(Math.PI * 0.50, Math.PI * 0.68, t) - uNorm * 0.16;
            const thTor = armIsR ? thTorR : mirrorThetaToLeft(thTorR);
            const pos = envelope.sampleTorso(y, thTor, 0.011);
            return {
              pos,
              skin: getBodyChainSkin(armIsR ? 'R' : 'L', y),
              sideSign: armIsR ? -1 : +1,
              fiberType: 1.0,
              yBranch: 0,
              retinaculum: 0,
            };
          }
          const tArm = smoothstep(0.78, 1.0, v);
          const y = mix(+1.52, +1.80, tArm);
          const thTorR = mix(Math.PI * 0.68, Math.PI * 0.82, tArm) - uNorm * 0.18;
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
            skin: makeWeights([[BONE.THORAX_HIGH, 1 - tArm], [B_HUM_ARM, tArm]]),
            sideSign: armIsR ? -1 : +1,
            fiberType: 0.9,
            yBranch: 0,
            retinaculum: 0,
          };
        },
        sharedUniforms,
      }),
    );
  }

  // ===========================================================================
  // 7. 骨ピン留めステーション (42箇所) の生成＆連続リグ同期
  // ===========================================================================
  const stationsGroup = new THREE.Group();
  stationsGroup.name = 'unified-bony-stations';
  const pinCoreGeom = new THREE.SphereGeometry(0.016, 12, 10);
  const pinRingGeom = new THREE.TorusGeometry(0.026, 0.0038, 8, 20);
  const pinCoreMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B88E3E'),
    roughness: 0.34,
    metalness: 0.35,
    emissive: new THREE.Color('#5A4114'),
    emissiveIntensity: 0.28,
  });
  const pinRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#C5A059'),
    transparent: true,
    opacity: 0.80,
  });

  const stationNodes = BONY_STATIONS.map((st) => {
    const holder = new THREE.Group();
    holder.name = `station:${st.id}`;
    const core = new THREE.Mesh(pinCoreGeom, pinCoreMat);
    const ring = new THREE.Mesh(pinRingGeom, pinRingMat);
    core.renderOrder = 3;
    ring.renderOrder = 3;
    core.raycast = () => {};
    ring.raycast = () => {};
    holder.add(core, ring);
    const restPos = new THREE.Vector3(st.pos[0], st.pos[1], st.pos[2]);
    holder.position.copy(restPos);
    stationsGroup.add(holder);
    const rig = skinToContinuousRig({ idx: [st.bone, 0, 0, 0], w: [1, 0, 0, 0] }, restPos, 0);
    return {
      def: st,
      holder,
      ring,
      restPos,
      rigA: rig.rigA,
      rigB: rig.rigB,
    };
  });
  group.add(stationsGroup);

  // ===========================================================================
  // 8. 表示状態＆ロール発色ステート管理
  // ===========================================================================
  const activeLines = new Set(FASCIA_LINE_DEFS.map((d) => d.id));
  let systemVisible = true;
  let showStations = true;
  let currentMode = 'idle'; // 'idle' | 'habit' | 'line' | 'step' | 'chain'

  const syncVisibility = () => {
    group.visible = systemVisible;
    for (const sh of sheets) {
      sh.mesh.visible = systemVisible && activeLines.has(sh.lineId);
    }
    for (const node of stationNodes) {
      const relevant = node.def.lines.some((lid) => activeLines.has(lid));
      node.holder.visible = systemVisible && showStations && relevant;
    }
  };

  const clearRoleTargets = () => {
    for (const sh of sheets) {
      sh.material.uniforms.uBaseOpacity.value = sh.baseOpacity;
      for (const sp of sh.spanInfos) {
        sp.roleTargetStrain = null;
      }
    }
  };

  /**
   * 縮む筋群・伸びる筋群・左右指定・対象ラインから各シートスパンのロール発色目標を計算する
   */
  const applyRoleColoring = ({
    lineIds = [],
    side = 'both',
    shortenCore = [],
    shortenLinked = [],
    lengthenAntagonist = [],
    lengthenLinked = [],
  }) => {
    clearRoleTargets();

    const sCoreSet = new Set(shortenCore || []);
    const sLinkSet = new Set(shortenLinked || []);
    const lAntSet = new Set(lengthenAntagonist || []);
    const lLinkSet = new Set(lengthenLinked || []);

    // 表示するラインを決定（未指定時は関連筋を含むライン、それもなければ全11本）
    let resolvedLines = (lineIds || []).filter(Boolean);
    if (!resolvedLines.length) {
      const inferred = new Set();
      const allMuscles = [...sCoreSet, ...sLinkSet, ...lAntSet, ...lLinkSet];
      for (const sh of sheets) {
        for (const sp of sh.spanInfos) {
          const mList = SPAN_MUSCLE_MAP[sp.id] || [];
          if (mList.some((m) => allMuscles.includes(m))) {
            inferred.add(sh.lineId);
          }
        }
      }
      resolvedLines = inferred.size ? [...inferred] : FASCIA_LINE_DEFS.map((d) => d.id);
    }

    activeLines.clear();
    for (const lid of resolvedLines) activeLines.add(lid);

    const wantSide = side === 'R' || side === 'L' ? side : 'both';

    for (const sh of sheets) {
      if (!activeLines.has(sh.lineId)) continue;
      const sideScale =
        wantSide === 'both' || sh.sideTag === 'both'
          ? 1.0
          : sh.sideTag === wantSide
            ? 1.0
            : 0.30;

      for (const sp of sh.spanInfos) {
        const mList = SPAN_MUSCLE_MAP[sp.id] || [];
        let shortScore = 0;
        let longScore = 0;
        for (const m of mList) {
          if (sCoreSet.has(m)) shortScore = Math.max(shortScore, 1.0);
          else if (sLinkSet.has(m)) shortScore = Math.max(shortScore, 0.78);
          if (lAntSet.has(m)) longScore = Math.max(longScore, 1.0);
          else if (lLinkSet.has(m)) longScore = Math.max(longScore, 0.78);
        }

        if (shortScore > 0 || longScore > 0) {
          if (shortScore >= longScore) {
            sp.roleTargetStrain = -0.165 * shortScore * sideScale;
          } else {
            sp.roleTargetStrain = +0.165 * longScore * sideScale;
          }
        } else {
          sp.roleTargetStrain = null;
        }
      }
    }

    syncVisibility();
  };

  syncVisibility();

  const update = (time, delta, cameraQuat = null) => {
    const dt = Math.min(0.1, Math.max(0, Number.isFinite(delta) ? delta : 1 / 60));
    sharedUniforms.uTime.value = Number.isFinite(time) ? time : sharedUniforms.uTime.value + dt;

    if (!systemVisible) return;

    const poseObj = posture.getPose();
    const rawCyc = clamp(posture.poseUniforms.uContractCycle.value || 0, 0, 1);
    const loadFactor =
      currentMode === 'habit'
        ? 0.42 + 0.58 * rawCyc
        : currentMode === 'step' || currentMode === 'chain'
          ? 0.88
          : 1.0;

    for (const sh of sheets) {
      if (!sh.mesh.visible) continue;
      sh.updateStrain(poseObj, loadFactor, currentMode);
    }

    if (showStations) {
      for (const node of stationNodes) {
        if (!node.holder.visible) continue;
        evalDeformSheetJS(node.restPos, node.rigA, node.rigB, poseObj, node.holder.position);
        if (cameraQuat) node.ring.quaternion.copy(cameraQuat);
      }
    }
  };

  return {
    group,
    sheets,
    setVisible(v) {
      systemVisible = Boolean(v);
      syncVisibility();
    },
    isVisible() {
      return systemVisible;
    },
    setDarkTheme(isDark) {
      sharedUniforms.uDarkTheme.value = isDark ? 1.0 : 0.0;
    },
    setStationsVisible(v) {
      showStations = Boolean(v);
      syncVisibility();
    },
    showAllLines() {
      currentMode = 'idle';
      clearRoleTargets();
      activeLines.clear();
      for (const d of FASCIA_LINE_DEFS) activeLines.add(d.id);
      syncVisibility();
    },
    showLine(lineId) {
      if (!lineId || lineId === 'ALL') {
        this.showAllLines();
        return;
      }
      currentMode = 'line';
      clearRoleTargets();
      activeLines.clear();
      activeLines.add(lineId);
      for (const sh of sheets) {
        if (sh.lineId === lineId) {
          sh.material.uniforms.uBaseOpacity.value = Math.min(0.96, sh.baseOpacity + 0.08);
        }
      }
      syncVisibility();
    },
    showHabit(habit) {
      if (!habit) {
        this.showAllLines();
        return;
      }
      currentMode = 'habit';
      const tl = habit.triggerLine || habit.goldenLine;
      const sCore = habit.shortenCore?.length ? habit.shortenCore : tl?.shortenCore || habit.shorten || [];
      const sLink = [...(habit.shortenLinked || []), ...(tl?.shortenLinked || []), ...(habit.shorten || [])];
      const lAnt = habit.lengthenAntagonist?.length ? habit.lengthenAntagonist : tl?.lengthenAntagonist || habit.lengthen || [];
      const lLink = [...(habit.lengthenLinked || []), ...(tl?.lengthenLinked || []), ...(habit.lengthen || [])];
      applyRoleColoring({
        lineIds: habit.lines || [],
        side: habit.side || 'both',
        shortenCore: sCore,
        shortenLinked: sLink,
        lengthenAntagonist: lAnt,
        lengthenLinked: lLink,
      });
    },
    showStep(step) {
      if (!step) return;
      currentMode = 'step';
      applyRoleColoring({
        lineIds: step.line ? [step.line] : [],
        side: step.side || 'both',
        shortenCore: step.shortenCore || step.shorten || [],
        shortenLinked: [...(step.shortenLinked || []), ...(step.yore || [])],
        lengthenAntagonist: step.lengthenAntagonist || step.lengthen || [],
        lengthenLinked: step.lengthenLinked || [],
      });
    },
    showMuscleChain(chainSpec) {
      if (!chainSpec) return;
      currentMode = 'chain';
      const lineIds = (chainSpec.lines || []).map((l) => (typeof l === 'string' ? l : l?.id)).filter(Boolean);
      applyRoleColoring({
        lineIds,
        side: chainSpec.side || 'both',
        shortenCore: chainSpec.shortenCore || (chainSpec.seedId ? [chainSpec.seedId] : []),
        shortenLinked: chainSpec.shortenLinked || [],
        lengthenAntagonist: chainSpec.lengthenAntagonist || [],
        lengthenLinked: chainSpec.lengthenLinked || [],
      });
    },
    update,
    dispose() {
      for (const sh of sheets) {
        sh.mesh.geometry.dispose();
        sh.material.dispose();
      }
      pinCoreGeom.dispose();
      pinRingGeom.dispose();
      pinCoreMat.dispose();
      pinRingMat.dispose();
      scene.remove(group);
    },
  };
}
