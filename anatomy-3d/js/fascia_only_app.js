// =============================================================================
// fascia_only_app.js — 筋膜シート単体 3D ビューア（番号付き4ステップ・高視認UI版）
//
// 厳守仕様:
// - 筋肉メッシュ（muscles.glb）はシーンに一切追加せず、体表コンター抽出直後に破棄する。
// - 最初から骨格が背景に溶けず立体的にくっきり見える象牙色シェーダー＋クール背景を採用。
// - 右上1ボタンで「通常」⇄「ダークモード」を1タップ切替。
// - 3D領域を画面の半分以下（スマホ 38dvh / PC 47%）に抑え、番号付き4ステップのページ送りで誤タップを防止。
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  BODY_REGIONS,
  MOTION_CATEGORIES,
  CARE_ZOOM_TARGETS,
  SYMPTOM_CARDS,
  MOTION_PRESETS,
  NEW_CANDIDATE_PRESETS,
  ALL_MOTION_PRESETS,
} from './fascia_only_clinical_data.js?v=20261118a';

import {
  BONE,
  SKELETON_SCALE,
  SKELETON_OFFSET,
  GROUND_Y,
  GLSL_BONE_UNIFORMS,
  getSkeletonMeshSkin,
  createBoneMatrixArray,
  computeMotionParams,
  solveRigMatrices,
  skinWorldPoint,
} from './fascia_only_biomechanics.js?v=20261118a';

import {
  FASCIA_LINE_DEFS,
  buildBodyEnvelope,
  createFasciaSheetsSystem,
} from './fascia_only_sheets.js?v=20261118a';

import {
  TOOL_DEFS,
  TOOL_ORDER,
  getAllowedToolsAndDefault,
  resolveCareProfile,
  sampleSurfaceStrokeByRaycaster,
  buildEnvelopeColliderMeshes,
  createSelfCareGuide3D,
} from './selfcare_guide3d.js?v=20261118a';

const MODEL_BASE = 'models/';
const ASSET_QUERY = '?v=20261118a';
const FALLBACK_BYTES = {
  'muscles.glb': 1543520,
  'skeleton.glb': 1497840,
};

const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥'];

// 16動作のうち単独4動作の説明データ（すべて2文以内・統一用語）
const STANDALONE_MOTION_CARDS = {
  'left-stance': {
    title: '左足に体重を乗せて立つ',
    lines: ['LL', 'DFL'],
    pitfall:
      '張っている左の外ももは、左へズレた骨盤を支えるために引っぱられている場所です。左の脇腹と左の内ももの縮みを先にゆるめると、両足へ均等に乗れるようになります。',
    chain: {
      culprit: '左の脇腹〜腰の奥・左の内もも',
      station: '左の骨盤の上の縁・左の大転子',
      victim: '左のお尻横〜太もも外側・右の脇腹',
    },
    careSteps: [
      {
        title: '左の脇腹（ろっ骨と骨盤のあいだ）',
        detail: '骨盤の上で縮んでいる脇腹の筋膜をゆるめ、骨盤が中央へ戻れるゆとりを作ります。',
        zoomKey: 'chest-oblique-sling',
      },
      {
        title: '内ももの付け根〜骨盤まわり',
        detail: '股関節を内側へ引き込む深部の筋膜をほぐし、左右均等に床を踏めるようにします。',
        zoomKey: 'groin-psoas',
      },
    ],
  },
  'alt-sway': {
    title: '左右交互の体重移動',
    lines: ['LL', 'DFL'],
    pitfall:
      '骨盤の上の縁を境目にして、体重を乗せた側は脇腹が縮み、太もも外側が引っぱられます。いつも張る外ももと「同じ側の脇腹」から先にゆるめるのがコツです。',
    chain: {
      culprit: '体重を乗せた側の脇腹・内もも',
      station: '左右の骨盤の上の縁・太もも外側の骨',
      victim: '体重を乗せた側の太もも外側・反対の脇腹',
    },
    careSteps: [
      {
        title: 'よく体重を乗せる側の脇腹',
        detail: '外ももが張る側と同じ側の脇腹をゆるめ、骨盤の横ズレを整えます。',
        zoomKey: 'flank-r',
      },
      {
        title: '骨盤の横〜太もも外側',
        detail: '脇腹がゆるんでから外ももを軽くさすると、張りが戻りにくくなります。',
        zoomKey: 'outer-hip-r',
      },
    ],
  },
  'arms-fold-stand': {
    title: '腕を組んで立つクセ',
    lines: ['SFAL', 'DFAL', 'DBAL'],
    pitfall:
      '腕を組むと胸と前腕内側の筋膜が縮んだまま固まり、背中側の肩甲骨のあいだが外へ引っぱられます。背中を揉む前に、縮んだ胸前と腕の内側をほどきます。',
    chain: {
      culprit: '胸〜鎖骨の下・前腕の内側',
      station: '肩の前の突起・肩甲骨の内側の縁',
      victim: '肩甲骨のあいだ・肘の外側',
    },
    careSteps: [
      {
        title: '胸の真ん中〜鎖骨の下',
        detail: '両肩を内側へ閉じている胸前の筋膜をゆるめ、自然に胸が開く状態を作ります。',
        zoomKey: 'pec-minor-r',
      },
      {
        title: '肘の内側〜手首・親指の付け根',
        detail: '組んだ腕で縮んでいた前腕内側をほぐすと、肩の力が抜けて腕が楽に下ります。',
        zoomKey: 'forearm-inner-r',
      },
    ],
  },
  'bag-child-hip': {
    title: '片腰抱っこ・片掛けカバン',
    lines: ['LL', 'DFL', 'SBAL'],
    pitfall:
      'カバン側の肩こりと反対側の外ももの張りは、骨盤の横ズレと肩のすくめから同時に起きています。肩や外ももを強く押す前に、鎖骨下と脇腹の縮みをゆるめます。',
    chain: {
      culprit: 'カバン側の胸前・腕前と片側の脇腹',
      station: '鎖骨・肩の屋根の骨と骨盤の上の縁',
      victim: 'カバン側の首〜肩上・突き出した側の外もも',
    },
    careSteps: [
      {
        title: '鎖骨の下〜わきの前側',
        detail: 'カバンを支えて縮んだ胸前・腕前をゆるめ、首から肩上の負担を抜きます。',
        zoomKey: 'pec-minor-r',
      },
      {
        title: '骨盤の横〜脇腹',
        detail: '片腰に乗せるクセで縮んだ脇腹をほぐし、骨盤を両足の真ん中へ戻します。',
        zoomKey: 'outer-hip-r',
      },
    ],
  },
};

// ケアズームターゲットごとの追従ボーン＆基準ローカル座標
const CARE_ZOOM_BONE_TRACK = {
  'flank-r': { bone: BONE.LUMBAR, restPos: [-0.36, 0.86, 0.02] },
  'inner-thigh-r': { bone: BONE.FEMUR_R, restPos: [-0.19, -0.56, 0.07] },
  'outer-hip-r': { bone: BONE.FEMUR_R, restPos: [-0.38, -0.48, 0.0] },
  'thumb-wrist-r': { bone: BONE.HAND_R, restPos: [-1.01, -0.04, 0.10] },
  'forearm-inner-r': { bone: BONE.RADIUS_R, restPos: [-0.93, 0.48, 0.02] },
  'pec-minor-r': { bone: BONE.THORAX_HIGH, restPos: [-0.28, 1.80, 0.14] },
  'between-scapula': { bone: BONE.THORAX_HIGH, restPos: [-0.14, 1.74, -0.18] },
  'sternum-clavicle': { bone: BONE.THORAX_HIGH, restPos: [-0.04, 1.86, 0.16] },
  'scm-neck-front': { bone: BONE.NECK, restPos: [-0.10, 2.34, 0.06] },
  'diaphragm-rib': { bone: BONE.THORAX_LOW, restPos: [-0.12, 1.24, 0.14] },
  'jaw-hyoid': { bone: BONE.HEAD, restPos: [-0.11, 2.66, 0.06] },
  'groin-psoas': { bone: BONE.PELVIS, restPos: [-0.16, 0.14, 0.12] },
  'ischium-ham': { bone: BONE.FEMUR_R, restPos: [-0.24, -0.46, -0.14] },
  'front-thigh-shin': { bone: BONE.FEMUR_R, restPos: [-0.28, -0.92, 0.12] },
  'armpit-lat-r': { bone: BONE.THORAX_HIGH, restPos: [-0.42, 1.54, -0.10] },
  'fibula-outer-r': { bone: BONE.SHANK_R, restPos: [-0.40, -2.32, -0.04] },
  'plantar-sole-r': { bone: BONE.FOOT_R, restPos: [-0.33, -3.22, -0.02] },
  'chest-oblique-sling': { bone: BONE.THORAX_LOW, restPos: [-0.18, 1.18, 0.14] },
};

