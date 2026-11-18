// =============================================================================
// fascia_only_biomechanics.js — 筋膜シート単体ビューア専用：22剛体ボーン運動連鎖・接地IK・スキニング基盤
//
// 特徴:
// - 既存アプリのコードには一切依存・干渉しない完全独立モジュール
// - 全身22剛体ボーン（骨盤・脊椎・頭頸部・左右下肢3節・左右肩甲帯・上腕・尺骨・橈骨・手部）により、
//   16種類の日常姿勢・仕事動作・スポーツ動作（片足休め荷重、デスクPCマウス回内、スマホ首、
//   猫背食いしばり、椅子ずっこけ座り、足組み座り、腕組み、片腰抱っこ、前かがみ、反り腰、
//   バンザイ挙上、手元回内作業、ラン片足着地、らせんスイング）を脱臼・骨歪み 0.0mm で再現する。
// - CPU（JS）とGPU（GLSL頂点シェーダー）が同一の22ボーン変換行列 `uBoneMats[22]` を共有するため、
//   骨格・全11アナトミートレイン連続筋膜シート・骨付着ピンが完全同期する。
// =============================================================================

import * as THREE from 'three';
import { MOTION_PRESETS, ALL_MOTION_PRESETS } from './fascia_only_clinical_data.js?v=20261118d';

export { MOTION_PRESETS, ALL_MOTION_PRESETS };

// -----------------------------------------------------------------------------
// GLB 座標整合定数（viewer.js と完全一致）
// ワールド座標系: 身長 ≈ 6.5単位（足底 y ≈ -3.285, 頭頂 y ≈ +3.09）
// 正面 = +Z, 本人左 = +X, 本人右 = -X
// -----------------------------------------------------------------------------
export const MUSCLE_TF = {
  center: [-0.6569976806640625, -97.01134777069092, 816.8721876144409],
  scale: 0.004,
};
export const SKELETON_TF = {
  center: [-0.667999267578125, -109.74665069580078, 817.0244853496552],
  scale: 0.0025,
};
export const SKELETON_SCALE = MUSCLE_TF.scale / SKELETON_TF.scale; // 1.6
export const SKELETON_OFFSET = new THREE.Vector3(
  (SKELETON_TF.center[0] - MUSCLE_TF.center[0]) * MUSCLE_TF.scale,
  (SKELETON_TF.center[2] - MUSCLE_TF.center[2]) * MUSCLE_TF.scale,
  -(SKELETON_TF.center[1] - MUSCLE_TF.center[1]) * MUSCLE_TF.scale,
);

export const GROUND_Y = -3.285;

// -----------------------------------------------------------------------------
// 22剛体ボーン定義（尺骨と橈骨を分離し前腕の回内クロスも剛体再現）
// -----------------------------------------------------------------------------
export const BONE = {
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
};
export const BONE_COUNT = 22;

// -----------------------------------------------------------------------------
// 解剖学的関節ピボット実測ワールド座標
// -----------------------------------------------------------------------------
export const JOINTS = {
  hipR: new THREE.Vector3(-0.195, -0.02, -0.03),
  hipL: new THREE.Vector3(+0.195, -0.02, -0.03),
  kneeR: new THREE.Vector3(-0.305, -1.62, +0.02),
  kneeL: new THREE.Vector3(+0.305, -1.62, +0.02),
  ankleR: new THREE.Vector3(-0.345, -3.02, -0.08),
  ankleL: new THREE.Vector3(+0.345, -3.02, -0.08),
  l5s1: new THREE.Vector3(0, +0.26, -0.08),
  l3: new THREE.Vector3(0, +0.68, -0.06),
  t12: new THREE.Vector3(0, +1.06, -0.07),
  t6: new THREE.Vector3(0, +1.56, -0.10),
  c7t1: new THREE.Vector3(0, +2.10, -0.08),
  c4: new THREE.Vector3(0, +2.34, -0.06),
  c0c1: new THREE.Vector3(0, +2.58, -0.05),

  // 胸鎖関節・肩甲帯ピボット
  scR: new THREE.Vector3(-0.11, +2.11, +0.11),
  scL: new THREE.Vector3(+0.11, +2.11, +0.11),
  // 肩甲上腕関節
  shoulderR: new THREE.Vector3(-0.72, +2.02, -0.08),
  shoulderL: new THREE.Vector3(+0.72, +2.02, -0.08),
  // 腕尺関節（肘ヒンジ）
  elbowR: new THREE.Vector3(-0.865, +0.925, -0.128),
  elbowL: new THREE.Vector3(+0.865, +0.925, -0.128),
  // 近位橈尺関節（橈骨頭）〜 遠位橈尺関節（尺骨頭）：前腕回内・回外軸
  radHeadR: new THREE.Vector3(-0.9300, +0.8869, -0.1080),
  radHeadL: new THREE.Vector3(+0.9300, +0.8869, -0.1080),
  ulnaHeadR: new THREE.Vector3(-0.9565, +0.0322, +0.0585),
  ulnaHeadL: new THREE.Vector3(+0.9565, +0.0322, +0.0585),
  // 橈骨手根関節（手首）
  wristR: new THREE.Vector3(-1.012, +0.016, +0.068),
  wristL: new THREE.Vector3(+1.012, +0.016, +0.068),
};

const PRON_AXIS_R = new THREE.Vector3().subVectors(JOINTS.ulnaHeadR, JOINTS.radHeadR).normalize();
const PRON_AXIS_L = new THREE.Vector3().subVectors(JOINTS.ulnaHeadL, JOINTS.radHeadL).normalize();