// 全18ケア部位の3D体表レイキャスト＆22剛体ボーンスキニング仕様
const CARE_SURFACE_SPECS = {
  'flank-r': {
    colliderNames: ['torso'],
    restCenter: [-0.34, 0.86, 0.02],
    strokeDir: [0.0, 1.0, 0.0],
    outDir: [-0.96, 0.0, 0.28],
    spanLen: 0.42,
    skinIdx: [BONE.LUMBAR, BONE.THORAX_LOW, BONE.PELVIS, 0],
    skinW: [0.55, 0.30, 0.15, 0],
    side: 'R',
  },
  'inner-thigh-r': {
    colliderNames: ['legR'],
    restCenter: [-0.19, -0.58, 0.07],
    strokeDir: [-0.08, -0.99, 0.02],
    outDir: [0.62, 0.0, 0.78],
    spanLen: 0.46,
    skinIdx: [BONE.FEMUR_R, BONE.PELVIS, 0, 0],
    skinW: [0.88, 0.12, 0, 0],
    side: 'R',
  },
  'outer-hip-r': {
    colliderNames: ['legR', 'torso'],
    restCenter: [-0.38, -0.52, 0.0],
    strokeDir: [-0.04, -0.99, 0.0],
    outDir: [-0.98, 0.04, 0.18],
    spanLen: 0.54,
    skinIdx: [BONE.FEMUR_R, BONE.PELVIS, 0, 0],
    skinW: [0.78, 0.22, 0, 0],
    side: 'R',
  },
  'thumb-wrist-r': {
    colliderNames: ['armR'],
    restCenter: [-0.99, -0.02, 0.09],
    strokeDir: [-0.12, 0.98, -0.14],
    outDir: [0.34, 0.06, 0.94],
    spanLen: 0.16,
    skinIdx: [BONE.RADIUS_R, BONE.HAND_R, 0, 0],
    skinW: [0.72, 0.28, 0, 0],
    side: 'R',
  },
  'forearm-inner-r': {
    colliderNames: ['armR'],
    restCenter: [-0.93, 0.48, 0.02],
    strokeDir: [-0.08, 0.98, -0.14],
    outDir: [0.28, 0.04, 0.96],
    spanLen: 0.28,
    skinIdx: [BONE.RADIUS_R, BONE.ULNA_R, 0, 0],
    skinW: [0.66, 0.34, 0, 0],
    side: 'R',
  },
  'pec-minor-r': {
    colliderNames: ['torso'],
    restCenter: [-0.28, 1.80, 0.14],
    strokeDir: [-0.82, 0.24, -0.52],
    outDir: [-0.24, 0.18, 0.95],
    spanLen: 0.24,
    skinIdx: [BONE.THORAX_HIGH, BONE.GIRDLE_R, 0, 0],
    skinW: [0.78, 0.22, 0, 0],
    side: 'R',
  },
  'between-scapula': {
    colliderNames: ['torso'],
    restCenter: [-0.15, 1.74, -0.16],
    strokeDir: [0.0, 0.99, 0.06],
    outDir: [-0.14, 0.06, -0.99],
    spanLen: 0.32,
    skinIdx: [BONE.THORAX_HIGH, BONE.THORAX_LOW, 0, 0],
    skinW: [0.82, 0.18, 0, 0],
    side: 'R',
  },
  'sternum-clavicle': {
    colliderNames: ['torso'],
    restCenter: [-0.06, 1.84, 0.16],
    strokeDir: [-0.88, 0.38, -0.28],
    outDir: [-0.08, 0.16, 0.98],
    spanLen: 0.24,
    skinIdx: [BONE.THORAX_HIGH, 0, 0, 0],
    skinW: [1.0, 0, 0, 0],
    side: 'R',
  },
  'scm-neck-front': {
    colliderNames: ['torso'],
    restCenter: [-0.10, 2.34, 0.06],
    strokeDir: [0.22, -0.96, 0.18],
    outDir: [-0.62, 0.05, 0.78],
    spanLen: 0.22,
    skinIdx: [BONE.NECK, BONE.THORAX_HIGH, 0, 0],
    skinW: [0.78, 0.22, 0, 0],
    side: 'R',
  },
  'diaphragm-rib': {
    colliderNames: ['torso'],
    restCenter: [-0.14, 1.24, 0.14],
    strokeDir: [-0.84, -0.46, -0.28],
    outDir: [-0.28, 0.08, 0.95],
    spanLen: 0.26,
    skinIdx: [BONE.THORAX_LOW, BONE.LUMBAR, 0, 0],
    skinW: [0.76, 0.24, 0, 0],
    side: 'R',
  },
  'jaw-hyoid': {
    colliderNames: ['torso'],
    restCenter: [-0.12, 2.66, 0.06],
    strokeDir: [0.10, -0.98, 0.16],
    outDir: [-0.76, -0.05, 0.65],
    spanLen: 0.16,
    skinIdx: [BONE.HEAD, BONE.NECK, 0, 0],
    skinW: [0.85, 0.15, 0, 0],
    side: 'R',
  },
  'groin-psoas': {
    colliderNames: ['torso', 'legR'],
    restCenter: [-0.16, 0.14, 0.12],
    strokeDir: [-0.20, -0.96, 0.18],
    outDir: [-0.22, 0.08, 0.97],
    spanLen: 0.22,
    skinIdx: [BONE.PELVIS, BONE.LUMBAR, 0, 0],
    skinW: [0.75, 0.25, 0, 0],
    side: 'R',
  },
  'ischium-ham': {
    colliderNames: ['legR', 'torso'],
    restCenter: [-0.24, -0.46, -0.14],
    strokeDir: [-0.05, -0.99, 0.04],
    outDir: [-0.24, -0.08, -0.96],
    spanLen: 0.42,
    skinIdx: [BONE.FEMUR_R, BONE.PELVIS, 0, 0],
    skinW: [0.74, 0.26, 0, 0],
    side: 'R',
  },
  'front-thigh-shin': {
    colliderNames: ['legR'],
    restCenter: [-0.28, -0.92, 0.12],
    strokeDir: [-0.04, -0.99, 0.02],
    outDir: [-0.18, 0.04, 0.98],
    spanLen: 0.60,
    skinIdx: [BONE.FEMUR_R, 0, 0, 0],
    skinW: [1.0, 0, 0, 0],
    side: 'R',
  },
  'armpit-lat-r': {
    colliderNames: ['torso'],
    restCenter: [-0.42, 1.54, -0.10],
    strokeDir: [0.12, -0.98, 0.12],
    outDir: [-0.82, 0.06, -0.57],
    spanLen: 0.28,
    skinIdx: [BONE.THORAX_HIGH, BONE.GIRDLE_R, 0, 0],
    skinW: [0.76, 0.24, 0, 0],
    side: 'R',
  },
  'fibula-outer-r': {
    colliderNames: ['legR'],
    restCenter: [-0.40, -2.32, -0.04],
    strokeDir: [-0.03, -0.99, 0.02],
    outDir: [-0.94, 0.02, 0.34],
    spanLen: 0.50,
    skinIdx: [BONE.SHANK_R, 0, 0, 0],
    skinW: [1.0, 0, 0, 0],
    side: 'R',
  },
  'plantar-sole-r': {
    colliderNames: ['soleR'],
    restCenter: [-0.33, -3.22, -0.02],
    strokeDir: [0.0, 0.0, 1.0],
    outDir: [0.0, -1.0, 0.0],
    spanLen: 0.22,
    skinIdx: [BONE.FOOT_R, 0, 0, 0],
    skinW: [1.0, 0, 0, 0],
    side: 'R',
  },
  'chest-oblique-sling': {
    colliderNames: ['torso'],
    restCenter: [-0.20, 1.18, 0.14],
    strokeDir: [0.68, -0.72, 0.14],
    outDir: [-0.36, 0.06, 0.93],
    spanLen: 0.34,
    skinIdx: [BONE.THORAX_LOW, BONE.LUMBAR, 0, 0],
    skinW: [0.65, 0.35, 0, 0],
    side: 'R',
  },
};

/**
 * 3Dセルフケア表示中の視認性＆関節滑走（ピン＆ストレッチ）ポーズ補正
 * - 脇腹・わき下では右腕を頭上へ上げて被り0pxに
 * - 前腕・親指では腕を見やすく前へ差し出し、指押し滑走ケア時は手首を背屈⇄掌屈させる
 * - 肩甲骨の間では両腕を前へ出して肩甲骨間を開き、ボール時は心地よい微揺れを加える
 */
function applySelfCarePoseOverride(mp, zoomKey, activeTool, nowSec) {
  if (!mp || !zoomKey) return mp;
  switch (zoomKey) {
    case 'flank-r':
    case 'armpit-lat-r': {
      mp.girdleElevateR = 20;
      mp.girdleProtractR = -6;
      mp.humAbductR = 148;
      mp.humFlexR = 16;
      mp.humIntRotR = -16;
      mp.elbowFlexR = 36;
      mp.pronationR = 12;
      break;
    }
    case 'forearm-inner-r':
    case 'thumb-wrist-r': {
      mp.girdleProtractR = 8;
      mp.girdleElevateR = 2;
      mp.humFlexR = 16;
      mp.humAbductR = 20;
      mp.humIntRotR = -16;
      mp.elbowFlexR = 50;
      mp.pronationR = -14;
      if (activeTool === 'hand') {
        mp.wristExtR = Math.sin(nowSec * 2.15) * 32;
        mp.wristUlnarR = Math.sin(nowSec * 2.15) * 6;
      } else {
        mp.wristExtR = 8;
        mp.wristUlnarR = 0;
      }
      break;
    }
    case 'between-scapula': {
      mp.girdleProtractR = 18;
      mp.girdleProtractL = 18;
      mp.humFlexR = 44;
      mp.humFlexL = 44;
      mp.humIntRotR = 36;
      mp.humIntRotL = 36;
      mp.elbowFlexR = 82;
      mp.elbowFlexL = 82;
      if (activeTool === 'ball') {
        mp.thoHighPitchDeg = (mp.thoHighPitchDeg || 0) + Math.sin(nowSec * 2.3) * 2.2;
      }
      break;
    }
    case 'outer-hip-r':
    case 'front-thigh-shin':
    case 'inner-thigh-r': {
      mp.humFlexR = Math.max(mp.humFlexR || 0, 32);
      mp.humAbductR = Math.max(mp.humAbductR || 0, 16);
      mp.elbowFlexR = Math.max(mp.elbowFlexR || 0, 82);
      mp.humFlexL = Math.max(mp.humFlexL || 0, 26);
      mp.elbowFlexL = Math.max(mp.elbowFlexL || 0, 72);
      break;
    }
    case 'plantar-sole-r': {
      mp.sitDepth = 0;
      mp.recline = 0;
      mp.forwardBow = 0;
      mp.weightShift = 0.14;
      if (activeTool === 'hand') {
        mp.plantarLoad = 0.5 + 0.5 * Math.sin(nowSec * 2.1);
      }
      break;
    }
    default:
      break;
  }
  return mp;
}

// -----------------------------------------------------------------------------
// ストリーム進捗付き GLB ローダー
// -----------------------------------------------------------------------------
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

function cleanStepTitle(rawTitle) {
  return String(rawTitle || '').replace(/^[①②③④⑤1-5][\s.．:：]*/, '').trim();
}

// -----------------------------------------------------------------------------
// カメラアングル定義（関わるエリア全体が見渡せる引き画角：原因〜ピン留め部〜症状を同時表示）
// -----------------------------------------------------------------------------
const CAMERA_VIEWS = {
  front: {
    label: '正面（全身）',
    dir: new THREE.Vector3(0.0, 0.03, 1.0).normalize(),
    target: new THREE.Vector3(0, -0.08, 0),
    halfH: 3.28,
    halfW: 1.14,
  },
  back: {
    label: '背面（全身）',
    dir: new THREE.Vector3(0.0, 0.03, -1.0).normalize(),
    target: new THREE.Vector3(0, -0.08, 0),
    halfH: 3.28,
    halfW: 1.14,
  },
  'right-tfl': {
    label: '右横から見る',
    dir: new THREE.Vector3(-0.84, 0.04, 0.54).normalize(),
    target: new THREE.Vector3(-0.08, -0.10, 0),
    halfH: 3.26,
    halfW: 1.14,
  },
  left: {
    label: '左横から見る',
    dir: new THREE.Vector3(0.84, 0.04, 0.54).normalize(),
    target: new THREE.Vector3(0.08, -0.10, 0),
    halfH: 3.26,
    halfW: 1.14,
  },
  'neck-shoulder': {
    label: '首・肩・腕まわり',
    dir: new THREE.Vector3(-0.28, 0.06, 0.96).normalize(),
    target: new THREE.Vector3(0.0, +1.40, 0.02),
    halfH: 1.90,
    halfW: 1.34,
  },
  'arm-hand': {
    label: '肩・腕・手首',
    dir: new THREE.Vector3(-0.50, 0.10, 0.86).normalize(),
    target: new THREE.Vector3(-0.22, +1.12, 0.04),
    halfH: 1.82,
    halfW: 1.38,
  },
  'pelvis-zoom': {
    label: '腰・骨盤・太もも',
    dir: new THREE.Vector3(-0.58, 0.06, 0.81).normalize(),
    target: new THREE.Vector3(-0.05, +0.02, 0.0),
    halfH: 2.15,
    halfW: 1.36,
  },
  'leg-foot-zoom': {
    label: '骨盤〜膝・足裏',
    dir: new THREE.Vector3(-0.68, 0.05, 0.73).normalize(),
    target: new THREE.Vector3(-0.08, -1.42, 0.0),
    halfH: 2.08,
    halfW: 1.30,
  },
  'leg-back-zoom': {
    label: '腰・もも裏〜足裏',
    dir: new THREE.Vector3(-0.38, 0.04, -0.92).normalize(),
    target: new THREE.Vector3(-0.08, -1.42, -0.04),
    halfH: 2.08,
    halfW: 1.30,
  },
  'upper-torso-zoom': {
    label: '頭〜胸・骨盤',
    dir: new THREE.Vector3(0.0, 0.04, 1.0).normalize(),
    target: new THREE.Vector3(0.0, +0.88, 0.0),
    halfH: 2.12,
    halfW: 1.34,
  },
  'banzai-wide': {
    label: 'バンザイ全身上部',
    dir: new THREE.Vector3(-0.22, 0.04, 0.97).normalize(),
    target: new THREE.Vector3(0.0, +1.34, 0.0),
    halfH: 2.68,
    halfW: 1.66,
  },
  'sock-reach-wide': {
    label: '片足靴下履き全身',
    dir: new THREE.Vector3(-0.64, 0.05, 0.77).normalize(),
    target: new THREE.Vector3(-0.04, -0.46, +0.08),
    halfH: 2.92,
    halfW: 1.56,
  },
  'seated-upper': {
    label: '座位の上半身・腕',
    dir: new THREE.Vector3(-0.34, 0.08, 0.93).normalize(),
    target: new THREE.Vector3(0.0, +0.42, -0.18),
    halfH: 1.78,
    halfW: 1.34,
  },
  'seated-side': {
    label: '座位の横・全身',
    dir: new THREE.Vector3(-0.78, 0.06, 0.62).normalize(),
    target: new THREE.Vector3(0.0, -0.45, -0.06),
    halfH: 2.42,
    halfW: 1.48,
  },
  'seated-lower': {
    label: '床座り・全身',
    dir: new THREE.Vector3(-0.32, 0.12, 0.94).normalize(),
    target: new THREE.Vector3(0.0, -0.86, -0.04),
    halfH: 2.38,
    halfW: 1.44,
  },
  'recline-side': {
    label: '仰向けリクライニング',
    dir: new THREE.Vector3(-0.94, 0.09, 0.33).normalize(),
    target: new THREE.Vector3(0.0, -0.62, +0.18),
    halfH: 2.35,
    halfW: 2.76,
  },
};