// -----------------------------------------------------------------------------
// 全11筋膜ライン対応：ピン留め部（筋膜の癒着・付着ポイント）定義（42箇所）
// -----------------------------------------------------------------------------
export const BONY_STATIONS = [
  // 下肢・骨盤（右側）
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

  // 下肢・骨盤（左側）
  { id: 'mt5-l', label: '左 第5中足骨底（足の外側）', pos: [+0.48, -3.22, +0.02], bone: BONE.FOOT_L, lines: ['LL'] },
  { id: 'calc-l', label: '左 踵骨（かかとの付着部）', pos: [+0.34, -3.20, -0.18], bone: BONE.FOOT_L, lines: ['SBL'] },
  { id: 'mal-l', label: '左 外果（外くるぶし後方）', pos: [+0.44, -3.06, -0.20], bone: BONE.SHANK_L, lines: ['LL'] },
  { id: 'fib-l', label: '左 腓骨頭（すね外側の上端）', pos: [+0.43, -1.72, -0.19], bone: BONE.SHANK_L, lines: ['LL', 'SPL'] },
  { id: 'gerdy-l', label: '左 ガーディ結節（腸脛靱帯の下端）', pos: [+0.41, -1.66, -0.05], bone: BONE.SHANK_L, lines: ['LL', 'SPL'] },
  { id: 'gt-l', label: '左 大転子（太もも外側のピン留め部）', pos: [+0.56, -0.04, -0.10], bone: BONE.FEMUR_L, lines: ['LL', 'BFL'] },
  { id: 'asis-l', label: '左 上前腸骨棘（骨盤の前かど）', pos: [+0.38, +0.26, +0.16], bone: BONE.PELVIS, lines: ['LL', 'SPL', 'SFL'] },
  { id: 'crest-l', label: '左 腸骨稜（骨盤の上の縁）', pos: [+0.50, +0.56, -0.06], bone: BONE.PELVIS, lines: ['LL', 'DFL'] },

  // 体幹・頭頸部コアのピン留め部
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

  // 上肢・肩甲帯のピン留め部（アーム4ライン＆ファンクショナルライン）
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

// -----------------------------------------------------------------------------
// 骨格メッシュ ID -> 22ボーンインデックス＆重み判定（100%剛体保護）
// -----------------------------------------------------------------------------
const SKEL_SINGLE_BONE = new Map();

function initSkeletonBoneMap() {
  if (SKEL_SINGLE_BONE.size > 0) return;

  const addAll = (ids, boneIdx) => {
    for (const id of ids) SKEL_SINGLE_BONE.set(id, boneIdx);
  };

  // 骨盤
  addAll(['sacrum', 'right-hip-bone', 'left-hip-bone'], BONE.PELVIS);

  // 頭蓋骨・上位頸椎・下顎・舌骨
  addAll(
    [
      'frontal-bone', 'right-parietal-bone', 'left-parietal-bone', 'occipital-bone',
      'right-temporal-bone', 'left-temporal-bone', 'sphenoid-bone', 'ethmoid-bone',
      'right-nasal-bone', 'right-lacrimal-bone', 'right-zygomatic-bone', 'right-maxilla',
      'right-palatine-bone', 'right-inferior-nasal-concha',
      'left-nasal-bone', 'left-lacrimal-bone', 'left-zygomatic-bone', 'left-maxilla',
      'left-palatine-bone', 'left-inferior-nasal-concha',
      'vomer', 'mandible', 'hyoid-bone', 'atlas-c1', 'axis-c2',
    ],
    BONE.HEAD,
  );

  // 上部胸郭（T1〜T6・第1〜6肋骨・胸骨）※鎖骨・肩甲骨は GIRDLE_R/L に分離！
  addAll(
    [
      'manubrium-of-sternum', 'body-of-sternum', 'xiphoid-process',
      'first-thoracic-vertebra-t1', 'second-thoracic-vertebra-t2', 'third-thoracic-vertebra-t3',
      'fourth-thoracic-vertebra-t4', 'fifth-thoracic-vertebra-t5', 'sixth-thoracic-vertebra-t6',
      'intervertebral-disc-t1-t2', 'intervertebral-disc-t2-t3', 'intervertebral-disc-t3-t4',
      'intervertebral-disc-t4-t5', 'intervertebral-disc-t5-t6',
      'right-first-rib', 'right-second-rib', 'right-third-rib', 'right-fourth-rib', 'right-fifth-rib', 'right-sixth-rib',
      'left-first-rib', 'left-second-rib', 'left-third-rib', 'left-fourth-rib', 'left-fifth-rib', 'left-sixth-rib',
      'right-first-costal-cartilage', 'right-second-costal-cartilage', 'right-third-costal-cartilage',
      'right-fourth-costal-cartilage', 'right-fifth-costal-cartilage', 'right-sixth-costal-cartilage',
      'left-first-costal-cartilage', 'left-second-costal-cartilage', 'left-third-costal-cartilage',
      'left-fourth-costal-cartilage', 'left-fifth-costal-cartilage', 'left-sixth-costal-cartilage',
    ],
    BONE.THORAX_HIGH,
  );

  // 下部胸郭（T7〜T12・第7〜12肋骨）
  addAll(
    [
      'seventh-thoracic-vertebra-t7', 'eighth-thoracic-vertebra-t8', 'ninth-thoracic-vertebra-t9',
      'tenth-thoracic-vertebra-t10', 'eleventh-thoracic-vertebra-t11', 'twelfth-thoracic-vertebra-t12',
      'intervertebral-disc-t6-t7', 'intervertebral-disc-t7-t8', 'intervertebral-disc-t8-t9',
      'intervertebral-disc-t9-t10', 'intervertebral-disc-t10-t11', 'intervertebral-disc-t11-t12',
      'right-seventh-rib', 'right-eighth-rib', 'right-ninth-rib', 'right-tenth-rib', 'right-eleventh-rib', 'right-twelfth-rib',
      'left-seventh-rib', 'left-eighth-rib', 'left-ninth-rib', 'left-tenth-rib', 'left-eleventh-rib', 'left-twelfth-rib',
      'right-seventh-costal-cartilage', 'right-lower-costal-cartilages',
      'left-seventh-costal-cartilage', 'left-lower-costal-cartilages',
    ],
    BONE.THORAX_LOW,
  );

  // 右下肢
  addAll(['right-femur', 'right-patella'], BONE.FEMUR_R);
  addAll(['right-tibia', 'right-fibula'], BONE.SHANK_R);
  addAll(
    [
      'right-talus', 'right-calcaneus', 'right-navicular', 'right-cuboid',
      'right-medial-cuneiform', 'right-intermediate-cuneiform', 'right-lateral-cuneiform',
      'right-first-metatarsal-bone', 'right-second-metatarsal-bone', 'right-third-metatarsal-bone',
      'right-fourth-metatarsal-bone', 'right-fifth-metatarsal-bone',
      'right-big-toe-proximal-phalanx', 'right-second-toe-proximal-phalanx', 'right-third-toe-proximal-phalanx',
      'right-fourth-toe-proximal-phalanx', 'right-little-toe-proximal-phalanx',
      'right-second-toe-middle-phalanx', 'right-third-toe-middle-phalanx',
      'right-fourth-toe-middle-phalanx', 'right-little-toe-middle-phalanx',
      'right-big-toe-distal-phalanx', 'right-second-toe-distal-phalanx', 'right-third-toe-distal-phalanx',
      'right-fourth-toe-distal-phalanx', 'right-little-toe-distal-phalanx',
      'right-sesamoid-bones-of-the-foot',
    ],
    BONE.FOOT_R,
  );

  // 左下肢
  addAll(['left-femur', 'left-patella'], BONE.FEMUR_L);
  addAll(['left-tibia', 'left-fibula'], BONE.SHANK_L);
  addAll(
    [
      'left-talus', 'left-calcaneus', 'left-navicular', 'left-cuboid',
      'left-medial-cuneiform', 'left-intermediate-cuneiform', 'left-lateral-cuneiform',
      'left-first-metatarsal-bone', 'left-second-metatarsal-bone', 'left-third-metatarsal-bone',
      'left-fourth-metatarsal-bone', 'left-fifth-metatarsal-bone',
      'left-big-toe-proximal-phalanx', 'left-second-toe-proximal-phalanx', 'left-third-toe-proximal-phalanx',
      'left-fourth-toe-proximal-phalanx', 'left-little-toe-proximal-phalanx',
      'left-second-toe-middle-phalanx', 'left-third-toe-middle-phalanx',
      'left-fourth-toe-middle-phalanx', 'left-little-toe-middle-phalanx',
      'left-big-toe-distal-phalanx', 'left-second-toe-distal-phalanx', 'left-third-toe-distal-phalanx',
      'left-fourth-toe-distal-phalanx', 'left-little-toe-distal-phalanx',
      'left-sesamoid-bones-of-the-foot',
    ],
    BONE.FOOT_L,
  );

  // 肩甲帯・上肢（左右完全分離：肩甲帯 -> 上腕 -> 尺骨 / 橈骨 -> 手骨格）
  addAll(['right-clavicle', 'right-scapula'], BONE.GIRDLE_R);
  addAll(['left-clavicle', 'left-scapula'], BONE.GIRDLE_L);
  addAll(['right-humerus'], BONE.HUMERUS_R);
  addAll(['left-humerus'], BONE.HUMERUS_L);
  addAll(['right-ulna'], BONE.ULNA_R);
  addAll(['left-ulna'], BONE.ULNA_L);
  addAll(['right-radius'], BONE.RADIUS_R);
  addAll(['left-radius'], BONE.RADIUS_L);

  addAll(
    [
      'right-scaphoid', 'right-lunate', 'right-triquetral', 'right-pisiform',
      'right-trapezium', 'right-trapezoid', 'right-capitate', 'right-hamate',
      'right-first-metacarpal-bone', 'right-second-metacarpal-bone', 'right-third-metacarpal-bone',
      'right-fourth-metacarpal-bone', 'right-fifth-metacarpal-bone',
      'right-thumb-proximal-phalanx', 'right-index-finger-proximal-phalanx', 'right-middle-finger-proximal-phalanx',
      'right-ring-finger-proximal-phalanx', 'right-little-finger-proximal-phalanx',
      'right-index-finger-middle-phalanx', 'right-middle-finger-middle-phalanx',
      'right-ring-finger-middle-phalanx', 'right-little-finger-middle-phalanx',
      'right-thumb-distal-phalanx', 'right-index-finger-distal-phalanx', 'right-middle-finger-distal-phalanx',
      'right-ring-finger-distal-phalanx', 'right-little-finger-distal-phalanx',
      'right-sesamoid-bones-of-the-hand',
    ],
    BONE.HAND_R,
  );

  addAll(
    [
      'left-scaphoid', 'left-lunate', 'left-triquetral', 'left-pisiform',
      'left-trapezium', 'left-trapezoid', 'left-capitate', 'left-hamate',
      'left-first-metacarpal-bone', 'left-second-metacarpal-bone', 'left-third-metacarpal-bone',
      'left-fourth-metacarpal-bone', 'left-fifth-metacarpal-bone',
      'left-thumb-proximal-phalanx', 'left-index-finger-proximal-phalanx', 'left-middle-finger-proximal-phalanx',
      'left-ring-finger-proximal-phalanx', 'left-little-finger-proximal-phalanx',
      'left-index-finger-middle-phalanx', 'left-middle-finger-middle-phalanx',
      'left-ring-finger-middle-phalanx', 'left-little-finger-middle-phalanx',
      'left-thumb-distal-phalanx', 'left-index-finger-distal-phalanx', 'left-middle-finger-distal-phalanx',
      'left-ring-finger-distal-phalanx', 'left-little-finger-distal-phalanx',
      'left-sesamoid-bones-of-the-hand',
    ],
    BONE.HAND_L,
  );
}

// 椎骨ごとの滑らかな2ボーン剛体ペア（椎骨1個の中では全頂点均一ウェイトなので一切歪まない）
const VERTEBRA_BLEND = {
  'intervertebral-disc-l5-s1': [BONE.PELVIS, 0.78, BONE.LUMBAR, 0.22],
  'fifth-lumbar-vertebra-l5': [BONE.PELVIS, 0.62, BONE.LUMBAR, 0.38],
  'intervertebral-disc-l4-l5': [BONE.PELVIS, 0.42, BONE.LUMBAR, 0.58],
  'fourth-lumbar-vertebra-l4': [BONE.PELVIS, 0.24, BONE.LUMBAR, 0.76],
  'intervertebral-disc-l3-l4': [BONE.PELVIS, 0.10, BONE.LUMBAR, 0.90],
  'third-lumbar-vertebra-l3': [BONE.LUMBAR, 1.0, BONE.PELVIS, 0.0],
  'intervertebral-disc-l2-l3': [BONE.LUMBAR, 0.80, BONE.THORAX_LOW, 0.20],
  'second-lumbar-vertebra-l2': [BONE.LUMBAR, 0.62, BONE.THORAX_LOW, 0.38],
  'intervertebral-disc-l1-l2': [BONE.LUMBAR, 0.42, BONE.THORAX_LOW, 0.58],
  'first-lumbar-vertebra-l1': [BONE.LUMBAR, 0.24, BONE.THORAX_LOW, 0.76],
  'intervertebral-disc-t12-l1': [BONE.LUMBAR, 0.10, BONE.THORAX_LOW, 0.90],

  'intervertebral-disc-c7-t1': [BONE.THORAX_HIGH, 0.80, BONE.NECK, 0.20],
  'seventh-cervical-vertebra-c7': [BONE.THORAX_HIGH, 0.60, BONE.NECK, 0.40],
  'intervertebral-disc-c6-c7': [BONE.THORAX_HIGH, 0.38, BONE.NECK, 0.62],
  'sixth-cervical-vertebra-c6': [BONE.THORAX_HIGH, 0.18, BONE.NECK, 0.82],
  'intervertebral-disc-c5-c6': [BONE.NECK, 0.92, BONE.THORAX_HIGH, 0.08],
  'fifth-cervical-vertebra-c5': [BONE.NECK, 1.0, BONE.HEAD, 0.0],
  'intervertebral-disc-c4-c5': [BONE.NECK, 0.86, BONE.HEAD, 0.14],
  'fourth-cervical-vertebra-c4': [BONE.NECK, 0.68, BONE.HEAD, 0.32],
  'intervertebral-disc-c3-c4': [BONE.NECK, 0.48, BONE.HEAD, 0.52],
  'third-cervical-vertebra-c3': [BONE.NECK, 0.30, BONE.HEAD, 0.70],
  'intervertebral-disc-c2-c3': [BONE.NECK, 0.14, BONE.HEAD, 0.86],
};

export function getSkeletonMeshSkin(structureId = '') {
  initSkeletonBoneMap();
  if (VERTEBRA_BLEND[structureId]) {
    const [b0, w0, b1, w1] = VERTEBRA_BLEND[structureId];
    return { idx: [b0, b1, 0, 0], w: [w0, w1, 0, 0] };
  }
  if (SKEL_SINGLE_BONE.has(structureId)) {
    return { idx: [SKEL_SINGLE_BONE.get(structureId), 0, 0, 0], w: [1, 0, 0, 0] };
  }
  if (/^right-.*(carpal|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|thumb|finger|hand)/.test(structureId)) {
    return { idx: [BONE.HAND_R, 0, 0, 0], w: [1, 0, 0, 0] };
  }
  if (/^left-.*(carpal|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|thumb|finger|hand)/.test(structureId)) {
    return { idx: [BONE.HAND_L, 0, 0, 0], w: [1, 0, 0, 0] };
  }
  return { idx: [BONE.THORAX_HIGH, 0, 0, 0], w: [1, 0, 0, 0] };
}

// -----------------------------------------------------------------------------
// 16種類の日常動作・姿勢プリセットから現在のモーション状態を生成
// -----------------------------------------------------------------------------
export function computeMotionParams({
  presetId = 'right-stance',
  phase01 = 0,
  manualScrub = null,
  manualWeightShift = null, // 後方互換エイリアス
  intensity = 1.0,
}) {
  const rawWave = 0.5 - 0.5 * Math.cos(phase01 * Math.PI * 2); // 0 -> 1 -> 0
  // ピーク付近で少しタメを作って伸び縮みの色と数値をじっくり観察しやすくする
  const smoothPulse = Math.pow(rawWave * rawWave * (3 - 2 * rawWave), 0.86);
  const biWave = Math.sin(phase01 * Math.PI * 2); // -1 .. +1
  const smoothBi = Math.sign(biWave) * Math.pow(Math.abs(biWave), 0.80);

  const preset = ALL_MOTION_PRESETS.find((p) => p.id === presetId) || MOTION_PRESETS[0];
  const isBi = Boolean(preset.bidirectional);

  const effectiveManual =
    manualScrub !== null && Number.isFinite(manualScrub)
      ? manualScrub
      : manualWeightShift !== null && Number.isFinite(manualWeightShift)
      ? manualWeightShift
      : null;

  let scrub = 0;
  if (effectiveManual !== null) {
    scrub = isBi
      ? THREE.MathUtils.clamp(effectiveManual, -1, 1)
      : THREE.MathUtils.clamp(effectiveManual, 0, 1);
  } else if (presetId === 'right-stance') {
    scrub = smoothPulse * intensity;
  } else if (presetId === 'left-stance') {
    scrub = -smoothPulse * intensity;
  } else if (isBi) {
    scrub = smoothBi * intensity;
  } else {
    scrub = smoothPulse * intensity;
  }

  // 全チャンネルの初期値（scrub === 0 のとき厳密に全 0 ＝ 解剖学的中立姿勢）
  const st = {
    presetId,
    bidirectional: isBi,
    scrub,
    isHabitComparison: false,
    habitLoad: 0,
    weightShift: 0, // [-1..+1] +1: 右足荷重, -1: 左足荷重
    lateralBend: 0, // [-1..+1] +1: 左側屈（右体側伸張）
    spiralTwist: 0, // [-1..+1] +1: 胸郭左回旋・骨盤右回旋
    forwardBow: 0,  // [0..1] 前かがみお辞儀

    // 追加専門チャンネル（全16動作＋新候補10動作を高精度に表現）
    sitAmount: 0,         // [0..1] 椅子座り股関節・膝屈曲
    crossLegR: 0,         // [0..1] 右脚を左膝の上へ組むクロス度
    swayBack: 0,          // [0..1] 反り腰（骨盤前傾＋腰椎過前弯＋胸郭後方スウェイ）
    runStrikeR: 0,        // [0..1] 右片足ラン着地
    slouchSlideZ: 0,      // [0..1] ソファーでお尻が前へ滑る仙骨座りスライド
    reclineChair: 0,      // [0..1] シャンプー台・歯科リクライニング仰向け傾斜
    reclineExtendLegs: 0, // [0..1] リクライニング時の両脚伸ばしきり度
    aguraSit: 0,          // [0..1] 床あぐら座位
    aguraAsym: 0,         // [0..1] あぐら時の右ひざ浮き・骨盤後傾ねじれ度
    sockLiftR: 0,         // [0..1] 立ったまま右足を抱え上げて靴下へ手を伸ばす度
    stairsDownR: 0,       // [0..1] 階段下りで右足首が硬く右膝が前内側へ出る局面

    // 脊椎・頭部追加オフセット（度）
    pelvisPitchAddDeg: 0,
    pelvisRollAddDeg: 0,
    pelvisYawAddDeg: 0,
    lumPitchDeg: 0,
    lumRollDeg: 0,
    lumYawDeg: 0,
    thoLowPitchDeg: 0,
    thoLowRollDeg: 0,
    thoLowYawDeg: 0,
    thoHighPitchDeg: 0,
    thoHighRollDeg: 0,
    thoHighYawDeg: 0,
    neckPitchDeg: 0,
    neckRollDeg: 0,
    neckYawDeg: 0,
    headPitchDeg: 0,
    headRollDeg: 0,
    headYawDeg: 0,

    // 右上肢（度）
    girdleProtractR: 0, // +: 巻き肩前方突出
    girdleElevateR: 0,  // +: 肩すくめ・上方回旋
    girdleAntTiltR: 0,  // +: 肩甲骨前傾
    humFlexR: 0,        // +: 前方挙上
    humAbductR: 0,      // +: 外転（バンザイ）
    humIntRotR: 0,      // +: 内旋
    elbowFlexR: 8,      // 自然な基本軽度屈曲は t に比例加算するため初期0ベースにする -> 下で設定
    pronationR: 0,      // +: 前腕回内（手のひら下向きクロス）
    wristExtR: 0,       // +: 手首背屈（甲側へ反らす）
    wristUlnarR: 0,

    // 左上肢（度）
    girdleProtractL: 0,
    girdleElevateL: 0,
    girdleAntTiltL: 0,
    humFlexL: 0,
    humAbductL: 0,
    humIntRotL: 0,
    elbowFlexL: 0,
    pronationL: 0,
    wristExtL: 0,
    wristUlnarL: 0,

    // 筋膜の生理学的収縮・滑車テンション係数（剛体内の腱膜・食いしばり・足底ウインドラス等）
    jawClench: 0,
    diaphragmSlump: 0,
    scalpPull: 0,
    plantarLoad: 0,
    forearmWorkR: 0,
  };
  st.elbowFlexR = 0;

  const t = Math.max(0, scrub);

  switch (presetId) {
    case 'right-stance':
    case 'left-stance':
    case 'alt-sway': {
      st.weightShift = scrub;
      st.elbowFlexR = 7 * Math.abs(scrub);
      st.elbowFlexL = 7 * Math.abs(scrub);
      break;
    }

    case 'desk-pc-mouse': {
      // デスクPC・マウス作業：胸椎丸まり＋下部頸椎前方＋画面を見る上位頸椎伸展＋両肩巻き肩＋右マウス回内背屈
      st.pelvisPitchAddDeg = -5 * t;
      st.lumPitchDeg = 7 * t;
      st.thoLowPitchDeg = 10 * t;
      st.thoHighPitchDeg = 14 * t;
      st.thoHighYawDeg = -3 * t;
      st.neckPitchDeg = 16 * t;
      st.headPitchDeg = -14 * t;

      st.girdleProtractR = 20 * t;
      st.girdleAntTiltR = 10 * t;
      st.girdleElevateR = 4 * t;
      st.humFlexR = 30 * t;
      st.humAbductR = 9 * t;
      st.humIntRotR = 28 * t;
      st.elbowFlexR = 78 * t;
      st.pronationR = 82 * t;
      st.wristExtR = 22 * t;
      st.wristUlnarR = 8 * t;

      st.girdleProtractL = 17 * t;
      st.girdleAntTiltL = 8 * t;
      st.girdleElevateL = 3 * t;
      st.humFlexL = 26 * t;
      st.humAbductL = 6 * t;
      st.humIntRotL = 36 * t;
      st.elbowFlexL = 82 * t;
      st.pronationL = 76 * t;
      st.wristExtL = 16 * t;

      st.forearmWorkR = 0.85 * t;
      break;
    }

    case 'phone-neck': {
      // スマホうつむき姿勢：頭が大きく前下へ落ち、胸前・腕前でスマホを保持
      st.pelvisPitchAddDeg = -6 * t;
      st.lumPitchDeg = 8 * t;
      st.thoLowPitchDeg = 12 * t;
      st.thoHighPitchDeg = 16 * t;
      st.neckPitchDeg = 25 * t;
      st.headPitchDeg = 15 * t;

      st.girdleProtractR = 16 * t;
      st.girdleAntTiltR = 9 * t;
      st.humFlexR = 34 * t;
      st.humIntRotR = 46 * t;
      st.elbowFlexR = 98 * t;
      st.pronationR = 32 * t;
      st.wristExtR = -8 * t;

      st.girdleProtractL = 15 * t;
      st.girdleAntTiltL = 8 * t;
      st.humFlexL = 30 * t;
      st.humIntRotL = 44 * t;
      st.elbowFlexL = 92 * t;
      st.pronationL = 36 * t;

      st.scalpPull = 1.0 * t;
      st.jawClench = 0.45 * t;
      st.diaphragmSlump = 0.55 * t;
      break;
    }

    case 'clench-slouch': {
      // 猫背・浅い呼吸・食いしばり姿勢：みぞおち陥没＋肩内巻き＋あご噛みしめ
      st.pelvisPitchAddDeg = -10 * t;
      st.lumPitchDeg = 14 * t;
      st.thoLowPitchDeg = 18 * t;
      st.thoHighPitchDeg = 16 * t;
      st.neckPitchDeg = 18 * t;
      st.headPitchDeg = -8 * t;

      st.girdleProtractR = 16 * t;
      st.girdleAntTiltR = 9 * t;
      st.girdleElevateR = 6 * t;
      st.humFlexR = 14 * t;
      st.humIntRotR = 32 * t;
      st.elbowFlexR = 26 * t;
      st.pronationR = 40 * t;

      st.girdleProtractL = 16 * t;
      st.girdleAntTiltL = 9 * t;
      st.girdleElevateL = 6 * t;
      st.humFlexL = 14 * t;
      st.humIntRotL = 32 * t;
      st.elbowFlexL = 26 * t;
      st.pronationL = 40 * t;

      st.jawClench = 1.0 * t;
      st.diaphragmSlump = 1.0 * t;
      st.scalpPull = 0.55 * t;
      break;
    }

    case 'chair-slouch-sit': {
      // 椅子の浅座り・ずっこけ座り（骨盤後傾＋股関節・膝屈曲＋腰丸まり）
      st.sitAmount = t;
      st.pelvisPitchAddDeg = -22 * t;
      st.lumPitchDeg = 30 * t;
      st.thoLowPitchDeg = 18 * t;
      st.thoHighPitchDeg = 13 * t;
      st.neckPitchDeg = 14 * t;
      st.headPitchDeg = -12 * t;

      st.girdleProtractR = 12 * t;
      st.humFlexR = 32 * t;
      st.humIntRotR = 26 * t;
      st.elbowFlexR = 56 * t;
      st.pronationR = 62 * t;

      st.girdleProtractL = 12 * t;
      st.humFlexL = 32 * t;
      st.humIntRotL = 26 * t;
      st.elbowFlexL = 56 * t;
      st.pronationL = 62 * t;

      st.diaphragmSlump = 0.78 * t;
      break;
    }

    case 'leg-cross-sit': {
      // 足を組んで座る（右脚上クロス＋骨盤後傾＆左下がりねじれ）
      st.sitAmount = t;
      st.crossLegR = t;
      st.pelvisPitchAddDeg = -16 * t;
      st.pelvisRollAddDeg = -9.5 * t; // 右腸骨稜が上がり左が下がる
      st.pelvisYawAddDeg = 8 * t;
      st.lumPitchDeg = 22 * t;
      st.lumRollDeg = 11.5 * t; // 立ち直り右側屈で右腰方形筋膜が縮み左腰が張る
      st.lumYawDeg = -7 * t;
      st.thoLowPitchDeg = 12 * t;
      st.thoLowRollDeg = 5 * t;
      st.thoLowYawDeg = -5 * t;
      st.thoHighPitchDeg = 9 * t;
      st.neckPitchDeg = 8 * t;
      st.neckRollDeg = -5 * t;
      st.headPitchDeg = -6 * t;

      st.girdleProtractR = 10 * t;
      st.humFlexR = 36 * t;
      st.humIntRotR = 30 * t;
      st.elbowFlexR = 62 * t;
      st.pronationR = 55 * t;

      st.girdleProtractL = 10 * t;
      st.humFlexL = 30 * t;
      st.humIntRotL = 26 * t;
      st.elbowFlexL = 58 * t;
      st.pronationL = 55 * t;
      break;
    }

    case 'arms-fold-stand': {
      // 腕を組んで立つクセ（両肩強い前方突出・内旋・肘屈曲クロス）
      st.pelvisPitchAddDeg = -4 * t;
      st.lumPitchDeg = -4 * t;
      st.thoLowPitchDeg = 8 * t;
      st.thoHighPitchDeg = 11 * t;
      st.neckPitchDeg = 8 * t;
      st.headPitchDeg = -5 * t;

      st.girdleProtractR = 21 * t;
      st.girdleAntTiltR = 9 * t;
      st.humFlexR = 42 * t;
      st.humAbductR = -4 * t;
      st.humIntRotR = 66 * t;
      st.elbowFlexR = 98 * t;
      st.pronationR = 52 * t;

      st.girdleProtractL = 20 * t;
      st.girdleAntTiltL = 9 * t;
      st.humFlexL = 36 * t;
      st.humAbductL = -4 * t;
      st.humIntRotL = 68 * t;
      st.elbowFlexL = 96 * t;
      st.pronationL = 48 * t;

      st.forearmWorkR = 0.45 * t;
      break;
    }

    case 'bag-child-hip': {
      // 片腰抱っこ・片掛けカバン（左腰シフト＋右肩カバン引き下げ耐え・肘抱え）
      st.weightShift = -0.95 * t; // 左骨盤外張り出し（tflItbL伸張・左脇腹短縮・右脇腹伸張）
      st.girdleProtractR = 13 * t;
      st.girdleElevateR = -6 * t; // カバンの重みで右肩甲帯が前下へ引かれつつ首肩上部が引き伸ばされる
      st.girdleAntTiltR = 8 * t;
      st.humFlexR = 20 * t;
      st.humIntRotR = 28 * t;
      st.elbowFlexR = 72 * t;
      st.pronationR = 45 * t;

      st.girdleElevateL = 5 * t;
      st.humFlexL = 28 * t;
      st.humAbductL = 12 * t;
      st.humIntRotL = 38 * t;
      st.elbowFlexL = 86 * t;
      break;
    }

    case 'forward-bend-work': {
      // 前かがみ・中腰作業（洗面・掃除・介護：SBL背面全体と足底〜後脛骨筋膜がブレーキ綱として伸張）
      st.forwardBow = 0.88 * t;
      st.girdleProtractR = 14 * t;
      st.humFlexR = 54 * t;
      st.humIntRotR = 18 * t;
      st.elbowFlexR = 32 * t;
      st.pronationR = 55 * t;

      st.girdleProtractL = 14 * t;
      st.humFlexL = 54 * t;
      st.humIntRotL = 18 * t;
      st.elbowFlexL = 32 * t;
      st.pronationL = 55 * t;

      st.plantarLoad = 1.0 * t;
      break;
    }

    case 'sway-back-stand': {
      // 反り腰・前もも張り立ち（骨盤前傾＋腰椎反り短縮＋お腹前面伸張＋前もも張り）
      st.swayBack = t;
      st.pelvisPitchAddDeg = 17 * t;   // 骨盤前傾（+X回転：上部が前へおじぎし坐骨が後ろ上へ上がる）
      st.lumPitchDeg = -25 * t;        // 腰椎強い伸展（反り腰：腰背部の胸腰筋膜がギュッと短縮！）
      st.thoLowPitchDeg = -8 * t;      // みぞおち〜お腹前面が開いて腹直筋鞘が引き伸ばされる
      st.thoHighPitchDeg = 12 * t;     // 上部胸郭でバランス補償
      st.neckPitchDeg = 10 * t;
      st.headPitchDeg = -8 * t;

      st.girdleProtractR = 8 * t;
      st.humFlexR = -6 * t;
      st.elbowFlexR = 14 * t;
      st.girdleProtractL = 8 * t;
      st.humFlexL = -6 * t;
      st.elbowFlexL = 14 * t;
      break;
    }

    case 'overhead-reach': {
      // 高い所へ手を伸ばす（右腕バンザイ挙上＋左への体側しなり：広背筋膜BFL・小胸筋膜DFALが伸張、肩上SBALは短縮挟み込み）
      st.lateralBend = 0.82 * t;
      st.girdleElevateR = 22 * t;
      st.girdleProtractR = -6 * t;
      st.humAbductR = 142 * t;
      st.humFlexR = 18 * t;
      st.humIntRotR = -18 * t;
      st.elbowFlexR = 18 * t;
      st.pronationR = 20 * t;

      st.humAbductL = 8 * t;
      st.elbowFlexL = 12 * t;
      break;
    }

    case 'forearm-pronation-work': {
      // 手元作業・包丁・施術（右前腕の強い回内クロス＋手首背屈＋親指・屈筋収縮）
      st.thoLowPitchDeg = 6 * t;
      st.thoHighPitchDeg = 9 * t;
      st.neckPitchDeg = 11 * t;
      st.headPitchDeg = 5 * t;

      st.girdleProtractR = 15 * t;
      st.girdleAntTiltR = 7 * t;
      st.humFlexR = 32 * t;
      st.humAbductR = 12 * t;
      st.humIntRotR = 22 * t;
      st.elbowFlexR = 76 * t;
      st.pronationR = 90 * t;
      st.wristExtR = 26 * t;
      st.wristUlnarR = 10 * t;

      st.girdleProtractL = 11 * t;
      st.humFlexL = 24 * t;
      st.humIntRotL = 26 * t;
      st.elbowFlexL = 68 * t;
      st.pronationL = 60 * t;

      st.forearmWorkR = 1.0 * t;
      break;
    }

    case 'run-single-strike': {
      // ランニング・階段の片足着地（右脚ミッドスタンス衝撃吸収：骨盤右シフト・左骨盤ドロップ＋右膝屈曲＋左遊脚）
      st.runStrikeR = t;
      st.weightShift = 0.88 * t;
      st.pelvisPitchAddDeg = 8 * t;
      st.pelvisYawAddDeg = -8 * t;
      st.lumPitchDeg = 6 * t;
      st.thoLowYawDeg = 10 * t;
      st.thoHighYawDeg = 10 * t;

      // ランニング腕振り（右脚着地時は左腕前・右腕後ろ）
      st.humFlexR = -26 * t;
      st.humAbductR = 8 * t;
      st.elbowFlexR = 78 * t;
      st.pronationR = 35 * t;

      st.humFlexL = 38 * t;
      st.humIntRotL = 18 * t;
      st.elbowFlexL = 86 * t;
      st.pronationL = 35 * t;

      st.plantarLoad = 0.85 * t;
      break;
    }

    case 'spiral-functional-twist': {
      // 体をひねる・スイング動作（双方向 scrub ∈ [-1..+1]）
      const s = scrub;
      const a = Math.abs(s);
      st.spiralTwist = s;
      st.weightShift = -0.35 * s; // 胸を左(+1)へ回すスイングでは左足へ踏み込みつつ右胸〜左股関節が連動

      // 右腕が胸前へ水平内転スイング(s>0) ⇄ バックスイング外転伸展(s<0)
      if (s >= 0) {
        st.girdleProtractR = 18 * s;
        st.humFlexR = 48 * s;
        st.humIntRotR = 45 * s;
        st.elbowFlexR = 46 * s;
        st.pronationR = 50 * s;

        st.girdleProtractL = -10 * s;
        st.humFlexL = -18 * s;
        st.humAbductL = 22 * s;
        st.elbowFlexL = 34 * s;
      } else {
        const n = -s;
        st.girdleProtractR = -12 * n;
        st.humFlexR = -20 * n;
        st.humAbductR = 26 * n;
        st.humIntRotR = -15 * n;
        st.elbowFlexR = 36 * n;

        st.girdleProtractL = 18 * n;
        st.humFlexL = 48 * n;
        st.humIntRotL = 45 * n;
        st.elbowFlexL = 46 * n;
        st.pronationL = 50 * n;
      }
      st.pelvisPitchAddDeg = 6 * a;
      break;
    }

    // =========================================================================
    // 新候補 10 アニメーション（最初 0%：負担の少ない姿勢 ⇄ 最後 100%：負担がかかるクセ）
    // =========================================================================
    case 'drive-1010-wheel': {
      // 1. 長距離運転：「腕下げラク運転(8時20分/4時40分)」(0%) ⇄ 「10時10分で腕を高く浮かせて握る」(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.sitAmount = 1.0;

      st.pelvisPitchAddDeg = -4 - 6 * t;
      st.lumPitchDeg = 2 + 5 * t;
      st.thoLowPitchDeg = 2 + 6 * t;
      st.thoHighPitchDeg = 2 + 9 * t;
      st.neckPitchDeg = 2 + 16 * t;
      st.headPitchDeg = -2 - 12 * t;

      // 0%: ひじを体側のひじ置きに下ろしハンドル下側(8時20分/4時40分・低い位置)に軽く添える
      // 100%: 両腕を前高く浮かせて胸前の高さでハンドル上部(10時10分・左右対称のハンドル幅)を握り続ける
      st.girdleProtractR = 2 + 14 * t;
      st.girdleElevateR = 0 + 10 * t;
      st.girdleAntTiltR = 2 + 5 * t;
      st.humFlexR = 8 + 64 * t;
      st.humAbductR = 2 + 10 * t;
      st.humIntRotR = 26 - 42 * t;
      st.elbowFlexR = 54 - 16 * t;
      st.pronationR = 36 + 28 * t;
      st.wristExtR = 6 + 8 * t;
      st.wristUlnarR = 8 * t;

      st.girdleProtractL = 2 + 14 * t;
      st.girdleElevateL = 0 + 10 * t;
      st.girdleAntTiltL = 2 + 5 * t;
      st.humFlexL = 8 + 64 * t;
      st.humAbductL = 2 + 10 * t;
      st.humIntRotL = 26 - 42 * t;
      st.elbowFlexL = 54 - 16 * t;
      st.pronationL = 36 + 28 * t;
      st.wristExtL = 6 + 8 * t;
      st.wristUlnarL = 8 * t;

      st.forearmWorkR = 0.85 * t;
      st.jawClench = 0.35 * t;
      break;
    }

    case 'bus-car-sway-neck': {
      // 2. バス・車・電車の揺れ：ヘッドレスト・ひじ掛け安定座位(0%) ⇄ 頭を浮かせて揺れに首と肩で踏ん張る(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.sitAmount = 1.0;

      // 連続再生時は乗り物の細かい横揺れを再現し、100%静止確認時は右揺れ耐え姿勢を明確に表示
      const swayOsc = effectiveManual === null ? Math.sin(phase01 * Math.PI * 4) * 0.45 * t : 0;
      const braceDir = 1.0 + swayOsc;

      st.pelvisPitchAddDeg = -3 - 9 * t;
      st.pelvisRollAddDeg = -6.5 * t * braceDir;
      st.lumPitchDeg = 2 + 11 * t;
      st.lumRollDeg = 9.5 * t * braceDir;
      st.thoLowPitchDeg = 2 + 11 * t;
      st.thoLowRollDeg = 6.5 * t * braceDir;
      st.thoHighPitchDeg = 2 + 13 * t;
      st.thoHighRollDeg = 3.0 * t * braceDir;
      st.neckPitchDeg = 1 + 20 * t;
      st.neckRollDeg = -9.0 * t * braceDir;
      st.headPitchDeg = -1 - 12 * t;
      st.headRollDeg = -4.0 * t * braceDir;

      st.girdleProtractR = 2 + 12 * t;
      st.girdleElevateR = 11.5 * t;
      st.girdleAntTiltR = 6 * t;
      st.humFlexR = 12 + 12 * t;
      st.humAbductR = 4 + 3 * t;
      st.humIntRotR = 25 - 1 * t;
      st.elbowFlexR = 62 + 12 * t;
      st.pronationR = 38 + 26 * t;

      st.girdleProtractL = 2 + 12 * t;
      st.girdleElevateL = 11.5 * t;
      st.girdleAntTiltL = 6 * t;
      st.humFlexL = 12 + 12 * t;
      st.humAbductL = 4 + 3 * t;
      st.humIntRotL = 25 - 1 * t;
      st.elbowFlexL = 62 + 12 * t;
      st.pronationL = 38 + 26 * t;

      st.jawClench = 0.95 * t;
      st.diaphragmSlump = 0.82 * t;
      st.scalpPull = 0.88 * t;
      break;
    }

    case 'sofa-deep-slouch': {
      // 3. ソファー沈み込み：骨盤が起きた座位(0%) ⇄ お尻が前へ滑りお腹が潰れて首だけ折れる仙骨座り(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.sitAmount = 1.0;
      st.slouchSlideZ = t;

      st.pelvisPitchAddDeg = -3 - 29 * t;
      st.lumPitchDeg = 3 + 33 * t;
      st.thoLowPitchDeg = 2 + 23 * t;
      st.thoHighPitchDeg = 2 + 18 * t;
      st.neckPitchDeg = 2 + 22 * t;
      st.headPitchDeg = -2 - 17 * t;

      st.girdleProtractR = 3 + 15 * t;
      st.girdleAntTiltR = 8 * t;
      st.humFlexR = 16 + 18 * t;
      st.humIntRotR = 22 + 22 * t;
      st.elbowFlexR = 58 + 30 * t;
      st.pronationR = 42 + 12 * t;

      st.girdleProtractL = 3 + 15 * t;
      st.girdleAntTiltL = 8 * t;
      st.humFlexL = 16 + 18 * t;
      st.humIntRotL = 22 + 22 * t;
      st.elbowFlexL = 58 + 30 * t;
      st.pronationL = 42 + 12 * t;

      st.diaphragmSlump = 1.0 * t;
      st.scalpPull = 0.90 * t;
      break;
    }

    case 'sleep-banzai-arms': {
      // 4. バンザイ寝：腕を下ろした自然な状態(0%) ⇄ 両腕バンザイ挙上＋ろっ骨開き＋腰の反り浮き(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.swayBack = 0.82 * t;

      st.pelvisPitchAddDeg = 15 * t;
      st.lumPitchDeg = -24 * t;
      st.thoLowPitchDeg = -11 * t;
      st.thoHighPitchDeg = -6 * t;
      st.neckPitchDeg = -6 * t;
      st.headPitchDeg = 5 * t;

      st.girdleElevateR = 20 * t;
      st.girdleProtractR = -8 * t;
      st.humAbductR = 4 + 132 * t;
      st.humFlexR = 16 * t;
      st.humIntRotR = -28 * t;
      st.elbowFlexR = 8 + 44 * t;
      st.pronationR = 12 * t;

      st.girdleElevateL = 20 * t;
      st.girdleProtractL = -8 * t;
      st.humAbductL = 4 + 132 * t;
      st.humFlexL = 16 * t;
      st.humIntRotL = -28 * t;
      st.elbowFlexL = 8 + 44 * t;
      st.pronationL = 12 * t;
      break;
    }

    case 'chin-rest-desk': {
      // 5. 机で片手頬杖：左右均等座位(0%) ⇄ 右ひじを突いて右あごを乗せ、頭と体幹が右へ傾く(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.sitAmount = 1.0;

      st.pelvisPitchAddDeg = -3 - 9 * t;
      st.pelvisRollAddDeg = -4.5 * t;
      st.pelvisYawAddDeg = 4 * t;
      st.lumPitchDeg = 2 + 11 * t;
      st.lumRollDeg = 7.0 * t;
      st.thoLowPitchDeg = 2 + 10 * t;
      st.thoLowRollDeg = 6.0 * t;
      st.thoHighPitchDeg = 2 + 9 * t;
      st.thoHighRollDeg = 5.0 * t;
      st.thoHighYawDeg = -5 * t;
      st.neckPitchDeg = 2 + 10 * t;
      st.neckRollDeg = 12.0 * t;
      st.neckYawDeg = -6 * t;
      st.headPitchDeg = -2 - 4 * t;
      st.headRollDeg = 6 * t;

      // 右手を右あご下へ添える頬杖チェーン
      st.girdleProtractR = 2 + 16 * t;
      st.girdleElevateR = 10 * t;
      st.girdleAntTiltR = 8 * t;
      st.humFlexR = 16 + 68 * t;
      st.humAbductR = 5 - 13 * t;
      st.humIntRotR = 16 + 20 * t;
      st.elbowFlexR = 62 + 54 * t;
      st.pronationR = 32 - 14 * t;
      st.wristExtR = 4 + 28 * t;

      // 左腕は机上に前置き
      st.girdleProtractL = 2 + 12 * t;
      st.humFlexL = 16 + 18 * t;
      st.humIntRotL = 18 + 18 * t;
      st.elbowFlexL = 62 + 16 * t;
      st.pronationL = 36 + 34 * t;

      st.jawClench = 0.95 * t;
      break;
    }

    case 'shampoo-dentist-arch': {
      // 6. シャンプー台・歯医者：ひざが軽く曲がり腰と首がラクな状態(0%) ⇄ 両脚伸ばしで腰が浮き首が反る(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.reclineChair = 1.0;
      st.reclineExtendLegs = t;

      st.pelvisPitchAddDeg = -36 + 15 * t;
      st.lumPitchDeg = 8 - 30 * t;
      st.thoLowPitchDeg = 6 - 16 * t;
      st.thoHighPitchDeg = 8 - 10 * t;
      st.neckPitchDeg = 14 - 34 * t;
      st.headPitchDeg = 2 - 16 * t;

      st.girdleProtractR = 4 - 10 * t;
      st.girdleElevateR = 7 * t;
      st.humFlexR = 12 - 8 * t;
      st.humIntRotR = 24;
      st.elbowFlexR = 48 - 18 * t;
      st.pronationR = 40;

      st.girdleProtractL = 4 - 10 * t;
      st.girdleElevateL = 7 * t;
      st.humFlexL = 12 - 8 * t;
      st.humIntRotL = 24;
      st.elbowFlexL = 48 - 18 * t;
      st.pronationL = 40;

      st.scalpPull = 0.75 * t;
      break;
    }

    case 'floor-agura-asymmetry': {
      // 7. 床のあぐら：お尻が高く両膝がラクに開くあぐら(0%) ⇄ 右膝が高く浮き骨盤が後傾ねじれするあぐら(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.aguraSit = 1.0;
      st.aguraAsym = t;

      st.pelvisPitchAddDeg = -2 - 22 * t;
      st.pelvisRollAddDeg = -8.5 * t;
      st.pelvisYawAddDeg = 9.0 * t;
      st.lumPitchDeg = 2 + 28 * t;
      st.lumRollDeg = 9.5 * t;
      st.lumYawDeg = -6.5 * t;
      st.thoLowPitchDeg = 2 + 16 * t;
      st.thoLowRollDeg = 4.5 * t;
      st.thoLowYawDeg = -4.5 * t;
      st.thoHighPitchDeg = 2 + 12 * t;
      st.neckPitchDeg = 2 + 14 * t;
      st.headPitchDeg = -2 - 10 * t;

      st.girdleProtractR = 4 + 10 * t;
      st.humFlexR = 20 + 8 * t;
      st.humAbductR = 10 + 6 * t;
      st.humIntRotR = 24;
      st.elbowFlexR = 52 - 8 * t;
      st.pronationR = 52;

      st.girdleProtractL = 4 + 10 * t;
      st.humFlexL = 20 + 4 * t;
      st.humAbductL = 10;
      st.humIntRotL = 24;
      st.elbowFlexL = 52;
      st.pronationL = 52;

      st.diaphragmSlump = 0.75 * t;
      break;
    }

    case 'kitchen-sink-lean': {
      // 8. キッチン洗い物・洗面：近づいてまっすぐ立つ(0%) ⇄ ちょい前かがみ＋両ひじ浮かせ手元作業(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.forwardBow = 0.42 * t;

      st.lumPitchDeg = 8 * t;
      st.thoLowPitchDeg = 8 * t;
      st.thoHighPitchDeg = 11 * t;
      st.neckPitchDeg = 16 * t;
      st.headPitchDeg = 6 * t;

      st.girdleProtractR = 18 * t;
      st.girdleElevateR = 8 * t;
      st.girdleAntTiltR = 9 * t;
      st.humFlexR = 10 + 38 * t;
      st.humAbductR = 3 + 14 * t;
      st.humIntRotR = 12 + 24 * t;
      st.elbowFlexR = 32 + 52 * t;
      st.pronationR = 24 + 58 * t;
      st.wristExtR = 14 * t;

      st.girdleProtractL = 18 * t;
      st.girdleElevateL = 8 * t;
      st.girdleAntTiltL = 9 * t;
      st.humFlexL = 10 + 38 * t;
      st.humAbductL = 3 + 14 * t;
      st.humIntRotL = 12 + 24 * t;
      st.elbowFlexL = 32 + 52 * t;
      st.pronationL = 24 + 58 * t;
      st.wristExtL = 14 * t;

      st.plantarLoad = 0.90 * t;
      st.forearmWorkR = 0.80 * t;
      st.diaphragmSlump = 0.65 * t;
      break;
    }

    case 'morning-sock-reach': {
      // 9. 朝の立ち靴下履き：両足安定立位(0%) ⇄ 片足立ちで右膝を抱え上げ腰を丸めて足先へ手を伸ばす(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.sockLiftR = t;
      st.weightShift = -0.45 * t;
      st.forwardBow = 0.52 * t;

      st.pelvisPitchAddDeg = -14 * t;
      st.pelvisRollAddDeg = -5 * t;
      st.lumPitchDeg = 26 * t;
      st.thoLowPitchDeg = 18 * t;
      st.thoHighPitchDeg = 14 * t;
      st.neckPitchDeg = 16 * t;
      st.headPitchDeg = 8 * t;

      st.girdleProtractR = 20 * t;
      st.girdleAntTiltR = 10 * t;
      st.humFlexR = 76 * t;
      st.humAbductR = -6 * t;
      st.humIntRotR = 18 * t;
      st.elbowFlexR = 22 * t;
      st.pronationR = 35 * t;

      st.girdleProtractL = 20 * t;
      st.girdleAntTiltL = 10 * t;
      st.humFlexL = 74 * t;
      st.humAbductL = -10 * t;
      st.humIntRotL = 32 * t;
      st.elbowFlexL = 24 * t;
      st.pronationL = 35 * t;

      st.plantarLoad = 0.70 * t;
      break;
    }

    case 'stairs-down-knee': {
      // 10. 階段下り：両足均等立位(0%) ⇄ 右足首が硬く右膝が前内側へ出て左足を下段へ下ろす局面(100%)
      st.isHabitComparison = true;
      st.habitLoad = t;
      st.stairsDownR = t;
      st.weightShift = 0.56 * t;

      st.pelvisPitchAddDeg = 10 * t;
      st.pelvisYawAddDeg = -6 * t;
      st.lumPitchDeg = 6 * t;
      st.thoLowPitchDeg = 4 * t;
      st.thoHighPitchDeg = 5 * t;
      st.neckPitchDeg = 8 * t;
      st.headPitchDeg = 4 * t;

      st.humFlexR = -10 * t;
      st.humAbductR = 8 * t;
      st.elbowFlexR = 28 * t;
      st.humFlexL = 22 * t;
      st.humAbductL = 8 * t;
      st.elbowFlexL = 34 * t;

      st.plantarLoad = 0.85 * t;
      break;
    }

    default:
      st.weightShift = scrub;
      break;
  }

  return st;
}

// -----------------------------------------------------------------------------
// 精密3D運動連鎖 ＆ 足底接地2リンク解析IK ＆ 22ボーンソルバー
// -----------------------------------------------------------------------------
const L1_FEMUR = JOINTS.hipR.distanceTo(JOINTS.kneeR); // 1.600781
const L2_SHANK = JOINTS.kneeR.distanceTo(JOINTS.ankleR); // 1.403567
const V_FEMUR0_R = new THREE.Vector3().subVectors(JOINTS.kneeR, JOINTS.hipR).normalize();
const V_SHANK0_R = new THREE.Vector3().subVectors(JOINTS.ankleR, JOINTS.kneeR).normalize();
const V_FEMUR0_L = new THREE.Vector3().subVectors(JOINTS.kneeL, JOINTS.hipL).normalize();
const V_SHANK0_L = new THREE.Vector3().subVectors(JOINTS.ankleL, JOINTS.kneeL).normalize();
const REST_HIP_ANKLE_DIST = JOINTS.hipR.distanceTo(JOINTS.ankleR); // 3.0004166

const _uLeg0R = new THREE.Vector3().subVectors(JOINTS.ankleR, JOINTS.hipR).normalize();
const POLE0_R = new THREE.Vector3()
  .subVectors(JOINTS.kneeR, JOINTS.hipR)
  .addScaledVector(_uLeg0R, -new THREE.Vector3().subVectors(JOINTS.kneeR, JOINTS.hipR).dot(_uLeg0R))
  .normalize();

const _uLeg0L = new THREE.Vector3().subVectors(JOINTS.ankleL, JOINTS.hipL).normalize();
const POLE0_L = new THREE.Vector3()
  .subVectors(JOINTS.kneeL, JOINTS.hipL)
  .addScaledVector(_uLeg0L, -new THREE.Vector3().subVectors(JOINTS.kneeL, JOINTS.hipL).dot(_uLeg0L))
  .normalize();

// 一時計算用オブジェクト（GC発生ゼロ）
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _uVec = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _nVec = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _qSwing = new THREE.Quaternion();
const _qTwist = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _mT1 = new THREE.Matrix4();
const _mT2 = new THREE.Matrix4();
const _mRot = new THREE.Matrix4();

function makePivotMatrix(outMat, p0, p1, q) {
  _mT1.makeTranslation(-p0.x, -p0.y, -p0.z);
  _mRot.makeRotationFromQuaternion(q);
  _mT2.makeTranslation(p1.x, p1.y, p1.z);
  outMat.copy(_mT2).multiply(_mRot).multiply(_mT1);
  return outMat;
}

/** 親の移動後ピボットを中心に、ワールド軸の追加回転 qDelta を掛ける（脊椎チェーン用: qDelta * qParent） */
function chainPivotMatrix(outMat, parentMat, restPivot, qDelta) {
  const movedPivot = _v1.copy(restPivot).applyMatrix4(parentMat);
  _q2.setFromRotationMatrix(parentMat);
  _q1.copy(qDelta).multiply(_q2);
  return makePivotMatrix(outMat, restPivot, movedPivot, _q1);
}

/** 親の移動後ピボットを中心に、親ローカル解剖軸の回転 qLocal を掛ける（上肢チェーン用: qParent * qLocal、関節脱臼 0.0mm！） */
function chainLocalPivotMatrix(outMat, parentMat, restPivot, qLocal) {
  const movedPivot = _v1.copy(restPivot).applyMatrix4(parentMat);
  _q2.setFromRotationMatrix(parentMat);
  _q1.copy(_q2).multiply(qLocal);
  return makePivotMatrix(outMat, restPivot, movedPivot, _q1);
}

function solveTwoLinkLegIK({
  isRight,
  hipPos,
  anklePos,
  poleDir,
  axialTwist = 0,
  outKneePos,
  outFemurMat,
  outShankMat,
}) {
  const hip0 = isRight ? JOINTS.hipR : JOINTS.hipL;
  const knee0 = isRight ? JOINTS.kneeR : JOINTS.kneeL;
  const vFem0 = isRight ? V_FEMUR0_R : V_FEMUR0_L;
  const vShk0 = isRight ? V_SHANK0_R : V_SHANK0_L;

  _uVec.subVectors(anklePos, hipPos);
  const rawDist = _uVec.length();
  const maxReach = L1_FEMUR + L2_SHANK - 1e-4;
  const minReach = Math.abs(L1_FEMUR - L2_SHANK) + 0.08;
  const d = THREE.MathUtils.clamp(rawDist, minReach, maxReach);
  if (rawDist > 1e-6) {
    _uVec.multiplyScalar(1 / rawDist);
  } else {
    _uVec.set(0, -1, 0);
  }

  const a = (L1_FEMUR * L1_FEMUR - L2_SHANK * L2_SHANK + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1_FEMUR * L1_FEMUR - a * a));

  _nVec.copy(poleDir).addScaledVector(_uVec, -poleDir.dot(_uVec));
  if (_nVec.lengthSq() < 1e-8) {
    _nVec.set(0, 0, 1).addScaledVector(_uVec, -_uVec.z);
  }
  _nVec.normalize();

  outKneePos.copy(hipPos).addScaledVector(_uVec, a).addScaledVector(_nVec, h);

  _v2.subVectors(outKneePos, hipPos).normalize();
  _q1.setFromUnitVectors(vFem0, _v2);
  if (Math.abs(axialTwist) > 1e-5) {
    _q2.setFromAxisAngle(_v2, axialTwist);
    _q1.premultiply(_q2);
  }
  makePivotMatrix(outFemurMat, hip0, hipPos, _q1);

  _v3.subVectors(anklePos, outKneePos).normalize();
  _q1.setFromUnitVectors(vShk0, _v3);
  if (Math.abs(axialTwist) > 1e-5) {
    _q2.setFromAxisAngle(_v3, axialTwist * 0.7);
    _q1.premultiply(_q2);
  }
  makePivotMatrix(outShankMat, knee0, outKneePos, _q1);
}

export function createBoneMatrixArray() {
  const arr = [];
  for (let i = 0; i < BONE_COUNT; i++) {
    arr.push(new THREE.Matrix4());
  }
  return arr;
}

const _hipR = new THREE.Vector3();
const _hipL = new THREE.Vector3();
const _ankleR = new THREE.Vector3();
const _ankleL = new THREE.Vector3();
const _kneeR = new THREE.Vector3();
const _kneeL = new THREE.Vector3();
const _pelvisCenter0 = new THREE.Vector3(0, -0.02, -0.03);
const _pelvisCenterMoved = new THREE.Vector3();
const _qPelvis = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * モーション状態から22ボーンすべてのワールド変換行列を厳密に計算する。
 */
export function solveRigMatrices(params, outMats) {
  const ws = THREE.MathUtils.clamp(params.weightShift || 0, -1, 1);
  const lb = THREE.MathUtils.clamp(params.lateralBend || 0, -1, 1);
  const st = THREE.MathUtils.clamp(params.spiralTwist || 0, -1, 1);
  const fb = THREE.MathUtils.clamp(params.forwardBow || 0, 0, 1);
  const sit = THREE.MathUtils.clamp(params.sitAmount || 0, 0, 1);
  const crossR = THREE.MathUtils.clamp(params.crossLegR || 0, 0, 1);
  const sway = THREE.MathUtils.clamp(params.swayBack || 0, 0, 1);
  const runR = THREE.MathUtils.clamp(params.runStrikeR || 0, 0, 1);
  const slouchZ = THREE.MathUtils.clamp(params.slouchSlideZ || 0, 0, 1);
  const recline = THREE.MathUtils.clamp(params.reclineChair || 0, 0, 1);
  const reclineExt = THREE.MathUtils.clamp(params.reclineExtendLegs || 0, 0, 1);
  const agura = THREE.MathUtils.clamp(params.aguraSit || 0, 0, 1);
  const aguraAsym = THREE.MathUtils.clamp(params.aguraAsym || 0, 0, 1);
  const sockR = THREE.MathUtils.clamp(params.sockLiftR || 0, 0, 1);
  const stairsR = THREE.MathUtils.clamp(params.stairsDownR || 0, 0, 1);

  const isSeatedLike = Math.max(sit, recline, agura);
  const d2r = THREE.MathUtils.degToRad;
  const absWs = Math.abs(ws);

  // =========================================================================
  // 1. 足関節目標位置と骨盤のボトムアップ運動連鎖
  // =========================================================================
  _ankleR.copy(JOINTS.ankleR);
  _ankleL.copy(JOINTS.ankleL);

  const pelvisObliquityZ =
    -ws * d2r(14.2) -
    lb * d2r(5.6) +
    d2r(params.pelvisRollAddDeg || 0);

  const pelvisPitchX =
    fb * d2r(38.0) -
    absWs * d2r(3.2) * (1 - runR) * (1 - isSeatedLike) +
    d2r(params.pelvisPitchAddDeg || 0);

  const pelvisYawY =
    -st * d2r(14.0) +
    d2r(params.pelvisYawAddDeg || 0);

  _euler.set(pelvisPitchX, pelvisYawY, pelvisObliquityZ, 'YXZ');
  _qPelvis.setFromEuler(_euler);

  // 骨盤の並進位置
  const swayLatX =
    -ws * (0.258 - 0.05 * runR - 0.08 * stairsR) -
    lb * 0.135 +
    crossR * 0.04 +
    aguraAsym * 0.035;

  const swayFwdZ =
    absWs * 0.038 * (1 - runR) * (1 - isSeatedLike) -
    fb * 0.195 +
    sway * 0.095 -         // 反り腰スウェイ
    sit * 0.52 +           // 椅子座り
    slouchZ * 0.24 -       // ソファー仙骨座りでお尻が前へ滑る
    recline * 0.36 -       // シャンプー台・歯科チェアー座面位置
    agura * 0.22 +         // 床あぐら座面位置
    stairsR * 0.14;        // 階段下り前重心

  const hipHalfSpan = 0.195;
  const stanceHipLift = hipHalfSpan * Math.sin(Math.abs(pelvisObliquityZ));
  const pendulumDrop = REST_HIP_ANKLE_DIST * (1 - Math.cos(Math.asin(Math.min(0.35, Math.abs(swayLatX) / REST_HIP_ANKLE_DIST))));
  const bowDrop = fb * 0.042;
  const sitDrop = sit * 1.16 + slouchZ * 0.09;
  const reclineDrop = recline * 1.05;
  const aguraDrop = agura * 1.68 + aguraAsym * 0.12;
  const runKneeDrop = runR * 0.16 + stairsR * 0.34;
  const swayDrop = sway * 0.018;

  const pelvisDeltaY = -(
    stanceHipLift * absWs * (1 - isSeatedLike) +
    pendulumDrop * (1 - isSeatedLike) +
    bowDrop +
    sitDrop +
    reclineDrop +
    aguraDrop +
    runKneeDrop +
    swayDrop +
    absWs * 0.005 * (1 - isSeatedLike)
  );

  _pelvisCenterMoved.set(
    _pelvisCenter0.x + swayLatX,
    _pelvisCenter0.y + pelvisDeltaY,
    _pelvisCenter0.z + swayFwdZ,
  );

  makePivotMatrix(outMats[BONE.PELVIS], _pelvisCenter0, _pelvisCenterMoved, _qPelvis);

  _hipR.copy(JOINTS.hipR).applyMatrix4(outMats[BONE.PELVIS]);
  _hipL.copy(JOINTS.hipL).applyMatrix4(outMats[BONE.PELVIS]);

  // =========================================================================
  // 2. 両脚2リンク解析IK（立位・座位・リクライニング・あぐら・靴下・階段すべて脱臼ゼロ）
  // =========================================================================
  const unloadL = Math.max(0, ws) * (1 - isSeatedLike) * (1 - runR) * (1 - stairsR);
  const unloadR = Math.max(0, -ws) * (1 - isSeatedLike) * (1 - sockR);

  if (recline > 1e-4) {
    // 美容院シャンプー台・歯科チェアー：0%はひざが軽く曲がり、100%は両脚が前へ伸びきる
    const zFoot = THREE.MathUtils.lerp(+1.66, +2.14, reclineExt);
    const yFoot = THREE.MathUtils.lerp(-2.54, -2.50, reclineExt);
    _ankleR.set(-0.22, yFoot, zFoot);
    _ankleL.set(+0.22, yFoot, zFoot);
  } else if (agura > 1e-4) {
    // 床あぐら：両足首を骨盤前内側へ引き寄せる
    _ankleR.set(-0.08, -3.08 + aguraAsym * 0.06, +0.28);
    _ankleL.set(+0.08, -3.10, +0.22);
  } else if (sit > 1e-4) {
    // 椅子座り時の両足接地位置（ソファー沈み込み時は少し前へ投げ出す）
    _ankleL.z += sit * 0.48 + slouchZ * 0.24;
    _ankleR.z += sit * 0.48 + slouchZ * 0.24;
    if (crossR > 1e-4) {
      _ankleR.x = THREE.MathUtils.lerp(_ankleR.x, +0.40, crossR);
      _ankleR.y = THREE.MathUtils.lerp(_ankleR.y, -2.30, crossR);
      _ankleR.z = THREE.MathUtils.lerp(_ankleR.z, +0.62, crossR);
    }
  } else if (sockR > 1e-4) {
    // 朝の靴下履き：左足立ちで右足を高く抱え上げる
    _ankleR.x = THREE.MathUtils.lerp(JOINTS.ankleR.x, -0.18, sockR);
    _ankleR.y = THREE.MathUtils.lerp(JOINTS.ankleR.y, -1.96, sockR);
    _ankleR.z = THREE.MathUtils.lerp(JOINTS.ankleR.z, +0.46, sockR);
  } else if (stairsR > 1e-4) {
    // 階段下り：右足を段上に残し、左足を前下へ下ろす局面
    _ankleR.x = THREE.MathUtils.lerp(JOINTS.ankleR.x, -0.28, stairsR);
    _ankleL.x += stairsR * 0.02;
    _ankleL.y -= stairsR * 0.08;
    _ankleL.z += stairsR * 0.48;
  } else if (runR > 1e-4) {
    // ランニング右片足着地
    _ankleR.x = THREE.MathUtils.lerp(JOINTS.ankleR.x, -0.26, runR);
    _ankleR.z = THREE.MathUtils.lerp(JOINTS.ankleR.z, +0.04, runR);
    _ankleL.x += runR * 0.03;
    _ankleL.y += runR * 0.34;
    _ankleL.z -= runR * 0.46;
  } else {
    _ankleL.x += unloadL * 0.018;
    _ankleL.y += unloadL * 0.024;
    _ankleL.z += unloadL * 0.026;

    _ankleR.x -= unloadR * 0.018;
    _ankleR.y += unloadR * 0.024;
    _ankleR.z += unloadR * 0.026;
  }

  // 右脚 IK ポールベクトル
  if (recline > 1e-4) {
    _pole.set(-0.04, 0.86, 0.50).normalize();
  } else if (agura > 1e-4) {
    // 0%: 右ひざも低く外へ開く -> 100%: 右股関節が硬く右ひざが高く浮き上がる！
    const pLow = _v1.set(-0.88, +0.08, +0.47).normalize();
    const pFloat = _v2.set(-0.44, +0.76, +0.48).normalize();
    _pole.copy(pLow).lerp(pFloat, aguraAsym).normalize();
  } else if (crossR > 1e-4) {
    _pole.copy(POLE0_R).lerp(_v1.set(+0.22, 0.72, 1.0).normalize(), crossR).normalize();
  } else if (sit > 1e-4) {
    _pole.copy(POLE0_R).lerp(_v1.set(-0.04, 0.45, 1.0).normalize(), sit).normalize();
  } else if (sockR > 1e-4) {
    _pole.copy(POLE0_R).lerp(_v1.set(-0.46, 0.48, 0.75).normalize(), sockR).normalize();
  } else if (stairsR > 1e-4) {
    // 階段下りで右足首が硬いため、右ひざが前内側（ニーイン）へ入る！
    _pole.copy(POLE0_R).lerp(_v1.set(+0.24, 0.18, 0.95).normalize(), stairsR).normalize();
  } else {
    _pole.copy(POLE0_R);
    _pole.x += -0.04 * unloadR - 0.05 * runR;
    _pole.normalize();
  }

  solveTwoLinkLegIK({
    isRight: true,
    hipPos: _hipR,
    anklePos: _ankleR,
    poleDir: _pole,
    axialTwist: st * 0.08 - crossR * 0.22 - agura * (0.35 - 0.20 * aguraAsym) + stairsR * 0.14,
    outKneePos: _kneeR,
    outFemurMat: outMats[BONE.FEMUR_R],
    outShankMat: outMats[BONE.SHANK_R],
  });

  // 左脚 IK ポールベクトル
  if (recline > 1e-4) {
    _pole.set(+0.04, 0.86, 0.50).normalize();
  } else if (agura > 1e-4) {
    _pole.set(+0.88, +0.08, +0.47).normalize();
  } else if (sit > 1e-4) {
    _pole.copy(POLE0_L).lerp(_v1.set(+0.04, 0.45, 1.0).normalize(), sit).normalize();
  } else {
    _pole.copy(POLE0_L);
    _pole.x += +0.04 * unloadL;
    _pole.normalize();
  }

  solveTwoLinkLegIK({
    isRight: false,
    hipPos: _hipL,
    anklePos: _ankleL,
    poleDir: _pole,
    axialTwist: st * 0.08 + agura * 0.35,
    outKneePos: _kneeL,
    outFemurMat: outMats[BONE.FEMUR_L],
    outShankMat: outMats[BONE.SHANK_L],
  });

  // 足部剛体行列
  const stanceR = Math.max(0, ws) * (1 - isSeatedLike);
  const stanceL = Math.max(0, -ws) * (1 - isSeatedLike);
  if (recline > 1e-4) {
    _euler.set(d2r(-34 - 8 * reclineExt), 0, 0, 'YXZ');
    _q1.setFromEuler(_euler);
    makePivotMatrix(outMats[BONE.FOOT_R], JOINTS.ankleR, _ankleR, _q1);
    makePivotMatrix(outMats[BONE.FOOT_L], JOINTS.ankleL, _ankleL, _q1);
  } else if (agura > 1e-4) {
    _euler.set(d2r(12), d2r(28), d2r(-24), 'YXZ');
    _q1.setFromEuler(_euler);
    makePivotMatrix(outMats[BONE.FOOT_R], JOINTS.ankleR, _ankleR, _q1);
    _euler.set(d2r(12), d2r(-28), d2r(24), 'YXZ');
    _q1.setFromEuler(_euler);
    makePivotMatrix(outMats[BONE.FOOT_L], JOINTS.ankleL, _ankleL, _q1);
  } else {
    if (crossR > 1e-4) {
      _q2.setFromRotationMatrix(outMats[BONE.SHANK_R]);
      _euler.set(d2r(16 * crossR), 0, 0, 'YXZ');
      _qLocal.setFromEuler(_euler);
      _q1.copy(_q2).multiply(_qLocal);
      makePivotMatrix(outMats[BONE.FOOT_R], JOINTS.ankleR, _ankleR, _q1);
    } else if (sockR > 1e-4) {
      _euler.set(d2r(-12 * sockR), d2r(10 * sockR), d2r(-8 * sockR), 'YXZ');
      _q1.setFromEuler(_euler);
      makePivotMatrix(outMats[BONE.FOOT_R], JOINTS.ankleR, _ankleR, _q1);
    } else {
      _euler.set(
        unloadR * d2r(9.5),
        -unloadR * d2r(4.0) - stairsR * d2r(4.0),
        +stanceR * d2r(5.2),
        'YXZ',
      );
      _q1.setFromEuler(_euler);
      makePivotMatrix(outMats[BONE.FOOT_R], JOINTS.ankleR, _ankleR, _q1);
    }

    _euler.set(
      unloadL * d2r(9.5) + runR * d2r(28.0) + stairsR * d2r(22.0),
      +unloadL * d2r(4.0),
      -stanceL * d2r(5.2),
      'YXZ',
    );
    _q1.setFromEuler(_euler);
    makePivotMatrix(outMats[BONE.FOOT_L], JOINTS.ankleL, _ankleL, _q1);
  }

  // =========================================================================
  // 3. 腰椎 〜 下部胸郭 〜 上部胸郭 〜 頸椎 〜 頭部の運動連鎖
  // =========================================================================
  const latStretchLumZ = -lb * d2r(12.5);
  const latStretchThoLowZ = -lb * d2r(10.5);
  const latStretchThoHighZ = -lb * d2r(8.5);

  // [A] 腰椎 (PELVIS -> LUMBAR at l5s1)
  _euler.set(
    fb * d2r(18.0) + absWs * d2r(1.8) * (1 - sit) + d2r(params.lumPitchDeg || 0),
    st * d2r(9.0) + d2r(params.lumYawDeg || 0),
    ws * d2r(11.4) * (1 - sit) + latStretchLumZ + d2r(params.lumRollDeg || 0),
    'YXZ',
  );
  _qDelta.setFromEuler(_euler);
  chainPivotMatrix(outMats[BONE.LUMBAR], outMats[BONE.PELVIS], JOINTS.l5s1, _qDelta);

  // [B] 下部胸郭 (LUMBAR -> THORAX_LOW at t12)
  _euler.set(
    fb * d2r(14.0) + d2r(params.thoLowPitchDeg || 0),
    st * d2r(13.5) + d2r(params.thoLowYawDeg || 0),
    ws * d2r(7.2) * (1 - sit) + latStretchThoLowZ + d2r(params.thoLowRollDeg || 0),
    'YXZ',
  );
  _qDelta.setFromEuler(_euler);
  chainPivotMatrix(outMats[BONE.THORAX_LOW], outMats[BONE.LUMBAR], JOINTS.t12, _qDelta);

  // [C] 上部胸郭 (THORAX_LOW -> THORAX_HIGH at t6)
  _euler.set(
    fb * d2r(11.0) + d2r(params.thoHighPitchDeg || 0),
    st * d2r(14.5) + d2r(params.thoHighYawDeg || 0),
    -ws * d2r(1.6) * (1 - sit) + latStretchThoHighZ + d2r(params.thoHighRollDeg || 0),
    'YXZ',
  );
  _qDelta.setFromEuler(_euler);
  chainPivotMatrix(outMats[BONE.THORAX_HIGH], outMats[BONE.THORAX_LOW], JOINTS.t6, _qDelta);

  // [D] 頸椎 (THORAX_HIGH -> NECK at c7t1)
  _euler.set(
    fb * d2r(6.0) + d2r(params.neckPitchDeg || 0),
    -st * d2r(8.0) + d2r(params.neckYawDeg || 0),
    -ws * d2r(4.8) * (1 - sit) - lb * d2r(6.0) + d2r(params.neckRollDeg || 0),
    'YXZ',
  );
  _qDelta.setFromEuler(_euler);
  chainPivotMatrix(outMats[BONE.NECK], outMats[BONE.THORAX_HIGH], JOINTS.c7t1, _qDelta);

  // [E] 頭部 (NECK -> HEAD at c0c1)
  _euler.set(
    -fb * d2r(8.0) + d2r(params.headPitchDeg || 0), // 前かがみ作業時は少し目線を前下へ向ける自然な角度
    -st * d2r(6.0) + d2r(params.headYawDeg || 0),
    -ws * d2r(4.6) * (1 - sit) - lb * d2r(4.0) + d2r(params.headRollDeg || 0),
    'YXZ',
  );
  _qDelta.setFromEuler(_euler);
  chainPivotMatrix(outMats[BONE.HEAD], outMats[BONE.NECK], JOINTS.c0c1, _qDelta);

  // =========================================================================
  // 4. 左右上肢の5節解剖学チェーン（肩甲帯 -> 上腕 -> 尺骨 -> 橈骨回内 -> 手首）
  // =========================================================================
  const solveArmChain = (isRight) => {
    const s = isRight ? -1 : +1; // 右 = -1 (-X), 左 = +1 (+X)
    const B_GIRDLE = isRight ? BONE.GIRDLE_R : BONE.GIRDLE_L;
    const B_HUM = isRight ? BONE.HUMERUS_R : BONE.HUMERUS_L;
    const B_ULNA = isRight ? BONE.ULNA_R : BONE.ULNA_L;
    const B_RAD = isRight ? BONE.RADIUS_R : BONE.RADIUS_L;
    const B_HAND = isRight ? BONE.HAND_R : BONE.HAND_L;

    const pivSC = isRight ? JOINTS.scR : JOINTS.scL;
    const pivSh = isRight ? JOINTS.shoulderR : JOINTS.shoulderL;
    const pivEl = isRight ? JOINTS.elbowR : JOINTS.elbowL;
    const pivRadH = isRight ? JOINTS.radHeadR : JOINTS.radHeadL;
    const pivWr = isRight ? JOINTS.wristR : JOINTS.wristL;
    const pronAxis = isRight ? PRON_AXIS_R : PRON_AXIS_L;

    const protractDeg = isRight ? params.girdleProtractR || 0 : params.girdleProtractL || 0;
    const elevateDeg = isRight ? params.girdleElevateR || 0 : params.girdleElevateL || 0;
    const antTiltDeg = isRight ? params.girdleAntTiltR || 0 : params.girdleAntTiltL || 0;

    const humFlexDeg = (isRight ? params.humFlexR || 0 : params.humFlexL || 0);
    const humAbdDeg = (isRight ? params.humAbductR || 0 : params.humAbductL || 0) + 3.2 * absWs;
    const humIntDeg = isRight ? params.humIntRotR || 0 : params.humIntRotL || 0;
    const elbFlexDeg = isRight ? params.elbowFlexR || 0 : params.elbowFlexL || 0;
    const pronDeg = isRight ? params.pronationR || 0 : params.pronationL || 0;
    const wristExtDeg = isRight ? params.wristExtR || 0 : params.wristExtL || 0;
    const wristUlnDeg = isRight ? params.wristUlnarR || 0 : params.wristUlnarL || 0;

    // (1) 肩甲帯 (THORAX_HIGH -> GIRDLE at scR/L)
    //   +protract: 右(s=-1)は +Y回転で肩が+Z前方へ巻き込む / 左(s=+1)は -Y回転で+Z前方へ巻き込む
    //   +elevate : 右(s=-1)は -Z回転で肩峰が+Y挙上 / 左(s=+1)は +Z回転で+Y挙上
    //   +antTilt : +X回転で肩甲骨上部・烏口突起が前下方へおじぎする
    _euler.set(
      d2r(antTiltDeg),
      -s * d2r(protractDeg),
      s * d2r(elevateDeg),
      'YXZ',
    );
    _qLocal.setFromEuler(_euler);
    chainLocalPivotMatrix(outMats[B_GIRDLE], outMats[BONE.THORAX_HIGH], pivSC, _qLocal);

    // (2) 上腕骨 (GIRDLE -> HUMERUS at shoulderR/L)
    //   まず上腕長軸まわりの内旋 qTwist (-s * humInt) を掛け、次に前方屈曲(-X)＆外転(s*Z) の qSwing を掛ける
    _qTwist.setFromAxisAngle(_yAxis, -s * d2r(humIntDeg));
    _euler.set(
      -d2r(humFlexDeg),
      0,
      s * d2r(humAbdDeg),
      'ZXY',
    );
    _qSwing.setFromEuler(_euler);
    _qLocal.copy(_qSwing).multiply(_qTwist);
    chainLocalPivotMatrix(outMats[B_HUM], outMats[B_GIRDLE], pivSh, _qLocal);

    // (3) 尺骨 (HUMERUS -> ULNA at elbowR/L)：純粋な肘屈伸ヒンジ（脱臼ゼロ）
    _euler.set(-d2r(elbFlexDeg), 0, 0, 'YXZ');
    _qLocal.setFromEuler(_euler);
    chainLocalPivotMatrix(outMats[B_ULNA], outMats[B_HUM], pivEl, _qLocal);

    // (4) 橈骨 (ULNA -> RADIUS at radHeadR/L along pronAxis)：尺骨の上を斜めに交差する剛体回内回転！
    //   外積検証済み: 右(s=-1)は負回転、左(s=+1)は正回転で母指側が前内方(+Z -> 内側)へ回内クロスする
    _qLocal.setFromAxisAngle(pronAxis, s * d2r(pronDeg));
    chainLocalPivotMatrix(outMats[B_RAD], outMats[B_ULNA], pivRadH, _qLocal);

    // (5) 手骨格 (RADIUS -> HAND at wristR/L)：橈骨と一緒に回内した上で、手首の背屈(+X)・尺屈(-s*Z)を実行
    _euler.set(d2r(wristExtDeg), 0, -s * d2r(wristUlnDeg), 'YXZ');
    _qLocal.setFromEuler(_euler);
    chainLocalPivotMatrix(outMats[B_HAND], outMats[B_RAD], pivWr, _qLocal);
  };

  solveArmChain(true);
  solveArmChain(false);

  return {
    weightShift: ws,
    scrub: params.scrub || 0,
    pelvisObliquityDeg: THREE.MathUtils.radToDeg(pelvisObliquityZ),
    hipMovedR: _hipR.clone(),
    hipMovedL: _hipL.clone(),
  };
}