// -----------------------------------------------------------------------------
// 初期化エントリポイント
// -----------------------------------------------------------------------------
async function bootstrap() {
  const stageColEl = document.getElementById('stage-col');
  const stageEl = document.getElementById('stage');
  const guideScrollEl = document.getElementById('guide-scroll');
  const loaderOverlay = document.getElementById('loader-overlay');
  const loaderBar = document.getElementById('loader-bar-fill');
  const loaderText = document.getElementById('loader-status');

  const setProgress = (pct, msg) => {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (loaderBar) loaderBar.style.width = `${p}%`;
    if (loaderText && msg) loaderText.textContent = `${msg}（${p}%）`;
  };

  try {
    setProgress(2, '3Dステージを準備しています');

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.75 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', '骨格と筋膜シートの3Dモデル');
    stageEl.appendChild(canvas);

    const scene = new THREE.Scene();

    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.28;
      pmrem.dispose();
    } catch (_) {
      // 環境テクスチャ非対応端末では3点ライトのみで描画
    }

    const w0 = stageEl.clientWidth || 640;
    const h0 = stageEl.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(30, w0 / h0, 0.05, 60);
    renderer.setSize(w0, h0, false);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.92;
    controls.minDistance = 0.62;
    controls.maxDistance = 26;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

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

    // フロア接地基準リング
    const floorGroup = new THREE.Group();
    floorGroup.position.set(0, GROUND_Y - 0.004, -0.04);
    const ringGeo = new THREE.RingGeometry(0.58, 0.60, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    const plumbGeo = new THREE.PlaneGeometry(0.008, 0.96);
    plumbGeo.rotateX(-Math.PI / 2);
    const plumbMat = new THREE.MeshBasicMaterial({
      color: 0xb88e3e,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plumbLine = new THREE.Mesh(plumbGeo, plumbMat);
    floorGroup.add(floorRing, plumbLine);
    scene.add(floorGroup);

    // ケアポイント『この場所を3Dで見る』フォーカスリング
    const focusMarker = new THREE.Group();
    focusMarker.visible = false;
    const focusOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.105, 0.132, 44),
      new THREE.MeshBasicMaterial({
        color: 0xc49a45,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    const focusInner = new THREE.Mesh(
      new THREE.RingGeometry(0.042, 0.062, 36),
      new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    focusOuter.renderOrder = 20;
    focusInner.renderOrder = 20;
    focusMarker.add(focusOuter, focusInner);
    scene.add(focusMarker);

    // GLB ダウンロード
    setProgress(5, '骨格と体表データを読み込んでいます');
    const progState = {
      'skeleton.glb': { got: 0, total: FALLBACK_BYTES['skeleton.glb'] },
      'muscles.glb': { got: 0, total: FALLBACK_BYTES['muscles.glb'] },
    };
    const updateDl = () => {
      const got = progState['skeleton.glb'].got + progState['muscles.glb'].got;
      const tot = progState['skeleton.glb'].total + progState['muscles.glb'].total;
      setProgress(5 + (got / Math.max(1, tot)) * 75, '骨格と筋膜曲面データをダウンロード中');
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

    setProgress(83, '骨格モデルを展開しています');
    const gltfLoader = new GLTFLoader();
    if (MeshoptDecoder) gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    const [parsedSkel, parsedMuscle] = await Promise.all([
      gltfLoader.parseAsync(skeletonBuf, MODEL_BASE),
      gltfLoader.parseAsync(muscleBuf, MODEL_BASE),
    ]);

    const skeletonRoot = parsedSkel.scene;
    skeletonRoot.name = 'skeleton-only';
    skeletonRoot.scale.setScalar(SKELETON_SCALE);
    skeletonRoot.position.copy(SKELETON_OFFSET);
    skeletonRoot.updateMatrixWorld(true);

    const muscleOffscreenRoot = parsedMuscle.scene;
    muscleOffscreenRoot.updateMatrixWorld(true);

    // 体表エンベロープをオフスクリーン抽出し、THREE.Raycaster用の軽量コライダーを生成してから筋肉メッシュを即破棄！
    setProgress(90, '全11本の連続3D筋膜シートを織り上げています');
    const envelope = buildBodyEnvelope(muscleOffscreenRoot, skeletonRoot);
    const envelopeColliders = buildEnvelopeColliderMeshes(envelope);
    disposeGroupResources(muscleOffscreenRoot);

    const boneMats = createBoneMatrixArray();
    const sharedUniforms = {
      uBoneMats: { value: boneMats },
      uDarkTheme: { value: 0.0 },
      uTime: { value: 0.0 },
    };

    // 骨格マテリアル構築（初期状態から常に背景に埋もれず立体的にくっきり見える設計）
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
        transparent: false,
        opacity: 1.0,
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

              // 通常モード：クール背景(#D3DFEE〜#B4C4DB)に対して温かい象牙色＋くっきりした輪郭陰影で骨を際立たせる
              vec3 lightLit = vec3(0.995, 0.978, 0.942);
              vec3 lightShd = vec3(0.58, 0.50, 0.40);
              vec3 lightInk = vec3(0.14, 0.11, 0.08);

              // ダークモード：深紺背景(#080E1D〜#162444)に対して高明度アイボリー＋立体陰影
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
      mat.customProgramCacheKey = () => 'fascia-only-bone-crisp-v4';

      obj.material = mat;
      obj.renderOrder = 1;
      obj.frustumCulled = false;
    });

    scene.add(skeletonRoot);

    const fasciaSystem = createFasciaSheetsSystem(envelope, sharedUniforms);
    scene.add(fasciaSystem.group);

    // 共通3Dセルフケア・マッサージエンジン（指・ボール・ローラー＋床/壁マット）
    const selfCareGuide = createSelfCareGuide3D({ parent: scene });

    setProgress(100, '準備が整いました');

    // -------------------------------------------------------------------------
    // アプリ状態管理（番号付き4ステップ・ページ送り対応）
    // -------------------------------------------------------------------------
    const ALL_LINE_IDS = FASCIA_LINE_DEFS.map((d) => d.id);

    const state = {
      viewPage: 'step-1', // 'step-1' | 'step-2' | 'step-3' | 'step-4' | 'motions' | 'lines'
      entrySource: 'symptom', // 'symptom' | 'motions'
      isNeutralSpecimen: true, // 初期状態は歪みのない静止骨格に全11筋膜シートが貼り付いた標本状態
      selectedRegionId: 'waist-hip',
      selectedMotionCat: MOTION_CATEGORIES[0].id,
      symptomId: null,
      presetId: SYMPTOM_CARDS[0].presetId,
      recommendedLines: [...ALL_LINE_IDS],
      activeCameraView: 'front',
      activeZoomKey: null,
      activeCareTool: null,
      careToolByZoomKey: {},
      careStrokeState: null,
      focusTrack: null,
      playing: false,
      phase01: 0.0,
      manualScrub: 0.0,
      intensity: 1.0,
      darkTheme: false,
      stageExpanded: false,
      lastFrameMs: performance.now(),
    };

    const refreshRigNow = (nowSec = performance.now() * 0.001) => {
      const mp = computeMotionParams({
        presetId: state.presetId,
        phase01: state.phase01,
        manualScrub: state.manualScrub,
        intensity: state.intensity,
      });
      if (state.activeZoomKey) {
        applySelfCarePoseOverride(mp, state.activeZoomKey, state.activeCareTool, nowSec);
      }
      solveRigMatrices(mp, boneMats);
      return mp;
    };
    refreshRigNow();

    // -------------------------------------------------------------------------
    // 3Dカメラ制御 ＆ スマホ「3Dを広げる」一時拡大制御
    // -------------------------------------------------------------------------
    let camTween = null;
    const computeCameraDist = (halfH, halfW) => {
      const w = Math.max(1, stageEl.clientWidth);
      const h = Math.max(1, stageEl.clientHeight);
      const aspect = w / h;
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const tanHalfV = Math.tan(vFovRad * 0.5);
      const tanHalfH = tanHalfV * aspect;
      const distV = (halfH * 1.05) / tanHalfV;
      const distH = (halfW * 1.08) / Math.max(0.22, tanHalfH);
      return Math.max(distV, distH);
    };

    const startCameraTween = (toTarget, dirVec, halfH, halfW, immediate = false) => {
      const dist = computeCameraDist(halfH, halfW);
      const normDir = dirVec.clone().normalize();
      const toPos = toTarget.clone().addScaledVector(normDir, dist);

      if (immediate) {
        controls.target.copy(toTarget);
        camera.position.copy(toPos);
        controls.update();
        camTween = null;
        return;
      }

      camTween = {
        t0: performance.now(),
        dur: 480,
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget: toTarget.clone(),
      };
    };

    const zoomResetWrapEl = document.getElementById('zoom-reset-wrap');
    const zoomResetBtn = document.getElementById('btn-zoom-reset');
    const stageExpandBtn = document.getElementById('btn-stage-expand');

    const setStageExpanded = (expanded) => {
      state.stageExpanded = Boolean(expanded);
      stageColEl?.classList.toggle('is-expanded', state.stageExpanded);
      if (stageExpandBtn) {
        stageExpandBtn.textContent = state.stageExpanded ? '3Dを戻す' : '3Dを広げる';
        stageExpandBtn.setAttribute('aria-expanded', String(state.stageExpanded));
      }
    };

    const activateCare3DGuide = (zoomKey, requestedTool = null) => {
      const spec = CARE_SURFACE_SPECS[zoomKey];
      if (!spec) return null;
      const targetLabel = CARE_ZOOM_TARGETS[zoomKey]?.label || '';
      const savedTool = requestedTool || state.careToolByZoomKey[zoomKey] || null;
      const profile = resolveCareProfile(zoomKey, savedTool, targetLabel);
      state.activeCareTool = profile.tool;
      state.careToolByZoomKey[zoomKey] = profile.tool;

      const colliderSet = new Set(spec.colliderNames || []);
      const targetColliders = envelopeColliders.filter((m) => colliderSet.has(m.name));
      const rayMeshes = targetColliders.length ? targetColliders : envelopeColliders;

      const centerRest = new THREE.Vector3(spec.restCenter[0], spec.restCenter[1], spec.restCenter[2]);
      const strokeDirRest = new THREE.Vector3(spec.strokeDir[0], spec.strokeDir[1], spec.strokeDir[2]).normalize();
      const outDirRest = new THREE.Vector3(spec.outDir[0], spec.outDir[1], spec.outDir[2]).normalize();

      const sampled = sampleSurfaceStrokeByRaycaster({
        candidateMeshes: rayMeshes,
        effSide: spec.side || 'R',
        centerRest,
        strokeDirRest,
        outDirRest,
        spanLen: spec.spanLen || 0.30,
        sampleCount: 7,
        fallbackOffset: 0.018,
      });

      const _normProbeRest = new THREE.Vector3();
      const _normProbeWorld = new THREE.Vector3();
      const transformFn = (ptRest, normRest, _idx, outPt, outNorm) => {
        skinWorldPoint(ptRest, spec.skinIdx, spec.skinW, boneMats, outPt);
        _normProbeRest.copy(ptRest).addScaledVector(normRest, 0.05);
        skinWorldPoint(_normProbeRest, spec.skinIdx, spec.skinW, boneMats, _normProbeWorld);
        outNorm.copy(_normProbeWorld).sub(outPt).normalize();
      };

      state.careStrokeState = {
        zoomKey,
        hitCount: sampled.hitCount,
        pointsRest: sampled.pointsRest,
        normalsRest: sampled.normalsRest,
        skinIdx: spec.skinIdx,
        skinW: spec.skinW,
      };

      selfCareGuide.show({
        targetId: zoomKey,
        tool: profile.tool,
        motion: profile.motion,
        handPose: profile.handPose,
        supportSurface: profile.supportSurface,
        effSide: spec.side || 'R',
        scale: profile.scale || 1.0,
        speed: 1.0,
        pointsRest: sampled.pointsRest,
        normalsRest: sampled.normalsRest,
        transformFn,
      });

      return profile;
    };

    const syncCareCardsUI = () => {
      document.querySelectorAll('.care-step-card').forEach((card) => {
        const zKey = card.dataset.zoomKey || '';
        const isActive = Boolean(zKey && zKey === state.activeZoomKey);
        card.classList.toggle('is-care-active', isActive);

        const zBtn = card.querySelector('.care-zoom-btn');
        if (zBtn && zBtn.dataset.baseLabel) {
          zBtn.classList.toggle('is-active', isActive);
          zBtn.textContent = isActive ? '● 3Dでほぐし方を再生中' : zBtn.dataset.baseLabel;
        }

        const panel = card.querySelector('.fo-care-panel');
        if (panel) {
          panel.hidden = !isActive;
          if (isActive) {
            const targetLabel = CARE_ZOOM_TARGETS[zKey]?.label || '';
            const curTool = state.careToolByZoomKey[zKey] || state.activeCareTool || null;
            const profile = resolveCareProfile(zKey, curTool, targetLabel);
            panel.querySelectorAll('.fo-care-tool-btn').forEach((tBtn) => {
              const on = tBtn.dataset.careTool === profile.tool;
              tBtn.classList.toggle('is-active', on);
              tBtn.setAttribute('aria-pressed', String(on));
            });
            const guideEl = panel.querySelector('.fo-care-guide-text');
            if (guideEl) {
              const prefix =
                profile.tool === 'hand'
                  ? '🤲 指のやり方：'
                  : profile.tool === 'roller'
                    ? '🛞 ローラーのやり方：'
                    : '🎾 ボールのやり方：';
              guideEl.textContent = `${prefix}${profile.guideText}`;
            }
          }
        }
      });
    };

    const clearCareZoomHighlight = () => {
      state.activeZoomKey = null;
      state.activeCareTool = null;
      state.careStrokeState = null;
      state.focusTrack = null;
      focusMarker.visible = false;
      selfCareGuide.clear();
      if (zoomResetWrapEl) zoomResetWrapEl.hidden = true;
      syncCareCardsUI();
    };

    const setCameraView = (viewKey, immediate = false) => {
      clearCareZoomHighlight();
      const vDef = CAMERA_VIEWS[viewKey] || CAMERA_VIEWS.front;
      state.activeCameraView = viewKey in CAMERA_VIEWS ? viewKey : 'front';
      floorGroup.visible = state.activeCameraView !== 'recline-side';

      refreshRigNow();
      const toTarget =
        vDef.trackBone !== undefined && vDef.restTarget
          ? vDef.restTarget.clone().applyMatrix4(boneMats[vDef.trackBone])
          : vDef.target.clone();

      document.querySelectorAll('[data-cam-view]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.camView === state.activeCameraView);
      });

      startCameraTween(toTarget, vDef.dir, vDef.halfH, vDef.halfW, immediate);
    };

    const zoomToCareTarget = (zoomKey, requestedTool = null) => {
      const zDef = CARE_ZOOM_TARGETS[zoomKey];
      if (!zDef) return;

      const curPreset = ALL_MOTION_PRESETS.find((p) => p.id === state.presetId) || MOTION_PRESETS[0];
      state.activeZoomKey = null;
      const curMp = refreshRigNow();
      if (Math.abs(curMp.scrub) < 0.45) {
        state.playing = false;
        state.manualScrub = curPreset.bidirectional && state.presetId === 'left-stance' ? -0.85 : 0.85;
        syncPlayBtnUI();
      } else {
        state.playing = false;
        state.manualScrub = curMp.scrub;
        syncPlayBtnUI();
      }

      state.activeZoomKey = zoomKey;
      activateCare3DGuide(zoomKey, requestedTool);
      refreshRigNow();

      const track = CARE_ZOOM_BONE_TRACK[zoomKey];
      let liveTarget;
      if (track) {
        const restVec = new THREE.Vector3(track.restPos[0], track.restPos[1], track.restPos[2]);
        liveTarget = restVec.clone().applyMatrix4(boneMats[track.bone]);
        state.focusTrack = { bone: track.bone, restPosVec: restVec };
      } else {
        liveTarget = new THREE.Vector3(zDef.target[0], zDef.target[1], zDef.target[2]);
        state.focusTrack = null;
      }
      // 旧式の静止点リングの代わりにリアルな3Dマッサージアニメーションを表示する
      focusMarker.visible = false;

      if (zoomResetWrapEl) zoomResetWrapEl.hidden = false;

      document.querySelectorAll('[data-cam-view]').forEach((btn) => btn.classList.remove('is-active'));
      syncCareCardsUI();

      const liveLerp = zoomKey === 'forearm-inner-r' || zoomKey === 'thumb-wrist-r' ? 0.78 : 0.34;
      const viewBase = Array.isArray(zDef.viewTarget)
        ? new THREE.Vector3(zDef.viewTarget[0], zDef.viewTarget[1], zDef.viewTarget[2]).lerp(liveTarget, liveLerp)
        : liveTarget;
      const dirVec = new THREE.Vector3(zDef.dir[0], zDef.dir[1], zDef.dir[2]);
      startCameraTween(viewBase, dirVec, zDef.halfH, zDef.halfW, false);
    };

    zoomResetBtn?.addEventListener('click', () => {
      setCameraView(state.activeCameraView || 'front', false);
    });

    document.getElementById('btn-cam-whole')?.addEventListener('click', () => {
      setCameraView('front', false);
    });

    stageExpandBtn?.addEventListener('click', () => {
      setStageExpanded(!state.stageExpanded);
    });

    // -------------------------------------------------------------------------
    // DOM 要素参照
    // -------------------------------------------------------------------------
    const regionBtnListEl = document.getElementById('region-btn-list');
    const headingStep2El = document.getElementById('heading-step-2');
    const symptomListEl = document.getElementById('symptom-card-list');
    const motionCatBarEl = document.getElementById('motion-cat-bar');
    const presetListEl = document.getElementById('preset-list');
    const lineListEl = document.getElementById('fascia-line-list');

    const backFrom3Btn = document.getElementById('btn-back-from-3');
    const explainTitleEl = document.getElementById('explain-title');
    const explainBodyEl = document.getElementById('explain-body');
    const chainCulpritEl = document.getElementById('chain-culprit-text');
    const chainStationEl = document.getElementById('chain-station-text');
    const chainVictimEl = document.getElementById('chain-victim-text');
    const careStepsListEl = document.getElementById('care-steps-list');

    const scrubSlider = document.getElementById('weight-shift-slider');
    const scrubLabelEl = document.getElementById('scrub-slider-label');
    const scrubValueEl = document.getElementById('weight-shift-value');
    const scaleMinEl = document.getElementById('scale-min-label');
    const scaleMidEl = document.getElementById('scale-mid-label');
    const scaleMaxEl = document.getElementById('scale-max-label');

    const playToggleBtn = document.getElementById('btn-play-toggle');
    const resetPoseBtn = document.getElementById('btn-reset-pose');
    const themeBtn = document.getElementById('btnTheme');
    const metaThemeColor = document.getElementById('meta-theme-color');
    const stationCheckbox = document.getElementById('chk-stations');

    // -------------------------------------------------------------------------
    // ページ送り（ウィザード遷移）制御
    // -------------------------------------------------------------------------
    const stepTabs = document.querySelectorAll('[data-goto-step]');

    const goToPage = (pageKey) => {
      state.viewPage = pageKey;
      document.body.dataset.viewPage = pageKey;

      // ページ遷移時はスマホの一時3D拡大を自動で戻し、スクロール位置を必ず先頭へリセット
      if (state.stageExpanded) setStageExpanded(false);
      if (guideScrollEl) guideScrollEl.scrollTop = 0;

      const curStepNum = pageKey.startsWith('step-') ? Number(pageKey.slice(5)) : 0;
      stepTabs.forEach((tab) => {
        const n = Number(tab.dataset.gotoStep);
        const isCurrent = curStepNum === n;
        const isDone = curStepNum > n;
        tab.classList.toggle('is-current', isCurrent);
        tab.classList.toggle('is-done', isDone);
        if (isCurrent) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      });

      if (backFrom3Btn) {
        backFrom3Btn.textContent =
          state.entrySource === 'motions' ? '← 16の動作一覧へ戻る' : '← ② 症状を選び直す';
      }
    };

    // 歪みのない静止した標本状態（全11筋膜ライン装着・姿勢0%固定）に戻すヘルパー
    const enterNeutralSpecimenMode = (immediateCam = false, keepCustomLines = false) => {
      state.isNeutralSpecimen = true;
      state.symptomId = null;
      state.playing = false;
      state.manualScrub = 0.0;
      state.phase01 = 0.0;
      state.recommendedLines = [...ALL_LINE_IDS];
      clearCareZoomHighlight();
      if (!keepCustomLines) {
        fasciaSystem.setOnlyLines(ALL_LINE_IDS);
        syncLineCheckboxes();
      }
      if (scrubSlider) scrubSlider.value = '0';
      syncSelectionActiveStates();
      syncPlayBtnUI();
      setCameraView('front', immediateCam);
    };

    stepTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const n = Number(tab.dataset.gotoStep);
        if (n === 1) {
          enterNeutralSpecimenMode(false);
          goToPage('step-1');
        } else if (n === 2) {
          renderSymptomStep2(state.selectedRegionId);
          goToPage('step-2');
        } else if (n === 3) {
          if (state.isNeutralSpecimen) {
            applySymptomCard(SYMPTOM_CARDS[0].id, false);
          }
          goToPage('step-3');
        } else if (n === 4) {
          if (state.isNeutralSpecimen) {
            applySymptomCard(SYMPTOM_CARDS[0].id, false);
          }
          goToPage('step-4');
        }
      });
    });

    document.getElementById('btn-back-to-1')?.addEventListener('click', () => {
      enterNeutralSpecimenMode(false);
      goToPage('step-1');
    });
    backFrom3Btn?.addEventListener('click', () => {
      if (state.entrySource === 'motions') {
        goToPage('motions');
      } else {
        // STEP 2（症状選び）へ戻る際も、一度静止した全11筋膜の模型に戻して比較しやすくする
        const reg = BODY_REGIONS.find((r) => r.id === state.selectedRegionId);
        enterNeutralSpecimenMode(false);
        if (reg?.previewCamera) setCameraView(reg.previewCamera, false);
        renderSymptomStep2(state.selectedRegionId);
        goToPage('step-2');
      }
    });
    document.getElementById('btn-go-step-4')?.addEventListener('click', () => goToPage('step-4'));
    document.getElementById('btn-back-to-3')?.addEventListener('click', () => goToPage('step-3'));
    document.getElementById('btn-restart-step-1')?.addEventListener('click', () => {
      enterNeutralSpecimenMode(false);
      goToPage('step-1');
    });

    document.getElementById('btn-open-motions')?.addEventListener('click', () => {
      renderMotionPresetList();
      goToPage('motions');
    });
    document.getElementById('btn-open-lines')?.addEventListener('click', () => {
      syncLineCheckboxes();
      goToPage('lines');
    });
    document.getElementById('btn-motion-back')?.addEventListener('click', () => {
      enterNeutralSpecimenMode(false);
      goToPage('step-1');
    });
    document.getElementById('btn-lines-back')?.addEventListener('click', () => {
      goToPage('step-1');
    });
    document.getElementById('btn-motion-to-step3')?.addEventListener('click', () => {
      if (state.isNeutralSpecimen) {
        applyMotionPreset(state.presetId || MOTION_PRESETS[0].id);
      }
      state.entrySource = 'motions';
      goToPage('step-3');
    });

    // -------------------------------------------------------------------------
    // UI レンダリングヘルパー
    // -------------------------------------------------------------------------
    function syncPlayBtnUI() {
      if (!playToggleBtn) return;
      playToggleBtn.hidden = Boolean(state.isNeutralSpecimen);
      playToggleBtn.textContent = state.playing ? '一時停止' : '動きを再生';
      playToggleBtn.classList.toggle('is-paused', !state.playing);
    }

    const syncLineCheckboxes = () => {
      lineListEl?.querySelectorAll('input[data-line-id]').forEach((inp) => {
        inp.checked = fasciaSystem.isLineVisible(inp.dataset.lineId);
        inp.closest('.line-toggle-item')?.classList.toggle('is-checked', inp.checked);
      });
    };

    const syncScrubSliderRange = (preset) => {
      if (!scrubSlider) return;
      if (preset.bidirectional) {
        scrubSlider.min = '-100';
        scrubSlider.max = '100';
        if (scrubLabelEl) {
          scrubLabelEl.textContent =
            preset.id === 'spiral-functional-twist' ? '左右のひねり角度' : '骨盤の左右シフト（体重移動）';
        }
        if (scaleMinEl) scaleMinEl.textContent = preset.id === 'spiral-functional-twist' ? '右ひねり100%' : '左100%';
        if (scaleMidEl) scaleMidEl.textContent = '中央0%';
        if (scaleMaxEl) scaleMaxEl.textContent = preset.id === 'spiral-functional-twist' ? '左ひねり100%' : '右100%';
      } else {
        scrubSlider.min = '0';
        scrubSlider.max = '100';
        if (scrubLabelEl) scrubLabelEl.textContent = '姿勢・動作の深さ（手動調整）';
        if (scaleMinEl) scaleMinEl.textContent = '中立0%';
        if (scaleMidEl) scaleMidEl.textContent = '中間50%';
        if (scaleMaxEl) scaleMaxEl.textContent = '最大100%';
      }
    };

    // STEP 3（原因）＆ STEP 4（ゆるめる順番）の描画
    const renderClinicalCarte = ({ title, pitfall, chain, careSteps }) => {
      if (explainTitleEl) explainTitleEl.textContent = title;
      if (explainBodyEl) explainBodyEl.textContent = pitfall;
      if (chainCulpritEl) chainCulpritEl.textContent = chain.culprit;
      if (chainStationEl) chainStationEl.textContent = chain.station;
      if (chainVictimEl) chainVictimEl.textContent = chain.victim;

      if (careStepsListEl) {
        careStepsListEl.innerHTML = '';
        careSteps.forEach((step, idx) => {
          const card = document.createElement('div');
          card.className = 'care-step-card';

          const head = document.createElement('div');
          head.className = 'care-step-head';

          const badge = document.createElement('span');
          badge.className = 'care-step-badge';
          badge.textContent = `手順 ${idx + 1}`;

          const h4 = document.createElement('h3');
          h4.className = 'care-step-title';
          h4.textContent = cleanStepTitle(step.title);

          head.append(badge, h4);

          const p = document.createElement('p');
          p.className = 'care-step-detail';
          p.textContent = step.detail;

          card.append(head, p);

          if (step.zoomKey && CARE_ZOOM_TARGETS[step.zoomKey]) {
            card.dataset.zoomKey = step.zoomKey;
            const zBtn = document.createElement('button');
            zBtn.type = 'button';
            zBtn.className = 'care-zoom-btn';
            const zLabel = '▶ 3Dでほぐし方を見る';
            zBtn.textContent = zLabel;
            zBtn.dataset.baseLabel = zLabel;
            zBtn.dataset.zoomKey = step.zoomKey;
            zBtn.addEventListener('click', () => zoomToCareTarget(step.zoomKey));
            card.appendChild(zBtn);

            // ワンタップ器具切替ピル（[ 🤲 指でやる ｜ 🎾 ボール ｜ 🛞 ローラー ]）＋ 1行やり方ガイド
            const carePanel = document.createElement('div');
            carePanel.className = 'fo-care-panel';
            carePanel.hidden = true;

            const rule = getAllowedToolsAndDefault(step.zoomKey);
            const allowedList = rule.allowedTools || rule.allowed || ['hand', 'ball', 'roller'];
            const onlyHand = rule.isDelicate || allowedList.length <= 1;

            if (onlyHand) {
              const safeBadge = document.createElement('div');
              safeBadge.className = 'fo-care-delicate-badge';
              safeBadge.textContent = '🤲 指でやさしくケア（強い器具は使いません）';
              carePanel.appendChild(safeBadge);
            } else {
              const toolBar = document.createElement('div');
              toolBar.className = 'fo-care-tool-bar';
              toolBar.setAttribute('role', 'group');
              toolBar.setAttribute('aria-label', 'ほぐし方の道具切り替え');

              for (const tid of TOOL_ORDER) {
                if (!allowedList.includes(tid)) continue;
                const tDef = TOOL_DEFS[tid];
                const tBtn = document.createElement('button');
                tBtn.type = 'button';
                tBtn.className = 'fo-care-tool-btn' + (tid === rule.defaultTool ? ' is-active' : '');
                tBtn.dataset.careTool = tid;
                tBtn.setAttribute('aria-pressed', String(tid === rule.defaultTool));
                tBtn.textContent = tDef.label;
                tBtn.addEventListener('click', () => {
                  if (state.activeZoomKey !== step.zoomKey) {
                    zoomToCareTarget(step.zoomKey, tid);
                  } else {
                    activateCare3DGuide(step.zoomKey, tid);
                    refreshRigNow();
                    syncCareCardsUI();
                  }
                });
                toolBar.appendChild(tBtn);
              }
              carePanel.appendChild(toolBar);
            }

            const guideP = document.createElement('p');
            guideP.className = 'fo-care-guide-text';
            const initProfile = resolveCareProfile(
              step.zoomKey,
              rule.defaultTool,
              CARE_ZOOM_TARGETS[step.zoomKey]?.label || '',
            );
            guideP.textContent = initProfile.guideText;
            carePanel.appendChild(guideP);

            card.appendChild(carePanel);
          }

          careStepsListEl.appendChild(card);
        });
      }
    };

    const syncSelectionActiveStates = () => {
      symptomListEl?.querySelectorAll('[data-symptom-id]').forEach((btn) => {
        const active = btn.dataset.symptomId === state.symptomId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      presetListEl?.querySelectorAll('[data-preset-id]').forEach((btn) => {
        const active = !state.isNeutralSpecimen && btn.dataset.presetId === state.presetId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    };

    // 1) 症状カード選択ハンドラ（選んだ瞬間に歪みモーションと対象筋膜の張力を再生開始）
    const applySymptomCard = (symptomId, immediateCam = false) => {
      const card = SYMPTOM_CARDS.find((c) => c.id === symptomId) || SYMPTOM_CARDS[0];
      const preset = MOTION_PRESETS.find((p) => p.id === card.presetId) || MOTION_PRESETS[0];

      state.isNeutralSpecimen = false;
      state.symptomId = card.id;
      state.presetId = preset.id;
      state.recommendedLines = [...card.lines];
      state.manualScrub = null;
      state.playing = true;
      state.phase01 = 0.28;

      fasciaSystem.setOnlyLines(card.lines);
      syncLineCheckboxes();
      syncScrubSliderRange(preset);
      renderClinicalCarte({
        title: card.title,
        pitfall: card.pitfall,
        chain: card.chain,
        careSteps: card.careSteps,
      });
      syncSelectionActiveStates();
      syncPlayBtnUI();
      setCameraView(card.cameraView || preset.defaultCamera || 'front', immediateCam);
    };

    // 2) 動作プリセット選択ハンドラ（既存16動作＋新候補10動作の両方に対応）
    const applyMotionPreset = (presetId, immediateCam = false) => {
      const preset = ALL_MOTION_PRESETS.find((p) => p.id === presetId) || MOTION_PRESETS[0];
      const linkedSymptom = SYMPTOM_CARDS.find((c) => c.presetId === preset.id) || null;
      const newCandidate = NEW_CANDIDATE_PRESETS.find((c) => c.id === preset.id) || null;

      state.isNeutralSpecimen = false;
      state.symptomId = linkedSymptom ? linkedSymptom.id : null;
      state.presetId = preset.id;
      state.recommendedLines = [...preset.recommendedLines];
      state.manualScrub = null;
      state.playing = true;
      state.phase01 = 0.28;

      fasciaSystem.setOnlyLines(preset.recommendedLines);
      syncLineCheckboxes();
      syncScrubSliderRange(preset);

      if (newCandidate) {
        renderClinicalCarte({
          title: newCandidate.label,
          pitfall: newCandidate.pitfall,
          chain: newCandidate.chain,
          careSteps: newCandidate.careSteps,
        });
      } else if (linkedSymptom) {
        renderClinicalCarte({
          title: preset.label,
          pitfall: linkedSymptom.pitfall,
          chain: linkedSymptom.chain,
          careSteps: linkedSymptom.careSteps,
        });
      } else {
        const fallback = STANDALONE_MOTION_CARDS[preset.id];
        if (fallback) {
          renderClinicalCarte({
            title: fallback.title,
            pitfall: fallback.pitfall,
            chain: fallback.chain,
            careSteps: fallback.careSteps,
          });
        }
      }

      syncSelectionActiveStates();
      syncPlayBtnUI();
      setCameraView(preset.defaultCamera || 'front', immediateCam);
    };

    // -------------------------------------------------------------------------
    // STEP 1（場所5択）＆ STEP 2（該当する2〜4症状のみ表示）DOM 構築
    // -------------------------------------------------------------------------
    const renderSymptomStep2 = (regionId) => {
      const reg = BODY_REGIONS.find((r) => r.id === regionId) || BODY_REGIONS[0];
      state.selectedRegionId = reg.id;
      if (headingStep2El) {
        headingStep2El.textContent = `${reg.label}の症状`;
      }

      if (!symptomListEl) return;
      symptomListEl.innerHTML = '';

      const filtered = SYMPTOM_CARDS.filter(
        (c) => c.region === reg.id || (Array.isArray(c.alsoRegions) && c.alsoRegions.includes(reg.id)),
      );

      filtered.forEach((card, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn' + (card.id === state.symptomId ? ' is-active' : '');
        btn.dataset.symptomId = card.id;
        btn.setAttribute('aria-pressed', String(card.id === state.symptomId));

        const numSpan = document.createElement('span');
        numSpan.className = 'choice-num-badge';
        numSpan.textContent = CIRCLED_NUMS[idx] || String(idx + 1);

        const txtWrap = document.createElement('span');
        txtWrap.className = 'choice-text-wrap';

        const main = document.createElement('span');
        main.className = 'choice-main-title';
        main.textContent = card.title;

        const sub = document.createElement('span');
        sub.className = 'choice-sub-desc';
        sub.textContent =
          card.habitSub || (MOTION_PRESETS.find((p) => p.id === card.presetId) || {}).label || '';

        txtWrap.append(main, sub);

        const arrow = document.createElement('span');
        arrow.className = 'choice-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '➔';

        btn.append(numSpan, txtWrap, arrow);
        btn.addEventListener('click', () => {
          state.entrySource = 'symptom';
          applySymptomCard(card.id, false);
          goToPage('step-3');
        });

        symptomListEl.appendChild(btn);
      });
    };

    if (regionBtnListEl) {
      regionBtnListEl.innerHTML = '';
      for (const reg of BODY_REGIONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.dataset.regionId = reg.id;

        const numSpan = document.createElement('span');
        numSpan.className = 'choice-num-badge';
        numSpan.textContent = reg.num;

        const txtWrap = document.createElement('span');
        txtWrap.className = 'choice-text-wrap';

        const main = document.createElement('span');
        main.className = 'choice-main-title';
        main.textContent = reg.label;

        const sub = document.createElement('span');
        sub.className = 'choice-sub-desc';
        sub.textContent = reg.sub;

        txtWrap.append(main, sub);

        const arrow = document.createElement('span');
        arrow.className = 'choice-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '➔';

        btn.append(numSpan, txtWrap, arrow);
        btn.addEventListener('click', () => {
          renderSymptomStep2(reg.id);
          if (reg.previewCamera) setCameraView(reg.previewCamera, false);
          goToPage('step-2');
        });
        regionBtnListEl.appendChild(btn);
      }
    }

    // -------------------------------------------------------------------------
    // サブページ A：4カテゴリ別・16の動作一覧
    // -------------------------------------------------------------------------
    const renderMotionPresetList = () => {
      if (!presetListEl) return;
      presetListEl.innerHTML = '';

      const filtered = MOTION_PRESETS.filter((p) => p.motionGroup === state.selectedMotionCat);
      filtered.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn' + (p.id === state.presetId ? ' is-active' : '');
        btn.dataset.presetId = p.id;
        btn.setAttribute('aria-pressed', String(p.id === state.presetId));

        const numSpan = document.createElement('span');
        numSpan.className = 'choice-num-badge';
        numSpan.textContent = CIRCLED_NUMS[idx] || String(idx + 1);

        const txtWrap = document.createElement('span');
        txtWrap.className = 'choice-text-wrap';

        const main = document.createElement('span');
        main.className = 'choice-main-title';
        main.textContent = p.label;

        const sub = document.createElement('span');
        sub.className = 'choice-sub-desc';
        sub.textContent = p.category;

        txtWrap.append(main, sub);
        btn.append(numSpan, txtWrap);
        btn.addEventListener('click', () => {
          applyMotionPreset(p.id);
        });
        presetListEl.appendChild(btn);
      });
    };

    if (motionCatBarEl) {
      motionCatBarEl.innerHTML = '';
      for (const cat of MOTION_CATEGORIES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'motion-cat-btn' + (cat.id === state.selectedMotionCat ? ' is-active' : '');
        btn.dataset.motionCat = cat.id;
        btn.textContent = `${cat.num}. ${cat.label}`;
        btn.addEventListener('click', () => {
          state.selectedMotionCat = cat.id;
          motionCatBarEl.querySelectorAll('.motion-cat-btn').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.motionCat === cat.id);
          });
          renderMotionPresetList();
        });
        motionCatBarEl.appendChild(btn);
      }
    }
    renderMotionPresetList();

    // -------------------------------------------------------------------------
    // サブページ B：全11筋膜ライン個別ON/OFF
    // -------------------------------------------------------------------------
    if (lineListEl) {
      lineListEl.innerHTML = '';
      let lastGroup = '';
      for (const def of FASCIA_LINE_DEFS) {
        if (def.group && def.group !== lastGroup) {
          lastGroup = def.group;
          const grpEl = document.createElement('div');
          grpEl.className = 'line-group-label';
          grpEl.textContent = def.group;
          lineListEl.appendChild(grpEl);
        }

        const label = document.createElement('label');
        label.className = 'line-toggle-item' + (fasciaSystem.isLineVisible(def.id) ? ' is-checked' : '');
        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.dataset.lineId = def.id;
        inp.checked = fasciaSystem.isLineVisible(def.id);
        inp.addEventListener('change', () => {
          fasciaSystem.setLineVisible(def.id, inp.checked);
          label.classList.toggle('is-checked', inp.checked);
        });

        const swatch = document.createElement('span');
        swatch.className = 'line-swatch';
        swatch.style.backgroundColor = def.accentHex;

        const textWrap = document.createElement('span');
        textWrap.className = 'line-text-wrap';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'line-title';
        titleSpan.textContent = def.name;
        const subSpan = document.createElement('span');
        subSpan.className = 'line-sub';
        subSpan.textContent = def.subtitle;
        textWrap.append(titleSpan, subSpan);

        label.append(inp, swatch, textWrap);
        lineListEl.appendChild(label);
      }
    }

    document.getElementById('btn-lines-recommended')?.addEventListener('click', () => {
      fasciaSystem.setOnlyLines(state.recommendedLines);
      syncLineCheckboxes();
    });
    document.getElementById('btn-lines-all')?.addEventListener('click', () => {
      fasciaSystem.setOnlyLines(FASCIA_LINE_DEFS.map((d) => d.id));
      syncLineCheckboxes();
    });
    document.getElementById('btn-lines-none')?.addEventListener('click', () => {
      fasciaSystem.setOnlyLines([]);
      syncLineCheckboxes();
    });

    if (stationCheckbox) {
      stationCheckbox.checked = fasciaSystem.isStationsVisible();
      stationCheckbox.addEventListener('change', () => {
        fasciaSystem.setStationsVisible(stationCheckbox.checked);
      });
    }

    // -------------------------------------------------------------------------
    // スライダー・再生・リセット・カメラ・通常/ダークモード1ボタン切替
    // -------------------------------------------------------------------------
    playToggleBtn?.addEventListener('click', () => {
      state.playing = !state.playing;
      if (state.playing) {
        state.manualScrub = null;
      }
      syncPlayBtnUI();
    });

    resetPoseBtn?.addEventListener('click', () => {
      state.playing = false;
      state.manualScrub = 0;
      state.phase01 = 0;
      if (scrubSlider) scrubSlider.value = '0';
      clearCareZoomHighlight();
      syncPlayBtnUI();
    });

    scrubSlider?.addEventListener('input', () => {
      const v = Number(scrubSlider.value) / 100;
      state.playing = false;
      state.manualScrub = v;
      syncPlayBtnUI();
    });

    document.querySelectorAll('[data-cam-view]').forEach((btn) => {
      btn.addEventListener('click', () => setCameraView(btn.dataset.camView, false));
    });

    themeBtn?.addEventListener('click', () => {
      state.darkTheme = !state.darkTheme;
      document.body.classList.toggle('theme-dark', state.darkTheme);
      sharedUniforms.uDarkTheme.value = state.darkTheme ? 1.0 : 0.0;
      ringMat.color.setHex(state.darkTheme ? 0x64748b : 0x64748b);
      themeBtn.setAttribute('aria-pressed', String(state.darkTheme));
      themeBtn.querySelectorAll('[data-theme-pill]').forEach((el) => {
        const isDarkPill = el.dataset.themePill === 'dark';
        el.classList.toggle('is-active', isDarkPill === state.darkTheme);
      });
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', state.darkTheme ? '#0B1220' : '#EEF2F7');
      }
    });

    // 初期モデルのセットアップ（通常時は静止した全11筋膜標本、HPコラム等のURLクエリ指定時は該当アニメを直接表示）
    renderClinicalCarte({
      title: SYMPTOM_CARDS[0].title,
      pitfall: SYMPTOM_CARDS[0].pitfall,
      chain: SYMPTOM_CARDS[0].chain,
      careSteps: SYMPTOM_CARDS[0].careSteps,
    });
    renderSymptomStep2(state.selectedRegionId);

    const urlParams = new URLSearchParams(window.location.search);
    const querySymptom = urlParams.get('symptom');
    const queryMotion = urlParams.get('motion');
    const matchedSymptom = querySymptom ? SYMPTOM_CARDS.find((c) => c.id === querySymptom) : null;
    const matchedMotion = queryMotion ? ALL_MOTION_PRESETS.find((p) => p.id === queryMotion) : null;

    if (matchedSymptom) {
      state.selectedRegionId = matchedSymptom.region || state.selectedRegionId;
      renderSymptomStep2(state.selectedRegionId);
      state.entrySource = 'symptom';
      applySymptomCard(matchedSymptom.id, true);
      goToPage('step-3');
    } else if (matchedMotion) {
      state.entrySource = 'motions';
      applyMotionPreset(matchedMotion.id, true);
      goToPage('step-3');
    } else {
      enterNeutralSpecimenMode(true);
      goToPage('step-1');
    }

    const onResize = () => {
      const w = Math.max(1, stageEl.clientWidth);
      const h = Math.max(1, stageEl.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(onResize).observe(stageEl);
    }
    window.addEventListener('resize', onResize);

    if (loaderOverlay) {
      loaderOverlay.classList.add('is-hidden');
      setTimeout(() => loaderOverlay.remove(), 420);
    }

    // -------------------------------------------------------------------------
    // メインアニメーション＆姿勢スライダー表示更新ループ
    // -------------------------------------------------------------------------
    const updateScrubReadout = (params, preset) => {
      const scrubPct = Math.round((params.scrub || 0) * 100);
      if (state.playing && scrubSlider) {
        scrubSlider.value = String(scrubPct);
      }
      if (scrubValueEl) {
        if (preset.bidirectional) {
          if (Math.abs(scrubPct) <= 2) {
            scrubValueEl.textContent = '中央 0%（均等）';
          } else if (preset.id === 'spiral-functional-twist') {
            scrubValueEl.textContent =
              scrubPct > 0 ? `左ひねり ${scrubPct}%` : `右ひねり ${Math.abs(scrubPct)}%`;
          } else {
            scrubValueEl.textContent =
              scrubPct > 0 ? `右足荷重 ${scrubPct}%` : `左足荷重 ${Math.abs(scrubPct)}%`;
          }
        } else {
          scrubValueEl.textContent = scrubPct <= 2 ? '中立 0%' : `動きの深さ ${scrubPct}%`;
        }
      }
    };

    const tick = (nowMs) => {
      requestAnimationFrame(tick);

      const dt = Math.min(0.05, Math.max(0, (nowMs - state.lastFrameMs) / 1000));
      state.lastFrameMs = nowMs;
      sharedUniforms.uTime.value = nowMs * 0.001;

      const curPreset = ALL_MOTION_PRESETS.find((p) => p.id === state.presetId) || MOTION_PRESETS[0];
      if (state.playing && !state.isNeutralSpecimen) {
        state.phase01 = (state.phase01 + dt / curPreset.cycleSec) % 1.0;
      }

      if (camTween) {
        const u = Math.min(1, (nowMs - camTween.t0) / camTween.dur);
        const ease = 1 - Math.pow(1 - u, 3);
        camera.position.lerpVectors(camTween.fromPos, camTween.toPos, ease);
        controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, ease);
        if (u >= 1) camTween = null;
      }
      controls.update();

      const nowSec = nowMs * 0.001;
      const motionParams = computeMotionParams({
        presetId: state.presetId,
        phase01: state.phase01,
        manualScrub: state.isNeutralSpecimen ? 0.0 : state.manualScrub,
        intensity: state.intensity,
      });
      if (state.activeZoomKey) {
        applySelfCarePoseOverride(motionParams, state.activeZoomKey, state.activeCareTool, nowSec);
      }

      solveRigMatrices(motionParams, boneMats);
      fasciaSystem.update(boneMats, camera.quaternion, motionParams);
      updateScrubReadout(motionParams, curPreset);

      if (selfCareGuide.isActive()) {
        selfCareGuide.update(nowSec, dt);
      }

      if (focusMarker.visible && state.focusTrack) {
        focusMarker.position.copy(state.focusTrack.restPosVec).applyMatrix4(boneMats[state.focusTrack.bone]);
        focusMarker.quaternion.copy(camera.quaternion);
        const pulse = 1.0 + 0.08 * Math.sin(nowMs * 0.005);
        focusMarker.scale.setScalar(pulse);
      }

      renderer.render(scene, camera);
    };

    const isLocalDev = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (isLocalDev) {
      window.__fasciaOnlyBridge = {
        state,
        applySymptomCard,
        applyMotionPreset,
        goToPage,
        zoomToCareTarget,
        activateCare3DGuide,
        clearCareZoomHighlight,
        selfCareGuide,
      };
    }

    requestAnimationFrame(tick);
  } catch (err) {
    console.error('[fascia-only] 初期化エラー:', err);
    if (loaderText) {
      loaderText.textContent = '3Dデータの読み込みに失敗しました。ページを再読み込みしてください。';
    }
  }
}

bootstrap();