// -----------------------------------------------------------------------------
// CPU側 4ボーン線形ブレンドスキニング（GLSL頂点シェーダーと完全同一数式）
// -----------------------------------------------------------------------------
const _tmpSkin = new THREE.Vector3();

export function skinWorldPoint(p0, idx4, w4, boneMats, outVec) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let k = 0; k < 4; k++) {
    const w = w4[k];
    if (w <= 1e-6) continue;
    const m = boneMats[idx4[k]];
    _tmpSkin.copy(p0).applyMatrix4(m);
    x += _tmpSkin.x * w;
    y += _tmpSkin.y * w;
    z += _tmpSkin.z * w;
  }
  return outVec.set(x, y, z);
}

// -----------------------------------------------------------------------------
// GLSL 共通スキニングコード断片（22ボーン行列：88 vec4s でモバイルGPUでも余裕）
// -----------------------------------------------------------------------------
export const GLSL_BONE_UNIFORMS = /* glsl */ `
uniform mat4 uBoneMats[22];

mat4 getBlendedBoneMatrix(vec4 bIdx, vec4 bW) {
  int i0 = int(bIdx.x + 0.5);
  int i1 = int(bIdx.y + 0.5);
  int i2 = int(bIdx.z + 0.5);
  int i3 = int(bIdx.w + 0.5);
  mat4 m = uBoneMats[i0] * bW.x;
  if (bW.y > 0.0001) m += uBoneMats[i1] * bW.y;
  if (bW.z > 0.0001) m += uBoneMats[i2] * bW.z;
  if (bW.w > 0.0001) m += uBoneMats[i3] * bW.w;
  return m;
}
`;
