import * as THREE from 'three';
export const POSTURE_VERSION = '20261121c';
const POSE_KEYS = [
  'trunkFlex',   // -0.5..1   背中が丸まる（胸椎・腰椎屈曲）
  'headForward', // 0..1      頭が前に出る（スマホ首・ストレートネック）
  'shoulderIn',  // 0..1      肩が内に入る（巻き肩・肩甲骨外転前傾）
  'pelvisTilt',  // -1..1     +後傾（仙骨座り・ソファー座り）/ -前傾（反り腰）
  'trunkRotate', // -1..1     +左(+X)へねじれ / -右(-X)へねじれ
  'sideBend',    // -1..1     +左(+X)へ傾く / -右(-X)へ傾く
  'hipShift',    // -1..1     +骨盤が左(+X)へずれる / -右(-X)へずれる
  'armsFold',    // 0..1      腕を組む（肘を屈曲し前腕を胸の前へ交差）
  'sit',         // 0..1      座位（股関節・膝関節を曲げ、全体高さを調整）
  'prone',       // 0..1      うつ伏せ・プランク（前もも・腕立て等のマット姿勢）
  'headPitch',   // -0.75..0.75 首・頭の上下ピッチ（負で天井を見上げる伸展 / 正で顎引き屈曲）
  'legSpread',   // -0.35..1.10 股関節の左右ワイド開脚・外転
  'hipHinge',    // -0.5..1.2 股関節からの前かがみ（お辞儀・シャンプー・中腰前傾）
  'kneeBend',    // 0..1.2    立位での膝曲げ・中腰・スクワット沈み込み
  'armRaiseL',   // -0.8..2.2 左肩の前方挙上・バンザイ（+前〜上 / -後方伸展）
  'armRaiseR',   // -0.8..2.2 右肩の前方挙上・バンザイ（+前〜上 / -後方伸展）
  'armSpreadL',  // -0.6..1.5 左肩の外転・肘張り（+外側へ開く / -内側へ閉じる）
  'armSpreadR',  // -0.6..1.5 右肩の外転・肘張り（+外側へ開く / -内側へ閉じる）
  'elFlexL',     // 0..1.6    左肘の屈曲（手元作業・保持・擦り動作）
  'elFlexR',     // 0..1.6    右肘の屈曲（手元作業・保持・擦り動作）
  'foreYawL',    // -1.5..1.5 左前腕の水平スイング（+内側へ / -外側へ）
  'foreYawR',    // -1.5..1.5 右前腕の水平スイング（+内側へ / -外側へ）
  'legSwingL',   // -1.0..1.2 左脚の前後スイング・足上げ（+前方振り出し / -後方蹴り出し）
  'legSwingR',   // -1.0..1.2 右脚の前後スイング・足上げ（+前方振り出し / -後方蹴り出し）
  'pronateL',    // -0.5..1.2 左前腕の回内ツイスト（0=手のひら前, 0.58=親指上, 1.0=手のひら下向き）
  'pronateR',    // -0.5..1.2 右前腕の回内ツイスト（0=手のひら前, 0.58=親指上, 1.0=手のひら下向き）
  'wristExtL',   // -0.85..1.15 左手首の背屈・掌屈（+手の甲側へ反らす背屈 / -掌屈）
  'wristExtR',   // -0.85..1.15 右手首の背屈・掌屈（+手の甲側へ反らす背屈 / -掌屈）
  'legAdductL',  // 0..1.1    左股関節の内転・足組み交差
  'legAdductR',  // 0..1.1    右股関節の内転・足組み交差
  'lieSide',     // 0..1.05   横向き寝・寝転びロール（身体左を下にして水平に横たわる）
  'floorSit',    // 0..1.05   床での横座り・お姉さん座り・ぺたんこ座り
  'ankleFlexL',  // -0.95..0.85 左足首（距腿関節）の背屈(+つま先上げ) / 底屈(-ペダル踏み・つま先立ち)
  'ankleFlexR',  // -0.95..0.85 右足首（距腿関節）の背屈(+つま先上げ) / 底屈(-ペダル踏み・つま先立ち)
  'toeRise',     // 0..1      地面に接地したつま先（MTP球）を支点にかかと〜全身が持ち上がるヒール立ち・スウェイバック挙上
];
export const poseUniforms = {
  uPoseA: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseB: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseC: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseD: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseE: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseF: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseG: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseH: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPoseI: { value: new THREE.Vector4(0, 0, 0, 0) },
  uRigRole: { value: new THREE.Vector4(-1, -1, -1, -1) },
  uContractCycle: { value: 0.0 },
};
const BONE_FEMUR_PATELLA = new Set([
  'right-femur', 'left-femur',
  'right-patella', 'left-patella',
]);
const BONE_SHANK = new Set([
  'right-tibia', 'left-tibia',
  'right-fibula', 'left-fibula',
]);
const BONE_FOOT = new Set([
  'right-talus', 'left-talus',
  'right-calcaneus', 'left-calcaneus',
  'right-navicular', 'left-navicular',
  'right-cuboid', 'left-cuboid',
  'right-medial-cuneiform', 'left-medial-cuneiform',
  'right-intermediate-cuneiform', 'left-intermediate-cuneiform',
  'right-lateral-cuneiform', 'left-lateral-cuneiform',
  'right-first-metatarsal-bone', 'left-first-metatarsal-bone',
  'right-second-metatarsal-bone', 'left-second-metatarsal-bone',
  'right-third-metatarsal-bone', 'left-third-metatarsal-bone',
  'right-fourth-metatarsal-bone', 'left-fourth-metatarsal-bone',
  'right-fifth-metatarsal-bone', 'left-fifth-metatarsal-bone',
  'right-big-toe-proximal-phalanx', 'left-big-toe-proximal-phalanx',
  'right-second-toe-proximal-phalanx', 'left-second-toe-proximal-phalanx',
  'right-third-toe-proximal-phalanx', 'left-third-toe-proximal-phalanx',
  'right-fourth-toe-proximal-phalanx', 'left-fourth-toe-proximal-phalanx',
  'right-little-toe-proximal-phalanx', 'left-little-toe-proximal-phalanx',
  'right-second-toe-middle-phalanx', 'left-second-toe-middle-phalanx',
  'right-third-toe-middle-phalanx', 'left-third-toe-middle-phalanx',
  'right-fourth-toe-middle-phalanx', 'left-fourth-toe-middle-phalanx',
  'right-little-toe-middle-phalanx', 'left-little-toe-middle-phalanx',
  'right-big-toe-distal-phalanx', 'left-big-toe-distal-phalanx',
  'right-second-toe-distal-phalanx', 'left-second-toe-distal-phalanx',
  'right-third-toe-distal-phalanx', 'left-third-toe-distal-phalanx',
  'right-fourth-toe-distal-phalanx', 'left-fourth-toe-distal-phalanx',
  'right-little-toe-distal-phalanx', 'left-little-toe-distal-phalanx',
  'right-sesamoid-bones-of-the-foot', 'left-sesamoid-bones-of-the-foot',
]);
const BONE_HUMERUS = new Set([
  'right-humerus', 'left-humerus',
]);
const BONE_ULNA = new Set([
  'right-ulna', 'left-ulna',
]);
const BONE_RADIUS = new Set([
  'right-radius', 'left-radius',
]);
const BONE_HAND = new Set([
  'right-scaphoid', 'left-scaphoid',
  'right-lunate', 'left-lunate',
  'right-triquetral', 'left-triquetral',
  'right-pisiform', 'left-pisiform',
  'right-trapezium', 'left-trapezium',
  'right-trapezoid', 'left-trapezoid',
  'right-capitate', 'left-capitate',
  'right-hamate', 'left-hamate',
  'right-first-metacarpal-bone', 'left-first-metacarpal-bone',
  'right-second-metacarpal-bone', 'left-second-metacarpal-bone',
  'right-third-metacarpal-bone', 'left-third-metacarpal-bone',
  'right-fourth-metacarpal-bone', 'left-fourth-metacarpal-bone',
  'right-fifth-metacarpal-bone', 'left-fifth-metacarpal-bone',
  'right-thumb-proximal-phalanx', 'left-thumb-proximal-phalanx',
  'right-index-finger-proximal-phalanx', 'left-index-finger-proximal-phalanx',
  'right-middle-finger-proximal-phalanx', 'left-middle-finger-proximal-phalanx',
  'right-ring-finger-proximal-phalanx', 'left-ring-finger-proximal-phalanx',
  'right-little-finger-proximal-phalanx', 'left-little-finger-proximal-phalanx',
  'right-index-finger-middle-phalanx', 'left-index-finger-middle-phalanx',
  'right-middle-finger-middle-phalanx', 'left-middle-finger-middle-phalanx',
  'right-ring-finger-middle-phalanx', 'left-ring-finger-middle-phalanx',
  'right-little-finger-middle-phalanx', 'left-little-finger-middle-phalanx',
  'right-thumb-distal-phalanx', 'left-thumb-distal-phalanx',
  'right-index-finger-distal-phalanx', 'left-index-finger-distal-phalanx',
  'right-middle-finger-distal-phalanx', 'left-middle-finger-distal-phalanx',
  'right-ring-finger-distal-phalanx', 'left-ring-finger-distal-phalanx',
  'right-little-finger-distal-phalanx', 'left-little-finger-distal-phalanx',
  'right-sesamoid-bones-of-the-hand', 'left-sesamoid-bones-of-the-hand',
]);
const MUSCLE_HIP_SPAN = new Set([
  'psoas-major', 'psoas-minor', 'iliacus',
  'gluteus-maximus', 'gluteus-medius', 'gluteus-minimus',
  'tensor-fasciae-latae',
  'piriformis', 'gemellus-superior', 'obturator-internus', 'gemellus-inferior',
  'quadratus-femoris', 'obturator-externus',
  'sartorius', 'rectus-femoris',
  'pectineus', 'adductor-longus', 'adductor-brevis', 'adductor-magnus', 'adductor-minimus', 'gracilis',
  'biceps-femoris', 'semitendinosus', 'semimembranosus',
]);
const MUSCLE_HIP_RIGID = new Set([
  'vastus-lateralis', 'vastus-medialis', 'vastus-intermedius',
  'popliteus', 'gastrocnemius', 'soleus', 'plantaris', 'calcaneal-tendon',
  'tibialis-anterior', 'extensor-hallucis-longus', 'extensor-digitorum-longus', 'fibularis-tertius',
  'fibularis-longus', 'fibularis-brevis',
  'flexor-digitorum-longus', 'flexor-hallucis-longus', 'tibialis-posterior',
  'extensor-digitorum-brevis', 'extensor-hallucis-brevis',
  'abductor-hallucis', 'flexor-digitorum-brevis', 'abductor-digiti-minimi-foot',
  'quadratus-plantae', 'lumbricals-foot', 'flexor-hallucis-brevis', 'adductor-hallucis',
  'flexor-digiti-minimi-brevis-foot', 'opponens-digiti-minimi-foot',
  'plantar-interossei', 'dorsal-interossei-foot',
]);
const MUSCLE_KNEE_SPAN = new Set([
  'rectus-femoris', 'vastus-lateralis', 'vastus-medialis', 'vastus-intermedius',
  'sartorius', 'gracilis', 'biceps-femoris', 'semitendinosus', 'semimembranosus',
  'tensor-fasciae-latae', 'gastrocnemius', 'plantaris', 'popliteus',
]);
const MUSCLE_ANKLE_SPAN = new Set([
  'soleus', 'calcaneal-tendon',
  'tibialis-anterior', 'extensor-hallucis-longus', 'extensor-digitorum-longus', 'fibularis-tertius',
  'fibularis-longus', 'fibularis-brevis',
  'flexor-digitorum-longus', 'flexor-hallucis-longus', 'tibialis-posterior',
]);
const MUSCLE_FOOT_INTRINSIC = new Set([
  'extensor-digitorum-brevis', 'extensor-hallucis-brevis',
  'abductor-hallucis', 'flexor-digitorum-brevis', 'abductor-digiti-minimi-foot',
  'quadratus-plantae', 'lumbricals-foot', 'flexor-hallucis-brevis', 'adductor-hallucis',
  'flexor-digiti-minimi-brevis-foot', 'opponens-digiti-minimi-foot',
  'plantar-interossei', 'dorsal-interossei-foot',
]);
const MUSCLE_SHOULDER_SPAN = new Set([
  'deltoid', 'pectoralis-major', 'latissimus-dorsi',
  'teres-major', 'teres-minor', 'supraspinatus', 'infraspinatus', 'subscapularis',
]);
const MUSCLE_ARM_RIGID = new Set([
  'biceps-brachii', 'brachialis', 'coracobrachialis', 'triceps-brachii', 'anconeus',
  'brachioradialis', 'pronator-teres',
  'flexor-carpi-radialis', 'palmaris-longus', 'flexor-carpi-ulnaris',
  'flexor-digitorum-superficialis', 'flexor-digitorum-profundus', 'flexor-pollicis-longus',
  'pronator-quadratus', 'supinator',
  'extensor-carpi-radialis-longus', 'extensor-carpi-radialis-brevis',
  'extensor-digitorum', 'extensor-digiti-minimi', 'extensor-carpi-ulnaris',
  'abductor-pollicis-longus', 'extensor-pollicis-brevis', 'extensor-pollicis-longus', 'extensor-indicis',
  'abductor-pollicis-brevis', 'flexor-pollicis-brevis', 'opponens-pollicis', 'adductor-pollicis',
  'abductor-digiti-minimi-hand', 'flexor-digiti-minimi-brevis-hand', 'opponens-digiti-minimi-hand',
  'lumbricals-hand', 'palmar-interossei', 'dorsal-interossei-hand', 'palmaris-brevis',
]);
const MUSCLE_ELBOW_ULNAR_SPAN = new Set([
  'triceps-brachii', 'brachialis', 'anconeus',
]);
const MUSCLE_ELBOW_RADIAL_SPAN = new Set([
  'brachioradialis', 'extensor-carpi-radialis-longus', 'extensor-carpi-radialis-brevis',
]);
const MUSCLE_HAND_INTRINSIC = new Set([
  'abductor-pollicis-brevis', 'flexor-pollicis-brevis', 'opponens-pollicis', 'adductor-pollicis',
  'abductor-digiti-minimi-hand', 'flexor-digiti-minimi-brevis-hand', 'opponens-digiti-minimi-hand',
  'lumbricals-hand', 'palmar-interossei', 'dorsal-interossei-hand', 'palmaris-brevis',
]);
const MUSCLE_RADIOULNAR_SPAN = new Set([
  'pronator-quadratus', 'supinator',
]);
const MUSCLE_FOREARM_TO_HAND = new Set([
  'flexor-carpi-radialis', 'palmaris-longus', 'flexor-carpi-ulnaris',
  'flexor-digitorum-superficialis', 'flexor-digitorum-profundus', 'flexor-pollicis-longus',
  'extensor-digitorum', 'extensor-digiti-minimi', 'extensor-carpi-ulnaris',
  'abductor-pollicis-longus', 'extensor-pollicis-brevis', 'extensor-pollicis-longus', 'extensor-indicis',
]);
const rigRoleCache = new Map();
const RIGID_HEAD_IDS = new Set([
  'frontal-bone',
  'left-parietal-bone',
  'right-parietal-bone',
  'occipital-bone',
  'left-temporal-bone',
  'right-temporal-bone',
  'sphenoid-bone',
  'ethmoid-bone',
  'left-nasal-bone',
  'right-nasal-bone',
  'left-lacrimal-bone',
  'right-lacrimal-bone',
  'left-zygomatic-bone',
  'right-zygomatic-bone',
  'left-maxilla',
  'right-maxilla',
  'left-palatine-bone',
  'right-palatine-bone',
  'left-inferior-nasal-concha',
  'right-inferior-nasal-concha',
  'vomer',
  'mandible',
  'temporalis',
  'masseter',
  'lateral-pterygoid',
  'medial-pterygoid',
  'frontalis',
  'occipitalis',
  'epicranial-aponeurosis',
  'temporoparietalis',
  'orbicularis-oculi',
  'orbicularis-oris',
  'nasalis',
  'procerus',
  'corrugator-supercilii',
  'zygomaticus-major',
  'zygomaticus-minor',
  'buccinator',
  'risorius',
  'mentalis',
  'levator-labii-superioris',
  'levator-labii-superioris-alaeque-nasi',
  'levator-anguli-oris',
  'depressor-anguli-oris',
  'depressor-labii-inferioris',
  'depressor-septi-nasi',
]);
/**
 * 構造IDと種別('bone'|'muscle')から解剖学的リグ役割ベクトルを返す。
 * @param {string} id 構造ID
 * @param {'bone'|'muscle'} [kind='muscle']
 * @returns {THREE.Vector4} (hipMode, kneeMode, armMode, forearmMode)
 */
export function getRigRole(id, kind = 'muscle') {
  if (!id || typeof id !== 'string') {
    return new THREE.Vector4(-1, -1, -1, -1);
  }
  const cleanId = id.replace(/^(bone|muscle):/, '').replace(/:outline$/, '');
  const cacheKey = `${kind}:${cleanId}`;
  if (rigRoleCache.has(cacheKey)) {
    return rigRoleCache.get(cacheKey).clone();
  }
  let hipMode = 0.0;
  let kneeMode = 0.0;
  let armMode = 0.0;
  let forearmMode = 0.0;
  const isBone =
    kind === 'bone' ||
    id.startsWith('bone:') ||
    BONE_FEMUR_PATELLA.has(cleanId) ||
    BONE_SHANK.has(cleanId) ||
    BONE_FOOT.has(cleanId) ||
    BONE_HUMERUS.has(cleanId) ||
    BONE_ULNA.has(cleanId) ||
    BONE_RADIUS.has(cleanId) ||
    BONE_HAND.has(cleanId);
  if (RIGID_HEAD_IDS.has(cleanId)) {
    hipMode = 3.0;
  } else if (isBone) {
    if (BONE_FEMUR_PATELLA.has(cleanId)) {
      hipMode = 1.0;
      kneeMode = 0.0;
    } else if (
      BONE_SHANK.has(cleanId) ||
      /-(tibia|fibula)$/.test(cleanId)
    ) {
      hipMode = 1.0;
      kneeMode = 1.0;
    } else if (
      BONE_FOOT.has(cleanId) ||
      /-(talus|calcaneus|navicular|cuboid|.*cuneiform|.*metatarsal-bone|.*-toe-.*|sesamoid-bones-of-the-foot)$/.test(cleanId)
    ) {
      hipMode = 1.0;
      kneeMode = 3.0;
    } else if (BONE_HUMERUS.has(cleanId) || /-humerus$/.test(cleanId)) {
      armMode = 1.0;
      forearmMode = 0.0;
    } else if (BONE_ULNA.has(cleanId) || /-ulna$/.test(cleanId)) {
      armMode = 1.0;
      forearmMode = 1.0;
    } else if (BONE_RADIUS.has(cleanId) || /-radius$/.test(cleanId)) {
      armMode = 1.0;
      forearmMode = 3.0;
    } else if (
      BONE_HAND.has(cleanId) ||
      /-(scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|.*metacarpal-bone|thumb-.*|.*-finger-.*|sesamoid-bones-of-the-hand)$/.test(cleanId)
    ) {
      armMode = 1.0;
      forearmMode = 4.0;
    }
  } else {
    if (MUSCLE_HIP_SPAN.has(cleanId)) {
      hipMode = 2.0;
    } else if (MUSCLE_HIP_RIGID.has(cleanId)) {
      hipMode = 1.0;
    }
    if (MUSCLE_FOOT_INTRINSIC.has(cleanId)) {
      kneeMode = 3.0;
    } else if (MUSCLE_ANKLE_SPAN.has(cleanId)) {
      kneeMode = 1.5;
    } else if (MUSCLE_KNEE_SPAN.has(cleanId)) {
      kneeMode = 2.0;
    }
    if (MUSCLE_SHOULDER_SPAN.has(cleanId)) {
      armMode = 2.0;
    } else if (MUSCLE_ARM_RIGID.has(cleanId)) {
      armMode = 1.0;
    }
    if (MUSCLE_ELBOW_ULNAR_SPAN.has(cleanId)) {
      forearmMode = 2.0;
    } else if (cleanId === 'biceps-brachii') {
      forearmMode = 2.2;
    } else if (MUSCLE_ELBOW_RADIAL_SPAN.has(cleanId)) {
      forearmMode = 2.5;
    } else if (cleanId === 'pronator-teres') {
      forearmMode = 2.7;
    } else if (MUSCLE_HAND_INTRINSIC.has(cleanId)) {
      forearmMode = 4.0;
    } else if (MUSCLE_RADIOULNAR_SPAN.has(cleanId)) {
      forearmMode = 5.5;
    } else if (MUSCLE_FOREARM_TO_HAND.has(cleanId)) {
      forearmMode = 5.0;
    }
  }
  const role = new THREE.Vector4(hipMode, kneeMode, armMode, forearmMode);
  rigRoleCache.set(cacheKey, role);
  return role.clone();
}
const currentPose = Object.fromEntries(POSE_KEYS.map((key) => [key, 0]));
const targetPose = { ...currentPose };
const velocityPose = { ...currentPose };
/** currentPose の値を poseUniforms に書き込む */
function syncUniformsFromCurrent() {
  poseUniforms.uPoseA.value.set(
    currentPose.trunkFlex,
    currentPose.headForward,
    currentPose.shoulderIn,
    currentPose.pelvisTilt,
  );
  poseUniforms.uPoseB.value.set(
    currentPose.trunkRotate,
    currentPose.sideBend,
    currentPose.hipShift,
    currentPose.armsFold,
  );
  poseUniforms.uPoseC.value.set(
    currentPose.sit,
    currentPose.prone,
    currentPose.headPitch,
    currentPose.legSpread,
  );
  poseUniforms.uPoseD.value.set(
    currentPose.hipHinge,
    currentPose.kneeBend,
    currentPose.armRaiseL,
    currentPose.armRaiseR,
  );
  poseUniforms.uPoseE.value.set(
    currentPose.armSpreadL,
    currentPose.armSpreadR,
    currentPose.elFlexL,
    currentPose.elFlexR,
  );
  poseUniforms.uPoseF.value.set(
    currentPose.foreYawL,
    currentPose.foreYawR,
    currentPose.legSwingL,
    currentPose.legSwingR,
  );
  poseUniforms.uPoseG.value.set(
    currentPose.pronateL,
    currentPose.pronateR,
    currentPose.wristExtL,
    currentPose.wristExtR,
  );
  poseUniforms.uPoseH.value.set(
    currentPose.legAdductL,
    currentPose.legAdductR,
    currentPose.lieSide,
    currentPose.floorSit,
  );
  poseUniforms.uPoseI.value.set(
    currentPose.ankleFlexL,
    currentPose.ankleFlexR,
    currentPose.toeRise,
    0,
  );
}
/** 外部から poseUniforms が直接書き換えられたかどうかを判定 */
function isUniformModifiedExternally() {
  const a = poseUniforms.uPoseA.value;
  const b = poseUniforms.uPoseB.value;
  const c = poseUniforms.uPoseC.value;
  const d = poseUniforms.uPoseD.value;
  const e = poseUniforms.uPoseE.value;
  const f = poseUniforms.uPoseF.value;
  const g = poseUniforms.uPoseG.value;
  const h = poseUniforms.uPoseH.value;
  const i = poseUniforms.uPoseI.value;
  return (
    Math.abs(a.x - currentPose.trunkFlex) > 1e-6 ||
    Math.abs(a.y - currentPose.headForward) > 1e-6 ||
    Math.abs(a.z - currentPose.shoulderIn) > 1e-6 ||
    Math.abs(a.w - currentPose.pelvisTilt) > 1e-6 ||
    Math.abs(b.x - currentPose.trunkRotate) > 1e-6 ||
    Math.abs(b.y - currentPose.sideBend) > 1e-6 ||
    Math.abs(b.z - currentPose.hipShift) > 1e-6 ||
    Math.abs(b.w - currentPose.armsFold) > 1e-6 ||
    Math.abs(c.x - currentPose.sit) > 1e-6 ||
    Math.abs(c.y - currentPose.prone) > 1e-6 ||
    Math.abs(c.z - currentPose.headPitch) > 1e-6 ||
    Math.abs(c.w - currentPose.legSpread) > 1e-6 ||
    Math.abs(d.x - currentPose.hipHinge) > 1e-6 ||
    Math.abs(d.y - currentPose.kneeBend) > 1e-6 ||
    Math.abs(d.z - currentPose.armRaiseL) > 1e-6 ||
    Math.abs(d.w - currentPose.armRaiseR) > 1e-6 ||
    Math.abs(e.x - currentPose.armSpreadL) > 1e-6 ||
    Math.abs(e.y - currentPose.armSpreadR) > 1e-6 ||
    Math.abs(e.z - currentPose.elFlexL) > 1e-6 ||
    Math.abs(e.w - currentPose.elFlexR) > 1e-6 ||
    Math.abs(f.x - currentPose.foreYawL) > 1e-6 ||
    Math.abs(f.y - currentPose.foreYawR) > 1e-6 ||
    Math.abs(f.z - currentPose.legSwingL) > 1e-6 ||
    Math.abs(f.w - currentPose.legSwingR) > 1e-6 ||
    Math.abs(g.x - currentPose.pronateL) > 1e-6 ||
    Math.abs(g.y - currentPose.pronateR) > 1e-6 ||
    Math.abs(g.z - currentPose.wristExtL) > 1e-6 ||
    Math.abs(g.w - currentPose.wristExtR) > 1e-6 ||
    Math.abs(h.x - currentPose.legAdductL) > 1e-6 ||
    Math.abs(h.y - currentPose.legAdductR) > 1e-6 ||
    Math.abs(h.z - currentPose.lieSide) > 1e-6 ||
    Math.abs(h.w - currentPose.floorSit) > 1e-6 ||
    Math.abs(i.x - currentPose.ankleFlexL) > 1e-6 ||
    Math.abs(i.y - currentPose.ankleFlexR) > 1e-6 ||
    Math.abs(i.z - currentPose.toeRise) > 1e-6
  );
}
export const POSE_GLSL = /* glsl */ `
uniform vec4 uPoseA; // x:trunkFlex, y:headForward, z:shoulderIn, w:pelvisTilt
uniform vec4 uPoseB; // x:trunkRotate, y:sideBend, z:hipShift, w:armsFold
uniform vec4 uPoseC; // x:sit, y:prone, z:headPitch, w:legSpread
uniform vec4 uPoseD; // x:hipHinge, y:kneeBend, z:armRaiseL, w:armRaiseR
uniform vec4 uPoseE; // x:armSpreadL, y:armSpreadR, z:elFlexL, w:elFlexR
uniform vec4 uPoseF; // x:foreYawL, y:foreYawR, z:legSwingL, w:legSwingR
uniform vec4 uPoseG; // x:pronateL, y:pronateR, z:wristExtL, w:wristExtR
uniform vec4 uPoseH; // x:legAdductL, y:legAdductR, z:lieSide, w:floorSit
uniform vec4 uPoseI; // x:ankleFlexL, y:ankleFlexR, z:toeRise, w:0
uniform vec4 uRigRole; // x:hipMode, y:kneeMode, z:armMode, w:forearmMode (-1 = 座標ベースフォールバック)
vec3 posePitchFwd(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dy = p.y - piv.y;
  float dz = p.z - piv.z;
  return vec3(
    p.x,
    piv.y + dy * c - dz * s,
    piv.z + dz * c + dy * s
  );
}
vec3 poseRollLeft(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dx = p.x - piv.x;
  float dy = p.y - piv.y;
  return vec3(
    piv.x + dx * c + dy * s,
    piv.y + dy * c - dx * s,
    p.z
  );
}
vec3 poseYawLeft(vec3 p, vec3 piv, float a) {
  float c = cos(a);
  float s = sin(a);
  float dx = p.x - piv.x;
  float dz = p.z - piv.z;
  return vec3(
    piv.x + dx * c + dz * s,
    p.y,
    piv.z + dz * c - dx * s
  );
}
vec3 poseRotateAxis(vec3 p, vec3 piv, vec3 axis, float a) {
  float c = cos(a);
  float sn = sin(a);
  vec3 v = p - piv;
  return piv + v * c + cross(axis, v) * sn + axis * dot(axis, v) * (1.0 - c);
}
vec3 poseDeform(vec3 wp) {
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
  float ankleFlexL  = uPoseI.x;
  float ankleFlexR  = uPoseI.y;
  float toeRise     = uPoseI.z;
  float act = abs(trunkFlex) + abs(headForward) + abs(shoulderIn)
            + abs(pelvisTilt) + abs(trunkRotate) + abs(sideBend)
            + abs(hipShift) + abs(armsFold) + abs(sit) + abs(prone)
            + abs(headPitch) + abs(legSpread)
            + abs(hipHinge) + abs(kneeBend)
            + abs(armRaiseL) + abs(armRaiseR) + abs(armSpreadL) + abs(armSpreadR)
            + abs(elFlexL) + abs(elFlexR) + abs(foreYawL) + abs(foreYawR)
            + abs(legSwingL) + abs(legSwingR)
            + abs(pronateL) + abs(pronateR) + abs(wristExtL) + abs(wristExtR)
            + abs(legAdductL) + abs(legAdductR) + abs(lieSide) + abs(floorSit)
            + abs(ankleFlexL) + abs(ankleFlexR) + abs(toeRise);
  if (act < 1e-5) return wp;
  vec3 p0 = wp;
  vec3 p = wp;
  float s = p0.x >= 0.0 ? 1.0 : -1.0;
  float isL = p0.x >= 0.0 ? 1.0 : 0.0;
  float ax = abs(p0.x);
  bool hasRig = uRigRole.x >= 0.0;
  bool isRigidHead = hasRig && uRigRole.x > 2.5;
  bool isRigidLeg = hasRig && (uRigRole.x > 0.5 && uRigRole.x < 1.5);
  float armY = smoothstep(-0.95, -0.68, p0.y) * (1.0 - smoothstep(2.12, 2.38, p0.y));
  float armX0 = mix(0.61, 0.56, smoothstep(1.45, 1.95, p0.y));
  float armX1 = mix(0.66, 0.72, smoothstep(1.45, 1.95, p0.y));
  float coordArmMask = smoothstep(armX0, armX1, ax) * armY;
  float shoulderSpanMask = smoothstep(0.56, 0.74, ax)
                         * smoothstep(1.12, 1.62, p0.y)
                         * (1.0 - smoothstep(2.12, 2.38, p0.y));
  float armMask = hasRig
    ? (uRigRole.z < 0.5 ? 0.0 : (uRigRole.z < 1.5 ? 1.0 : (uRigRole.z < 2.5 ? shoulderSpanMask : coordArmMask)))
    : coordArmMask;
  float legMask = 1.0 - armMask;
  float yEff = isRigidLeg ? -0.16 : mix(p0.y, 2.02, armMask);
  float armRaise  = mix(armRaiseR,  armRaiseL,  isL);
  float armSpread = mix(armSpreadR, armSpreadL, isL);
  float elFlex    = mix(elFlexR,    elFlexL,    isL);
  float foreYaw   = mix(foreYawR,   foreYawL,   isL);
  float pronate   = mix(pronateR,   pronateL,   isL);
  float wristExt  = mix(wristExtR,  wristExtL,  isL);
  float customArmAct = abs(armRaise) + abs(armSpread) + abs(elFlex) + abs(foreYaw) + abs(pronate) + abs(wristExt);
  float sitArm = sit * clamp(1.0 - (armsFold + customArmAct) * 1.8, 0.0, 1.0);
  if ((armsFold > 1e-4 || sitArm > 1e-4 || customArmAct > 1e-4) && armMask > 1e-4) {
    float elMask = 0.0;
    float pronWeight = 0.0;
    float wristWeight = 0.0;
    if (hasRig) {
      float fm = uRigRole.w;
      if (fm < 0.5) {
        elMask = 0.0;
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 1.5) {
        elMask = 1.0;
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 2.1) {
        elMask = armMask * (1.0 - smoothstep(0.88, 1.18, p0.y));
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 2.35) {
        elMask = armMask * (1.0 - smoothstep(0.88, 1.18, p0.y));
        pronWeight = elMask * (1.0 - smoothstep(0.76, 0.94, p0.y)) * 0.65;
        wristWeight = 0.0;
      } else if (fm < 2.6) {
        elMask = armMask * (1.0 - smoothstep(0.90, 1.22, p0.y));
        pronWeight = elMask * (1.0 - smoothstep(0.06, 0.92, p0.y));
        wristWeight = elMask * (1.0 - smoothstep(-0.025, 0.020, p0.y));
      } else if (fm < 2.85) {
        elMask = armMask * (1.0 - smoothstep(0.90, 1.12, p0.y));
        pronWeight = elMask * (1.0 - smoothstep(0.54, 0.95, p0.y));
        wristWeight = 0.0;
      } else if (fm < 3.5) {
        elMask = 1.0;
        pronWeight = 1.0;
        wristWeight = 0.0;
      } else if (fm < 4.5) {
        elMask = 1.0;
        pronWeight = 1.0;
        wristWeight = 1.0;
      } else if (fm < 5.25) {
        elMask = 1.0;
        pronWeight = 1.0 - smoothstep(0.05, 0.88, p0.y);
        wristWeight = 1.0 - smoothstep(-0.025, 0.020, p0.y);
      } else {
        elMask = 1.0;
        pronWeight = smoothstep(0.945, 1.025, ax);
        wristWeight = 0.0;
      }
    } else {
      elMask = armMask * (1.0 - smoothstep(0.90, 1.22, p0.y));
      pronWeight = elMask * (1.0 - smoothstep(0.05, 0.88, p0.y));
      wristWeight = elMask * (1.0 - smoothstep(-0.025, 0.020, p0.y));
    }
    float shMask = hasRig
      ? (uRigRole.z < 0.5 ? 0.0 : (uRigRole.z < 1.5 ? 1.0 : armMask * (1.0 - smoothstep(1.90, 2.22, p0.y))))
      : armMask * (1.0 - smoothstep(1.90, 2.22, p0.y));
    vec3 pivEl = hasRig ? vec3(s * 0.865, 0.925, -0.128) : vec3(s * 0.865, 0.96, -0.11);
    vec3 pivSh = hasRig ? vec3(s * 0.72, 2.02, -0.08) : vec3(s * 0.72, 2.02, -0.10);
    vec3 pivRadHead = vec3(s * 0.9300, 0.8869, -0.1080);
    vec3 pivUlnaHead = vec3(s * 0.9565, 0.0322, 0.0585);
    vec3 pronAxis = normalize(pivUlnaHead - pivRadHead);
    vec3 pivWrist = vec3(s * 1.012, 0.016, 0.068);
    if (customArmAct > 1e-4) {
      if (abs(wristExt) > 1e-4 && wristWeight > 1e-5) {
        p = posePitchFwd(p, pivWrist, clamp(wristExt, -0.80, 1.10) * 0.96 * wristWeight);
      }
      float autoPron = 0.22 * clamp(elFlex, 0.0, 1.0) * clamp(1.0 - abs(pronate) * 2.0, 0.0, 1.0);
      float effPronate = clamp(pronate + autoPron, -0.45, 1.08);
      if (abs(effPronate) > 1e-4 && pronWeight > 1e-5) {
        p = poseRotateAxis(p, pivRadHead, pronAxis, s * 2.52 * effPronate * pronWeight);
      }
      float wEl = elMask;
      p = posePitchFwd(p, pivEl, -1.08 * elFlex * wEl);
      p = poseYawLeft(p, pivEl, -s * 0.85 * foreYaw * wEl);
      float torsoFwd = 0.55 * max(0.0, trunkFlex) + 0.75 * max(0.0, hipHinge);
      float compFwd = torsoFwd * smoothstep(0.05, 0.45, armRaise);
      float wSh = shMask;
      p = poseRollLeft(p, pivSh, -s * 0.78 * armSpread * wSh);
      p = posePitchFwd(p, pivSh, -(1.05 * armRaise + compFwd) * wSh);
      p.z += 0.05 * clamp(armRaise, 0.0, 1.0) * wSh;
    }
    if (armsFold > 1e-4) {
      float foldBend = 1.0 - pow(clamp(1.0 - armsFold, 0.0, 1.0), 1.45);
      float midHold = smoothstep(0.15, 0.45, armsFold) * (1.0 - smoothstep(0.78, 0.96, armsFold));
      float bendReach = smoothstep(0.35, 0.70, trunkFlex) * smoothstep(0.18, 0.45, armsFold);
      float workReach = clamp(midHold * 0.75 + bendReach * 0.85, 0.0, 1.0);
      float crossRate = mix(0.54, 1.0, smoothstep(0.75, 0.96, armsFold)) * (1.0 - 0.38 * bendReach);
      float wElB = elMask * foldBend;
      float wElC = elMask * armsFold * crossRate;
      p = poseYawLeft(p, pivEl, -s * 0.75 * wElC);
      p = posePitchFwd(p, pivEl, (-1.18 - s * 0.05) * wElB);
      p = poseYawLeft(p, pivEl, -s * (1.28 - s * 0.04) * wElC);
      float shAdduct = (0.26 * armsFold - 0.18 * workReach) * shMask;
      float shPitch = ((-0.52 - s * 0.03) * armsFold - (0.30 * workReach + 0.16 * bendReach)) * shMask;
      p = poseRollLeft(p, pivSh, s * shAdduct);
      p = posePitchFwd(p, pivSh, shPitch);
      p.z += 0.06 * workReach * shMask;
      p.y += 0.04 * midHold * (1.0 - bendReach) * shMask;
    }
    if (sitArm > 1e-4) {
      float wElS = elMask * sitArm;
      float wShS = shMask * sitArm;
      if (pronWeight > 1e-5) {
        p = poseRotateAxis(p, pivRadHead, pronAxis, s * 2.36 * pronWeight * sitArm);
      }
      p = posePitchFwd(p, pivEl, -0.68 * wElS);
      p = poseYawLeft(p, pivEl, -s * 0.36 * wElS);
      p = poseRollLeft(p, pivSh, s * 0.08 * wShS);
      p = posePitchFwd(p, pivSh, -0.10 * wShS);
    }
  }
  if (shoulderIn > 1e-4) {
    float armOverheadAtten = 1.0 - 0.78 * smoothstep(1.10, 2.15, armRaise);
    float trunkSh = smoothstep(0.36, 0.66, ax)
                  * smoothstep(1.10, 1.65, p0.y)
                  * (1.0 - smoothstep(2.18, 2.45, p0.y));
    float wShIn = max(armMask * armOverheadAtten, trunkSh * (1.0 - armMask)) * shoulderIn;
    vec3 pivClav = vec3(s * 0.35, 1.85, -0.06);
    p = poseYawLeft(p, pivClav, -s * 0.34 * wShIn);
    p = posePitchFwd(p, pivClav, 0.08 * wShIn);
    p.z += 0.04 * wShIn;
  }
  if (headForward > 1e-4) {
    float neckMask = (1.0 - armMask) * headForward;
    float wNeck = isRigidHead ? neckMask : smoothstep(1.82, 2.32, p0.y) * neckMask;
    float wHead = isRigidHead ? neckMask : smoothstep(2.32, 2.68, p0.y) * neckMask;
    vec3 pivNeck = vec3(0.0, 2.15, -0.08);
    vec3 pivHead = vec3(0.0, 2.52, 0.02);
    p = posePitchFwd(p, pivNeck, 0.38 * wNeck);
    p.z += 0.14 * wNeck;
    p.y -= 0.03 * wNeck;
    float headComp = -0.18 - 0.22 * clamp(hipHinge, 0.0, 1.0);
    p = posePitchFwd(p, pivHead, headComp * wHead);
  }
  if (abs(headPitch) > 1e-4) {
    float hpMask = (1.0 - armMask) * headPitch;
    float wNeckP = isRigidHead ? hpMask : smoothstep(1.85, 2.35, p0.y) * hpMask;
    float wHeadP = isRigidHead ? hpMask : smoothstep(2.30, 2.65, p0.y) * hpMask;
    p = posePitchFwd(p, vec3(0.0, 2.15, -0.10), 0.46 * wNeckP);
    p = posePitchFwd(p, vec3(0.0, 2.48, -0.04), 0.42 * wHeadP);
  }
  if (abs(trunkFlex) > 1e-4) {
    float wFlexT = smoothstep(0.75, 1.95, yEff) * trunkFlex;
    float wFlexL = smoothstep(0.05, 1.25, yEff) * trunkFlex;
    p = posePitchFwd(p, vec3(0.0, 1.25, -0.08), 0.38 * wFlexT);
    p = posePitchFwd(p, vec3(0.0, 0.35, -0.06), 0.26 * wFlexL);
  }
  if (abs(hipHinge) > 1e-4) {
    float wHinge = smoothstep(-0.08, 0.20, yEff) * hipHinge;
    p = posePitchFwd(p, vec3(0.0, 0.02, -0.04), 0.78 * wHinge);
    float wCounter = isRigidLeg ? 0.0 : smoothstep(-1.62, 0.05, yEff);
    p.z -= 0.22 * hipHinge * wCounter;
  }
  if (abs(trunkRotate) > 1e-4) {
    float wRot = smoothstep(0.02, 1.95, yEff) * trunkRotate;
    p = poseYawLeft(p, vec3(0.0, 0.0, -0.06), 0.52 * wRot);
  }
  if (abs(sideBend) > 1e-4) {
    float wBend = smoothstep(0.05, 1.75, yEff) * sideBend;
    p = poseRollLeft(p, vec3(0.0, 0.35, -0.06), 0.34 * wBend);
  }
  if (abs(pelvisTilt) > 1e-4) {
    float wPelvRot = smoothstep(-0.15, 0.18, yEff) * (1.0 - smoothstep(0.45, 1.15, yEff));
    p = posePitchFwd(p, vec3(0.0, 0.0, -0.05), -0.26 * pelvisTilt * wPelvRot);
    float wArch = smoothstep(0.0, 0.42, yEff) * (1.0 - smoothstep(0.60, 1.25, yEff));
    p.z -= 0.09 * pelvisTilt * wArch;
    float wSlouch = smoothstep(0.20, 1.15, yEff);
    p = posePitchFwd(p, vec3(0.0, 0.35, -0.06), 0.14 * pelvisTilt * wSlouch);
  }
  if (!isRigidLeg && abs(hipShift) > 1e-4) {
    float wShift = smoothstep(-3.15, 0.05, yEff) * (1.0 - 0.35 * smoothstep(0.25, 2.10, yEff));
    p.x += 0.24 * hipShift * wShift;
    float wHipRoll = smoothstep(-0.35, 0.05, yEff) * (1.0 - smoothstep(0.30, 1.00, yEff));
    p = poseRollLeft(p, vec3(0.0, 0.05, -0.05), -0.10 * hipShift * wHipRoll);
  }
  float gluteGuard = (1.0 - smoothstep(-0.18, -0.04, p0.z)) * smoothstep(-0.32, -0.02, p0.y);
  float ankleMask = hasRig
    ? (uRigRole.y > 2.5 ? 1.0 : (uRigRole.y > 1.2 ? (1.0 - smoothstep(-3.16, -2.86, p0.y)) : 0.0))
    : (1.0 - smoothstep(-3.14, -2.90, p0.y)) * legMask;
  float kneeMask = hasRig
    ? (uRigRole.y < 0.5 ? 0.0 : ((uRigRole.y > 1.8 && uRigRole.y < 2.5) ? (1.0 - smoothstep(-1.72, -1.42, p0.y)) : 1.0))
    : (1.0 - smoothstep(-1.78, -1.45, p0.y)) * legMask;
  float hipMask = hasRig
    ? ((uRigRole.x < 0.5 || isRigidHead) ? 0.0 : (uRigRole.x < 1.5 ? 1.0 : (1.0 - smoothstep(-0.24, 0.14, p0.y)) * (1.0 - 0.55 * gluteGuard)))
    : (1.0 - smoothstep(-0.22, 0.12, p0.y)) * (1.0 - 0.65 * gluteGuard) * legMask;
  vec3 pivAnkleSide = vec3(s * 0.31, -3.03, -0.13);
  vec3 pivKneeSide  = vec3(s * 0.185, -1.62, 0.02);
  vec3 pivHipSide   = vec3(s * 0.185, -0.02, -0.03);
  float ankleFlex   = mix(ankleFlexR, ankleFlexL, isL);
  float legSwing    = mix(legSwingR, legSwingL, isL);
  float legAdduct   = mix(legAdductR, legAdductL, isL);
  float standRatio  = clamp(1.0 - clamp(sit, 0.0, 1.0) - clamp(floorSit, 0.0, 1.0) - clamp(prone, 0.0, 1.0), 0.0, 1.0);
  float hingeLegAng = isRigidLeg ? (0.1375 * hipHinge * standRatio) : 0.0;
  if (abs(ankleFlex) > 1e-4 && ankleMask > 1e-5) {
    p = posePitchFwd(p, pivAnkleSide, -0.78 * ankleFlex * ankleMask);
  }
  float autoSwingKnee = max(0.0, -legSwing * 0.72) + max(0.0, legSwing * 0.12);
  float sitKnee = (1.36 - 0.18 * clamp(legAdduct, 0.0, 1.2)) * sit;
  float totalKneePitch = sitKnee
                       + (2.18 + s * 0.18) * floorSit
                       + 1.12 * kneeBend
                       + 0.78 * autoSwingKnee
                       + hingeLegAng;
  if (abs(totalKneePitch) > 1e-4 && kneeMask > 1e-5) {
    p = posePitchFwd(p, pivKneeSide, totalKneePitch * kneeMask);
  }
  if (hipMask > 1e-5) {
    if (legAdduct > 1e-4) {
      p = poseRollLeft(p, pivHipSide, s * 0.32 * legAdduct * hipMask);
      p = poseYawLeft(p, pivHipSide, s * 0.14 * legAdduct * hipMask);
    }
    if (sit > 1e-4) {
      p = poseRollLeft(p, pivHipSide, -s * 0.035 * sit * (1.0 - clamp(legAdduct, 0.0, 1.0)) * hipMask);
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
      p = posePitchFwd(p, pivHipSide, totalHipPitch * hipMask);
    }
    if (floorSit > 1e-4) {
      p = poseRollLeft(p, pivHipSide, s * (1.16 - s * 0.04) * floorSit * hipMask);
      p = poseYawLeft(p, pivHipSide, s * 0.56 * floorSit * hipMask);
    }
    if (abs(legSpread) > 1e-4) {
      float sitRatio = clamp(sit, 0.0, 1.0);
      p = poseRollLeft(p, pivHipSide, -s * 0.46 * legSpread * (1.0 - 0.55 * sitRatio) * hipMask);
      p = poseYawLeft(p, pivHipSide, s * (0.30 + 0.38 * sitRatio) * legSpread * hipMask);
    }
  }
  if (isRigidLeg && abs(hipHinge) > 1e-4) {
    p.y += 1.60 * (1.0 - cos(hingeLegAng));
    p.z -= 1.60 * sin(hingeLegAng) + 0.22 * hipHinge * (1.0 - standRatio);
  }
  if (prone > 1e-4) {
    p = posePitchFwd(p, vec3(0.0, -0.20, -0.05), 1.5708 * prone);
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
  if (toeRise > 1e-4) {
    float angRise = 0.78 * max(0.0, -0.5 * (ankleFlexL + ankleFlexR));
    float cR = cos(angRise);
    float sR = sin(angRise);
    float dAnkY = 0.23 * (cR - 1.0) + 0.29 * sR;
    float dAnkZ = -0.29 * (cR - 1.0) + 0.23 * sR;
    float toeFlat = smoothstep(0.14, 0.24, p0.z) * (1.0 - smoothstep(-3.21, -3.08, p0.y)) * ankleMask;
    p.y += (dAnkY + 0.045 * (1.0 - toeFlat)) * toeRise;
    p.z += dAnkZ * toeRise;
    if (toeFlat > 1e-4 && angRise > 1e-4) {
      p = posePitchFwd(p, vec3(s * 0.31, -3.26, 0.16), -angRise * 0.88 * toeFlat * toeRise);
    }
    float yBody = mix(p0.y, 2.02, armMask);
    float swayPelvis = smoothstep(-3.03, -0.02, yBody) * (1.0 - 0.92 * smoothstep(0.24, 1.15, yBody));
    float lumbarArch = smoothstep(0.12, 0.48, yBody) * (1.0 - smoothstep(0.62, 1.30, yBody));
    p.z += (0.13 * swayPelvis + 0.075 * lumbarArch) * toeRise;
  }
  if (isRigidLeg && abs(hipShift) > 1e-4) {
    float hLegShift = 3.13 - 0.44 * clamp(kneeBend, 0.0, 1.2);
    float angLegShift = (0.24 * hipShift * standRatio) / hLegShift;
    p = poseRollLeft(p, vec3(0.0, -3.15, -0.03 - 0.18 * kneeBend), angLegShift);
    p.x += 0.24 * hipShift * (1.0 - standRatio);
  }
  if (lieSide > 1e-4) {
    p = poseRollLeft(p, vec3(0.0, 0.35, 0.0), 1.34 * lieSide);
    p.y -= 0.25 * lieSide;
  }
  return p;
}
vec3 poseDeformNormal(vec3 wp, vec3 n) {
  float act = abs(uPoseA.x) + abs(uPoseA.y) + abs(uPoseA.z) + abs(uPoseA.w)
            + abs(uPoseB.x) + abs(uPoseB.y) + abs(uPoseB.z) + abs(uPoseB.w)
            + abs(uPoseC.x) + abs(uPoseC.y) + abs(uPoseC.z) + abs(uPoseC.w)
            + abs(uPoseD.x) + abs(uPoseD.y) + abs(uPoseD.z) + abs(uPoseD.w)
            + abs(uPoseE.x) + abs(uPoseE.y) + abs(uPoseE.z) + abs(uPoseE.w)
            + abs(uPoseF.x) + abs(uPoseF.y) + abs(uPoseF.z) + abs(uPoseF.w)
            + abs(uPoseG.x) + abs(uPoseG.y) + abs(uPoseG.z) + abs(uPoseG.w)
            + abs(uPoseH.x) + abs(uPoseH.y) + abs(uPoseH.z) + abs(uPoseH.w)
            + abs(uPoseI.x) + abs(uPoseI.y) + abs(uPoseI.z);
  vec3 n0 = normalize(n);
  if (act < 1e-5) return n0;
  vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(up, n0));
  vec3 t2 = cross(n0, t1);
  const float eps = 0.01;
  vec3 p0 = poseDeform(wp);
  vec3 d1 = poseDeform(wp + t1 * eps) - p0;
  vec3 d2 = poseDeform(wp + t2 * eps) - p0;
  vec3 wn = cross(d1, d2);
  float len = length(wn);
  return len > 1e-8 ? wn / len : n0;
}
`;
/**
 * Three.js の onBeforeCompile(shader) 内で呼び出し、姿勢変形を注入する。
 * 後続の onBeforeCompile 連結を壊さないよう、既存の #include マーカーを残したまま拡張する。
 * @param {object} shader Three.js onBeforeCompile の shader オブジェクト
 * @param {THREE.Vector4|string} [rigRole] 構造別ボーン・リグ役割ベクトル（省略時は shader.shaderName または座標フォールバック）
 */
export function injectPose(shader, rigRole) {
  if (!shader || !shader.vertexShader) return shader;
  Object.assign(shader.uniforms, poseUniforms);
  let resolvedRole = null;
  if (rigRole && typeof rigRole === 'object' && Number.isFinite(rigRole.x)) {
    resolvedRole = rigRole;
  } else if (typeof rigRole === 'string' && rigRole) {
    resolvedRole = getRigRole(rigRole);
  } else {
    const sName = shader.shaderName || shader.name || '';
    const m = typeof sName === 'string' ? sName.match(/^(bone|muscle):(.+)$/) : null;
    if (m) {
      resolvedRole = getRigRole(m[2], m[1]);
    }
  }
  shader.uniforms.uRigRole = {
    value: resolvedRole || new THREE.Vector4(-1, -1, -1, -1),
  };
  let vs = shader.vertexShader;
  if (!vs.includes('vec3 poseDeform(')) {
    if (vs.includes('#include <common>')) {
      vs = vs.replace('#include <common>', `#include <common>\n${POSE_GLSL}`);
    } else {
      vs = `${POSE_GLSL}\n${vs}`;
    }
  }
  if (vs.includes('#include <defaultnormal_vertex>') && !vs.includes('poseDeformNormal(')) {
    vs = vs.replace(
      '#include <defaultnormal_vertex>',
      `#include <defaultnormal_vertex>
      {
        vec4 poseNPos = vec4( position, 1.0 );
        #ifdef USE_BATCHING
          poseNPos = batchingMatrix * poseNPos;
        #endif
        #ifdef USE_INSTANCING
          poseNPos = instanceMatrix * poseNPos;
        #endif
        vec3 poseWn = normalize( ( vec4( transformedNormal, 0.0 ) * viewMatrix ).xyz );
        poseWn = poseDeformNormal( ( modelMatrix * poseNPos ).xyz, poseWn );
        transformedNormal = ( viewMatrix * vec4( poseWn, 0.0 ) ).xyz;
      }`,
    );
  }
  if (vs.includes('#include <project_vertex>') && !vs.includes('poseWp')) {
    vs = vs.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec4 poseWp = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        poseWp = batchingMatrix * poseWp;
      #endif
      #ifdef USE_INSTANCING
        poseWp = instanceMatrix * poseWp;
      #endif
      poseWp = modelMatrix * poseWp;
      poseWp.xyz = poseDeform( poseWp.xyz );
      mvPosition = viewMatrix * poseWp;
      gl_Position = projectionMatrix * mvPosition;`,
    );
  }
  if (vs.includes('#include <worldpos_vertex>') && vs.includes('poseWp') && !vs.includes('worldPosition = poseWp')) {
    vs = vs.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
        worldPosition = poseWp;
      #endif`,
    );
  }
  shader.vertexShader = vs;
  return shader;
}
function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
function mix(a, b, t) {
  return a + (b - a) * t;
}
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
function resolveRigRoleArg(rigRole) {
  if (!rigRole) return null;
  if (typeof rigRole === 'object' && Number.isFinite(rigRole.x)) return rigRole;
  if (typeof rigRole === 'string') return getRigRole(rigRole);
  return null;
}
/**
 * 指定されたポーズ係数を用いてワールド座標 v3 を変形し、新しい THREE.Vector3 を返す。
 * GLSL の poseDeform と 100% 同一数式・同一順序で同期。
 */
function evalDeform(v3, poseObj, rigRole = null) {
  const p = new THREE.Vector3(v3.x, v3.y, v3.z);
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
  const ankleFlexL  = poseObj.ankleFlexL  || 0;
  const ankleFlexR  = poseObj.ankleFlexR  || 0;
  const toeRise     = poseObj.toeRise     || 0;
  const act =
    Math.abs(trunkFlex) +
    Math.abs(headForward) +
    Math.abs(shoulderIn) +
    Math.abs(pelvisTilt) +
    Math.abs(trunkRotate) +
    Math.abs(sideBend) +
    Math.abs(hipShift) +
    Math.abs(armsFold) +
    Math.abs(sit) +
    Math.abs(prone) +
    Math.abs(headPitch) +
    Math.abs(legSpread) +
    Math.abs(hipHinge) +
    Math.abs(kneeBend) +
    Math.abs(armRaiseL) +
    Math.abs(armRaiseR) +
    Math.abs(armSpreadL) +
    Math.abs(armSpreadR) +
    Math.abs(elFlexL) +
    Math.abs(elFlexR) +
    Math.abs(foreYawL) +
    Math.abs(foreYawR) +
    Math.abs(legSwingL) +
    Math.abs(legSwingR) +
    Math.abs(pronateL) +
    Math.abs(pronateR) +
    Math.abs(wristExtL) +
    Math.abs(wristExtR) +
    Math.abs(legAdductL) +
    Math.abs(legAdductR) +
    Math.abs(lieSide) +
    Math.abs(floorSit) +
    Math.abs(ankleFlexL) +
    Math.abs(ankleFlexR) +
    Math.abs(toeRise);
  if (act < 1e-5) return p;
  const x0 = v3.x;
  const y0 = v3.y;
  const s = x0 >= 0.0 ? 1.0 : -1.0;
  const isL = x0 >= 0.0 ? 1.0 : 0.0;
  const ax = Math.abs(x0);
  const role = resolveRigRoleArg(rigRole);
  const hasRig = Boolean(role && role.x >= 0.0);
  const isRigidHead = Boolean(hasRig && role.x > 2.5);
  const isRigidLeg = Boolean(hasRig && role.x > 0.5 && role.x < 1.5);
  const armY = smoothstep(-0.95, -0.68, y0) * (1.0 - smoothstep(2.12, 2.38, y0));
  const tSh = smoothstep(1.45, 1.95, y0);
  const armX0 = mix(0.61, 0.56, tSh);
  const armX1 = mix(0.66, 0.72, tSh);
  const coordArmMask = smoothstep(armX0, armX1, ax) * armY;
  const shoulderSpanMask =
    smoothstep(0.56, 0.74, ax) *
    smoothstep(1.12, 1.62, y0) *
    (1.0 - smoothstep(2.12, 2.38, y0));
  const armMask = hasRig
    ? role.z < 0.5
      ? 0.0
      : role.z < 1.5
        ? 1.0
        : role.z < 2.5
          ? shoulderSpanMask
          : coordArmMask
    : coordArmMask;
  const legMask = 1.0 - armMask;
  const yEff = isRigidLeg ? -0.16 : mix(y0, 2.02, armMask);
  const armRaise  = mix(armRaiseR,  armRaiseL,  isL);
  const armSpread = mix(armSpreadR, armSpreadL, isL);
  const elFlex    = mix(elFlexR,    elFlexL,    isL);
  const foreYaw   = mix(foreYawR,   foreYawL,   isL);
  const pronate   = mix(pronateR,   pronateL,   isL);
  const wristExt  = mix(wristExtR,  wristExtL,  isL);
  const customArmAct =
    Math.abs(armRaise) +
    Math.abs(armSpread) +
    Math.abs(elFlex) +
    Math.abs(foreYaw) +
    Math.abs(pronate) +
    Math.abs(wristExt);
  const sitArm = sit * clamp(1.0 - (armsFold + customArmAct) * 1.8, 0.0, 1.0);
  if ((armsFold > 1e-4 || sitArm > 1e-4 || customArmAct > 1e-4) && armMask > 1e-4) {
    let elMask = 0.0;
    let pronWeight = 0.0;
    let wristWeight = 0.0;
    if (hasRig) {
      const fm = role.w;
      if (fm < 0.5) {
        elMask = 0.0;
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 1.5) {
        elMask = 1.0;
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 2.1) {
        elMask = armMask * (1.0 - smoothstep(0.88, 1.18, y0));
        pronWeight = 0.0;
        wristWeight = 0.0;
      } else if (fm < 2.35) {
        elMask = armMask * (1.0 - smoothstep(0.88, 1.18, y0));
        pronWeight = elMask * (1.0 - smoothstep(0.76, 0.94, y0)) * 0.65;
        wristWeight = 0.0;
      } else if (fm < 2.6) {
        elMask = armMask * (1.0 - smoothstep(0.90, 1.22, y0));
        pronWeight = elMask * (1.0 - smoothstep(0.06, 0.92, y0));
        wristWeight = elMask * (1.0 - smoothstep(-0.025, 0.020, y0));
      } else if (fm < 2.85) {
        elMask = armMask * (1.0 - smoothstep(0.90, 1.12, y0));
        pronWeight = elMask * (1.0 - smoothstep(0.54, 0.95, y0));
        wristWeight = 0.0;
      } else if (fm < 3.5) {
        elMask = 1.0;
        pronWeight = 1.0;
        wristWeight = 0.0;
      } else if (fm < 4.5) {
        elMask = 1.0;
        pronWeight = 1.0;
        wristWeight = 1.0;
      } else if (fm < 5.25) {
        elMask = 1.0;
        pronWeight = 1.0 - smoothstep(0.05, 0.88, y0);
        wristWeight = 1.0 - smoothstep(-0.025, 0.020, y0);
      } else {
        elMask = 1.0;
        pronWeight = smoothstep(0.945, 1.025, ax);
        wristWeight = 0.0;
      }
    } else {
      elMask = armMask * (1.0 - smoothstep(0.90, 1.22, y0));
      pronWeight = elMask * (1.0 - smoothstep(0.05, 0.88, y0));
      wristWeight = elMask * (1.0 - smoothstep(-0.025, 0.020, y0));
    }
    const shMask = hasRig
      ? role.z < 0.5
        ? 0.0
        : role.z < 1.5
          ? 1.0
          : armMask * (1.0 - smoothstep(1.90, 2.22, y0))
      : armMask * (1.0 - smoothstep(1.90, 2.22, y0));
    const pivElX = s * 0.865;
    const pivElY = hasRig ? 0.925 : 0.96;
    const pivElZ = hasRig ? -0.128 : -0.11;
    const pivShX = s * 0.72;
    const pivShY = 2.02;
    const pivShZ = hasRig ? -0.08 : -0.10;
    const pivRadHeadX = s * 0.9300;
    const pivRadHeadY = 0.8869;
    const pivRadHeadZ = -0.1080;
    const pivUlnaHeadX = s * 0.9565;
    const pivUlnaHeadY = 0.0322;
    const pivUlnaHeadZ = 0.0585;
    let pAxX = pivUlnaHeadX - pivRadHeadX;
    let pAxY = pivUlnaHeadY - pivRadHeadY;
    let pAxZ = pivUlnaHeadZ - pivRadHeadZ;
    const pAxLen = Math.hypot(pAxX, pAxY, pAxZ) || 1.0;
    pAxX /= pAxLen;
    pAxY /= pAxLen;
    pAxZ /= pAxLen;
    const pivWristX = s * 1.012;
    const pivWristY = 0.016;
    const pivWristZ = 0.068;
    if (customArmAct > 1e-4) {
      if (Math.abs(wristExt) > 1e-4 && wristWeight > 1e-5) {
        pitchFwdJS(p, pivWristX, pivWristY, pivWristZ, clamp(wristExt, -0.80, 1.10) * 0.96 * wristWeight);
      }
      const autoPron = 0.22 * clamp(elFlex, 0.0, 1.0) * clamp(1.0 - Math.abs(pronate) * 2.0, 0.0, 1.0);
      const effPronate = clamp(pronate + autoPron, -0.45, 1.08);
      if (Math.abs(effPronate) > 1e-4 && pronWeight > 1e-5) {
        rotateAxisJS(p, pivRadHeadX, pivRadHeadY, pivRadHeadZ, pAxX, pAxY, pAxZ, s * 2.52 * effPronate * pronWeight);
      }
      const wEl = elMask;
      pitchFwdJS(p, pivElX, pivElY, pivElZ, -1.08 * elFlex * wEl);
      yawLeftJS(p, pivElX, pivElY, pivElZ, -s * 0.85 * foreYaw * wEl);
      const torsoFwd = 0.55 * Math.max(0.0, trunkFlex) + 0.75 * Math.max(0.0, hipHinge);
      const compFwd = torsoFwd * smoothstep(0.05, 0.45, armRaise);
      const wSh = shMask;
      rollLeftJS(p, pivShX, pivShY, pivShZ, -s * 0.78 * armSpread * wSh);
      pitchFwdJS(p, pivShX, pivShY, pivShZ, -(1.05 * armRaise + compFwd) * wSh);
      p.z += 0.05 * clamp(armRaise, 0.0, 1.0) * wSh;
    }
    if (armsFold > 1e-4) {
      const foldBend = 1.0 - Math.pow(clamp(1.0 - armsFold, 0.0, 1.0), 1.45);
      const midHold = smoothstep(0.15, 0.45, armsFold) * (1.0 - smoothstep(0.78, 0.96, armsFold));
      const bendReach = smoothstep(0.35, 0.70, trunkFlex) * smoothstep(0.18, 0.45, armsFold);
      const workReach = clamp(midHold * 0.75 + bendReach * 0.85, 0.0, 1.0);
      const crossRate = mix(0.54, 1.0, smoothstep(0.75, 0.96, armsFold)) * (1.0 - 0.38 * bendReach);
      const wElB = elMask * foldBend;
      const wElC = elMask * armsFold * crossRate;
      yawLeftJS(p, pivElX, pivElY, pivElZ, -s * 0.75 * wElC);
      pitchFwdJS(p, pivElX, pivElY, pivElZ, (-1.18 - s * 0.05) * wElB);
      yawLeftJS(p, pivElX, pivElY, pivElZ, -s * (1.28 - s * 0.04) * wElC);
      const shAdduct = (0.26 * armsFold - 0.18 * workReach) * shMask;
      const shPitch = ((-0.52 - s * 0.03) * armsFold - (0.30 * workReach + 0.16 * bendReach)) * shMask;
      rollLeftJS(p, pivShX, pivShY, pivShZ, s * shAdduct);
      pitchFwdJS(p, pivShX, pivShY, pivShZ, shPitch);
      p.z += 0.06 * workReach * shMask;
      p.y += 0.04 * midHold * (1.0 - bendReach) * shMask;
    }
    if (sitArm > 1e-4) {
      const wElS = elMask * sitArm;
      const wShS = shMask * sitArm;
      if (pronWeight > 1e-5) {
        rotateAxisJS(p, pivRadHeadX, pivRadHeadY, pivRadHeadZ, pAxX, pAxY, pAxZ, s * 2.36 * pronWeight * sitArm);
      }
      pitchFwdJS(p, pivElX, pivElY, pivElZ, -0.68 * wElS);
      yawLeftJS(p, pivElX, pivElY, pivElZ, -s * 0.36 * wElS);
      rollLeftJS(p, pivShX, pivShY, pivShZ, s * 0.08 * wShS);
      pitchFwdJS(p, pivShX, pivShY, pivShZ, -0.10 * wShS);
    }
  }
  if (shoulderIn > 1e-4) {
    const armOverheadAtten = 1.0 - 0.78 * smoothstep(1.10, 2.15, armRaise);
    const trunkSh =
      smoothstep(0.36, 0.66, ax) *
      smoothstep(1.10, 1.65, y0) *
      (1.0 - smoothstep(2.18, 2.45, y0));
    const wShIn = Math.max(armMask * armOverheadAtten, trunkSh * (1.0 - armMask)) * shoulderIn;
    yawLeftJS(p, s * 0.35, 1.85, -0.06, -s * 0.34 * wShIn);
    pitchFwdJS(p, s * 0.35, 1.85, -0.06, 0.08 * wShIn);
    p.z += 0.04 * wShIn;
  }
  if (headForward > 1e-4) {
    const neckMask = (1.0 - armMask) * headForward;
    const wNeck = isRigidHead ? neckMask : smoothstep(1.82, 2.32, y0) * neckMask;
    const wHead = isRigidHead ? neckMask : smoothstep(2.32, 2.68, y0) * neckMask;
    pitchFwdJS(p, 0.0, 2.15, -0.08, 0.38 * wNeck);
    p.z += 0.14 * wNeck;
    p.y -= 0.03 * wNeck;
    const headComp = -0.18 - 0.22 * clamp(hipHinge, 0.0, 1.0);
    pitchFwdJS(p, 0.0, 2.52, 0.02, headComp * wHead);
  }
  if (Math.abs(headPitch) > 1e-4) {
    const hpMask = (1.0 - armMask) * headPitch;
    const wNeckP = isRigidHead ? hpMask : smoothstep(1.85, 2.35, y0) * hpMask;
    const wHeadP = isRigidHead ? hpMask : smoothstep(2.30, 2.65, y0) * hpMask;
    pitchFwdJS(p, 0.0, 2.15, -0.10, 0.46 * wNeckP);
    pitchFwdJS(p, 0.0, 2.48, -0.04, 0.42 * wHeadP);
  }
  if (Math.abs(trunkFlex) > 1e-4) {
    const wFlexT = smoothstep(0.75, 1.95, yEff) * trunkFlex;
    const wFlexL = smoothstep(0.05, 1.25, yEff) * trunkFlex;
    pitchFwdJS(p, 0.0, 1.25, -0.08, 0.38 * wFlexT);
    pitchFwdJS(p, 0.0, 0.35, -0.06, 0.26 * wFlexL);
  }
  if (Math.abs(hipHinge) > 1e-4) {
    const wHinge = smoothstep(-0.08, 0.20, yEff) * hipHinge;
    pitchFwdJS(p, 0.0, 0.02, -0.04, 0.78 * wHinge);
    const wCounter = isRigidLeg ? 0.0 : smoothstep(-1.62, 0.05, yEff);
    p.z -= 0.22 * hipHinge * wCounter;
  }
  if (Math.abs(trunkRotate) > 1e-4) {
    const wRot = smoothstep(0.02, 1.95, yEff) * trunkRotate;
    yawLeftJS(p, 0.0, 0.0, -0.06, 0.52 * wRot);
  }
  if (Math.abs(sideBend) > 1e-4) {
    const wBend = smoothstep(0.05, 1.75, yEff) * sideBend;
    rollLeftJS(p, 0.0, 0.35, -0.06, 0.34 * wBend);
  }
  if (Math.abs(pelvisTilt) > 1e-4) {
    const wPelvRot = smoothstep(-0.15, 0.18, yEff) * (1.0 - smoothstep(0.45, 1.15, yEff));
    pitchFwdJS(p, 0.0, 0.0, -0.05, -0.26 * pelvisTilt * wPelvRot);
    const wArch = smoothstep(0.0, 0.42, yEff) * (1.0 - smoothstep(0.60, 1.25, yEff));
    p.z -= 0.09 * pelvisTilt * wArch;
    const wSlouch = smoothstep(0.20, 1.15, yEff);
    pitchFwdJS(p, 0.0, 0.35, -0.06, 0.14 * pelvisTilt * wSlouch);
  }
  if (!isRigidLeg && Math.abs(hipShift) > 1e-4) {
    const wShift = smoothstep(-3.15, 0.05, yEff) * (1.0 - 0.35 * smoothstep(0.25, 2.10, yEff));
    p.x += 0.24 * hipShift * wShift;
    const wHipRoll = smoothstep(-0.35, 0.05, yEff) * (1.0 - smoothstep(0.30, 1.00, yEff));
    rollLeftJS(p, 0.0, 0.05, -0.05, -0.10 * hipShift * wHipRoll);
  }
  const gluteGuard = (1.0 - smoothstep(-0.18, -0.04, v3.z)) * smoothstep(-0.32, -0.02, y0);
  const ankleMask = hasRig
    ? role.y > 2.5
      ? 1.0
      : role.y > 1.2
        ? 1.0 - smoothstep(-3.16, -2.86, y0)
        : 0.0
    : (1.0 - smoothstep(-3.14, -2.90, y0)) * legMask;
  const kneeMask = hasRig
    ? role.y < 0.5
      ? 0.0
      : role.y > 1.8 && role.y < 2.5
        ? 1.0 - smoothstep(-1.72, -1.42, y0)
        : 1.0
    : (1.0 - smoothstep(-1.78, -1.45, y0)) * legMask;
  const hipMask = hasRig
    ? role.x < 0.5 || isRigidHead
      ? 0.0
      : role.x < 1.5
        ? 1.0
        : (1.0 - smoothstep(-0.24, 0.14, y0)) * (1.0 - 0.55 * gluteGuard)
    : (1.0 - smoothstep(-0.22, 0.12, y0)) * (1.0 - 0.65 * gluteGuard) * legMask;
  const pivAnkleSideX = s * 0.31;
  const pivAnkleSideY = -3.03;
  const pivAnkleSideZ = -0.13;
  const pivKneeSideX = s * 0.185;
  const pivKneeSideY = -1.62;
  const pivKneeSideZ = 0.02;
  const pivHipSideX = s * 0.185;
  const pivHipSideY = -0.02;
  const pivHipSideZ = -0.03;
  const ankleFlex = mix(ankleFlexR, ankleFlexL, isL);
  const legSwing = mix(legSwingR, legSwingL, isL);
  const legAdduct = mix(legAdductR, legAdductL, isL);
  const standRatio = clamp(
    1.0 - clamp(sit, 0.0, 1.0) - clamp(floorSit, 0.0, 1.0) - clamp(prone, 0.0, 1.0),
    0.0,
    1.0,
  );
  const hingeLegAng = isRigidLeg ? 0.1375 * hipHinge * standRatio : 0.0;
  if (Math.abs(ankleFlex) > 1e-4 && ankleMask > 1e-5) {
    pitchFwdJS(p, pivAnkleSideX, pivAnkleSideY, pivAnkleSideZ, -0.78 * ankleFlex * ankleMask);
  }
  const autoSwingKnee = Math.max(0.0, -legSwing * 0.72) + Math.max(0.0, legSwing * 0.12);
  const sitKnee = (1.36 - 0.18 * clamp(legAdduct, 0.0, 1.2)) * sit;
  const totalKneePitch =
    sitKnee +
    (2.18 + s * 0.18) * floorSit +
    1.12 * kneeBend +
    0.78 * autoSwingKnee +
    hingeLegAng;
  if (Math.abs(totalKneePitch) > 1e-4 && kneeMask > 1e-5) {
    pitchFwdJS(p, pivKneeSideX, pivKneeSideY, pivKneeSideZ, totalKneePitch * kneeMask);
  }
  if (hipMask > 1e-5) {
    if (legAdduct > 1e-4) {
      rollLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, s * 0.32 * legAdduct * hipMask);
      yawLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, s * 0.14 * legAdduct * hipMask);
    }
    if (sit > 1e-4) {
      rollLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, -s * 0.035 * sit * (1.0 - clamp(legAdduct, 0.0, 1.0)) * hipMask);
    }
    const slouchComp = clamp(trunkFlex * 0.7 + Math.max(0.0, pelvisTilt) * 0.4, 0.0, 1.0);
    const hipPitchSit = (-1.38 + 0.14 * slouchComp) * sit - 0.28 * legAdduct * sit;
    const hipPitchFloor = (-1.38 - s * 0.05) * floorSit;
    const totalHipPitch =
      hipPitchSit +
      hipPitchFloor -
      0.68 * kneeBend -
      0.68 * legSwing -
      0.22 * legAdduct * (1.0 - clamp(sit, 0.0, 1.0)) -
      hingeLegAng;
    if (Math.abs(totalHipPitch) > 1e-4) {
      pitchFwdJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, totalHipPitch * hipMask);
    }
    if (floorSit > 1e-4) {
      rollLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, s * (1.16 - s * 0.04) * floorSit * hipMask);
      yawLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, s * 0.56 * floorSit * hipMask);
    }
    if (Math.abs(legSpread) > 1e-4) {
      const sitRatio = clamp(sit, 0.0, 1.0);
      rollLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, -s * 0.46 * legSpread * (1.0 - 0.55 * sitRatio) * hipMask);
      yawLeftJS(p, pivHipSideX, pivHipSideY, pivHipSideZ, s * (0.30 + 0.38 * sitRatio) * legSpread * hipMask);
    }
  }
  if (isRigidLeg && Math.abs(hipHinge) > 1e-4) {
    p.y += 1.60 * (1.0 - Math.cos(hingeLegAng));
    p.z -= 1.60 * Math.sin(hingeLegAng) + 0.22 * hipHinge * (1.0 - standRatio);
  }
  if (prone > 1e-4) {
    pitchFwdJS(p, 0.0, -0.20, -0.05, 1.5708 * prone);
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
  if (toeRise > 1e-4) {
    const angRise = 0.78 * Math.max(0.0, -0.5 * (ankleFlexL + ankleFlexR));
    const cR = Math.cos(angRise);
    const sR = Math.sin(angRise);
    const dAnkY = 0.23 * (cR - 1.0) + 0.29 * sR;
    const dAnkZ = -0.29 * (cR - 1.0) + 0.23 * sR;
    const toeFlat = smoothstep(0.14, 0.24, v3.z) * (1.0 - smoothstep(-3.21, -3.08, y0)) * ankleMask;
    p.y += (dAnkY + 0.045 * (1.0 - toeFlat)) * toeRise;
    p.z += dAnkZ * toeRise;
    if (toeFlat > 1e-4 && angRise > 1e-4) {
      pitchFwdJS(p, s * 0.31, -3.26, 0.16, -angRise * 0.88 * toeFlat * toeRise);
    }
    const yBody = mix(y0, 2.02, armMask);
    const swayPelvis = smoothstep(-3.03, -0.02, yBody) * (1.0 - 0.92 * smoothstep(0.24, 1.15, yBody));
    const lumbarArch = smoothstep(0.12, 0.48, yBody) * (1.0 - smoothstep(0.62, 1.30, yBody));
    p.z += (0.13 * swayPelvis + 0.075 * lumbarArch) * toeRise;
  }
  if (isRigidLeg && Math.abs(hipShift) > 1e-4) {
    const hLegShift = 3.13 - 0.44 * clamp(kneeBend, 0.0, 1.2);
    const angLegShift = (0.24 * hipShift * standRatio) / hLegShift;
    rollLeftJS(p, 0.0, -3.15, -0.03 - 0.18 * kneeBend, angLegShift);
    p.x += 0.24 * hipShift * (1.0 - standRatio);
  }
  if (lieSide > 1e-4) {
    rollLeftJS(p, 0.0, 0.35, 0.0, 1.34 * lieSide);
    p.y -= 0.25 * lieSide;
  }
  return p;
}
/**
 * ワールド座標 v3 に姿勢変形を適用し、新しい THREE.Vector3 を返す。
 * デフォルト（useTarget = true）では setPose 直後のカメラフォーカス計算（viewer.focus）でも
 * 目標姿勢の正しい位置を返せるよう targetPose を参照する。
 * 現在フレームの補間中座標が欲しい場合（ピン追従等）は useTarget = false を指定する。
 * @param {THREE.Vector3} wp
 * @param {THREE.Vector4|string} [rigRole] 構造別ボーン・リグ役割（省略時は座標フォールバック）
 * @param {boolean} [useTarget=true] true=目標姿勢(targetPose), false=現在フレーム姿勢(currentPose)
 * @returns {THREE.Vector3}
 */
export function deformPoint(wp, rigRole, useTarget = true) {
  if (!wp) return new THREE.Vector3();
  if (!useTarget) {
    if (isUniformModifiedExternally()) {
      const a = poseUniforms.uPoseA.value;
      const b = poseUniforms.uPoseB.value;
      const c = poseUniforms.uPoseC.value;
      const d = poseUniforms.uPoseD.value;
      const e = poseUniforms.uPoseE.value;
      const f = poseUniforms.uPoseF.value;
      const g = poseUniforms.uPoseG.value;
      const h = poseUniforms.uPoseH.value;
      const i = poseUniforms.uPoseI.value;
      return evalDeform(
        wp,
        {
          trunkFlex: a.x,
          headForward: a.y,
          shoulderIn: a.z,
          pelvisTilt: a.w,
          trunkRotate: b.x,
          sideBend: b.y,
          hipShift: b.z,
          armsFold: b.w,
          sit: c.x,
          prone: c.y,
          headPitch: c.z,
          legSpread: c.w,
          hipHinge: d.x,
          kneeBend: d.y,
          armRaiseL: d.z,
          armRaiseR: d.w,
          armSpreadL: e.x,
          armSpreadR: e.y,
          elFlexL: e.z,
          elFlexR: e.w,
          foreYawL: f.x,
          foreYawR: f.y,
          legSwingL: f.z,
          legSwingR: f.w,
          pronateL: g.x,
          pronateR: g.y,
          wristExtL: g.z,
          wristExtR: g.w,
          legAdductL: h.x,
          legAdductR: h.y,
          lieSide: h.z,
          floorSit: h.w,
          ankleFlexL: i.x,
          ankleFlexR: i.y,
          toeRise: i.z,
        },
        rigRole,
      );
    }
    return evalDeform(wp, currentPose, rigRole);
  }
  return evalDeform(wp, baseTargetPose, rigRole);
}
/**
 * ワールド法線 n を有限差分で変形して新しい THREE.Vector3 を返す（JS 補助用）。
 * @param {THREE.Vector3} wp
 * @param {THREE.Vector3} n
 * @param {THREE.Vector4|string} [rigRole]
 * @param {boolean} [useTarget=true]
 * @returns {THREE.Vector3}
 */
export function deformNormal(wp, n, rigRole, useTarget = true) {
  const n0 = n.clone().normalize();
  const up = Math.abs(n0.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(up, n0).normalize();
  const t2 = new THREE.Vector3().crossVectors(n0, t1);
  const eps = 0.01;
  const p0 = deformPoint(wp, rigRole, useTarget);
  const d1 = deformPoint(wp.clone().addScaledVector(t1, eps), rigRole, useTarget).sub(p0);
  const d2 = deformPoint(wp.clone().addScaledVector(t2, eps), rigRole, useTarget).sub(p0);
  const wn = new THREE.Vector3().crossVectors(d1, d2);
  const len = wn.length();
  return len > 1e-8 ? wn.divideScalar(len) : n0;
}
const rawInputPose = { ...currentPose };
const baseTargetPose = { ...currentPose };
let activeHabitId = null;
let activeAmount = 1.0;
let cyclicEnabled = true;
let cyclicPhase = 0;
let hasActiveTargetPose = false;
let lockedContractCycle = null;
const OVERHEAD_START_HABITS = new Set([
  'tennis-baseball-arm',
  'volleyball-smash',
]);
const OVERHEAD_END_HABITS = new Set([
  'laundry-reach',
  'overhead-tool',
  'swim-crawl-yoga',
  'court-step-jump',
  'yoga-pilates-open',
]);
/**
 * 動作ID（habitId）と入力pose、経過フェーズ(phase)または明示的正規化フェーズ(explicitU01: 0..1)から、
 * その原因動作ならではのリアルな3D作業姿勢＆全身連動アニメーション（頭上真上サーブ＆スパイク、
 * 骨干渉ゼロの椅子足組み・床あぐら、体幹の反り⇄前傾の運動連鎖等 全45動作）を算出して out に書き込む。
 * @param {number|null} phase アニメーション位相（null の場合は初期カメラフレーミング用の代表姿勢）
 * @param {object} raw 入力ベース姿勢
 * @param {object} out 出力先ポーズオブジェクト
 * @param {string|null} habitId 動作ID
 * @param {number} [k=1] 適用強度
 * @param {number|null} [explicitU01=null] 明示的フェーズ 0.0(開始) .. 1.0(終点)
 */
function computeHabitActionPose(phase, raw, out, habitId, k = 1.0, explicitU01 = null) {
  const kFull = k <= 1e-4 ? 0.0 : Math.min(1.0, Math.max(0.2, k) / 0.72);
  let u;
  let sw;
  let co;
  if (explicitU01 !== null && Number.isFinite(Number(explicitU01))) {
    u = clamp(Number(explicitU01), 0.0, 1.0);
    const theta = u * Math.PI;
    sw = -Math.cos(theta); // u=0 -> -1, u=0.5 -> 0, u=1 -> +1
    co = Math.sin(theta);  // u=0,1 -> 0, u=0.5 -> +1
  } else if (phase === null) {
    if (OVERHEAD_START_HABITS.has(habitId)) {
      u = 0.08;
    } else if (OVERHEAD_END_HABITS.has(habitId)) {
      u = 0.90;
    } else {
      u = 0.72;
    }
    const theta = u * Math.PI;
    sw = -Math.cos(theta);
    co = Math.sin(theta);
  } else {
    const theta = phase * 2.2;
    sw = -Math.cos(theta);
    co = Math.sin(theta);
    u = 0.5 + 0.5 * sw;
  }
  const e = u * u * (3.0 - 2.0 * u); // Hermite smoothstep 0..1
  const sub = Math.sin(u * Math.PI * 2.0); // 中間手首返し・細かい反復補助
  for (const key of POSE_KEYS) out[key] = 0;
  out.trunkFlex   = (raw.trunkFlex   || 0) * k;
  out.headForward = (raw.headForward || 0) * k;
  out.shoulderIn  = (raw.shoulderIn  || 0) * k;
  out.pelvisTilt  = (raw.pelvisTilt  || 0) * k;
  out.trunkRotate = (raw.trunkRotate || 0) * k;
  out.sideBend    = (raw.sideBend    || 0) * k;
  out.hipShift    = (raw.hipShift    || 0) * k;
  out.armsFold    = (raw.armsFold    || 0) * k;
  out.sit         = raw.sit || 0;
  out.prone       = (raw.prone       || 0) * k;
  out.headPitch   = (raw.headPitch   || 0) * k;
  out.legSpread   = (raw.legSpread   || 0) * k;
  out.hipHinge    = (raw.hipHinge    || 0) * k;
  out.kneeBend    = (raw.kneeBend    || 0) * k;
  out.armRaiseL   = (raw.armRaiseL   || 0) * k;
  out.armRaiseR   = (raw.armRaiseR   || 0) * k;
  out.armSpreadL  = (raw.armSpreadL  || 0) * k;
  out.armSpreadR  = (raw.armSpreadR  || 0) * k;
  out.elFlexL     = (raw.elFlexL     || 0) * k;
  out.elFlexR     = (raw.elFlexR     || 0) * k;
  out.foreYawL    = (raw.foreYawL    || 0) * k;
  out.foreYawR    = (raw.foreYawR    || 0) * k;
  out.legSwingL   = (raw.legSwingL   || 0) * k;
  out.legSwingR   = (raw.legSwingR   || 0) * k;
  out.pronateL    = (raw.pronateL    || 0) * k;
  out.pronateR    = (raw.pronateR    || 0) * k;
  out.wristExtL   = (raw.wristExtL   || 0) * k;
  out.wristExtR   = (raw.wristExtR   || 0) * k;
  out.legAdductL  = (raw.legAdductL  || 0) * k;
  out.legAdductR  = (raw.legAdductR  || 0) * k;
  out.lieSide     = (raw.lieSide     || 0) * k;
  out.floorSit    = (raw.floorSit    || 0) * k;
  out.ankleFlexL  = (raw.ankleFlexL  || 0) * k;
  out.ankleFlexR  = (raw.ankleFlexR  || 0) * k;
  out.toeRise     = (raw.toeRise     || 0) * k;
  switch (habitId) {
    case 'hair-shampoo-bend': {
      out.armsFold    = 0;
      out.pelvisTilt  = mix(0.0, 0.12, e) * kFull;
      out.hipHinge    = mix(0.10, 0.48, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.24, e) * kFull;
      out.kneeBend    = mix(0.06, 0.28, e) * kFull;
      out.ankleFlexL  = mix(0.04, 0.18, e) * kFull;
      out.ankleFlexR  = mix(0.04, 0.18, e) * kFull;
      out.headForward = mix(0.20, 0.48, e) * kFull;
      out.shoulderIn  = mix(0.28, 0.62, e) * kFull;
      out.trunkRotate = (-0.08 + 0.18 * e) * kFull;
      out.armRaiseL   = (mix(0.44, 0.80, e) + 0.06 * sub) * kFull;
      out.armRaiseR   = (mix(0.44, 0.80, e) - 0.06 * sub) * kFull;
      out.armSpreadL  = mix(0.22, 0.14, e) * kFull;
      out.armSpreadR  = mix(0.22, 0.14, e) * kFull;
      out.elFlexL     = (mix(1.04, 0.66, e) + 0.10 * sub) * kFull;
      out.elFlexR     = (mix(1.04, 0.66, e) - 0.10 * sub) * kFull;
      out.foreYawL    = (mix(0.28, 0.52, e) + 0.12 * sub) * kFull;
      out.foreYawR    = (mix(0.28, 0.52, e) - 0.12 * sub) * kFull;
      out.pronateL    = 0.82 * kFull;
      out.pronateR    = 0.82 * kFull;
      out.wristExtL   = mix(0.10, 0.24, e) * kFull;
      out.wristExtR   = mix(0.10, 0.24, e) * kFull;
      break;
    }
    case 'hair-cut-arm': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.0, 0.03, e) * kFull;
      out.trunkFlex   = mix(0.02, 0.08, e) * kFull;
      out.headForward = mix(0.16, 0.42, e) * kFull;
      out.headPitch   = mix(0.04, 0.16, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.58, e) * kFull;
      out.trunkRotate = mix(-0.08, 0.14, e) * kFull;
      out.sideBend    = mix(0.02, -0.12, e) * kFull;
      out.armSpreadL  = mix(0.24, 0.68, e) * kFull;
      out.armSpreadR  = mix(0.28, 0.92, e) * kFull;
      out.armRaiseL   = mix(0.46, 0.88, e) * kFull;
      out.armRaiseR   = mix(0.50, 1.08, e) * kFull;
      out.elFlexL     = mix(0.92, 1.18, e) * kFull;
      out.elFlexR     = (mix(0.94, 1.30, e) + 0.08 * sub) * kFull;
      out.foreYawL    = mix(0.30, 0.52, e) * kFull;
      out.foreYawR    = (mix(0.20, 0.58, e) + 0.16 * sub) * kFull;
      out.pronateL    = 0.76 * kFull;
      out.pronateR    = 0.88 * kFull;
      out.wristExtL   = 0.14 * kFull;
      out.wristExtR   = (mix(0.10, 0.28, e) + 0.06 * sub) * kFull;
      break;
    }
    case 'stand-hip-r': {
      out.armsFold    = 0;
      out.hipHinge    = 0;
      out.hipShift    = mix(-0.10, -0.84, e) * kFull;
      out.sideBend    = mix(0.03, 0.34, e) * kFull;
      out.trunkRotate = mix(0.0, -0.16, e) * kFull;
      out.pelvisTilt  = mix(-0.04, -0.26, e) * kFull;
      out.trunkFlex   = mix(0.0, -0.04, e) * kFull;
      out.legSwingL   = mix(0.02, 0.32, e) * kFull;
      out.ankleFlexL  = mix(0.0, -0.22, e) * kFull;
      out.armSpreadR  = mix(0.08, 0.28, e) * kFull;
      out.armRaiseR   = mix(0.04, 0.12, e) * kFull;
      out.elFlexR     = mix(0.22, 0.78, e) * kFull;
      out.foreYawR    = mix(0.10, 0.40, e) * kFull;
      out.pronateR    = mix(0.58, 0.86, e) * kFull;
      out.wristExtR   = mix(0.06, 0.30, e) * kFull;
      out.armRaiseL   = mix(0.02, 0.14, e) * kFull;
      out.elFlexL     = mix(0.14, 0.30, e) * kFull;
      out.pronateL    = 0.54 * kFull;
      break;
    }
    case 'stand-hip-l': {
      out.armsFold    = 0;
      out.hipHinge    = 0;
      out.hipShift    = mix(0.10, 0.84, e) * kFull;
      out.sideBend    = mix(-0.03, -0.34, e) * kFull;
      out.trunkRotate = mix(0.0, 0.16, e) * kFull;
      out.pelvisTilt  = mix(-0.04, -0.26, e) * kFull;
      out.trunkFlex   = mix(0.0, -0.04, e) * kFull;
      out.legSwingR   = mix(0.02, 0.32, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.22, e) * kFull;
      out.armSpreadL  = mix(0.08, 0.28, e) * kFull;
      out.armRaiseL   = mix(0.04, 0.12, e) * kFull;
      out.elFlexL     = mix(0.22, 0.78, e) * kFull;
      out.foreYawL    = mix(0.10, 0.40, e) * kFull;
      out.pronateL    = mix(0.58, 0.86, e) * kFull;
      out.wristExtL   = mix(0.06, 0.30, e) * kFull;
      out.armRaiseR   = mix(0.02, 0.14, e) * kFull;
      out.elFlexR     = mix(0.14, 0.30, e) * kFull;
      out.pronateR    = 0.54 * kFull;
      break;
    }
    case 'nail-eye-fine': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.hipHinge    = mix(0.02, 0.10, e) * kFull;
      out.trunkFlex   = mix(0.08, 0.34, e) * kFull;
      out.headForward = mix(0.20, 0.82, e) * kFull;
      out.headPitch   = mix(0.08, 0.36, e) * kFull;
      out.shoulderIn  = mix(0.24, 0.68, e) * kFull;
      out.pelvisTilt  = mix(0.10, 0.36, e) * kFull;
      out.armRaiseL   = mix(0.38, 0.56, e) * kFull;
      out.armRaiseR   = (mix(0.40, 0.60, e) + 0.04 * sub) * kFull;
      out.armSpreadL  = mix(0.06, -0.06, e) * kFull;
      out.armSpreadR  = mix(0.08, -0.04, e) * kFull;
      out.elFlexL     = mix(0.92, 1.22, e) * kFull;
      out.elFlexR     = (mix(0.94, 1.26, e) + 0.06 * sub) * kFull;
      out.foreYawL    = mix(0.38, 0.54, e) * kFull;
      out.foreYawR    = (mix(0.36, 0.58, e) + 0.10 * sub) * kFull;
      out.pronateL    = 0.78 * kFull;
      out.pronateR    = 0.84 * kFull;
      out.wristExtL   = mix(0.14, 0.26, e) * kFull;
      out.wristExtR   = mix(0.16, 0.34, e) * kFull;
      break;
    }
    case 'desk-round': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.hipHinge    = 0;
      out.trunkFlex   = mix(0.03, 0.08, e) * kFull;
      out.headForward = mix(0.08, 0.22, e) * kFull;
      out.headPitch   = mix(0.02, 0.06, e) * kFull;
      out.shoulderIn  = mix(0.16, 0.52, e) * kFull;
      out.pelvisTilt  = mix(0.06, 0.14, e) * kFull;
      out.armSpreadL  = mix(0.04, 0.58, e) * kFull;
      out.armSpreadR  = mix(0.06, 0.72, e) * kFull;
      out.armRaiseL   = mix(0.14, 0.30, e) * kFull;
      out.armRaiseR   = mix(0.16, 0.36, e) * kFull;
      out.elFlexL     = mix(0.84, 1.02, e) * kFull;
      out.elFlexR     = mix(0.82, 0.96, e) * kFull;
      out.foreYawL    = mix(0.24, 0.42, e) * kFull;
      out.foreYawR    = mix(0.22, 0.08, e) * kFull;
      out.pronateL    = 0.96 * kFull;
      out.pronateR    = 0.98 * kFull;
      out.wristExtL   = mix(0.10, 0.24, e) * kFull;
      out.wristExtR   = mix(0.12, 0.34, e) * kFull;
      break;
    }
    case 'phone-neck': {
      out.armsFold    = 0;
      out.hipHinge    = 0;
      out.trunkFlex   = mix(0.02, 0.12, e) * kFull;
      out.headForward = mix(0.12, 0.90, e) * kFull;
      out.headPitch   = mix(0.02, 0.48, e) * kFull;
      out.shoulderIn  = mix(0.16, 0.52, e) * kFull;
      out.pelvisTilt  = mix(0.0, 0.08, e) * kFull;
      out.armRaiseL   = mix(0.52, 0.34, e) * kFull;
      out.armRaiseR   = mix(0.72, 0.38, e) * kFull;
      out.elFlexL     = mix(1.12, 1.00, e) * kFull;
      out.elFlexR     = (mix(1.28, 1.12, e) + 0.06 * sub) * kFull;
      out.foreYawL    = 0.54 * kFull;
      out.foreYawR    = (0.56 + 0.08 * sub) * kFull;
      out.pronateL    = 0.46 * kFull;
      out.pronateR    = 0.40 * kFull;
      break;
    }
    case 'leg-cross-r': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.legAdductR  = mix(0.08, 1.05, e) * kFull;
      out.legSwingR   = mix(0.0, 0.08, e) * kFull;
      out.ankleFlexR  = mix(-0.04, -0.34, e) * kFull;
      out.ankleFlexL  = mix(0.0, -0.10, e) * kFull;
      out.hipHinge    = mix(-0.02, -0.04, e) * kFull;
      out.pelvisTilt  = mix(0.08, 0.44, e) * kFull;
      out.trunkFlex   = mix(0.04, 0.18, e) * kFull;
      out.headForward = mix(0.08, 0.32, e) * kFull;
      out.headPitch   = mix(0.0, 0.06, e) * kFull;
      out.shoulderIn  = mix(0.16, 0.40, e) * kFull;
      out.trunkRotate = mix(0.02, 0.28, e) * kFull;
      out.sideBend    = mix(-0.02, -0.18, e) * kFull;
      out.hipShift    = mix(0.04, 0.26, e) * kFull;
      out.armRaiseL   = mix(0.24, 0.34, e) * kFull;
      out.armRaiseR   = mix(0.26, 0.38, e) * kFull;
      out.elFlexL     = mix(0.72, 0.84, e) * kFull;
      out.elFlexR     = mix(0.74, 0.90, e) * kFull;
      out.foreYawL    = mix(0.32, 0.42, e) * kFull;
      out.foreYawR    = mix(0.36, 0.48, e) * kFull;
      out.pronateL    = 0.86 * kFull;
      out.pronateR    = 0.86 * kFull;
      out.wristExtL   = 0.12 * kFull;
      out.wristExtR   = 0.12 * kFull;
      break;
    }
    case 'laptop-low-screen': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.hipHinge    = mix(-0.02, 0.06, e) * kFull;
      out.trunkFlex   = mix(0.08, 0.38, e) * kFull;
      out.headForward = mix(0.18, 0.88, e) * kFull;
      out.headPitch   = mix(0.04, 0.32, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.70, e) * kFull;
      out.pelvisTilt  = mix(0.12, 0.48, e) * kFull;
      out.armRaiseL   = (mix(0.28, 0.42, e) + 0.03 * sub) * kFull;
      out.armRaiseR   = (mix(0.28, 0.42, e) - 0.03 * sub) * kFull;
      out.elFlexL     = mix(0.84, 0.98, e) * kFull;
      out.elFlexR     = mix(0.84, 0.98, e) * kFull;
      out.foreYawL    = mix(0.34, 0.44, e) * kFull;
      out.foreYawR    = mix(0.34, 0.44, e) * kFull;
      out.pronateL    = 1.0 * kFull;
      out.pronateR    = 1.0 * kFull;
      out.wristExtL   = mix(0.16, 0.34, e) * kFull;
      out.wristExtR   = mix(0.18, 0.36, e) * kFull;
      break;
    }
    case 'mouse-wrist-strain': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.hipHinge    = mix(0.0, 0.04, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.16, e) * kFull;
      out.headForward = mix(0.18, 0.42, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.54, e) * kFull;
      out.pelvisTilt  = mix(0.08, 0.24, e) * kFull;
      out.trunkRotate = mix(-0.02, 0.10, e) * kFull;
      out.armRaiseL   = mix(0.24, 0.30, e) * kFull;
      out.armSpreadL  = 0.06 * kFull;
      out.elFlexL     = mix(0.90, 0.84, e) * kFull;
      out.foreYawL    = 0.30 * kFull;
      out.pronateL    = 1.0 * kFull;
      out.wristExtL   = mix(0.14, 0.34, e) * kFull;
      out.armRaiseR   = mix(0.24, 0.48, e) * kFull;
      out.armSpreadR  = mix(0.08, 0.36, e) * kFull;
      out.elFlexR     = mix(0.94, 0.62, e) * kFull;
      out.foreYawR    = mix(0.24, -0.32, e) * kFull;
      out.pronateR    = 1.0 * kFull;
      out.wristExtR   = mix(0.18, 0.72, e) * kFull;
      break;
    }
    case 'therapist-press': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.12, 0.42, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.20, e) * kFull;
      out.kneeBend    = mix(0.08, 0.36, e) * kFull;
      out.ankleFlexL  = mix(0.04, 0.22, e) * kFull;
      out.ankleFlexR  = mix(0.04, 0.22, e) * kFull;
      out.headForward = mix(0.20, 0.44, e) * kFull;
      out.shoulderIn  = mix(0.34, 0.76, e) * kFull;
      out.armRaiseL   = mix(0.44, 0.74, e) * kFull;
      out.armRaiseR   = mix(0.44, 0.74, e) * kFull;
      out.elFlexL     = mix(0.76, 0.14, e) * kFull;
      out.elFlexR     = mix(0.76, 0.14, e) * kFull;
      out.foreYawL    = mix(0.38, 0.48, e) * kFull;
      out.foreYawR    = mix(0.38, 0.48, e) * kFull;
      out.pronateL    = 1.0 * kFull;
      out.pronateR    = 1.0 * kFull;
      out.wristExtL   = mix(0.34, 0.78, e) * kFull;
      out.wristExtR   = mix(0.34, 0.78, e) * kFull;
      break;
    }
    case 'care-lift-bend': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.46, -0.06, e) * kFull;
      out.trunkFlex   = mix(0.22, -0.08, e) * kFull;
      out.pelvisTilt  = mix(0.08, -0.22, e) * kFull;
      out.kneeBend    = mix(0.56, 0.08, e) * kFull;
      out.ankleFlexL  = mix(0.28, 0.02, e) * kFull;
      out.ankleFlexR  = mix(0.28, 0.02, e) * kFull;
      out.headForward = mix(0.32, 0.14, e) * kFull;
      out.headPitch   = mix(0.08, -0.08, e) * kFull;
      out.shoulderIn  = mix(0.44, 0.64, e) * kFull;
      out.trunkRotate = mix(0.22, -0.06, e) * kFull;
      out.armRaiseL   = mix(0.52, 0.86, e) * kFull;
      out.armRaiseR   = mix(0.52, 0.86, e) * kFull;
      out.armSpreadL  = mix(0.26, 0.12, e) * kFull;
      out.armSpreadR  = mix(0.26, 0.12, e) * kFull;
      out.elFlexL     = mix(0.52, 1.18, e) * kFull;
      out.elFlexR     = mix(0.52, 1.18, e) * kFull;
      out.foreYawL    = mix(0.26, 0.56, e) * kFull;
      out.foreYawR    = mix(0.26, 0.56, e) * kFull;
      out.pronateL    = 0.22 * kFull;
      out.pronateR    = 0.22 * kFull;
      break;
    }
    case 'nurse-ward-walk': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.04, 0.08, e) * kFull;
      out.trunkFlex   = mix(0.03, 0.07, e) * kFull;
      out.headForward = mix(0.14, 0.22, e) * kFull;
      out.trunkRotate = 0.22 * sw * kFull;
      out.hipShift    = 0.14 * sw * kFull;
      out.kneeBend    = (0.06 + 0.12 * co) * kFull;
      out.legSwingL   = 0.58 * sw * kFull;
      out.legSwingR   = -0.58 * sw * kFull;
      out.ankleFlexL  = 0.34 * sw * kFull;
      out.ankleFlexR  = -0.34 * sw * kFull;
      out.armRaiseL   = (0.20 - 0.36 * sw) * kFull;
      out.armRaiseR   = (0.26 + 0.34 * sw) * kFull;
      out.elFlexL     = 0.64 * kFull;
      out.elFlexR     = mix(0.68, 0.86, e) * kFull;
      out.pronateL    = 0.58 * kFull;
      out.pronateR    = 0.58 * kFull;
      break;
    }
    case 'childcare-hip-l': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.0, -0.05, e) * kFull;
      out.hipShift    = mix(0.14, 0.84, e) * kFull;
      out.sideBend    = mix(-0.04, -0.36, e) * kFull;
      out.pelvisTilt  = mix(-0.06, -0.40, e) * kFull;
      out.trunkFlex   = mix(0.04, -0.12, e) * kFull;
      out.trunkRotate = mix(0.04, -0.22, e) * kFull;
      out.kneeBend    = mix(0.04, 0.14, e) * kFull;
      out.legSwingR   = mix(0.02, 0.24, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.20, e) * kFull;
      out.shoulderIn  = 0.38 * kFull;
      out.armRaiseL   = mix(0.38, 0.54, e) * kFull;
      out.armSpreadL  = mix(0.16, 0.32, e) * kFull;
      out.elFlexL     = mix(1.02, 1.26, e) * kFull;
      out.foreYawL    = 0.62 * kFull;
      out.pronateL    = 0.34 * kFull;
      out.armRaiseR   = (mix(0.34, 0.60, e) + 0.06 * sub) * kFull;
      out.elFlexR     = (mix(0.88, 1.14, e) + 0.08 * sub) * kFull;
      out.foreYawR    = 0.52 * kFull;
      out.pronateR    = 0.72 * kFull;
      break;
    }
    case 'laundry-reach': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.06, -0.12, e) * kFull;
      out.trunkFlex   = mix(0.06, -0.26, e) * kFull;
      out.pelvisTilt  = mix(0.02, -0.46, e) * kFull;
      out.kneeBend    = mix(0.08, 0.0, e) * kFull;
      out.ankleFlexL  = mix(0.0, -0.28, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.28, e) * kFull;
      out.headForward = mix(0.18, 0.0, e) * kFull;
      out.headPitch   = mix(0.08, -0.56, e) * kFull;
      out.shoulderIn  = mix(0.40, 0.24, e) * kFull;
      out.armRaiseL   = mix(0.52, 2.38, e) * kFull;
      out.armRaiseR   = mix(0.56, 2.46, e) * kFull;
      out.armSpreadL  = mix(0.18, 0.14, e) * kFull;
      out.armSpreadR  = mix(0.18, 0.14, e) * kFull;
      out.elFlexL     = mix(0.96, 0.14, e) * kFull;
      out.elFlexR     = mix(0.96, 0.12, e) * kFull;
      out.foreYawL    = mix(0.36, 0.10, e) * kFull;
      out.foreYawR    = mix(0.36, 0.10, e) * kFull;
      out.pronateL    = 0.78 * kFull;
      out.pronateR    = 0.78 * kFull;
      out.wristExtL   = mix(0.08, 0.26, e) * kFull;
      out.wristExtR   = mix(0.08, 0.26, e) * kFull;
      break;
    }
    case 'vacuum-dish-bend': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.08, 0.28, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.18, e) * kFull;
      out.kneeBend    = mix(0.04, 0.18, e) * kFull;
      out.ankleFlexL  = mix(0.0, 0.14, e) * kFull;
      out.ankleFlexR  = mix(-0.08, 0.18, e) * kFull;
      out.headForward = mix(0.22, 0.46, e) * kFull;
      out.headPitch   = mix(0.08, 0.18, e) * kFull;
      out.shoulderIn  = mix(0.32, 0.56, e) * kFull;
      out.trunkRotate = mix(-0.12, 0.28, e) * kFull;
      out.legSwingR   = mix(-0.10, 0.28, e) * kFull;
      out.armRaiseL   = mix(0.36, 0.52, e) * kFull;
      out.armRaiseR   = mix(0.26, 0.96, e) * kFull;
      out.elFlexL     = mix(0.94, 0.80, e) * kFull;
      out.elFlexR     = mix(1.04, 0.24, e) * kFull;
      out.foreYawL    = 0.36 * kFull;
      out.foreYawR    = mix(0.36, 0.12, e) * kFull;
      out.pronateL    = 0.78 * kFull;
      out.pronateR    = 0.86 * kFull;
      out.wristExtR   = mix(0.08, 0.22, e) * kFull;
      break;
    }
    case 'sofa-slouch': {
      out.armsFold    = 0;
      out.sit         = 1.0 * kFull;
      out.hipHinge    = mix(-0.04, -0.46, e) * kFull;
      out.pelvisTilt  = mix(0.14, 0.96, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.36, e) * kFull;
      out.headForward = mix(0.14, 0.78, e) * kFull;
      out.headPitch   = mix(0.02, 0.24, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.64, e) * kFull;
      out.legSwingL   = mix(0.04, 0.34, e) * kFull;
      out.legSwingR   = mix(0.06, 0.38, e) * kFull;
      out.ankleFlexL  = mix(0.0, -0.26, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.26, e) * kFull;
      out.armRaiseL   = mix(0.20, 0.28, e) * kFull;
      out.armRaiseR   = mix(0.22, 0.34, e) * kFull;
      out.elFlexL     = mix(0.74, 0.86, e) * kFull;
      out.elFlexR     = (mix(0.76, 0.98, e) + 0.05 * sub) * kFull;
      out.foreYawL    = mix(0.34, 0.48, e) * kFull;
      out.foreYawR    = mix(0.36, 0.54, e) * kFull;
      out.pronateL    = 0.58 * kFull;
      out.pronateR    = 0.46 * kFull;
      break;
    }
    case 'kitchen-knife-chop': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.03, 0.07, e) * kFull;
      out.trunkFlex   = mix(0.05, 0.12, e) * kFull;
      out.headForward = mix(0.22, 0.42, e) * kFull;
      out.headPitch   = mix(0.14, 0.28, e) * kFull;
      out.shoulderIn  = mix(0.28, 0.48, e) * kFull;
      out.armRaiseL   = mix(0.40, 0.44, e) * kFull;
      out.elFlexL     = 0.96 * kFull;
      out.foreYawL    = 0.42 * kFull;
      out.pronateL    = 0.96 * kFull;
      out.wristExtL   = 0.22 * kFull;
      out.armRaiseR   = mix(0.62, 0.36, e) * kFull;
      out.armSpreadR  = mix(0.18, 0.10, e) * kFull;
      out.elFlexR     = mix(1.16, 0.62, e) * kFull;
      out.foreYawR    = 0.28 * kFull;
      out.pronateR    = 0.78 * kFull;
      out.wristExtR   = mix(0.24, -0.22, e) * kFull;
      break;
    }
    case 'stroller-cart-push': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.04, 0.08, e) * kFull;
      out.trunkFlex   = mix(0.04, 0.08, e) * kFull;
      out.headForward = mix(0.12, 0.20, e) * kFull;
      out.shoulderIn  = mix(0.26, 0.38, e) * kFull;
      out.trunkRotate = 0.10 * sw * kFull;
      out.kneeBend    = (0.05 + 0.10 * co) * kFull;
      out.legSwingL   = 0.50 * sw * kFull;
      out.legSwingR   = -0.50 * sw * kFull;
      out.ankleFlexL  = 0.32 * sw * kFull;
      out.ankleFlexR  = -0.32 * sw * kFull;
      out.armRaiseL   = mix(0.46, 0.54, e) * kFull;
      out.armRaiseR   = mix(0.46, 0.54, e) * kFull;
      out.elFlexL     = mix(0.84, 0.72, e) * kFull;
      out.elFlexR     = mix(0.84, 0.72, e) * kFull;
      out.foreYawL    = 0.26 * kFull;
      out.foreYawR    = 0.26 * kFull;
      out.pronateL    = 0.96 * kFull;
      out.pronateR    = 0.96 * kFull;
      out.wristExtL   = 0.18 * kFull;
      out.wristExtR   = 0.18 * kFull;
      break;
    }
    case 'heavy-lift-dig': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.46, 0.04, e) * kFull;
      out.trunkFlex   = mix(0.22, -0.10, e) * kFull;
      out.pelvisTilt  = mix(0.08, -0.24, e) * kFull;
      out.kneeBend    = mix(0.56, 0.12, e) * kFull;
      out.ankleFlexL  = mix(0.26, 0.04, e) * kFull;
      out.ankleFlexR  = mix(0.26, -0.18, e) * kFull;
      out.headForward = mix(0.30, 0.14, e) * kFull;
      out.shoulderIn  = 0.50 * kFull;
      out.trunkRotate = mix(-0.26, 0.56, e) * kFull;
      out.sideBend    = mix(0.16, -0.20, e) * kFull;
      out.armRaiseL   = mix(0.54, 1.04, e) * kFull;
      out.armRaiseR   = mix(0.42, 0.94, e) * kFull;
      out.elFlexL     = mix(0.48, 0.92, e) * kFull;
      out.elFlexR     = mix(0.72, 1.08, e) * kFull;
      out.foreYawL    = 0.42 * kFull;
      out.foreYawR    = 0.36 * kFull;
      out.pronateL    = 0.68 * kFull;
      out.pronateR    = 0.46 * kFull;
      break;
    }
    case 'overhead-tool': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.04, -0.14, e) * kFull;
      out.trunkFlex   = mix(0.04, -0.28, e) * kFull;
      out.pelvisTilt  = mix(0.0, -0.48, e) * kFull;
      out.ankleFlexL  = mix(0.0, -0.18, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.18, e) * kFull;
      out.headForward = mix(0.18, 0.0, e) * kFull;
      out.headPitch   = mix(0.08, -0.60, e) * kFull;
      out.shoulderIn  = mix(0.42, 0.26, e) * kFull;
      out.armRaiseL   = mix(0.56, 2.26, e) * kFull;
      out.armRaiseR   = mix(0.64, 2.54, e) * kFull;
      out.armSpreadL  = mix(0.18, 0.14, e) * kFull;
      out.armSpreadR  = mix(0.20, 0.14, e) * kFull;
      out.elFlexL     = mix(1.04, 0.20, e) * kFull;
      out.elFlexR     = mix(1.08, 0.10, e) * kFull;
      out.foreYawL    = mix(0.36, 0.14, e) * kFull;
      out.foreYawR    = mix(0.36, 0.12, e) * kFull;
      out.pronateL    = 0.76 * kFull;
      out.pronateR    = 0.80 * kFull;
      out.wristExtR   = mix(0.10, 0.32, e) * kFull;
      break;
    }
    case 'drive-long': {
      const steer = -sw; // u=0 -> +1, u=1 -> -1
      out.armsFold    = 0;
      out.sit         = 0.95 * kFull;
      out.hipHinge    = -0.10 * kFull;
      out.pelvisTilt  = mix(0.24, 0.34, e) * kFull;
      out.trunkFlex   = mix(0.12, 0.18, e) * kFull;
      out.headForward = mix(0.22, 0.32, e) * kFull;
      out.headPitch   = -0.03 * kFull;
      out.shoulderIn  = mix(0.34, 0.44, e) * kFull;
      out.trunkRotate = -0.05 * sw * kFull;
      out.armRaiseL   = (0.54 - 0.06 * steer) * kFull;
      out.armRaiseR   = (0.54 + 0.06 * steer) * kFull;
      out.armSpreadL  = 0.12 * kFull;
      out.armSpreadR  = 0.12 * kFull;
      out.elFlexL     = (0.82 + 0.06 * steer) * kFull;
      out.elFlexR     = (0.82 - 0.06 * steer) * kFull;
      out.foreYawL    = (0.30 + 0.06 * steer) * kFull;
      out.foreYawR    = (0.30 - 0.06 * steer) * kFull;
      out.pronateL    = 0.68 * kFull;
      out.pronateR    = 0.68 * kFull;
      out.wristExtL   = 0.12 * kFull;
      out.wristExtR   = 0.12 * kFull;
      out.legSwingL   = 0.22 * kFull;
      out.legSwingR   = mix(0.32, 0.25, e) * kFull;
      out.ankleFlexL  = 0.10 * kFull;
      out.ankleFlexR  = mix(0.46, -0.72, e) * kFull;
      break;
    }
    case 'delivery-carry-box': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.38, -0.05, e) * kFull;
      out.trunkFlex   = mix(0.18, 0.02, e) * kFull;
      out.pelvisTilt  = mix(0.06, -0.18, e) * kFull;
      out.kneeBend    = mix(0.50, 0.06, e) * kFull;
      out.ankleFlexL  = mix(0.24, 0.08 * sw, e) * kFull;
      out.ankleFlexR  = mix(0.24, -0.08 * sw, e) * kFull;
      out.headForward = mix(0.26, 0.14, e) * kFull;
      out.shoulderIn  = 0.48 * kFull;
      out.trunkRotate = 0.10 * sw * kFull;
      out.legSwingL   = mix(0.0, 0.30, e) * sw * kFull;
      out.legSwingR   = mix(0.0, -0.30, e) * sw * kFull;
      out.armRaiseL   = mix(0.48, 0.72, e) * kFull;
      out.armRaiseR   = mix(0.48, 0.72, e) * kFull;
      out.armSpreadL  = mix(0.24, 0.16, e) * kFull;
      out.armSpreadR  = mix(0.24, 0.16, e) * kFull;
      out.elFlexL     = mix(0.58, 1.18, e) * kFull;
      out.elFlexR     = mix(0.58, 1.18, e) * kFull;
      out.foreYawL    = mix(0.32, 0.46, e) * kFull;
      out.foreYawR    = mix(0.32, 0.46, e) * kFull;
      out.pronateL    = 0.32 * kFull;
      out.pronateR    = 0.32 * kFull;
      break;
    }
    case 'cook-pan-hold': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.02, -0.02, e) * kFull;
      out.trunkFlex   = mix(0.04, 0.02, e) * kFull;
      out.pelvisTilt  = mix(0.0, -0.08, e) * kFull;
      out.headForward = mix(0.18, 0.22, e) * kFull;
      out.headPitch   = mix(0.10, 0.14, e) * kFull;
      out.shoulderIn  = mix(0.24, 0.56, e) * kFull;
      out.trunkRotate = mix(0.02, 0.14, e) * kFull;
      out.armRaiseL   = mix(0.28, 0.20, e) * kFull;
      out.armSpreadL  = mix(0.08, 0.18, e) * kFull;
      out.elFlexL     = mix(0.68, 1.34, e) * kFull;
      out.foreYawL    = mix(0.10, 0.18, e) * kFull;
      out.pronateL    = mix(0.62, 0.54, e) * kFull;
      out.wristExtL   = mix(-0.10, 0.34, e) * kFull;
      out.armRaiseR   = mix(0.26, 0.38, e) * kFull;
      out.elFlexR     = mix(0.84, 1.02, e) * kFull;
      out.foreYawR    = mix(0.38, 0.24, e) * kFull;
      out.pronateR    = 0.74 * kFull;
      break;
    }
    case 'sway-back': {
      out.armsFold    = 0;
      out.ankleFlexL  = mix(0.0, -0.72, e) * kFull;
      out.ankleFlexR  = mix(0.0, -0.72, e) * kFull;
      out.toeRise     = mix(0.0, 1.00, e) * kFull;
      out.pelvisTilt  = mix(0.02, 0.52, e) * kFull;
      out.trunkFlex   = mix(0.0, -0.28, e) * kFull;
      out.hipHinge    = mix(0.0, 0.04, e) * kFull;
      out.headForward = mix(0.06, 0.36, e) * kFull;
      out.headPitch   = mix(0.0, 0.06, e) * kFull;
      out.shoulderIn  = mix(0.08, 0.22, e) * kFull;
      out.hipShift    = 0;
      out.sideBend    = 0;
      out.armRaiseL   = mix(0.02, -0.08, e) * kFull;
      out.armRaiseR   = mix(0.02, -0.08, e) * kFull;
      out.elFlexL     = mix(0.18, 0.32, e) * kFull;
      out.elFlexR     = mix(0.18, 0.32, e) * kFull;
      out.foreYawL    = 0.22 * kFull;
      out.foreYawR    = 0.22 * kFull;
      out.pronateL    = 0.56 * kFull;
      out.pronateR    = 0.56 * kFull;
      break;
    }
    case 'arms-fold': {
      out.armsFold    = mix(0.06, 1.00, e) * kFull;
      out.hipHinge    = mix(0.0, -0.06, e) * kFull;
      out.trunkFlex   = mix(0.0, 0.08, e) * kFull;
      out.pelvisTilt  = mix(-0.02, 0.22, e) * kFull;
      out.headForward = mix(0.06, 0.24, e) * kFull;
      out.shoulderIn  = mix(0.12, 0.68, e) * kFull;
      out.trunkRotate = mix(0.0, 0.18, e) * kFull;
      out.hipShift    = mix(0.0, -0.30, e) * kFull;
      out.sideBend    = mix(0.0, 0.12, e) * kFull;
      break;
    }
    case 'register-stand-long': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.02, 0.06, e) * kFull;
      out.trunkFlex   = mix(0.03, 0.08, e) * kFull;
      out.headForward = mix(0.18, 0.30, e) * kFull;
      out.headPitch   = mix(0.08, 0.16, e) * kFull;
      out.pelvisTilt  = -0.22 * kFull;
      out.trunkRotate = mix(-0.24, 0.26, e) * kFull;
      out.hipShift    = mix(-0.24, 0.24, e) * kFull;
      out.ankleFlexL  = mix(-0.10, 0.06, e) * kFull;
      out.ankleFlexR  = mix(0.06, -0.10, e) * kFull;
      out.armRaiseL   = mix(0.32, 0.62, e) * kFull;
      out.armRaiseR   = mix(0.62, 0.38, e) * kFull;
      out.elFlexL     = mix(0.94, 0.64, e) * kFull;
      out.elFlexR     = mix(0.62, 0.96, e) * kFull;
      out.foreYawL    = mix(0.44, 0.08, e) * kFull;
      out.foreYawR    = mix(0.08, 0.46, e) * kFull;
      out.pronateL    = 0.90 * kFull;
      out.pronateR    = 0.90 * kFull;
      out.wristExtL   = 0.18 * kFull;
      out.wristExtR   = 0.18 * kFull;
      break;
    }
    case 'bag-shoulder-r': {
      out.armsFold    = 0;
      out.hipHinge    = 0;
      out.sideBend    = mix(0.08, 0.38, e) * kFull;
      out.hipShift    = mix(-0.14, -0.60, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.48, e) * kFull;
      out.trunkFlex   = mix(0.02, 0.06, e) * kFull;
      out.trunkRotate = (-0.08 + 0.20 * sw) * kFull;
      out.legSwingL   = 0.40 * sw * kFull;
      out.legSwingR   = -0.40 * sw * kFull;
      out.ankleFlexL  = 0.24 * sw * kFull;
      out.ankleFlexR  = -0.24 * sw * kFull;
      out.armRaiseR   = mix(0.10, 0.18, e) * kFull;
      out.armSpreadR  = mix(0.12, 0.16, e) * kFull;
      out.elFlexR     = mix(2.18, 2.32, e) * kFull;
      out.foreYawR    = mix(0.30, 0.38, e) * kFull;
      out.pronateR    = 0.22 * kFull;
      out.wristExtR   = -0.10 * kFull;
      out.armRaiseL   = -0.26 * sw * kFull;
      out.elFlexL     = 0.28 * kFull;
      out.pronateL    = 0.56 * kFull;
      break;
    }
    case 'sleep-side-curl': {
      out.armsFold    = 0;
      out.lieSide     = mix(1.06, 1.12, e) * kFull;
      out.sit         = mix(0.26, 1.02, e) * kFull;
      out.kneeBend    = mix(0.06, 0.56, e) * kFull;
      out.ankleFlexL  = mix(-0.08, -0.20, e) * kFull;
      out.ankleFlexR  = mix(-0.08, -0.20, e) * kFull;
      out.trunkFlex   = mix(0.08, 0.62, e) * kFull;
      out.headForward = mix(0.10, 0.42, e) * kFull;
      out.shoulderIn  = mix(0.28, 0.72, e) * kFull;
      out.sideBend    = mix(-0.08, -0.32, e) * kFull;
      out.pelvisTilt  = mix(0.08, 0.48, e) * kFull;
      out.legSwingR   = mix(0.02, 0.24, e) * kFull;
      out.armRaiseL   = mix(0.42, 0.78, e) * kFull;
      out.armRaiseR   = mix(0.40, 0.76, e) * kFull;
      out.elFlexL     = mix(0.72, 1.22, e) * kFull;
      out.elFlexR     = mix(0.70, 1.20, e) * kFull;
      out.foreYawL    = mix(0.32, 0.50, e) * kFull;
      out.foreYawR    = mix(0.36, 0.54, e) * kFull;
      out.pronateL    = 0.56 * kFull;
      out.pronateR    = 0.56 * kFull;
      break;
    }
    case 'phone-bed-side': {
      out.armsFold    = 0;
      out.lieSide     = mix(0.94, 0.99, e) * kFull;
      out.sit         = mix(0.44, 0.68, e) * kFull;
      out.kneeBend    = mix(0.12, 0.30, e) * kFull;
      out.ankleFlexL  = -0.16 * kFull;
      out.ankleFlexR  = -0.16 * kFull;
      out.legSwingR   = mix(0.08, 0.28, e) * kFull;
      out.trunkFlex   = mix(0.12, 0.42, e) * kFull;
      out.headForward = mix(0.20, 0.72, e) * kFull;
      out.shoulderIn  = mix(0.36, 0.68, e) * kFull;
      out.sideBend    = mix(-0.16, -0.48, e) * kFull;
      out.armSpreadL  = mix(0.40, 0.54, e) * kFull;
      out.armRaiseL   = mix(0.36, 0.46, e) * kFull;
      out.elFlexL     = mix(0.86, 1.04, e) * kFull;
      out.foreYawL    = 0.28 * kFull;
      out.pronateL    = 0.85 * kFull;
      out.armRaiseR   = mix(0.54, 0.84, e) * kFull;
      out.elFlexR     = (mix(0.86, 1.26, e) + 0.05 * sub) * kFull;
      out.foreYawR    = (mix(0.34, 0.58, e) + 0.08 * sub) * kFull;
      out.pronateR    = 0.42 * kFull;
      break;
    }
    case 'teeth-clench-night':
    case 'neck-jaw-clench': {
      out.armsFold    = 0;
      out.hipHinge    = 0;
      out.trunkFlex   = mix(0.02, 0.08, e) * kFull;
      out.headForward = mix(0.12, 0.54, e) * kFull;
      out.headPitch   = mix(0.0, 0.16, e) * kFull;
      out.shoulderIn  = mix(0.14, 0.80, e) * kFull;
      out.armRaiseL   = mix(0.04, 0.24, e) * kFull;
      out.armRaiseR   = mix(0.04, 0.24, e) * kFull;
      out.armSpreadL  = mix(0.04, 0.14, e) * kFull;
      out.armSpreadR  = mix(0.04, 0.14, e) * kFull;
      out.elFlexL     = mix(0.24, 0.96, e) * kFull;
      out.elFlexR     = mix(0.24, 0.96, e) * kFull;
      out.foreYawL    = mix(0.20, 0.46, e) * kFull;
      out.foreYawR    = mix(0.20, 0.46, e) * kFull;
      out.pronateL    = 0.68 * kFull;
      out.pronateR    = 0.68 * kFull;
      out.wristExtL   = mix(0.0, 0.20, e) * kFull;
      out.wristExtR   = mix(0.0, 0.20, e) * kFull;
      break;
    }
    case 'floor-sit-cross': {
      out.armsFold    = 0;
      out.sit         = 0;
      out.floorSit    = 0.96 * kFull;
      out.hipHinge    = mix(-0.04, -0.16, e) * kFull;
      out.pelvisTilt  = mix(0.04, 0.78, e) * kFull;
      out.trunkFlex   = mix(0.02, 0.46, e) * kFull;
      out.headForward = mix(0.08, 0.56, e) * kFull;
      out.headPitch   = mix(-0.02, 0.16, e) * kFull;
      out.shoulderIn  = mix(0.14, 0.54, e) * kFull;
      out.trunkRotate = mix(0.02, 0.14, e) * kFull;
      out.sideBend    = mix(-0.02, -0.14, e) * kFull;
      out.hipShift    = mix(0.0, -0.06, e) * kFull;
      out.ankleFlexL  = -0.20 * kFull;
      out.ankleFlexR  = -0.20 * kFull;
      out.armRaiseL   = mix(0.26, 0.34, e) * kFull;
      out.armSpreadL  = mix(0.24, 0.16, e) * kFull;
      out.elFlexL     = mix(0.56, 0.72, e) * kFull;
      out.foreYawL    = mix(0.18, 0.34, e) * kFull;
      out.pronateL    = 0.88 * kFull;
      out.armRaiseR   = mix(0.26, 0.34, e) * kFull;
      out.armSpreadR  = mix(0.24, 0.16, e) * kFull;
      out.elFlexR     = mix(0.56, 0.72, e) * kFull;
      out.foreYawR    = mix(0.18, 0.34, e) * kFull;
      out.pronateR    = 0.88 * kFull;
      out.wristExtR   = 0.14 * kFull;
      break;
    }
    case 'heels-commute-walk': {
      out.armsFold    = 0;
      out.pelvisTilt  = mix(-0.42, -0.58, e) * kFull;
      out.hipHinge    = mix(0.0, 0.04, e) * kFull;
      out.trunkFlex   = mix(-0.10, -0.04, e) * kFull;
      out.headForward = mix(0.12, 0.22, e) * kFull;
      out.trunkRotate = -0.16 * sw * kFull;
      out.hipShift    = -0.16 * sw * kFull;
      out.kneeBend    = (0.04 + 0.10 * co) * kFull;
      out.legSwingL   = -0.46 * sw * kFull;
      out.legSwingR   = 0.46 * sw * kFull;
      out.ankleFlexL  = (-0.44 - 0.16 * sw) * kFull;
      out.ankleFlexR  = (-0.44 + 0.16 * sw) * kFull;
      out.armRaiseL   = 0.32 * sw * kFull;
      out.elFlexL     = 0.42 * kFull;
      out.pronateL    = 0.58 * kFull;
      out.armRaiseR   = mix(0.28, 0.38, e) * kFull;
      out.elFlexR     = mix(0.92, 1.04, e) * kFull;
      out.foreYawR    = 0.32 * kFull;
      out.pronateR    = 0.62 * kFull;
      break;
    }
    case 'golf-swing-rot': {
      const sN = -sw;
      out.armsFold    = 0;
      out.hipHinge    = (0.28 - 0.18 * Math.max(0, sw) - 0.06 * e) * kFull;
      out.trunkFlex   = mix(0.08, -0.16, e) * kFull;
      out.pelvisTilt  = mix(-0.18, -0.38, e) * kFull;
      out.kneeBend    = mix(0.24, 0.08, e) * kFull;
      out.ankleFlexL  = mix(0.14, 0.0, e) * kFull;
      out.ankleFlexR  = mix(0.10, -0.48, e) * kFull;
      out.trunkRotate = (0.12 + 0.84 * sw) * kFull;
      out.sideBend    = -0.20 * sw * kFull;
      out.hipShift    = (0.10 + 0.28 * sw) * kFull;
      out.shoulderIn  = 0.58 * kFull;
      out.armSpreadL  = (-0.28 + 0.22 * sw + 0.05 * sw * sw) * kFull;
      out.armSpreadR  = (-0.28 + 0.22 * sN + 0.05 * sN * sN) * kFull;
      out.armRaiseL   = (0.54 + 0.54 * Math.abs(sw) - 0.16 * sw) * kFull;
      out.armRaiseR   = (0.54 + 0.54 * Math.abs(sN) - 0.16 * sN) * kFull;
      out.elFlexL     = (0.44 + 0.44 * Math.max(0, sw) - 0.30 * Math.max(0, -sw)) * kFull;
      out.elFlexR     = (0.44 + 0.44 * Math.max(0, sN) - 0.30 * Math.max(0, -sN)) * kFull;
      out.foreYawL    = (0.46 - 0.24 * sw) * kFull;
      out.foreYawR    = (0.46 - 0.24 * sN) * kFull;
      out.pronateL    = 0.56 * kFull;
      out.pronateR    = 0.56 * kFull;
      out.wristExtL   = 0.18 * kFull;
      out.wristExtR   = 0.18 * kFull;
      break;
    }
    case 'tennis-baseball-arm': {
      out.armsFold    = 0;
      out.trunkFlex   = mix(-0.30, 0.20, e) * kFull;
      out.hipHinge    = mix(-0.14, 0.24, e) * kFull;
      out.pelvisTilt  = mix(-0.42, 0.12, e) * kFull;
      out.headForward = mix(0.0, 0.20, e) * kFull;
      out.headPitch   = mix(-0.50, 0.14, e) * kFull;
      out.trunkRotate = mix(-0.44, 0.70, e) * kFull;
      out.sideBend    = mix(0.20, -0.18, e) * kFull;
      out.hipShift    = mix(-0.14, 0.24, e) * kFull;
      out.kneeBend    = (mix(0.10, 0.28, e) - 0.06 * co) * kFull;
      out.legSwingL   = mix(-0.14, 0.34, e) * kFull;
      out.legSwingR   = mix(-0.20, -0.32, e) * kFull;
      out.ankleFlexL  = mix(-0.22, 0.16, e) * kFull;
      out.ankleFlexR  = mix(-0.26, -0.46, e) * kFull;
      out.shoulderIn  = mix(0.24, 0.64, e) * kFull;
      out.armRaiseR   = (mix(2.70, 0.36, e) + 0.14 * co) * kFull;
      out.armSpreadR  = (mix(0.08, -0.28, e) + 0.18 * co) * kFull;
      out.elFlexR     = (mix(0.03, 0.64, e) + 0.14 * co) * kFull;
      out.foreYawR    = mix(0.02, 0.74, e) * kFull;
      out.pronateR    = mix(0.36, 0.98, e) * kFull;
      out.wristExtR   = mix(0.20, -0.38, e) * kFull;
      out.armRaiseL   = mix(1.48, 0.14, e) * kFull;
      out.armSpreadL  = mix(0.14, 0.20, e) * kFull;
      out.elFlexL     = mix(0.26, 0.96, e) * kFull;
      out.foreYawL    = mix(0.12, 0.42, e) * kFull;
      out.pronateL    = 0.62 * kFull;
      break;
    }
    case 'volleyball-smash': {
      out.armsFold    = 0;
      out.trunkFlex   = mix(-0.36, 0.24, e) * kFull;
      out.hipHinge    = mix(-0.18, 0.26, e) * kFull;
      out.pelvisTilt  = mix(-0.46, 0.16, e) * kFull;
      out.headForward = mix(0.0, 0.22, e) * kFull;
      out.headPitch   = mix(-0.52, 0.18, e) * kFull;
      out.trunkRotate = mix(-0.38, 0.56, e) * kFull;
      out.sideBend    = mix(0.18, -0.16, e) * kFull;
      out.hipShift    = mix(-0.10, 0.18, e) * kFull;
      out.kneeBend    = mix(0.12, 0.28, e) * kFull;
      out.legSwingL   = mix(-0.36, 0.24, e) * kFull;
      out.legSwingR   = mix(-0.44, 0.16, e) * kFull;
      out.ankleFlexL  = mix(-0.38, 0.14, e) * kFull;
      out.ankleFlexR  = mix(-0.42, 0.10, e) * kFull;
      out.shoulderIn  = mix(0.22, 0.64, e) * kFull;
      out.armRaiseR   = (mix(2.72, 0.30, e) + 0.12 * co) * kFull;
      out.armSpreadR  = (mix(0.10, -0.20, e) + 0.16 * co) * kFull;
      out.elFlexR     = (mix(0.04, 0.48, e) + 0.16 * co) * kFull;
      out.foreYawR    = mix(0.02, 0.56, e) * kFull;
      out.pronateR    = mix(0.44, 0.98, e) * kFull;
      out.wristExtR   = mix(0.24, -0.48, e) * kFull;
      out.armRaiseL   = mix(1.72, 0.16, e) * kFull;
      out.armSpreadL  = mix(0.16, 0.22, e) * kFull;
      out.elFlexL     = mix(0.24, 0.90, e) * kFull;
      out.foreYawL    = mix(0.10, 0.38, e) * kFull;
      out.pronateL    = 0.64 * kFull;
      break;
    }
    case 'running-strike': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.08, 0.14, e) * kFull;
      out.trunkFlex   = mix(0.04, 0.08, e) * kFull;
      out.pelvisTilt  = -0.18 * kFull;
      out.trunkRotate = 0.28 * sw * kFull;
      out.hipShift    = 0.14 * sw * kFull;
      out.kneeBend    = mix(0.10, 0.30, e) * kFull;
      out.legSwingL   = 0.72 * sw * kFull;
      out.legSwingR   = -0.72 * sw * kFull;
      out.ankleFlexL  = 0.38 * sw * kFull;
      out.ankleFlexR  = -0.38 * sw * kFull;
      out.armRaiseL   = (0.26 - 0.58 * sw) * kFull;
      out.armRaiseR   = (0.26 + 0.58 * sw) * kFull;
      out.elFlexL     = 1.18 * kFull;
      out.elFlexR     = 1.18 * kFull;
      out.foreYawL    = 0.22 * kFull;
      out.foreYawR    = 0.22 * kFull;
      out.pronateL    = 0.58 * kFull;
      out.pronateR    = 0.58 * kFull;
      break;
    }
    case 'cycling-aero': {
      out.armsFold    = 0;
      out.sit         = mix(0.68, 0.74, e) * kFull;
      out.hipHinge    = mix(0.32, 0.48, e) * kFull;
      out.trunkFlex   = mix(0.24, 0.40, e) * kFull;
      out.headForward = mix(0.26, 0.38, e) * kFull;
      out.headPitch   = mix(-0.18, -0.34, e) * kFull;
      out.shoulderIn  = mix(0.44, 0.60, e) * kFull;
      out.pelvisTilt  = 0.34 * kFull;
      out.sideBend    = 0.08 * sw * kFull;
      out.armRaiseL   = mix(0.72, 0.84, e) * kFull;
      out.armRaiseR   = mix(0.72, 0.84, e) * kFull;
      out.elFlexL     = mix(0.38, 0.66, e) * kFull;
      out.elFlexR     = mix(0.38, 0.66, e) * kFull;
      out.foreYawL    = 0.25 * kFull;
      out.foreYawR    = 0.25 * kFull;
      out.pronateL    = 0.72 * kFull;
      out.pronateR    = 0.72 * kFull;
      out.wristExtL   = 0.20 * kFull;
      out.wristExtR   = 0.20 * kFull;
      out.legSwingL   = (0.14 + 0.46 * sw) * kFull;
      out.legSwingR   = (0.14 - 0.46 * sw) * kFull;
      out.ankleFlexL  = (-0.06 + 0.30 * sw) * kFull;
      out.ankleFlexR  = (-0.06 - 0.30 * sw) * kFull;
      break;
    }
    case 'soccer-kick': {
      out.armsFold    = 0;
      out.trunkFlex   = mix(-0.18, 0.14, e) * kFull;
      out.hipHinge    = mix(0.08, -0.08, e) * kFull;
      out.pelvisTilt  = mix(-0.42, 0.16, e) * kFull;
      out.headPitch   = mix(-0.08, 0.10, e) * kFull;
      out.trunkRotate = mix(-0.38, 0.62, e) * kFull;
      out.sideBend    = mix(0.06, 0.28, e) * kFull;
      out.hipShift    = mix(-0.20, -0.32, e) * kFull;
      out.kneeBend    = mix(0.16, 0.16, e) * kFull;
      out.legSwingR   = mix(-0.84, 1.22, e) * kFull;
      out.legSwingL   = mix(0.22, -0.18, e) * kFull;
      out.ankleFlexR  = mix(-0.38, -0.56, e) * kFull;
      out.ankleFlexL  = mix(0.20, -0.12, e) * kFull;
      out.armRaiseL   = mix(1.00, -0.26, e) * kFull;
      out.armSpreadL  = mix(0.50, 0.28, e) * kFull;
      out.elFlexL     = 0.62 * kFull;
      out.pronateL    = 0.62 * kFull;
      out.armRaiseR   = mix(-0.46, 0.74, e) * kFull;
      out.armSpreadR  = 0.28 * kFull;
      out.elFlexR     = 0.66 * kFull;
      out.pronateR    = 0.62 * kFull;
      break;
    }
    case 'hiking-mountain-walk': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.12, 0.22, e) * kFull;
      out.trunkFlex   = mix(0.06, 0.12, e) * kFull;
      out.headForward = mix(0.16, 0.26, e) * kFull;
      out.trunkRotate = -0.20 * sw * kFull;
      out.kneeBend    = mix(0.14, 0.32, e) * kFull;
      out.legSwingL   = (0.14 - 0.58 * sw) * kFull;
      out.legSwingR   = (0.14 + 0.58 * sw) * kFull;
      out.ankleFlexL  = (-0.06 - 0.36 * sw) * kFull;
      out.ankleFlexR  = (-0.06 + 0.36 * sw) * kFull;
      out.armRaiseL   = (0.34 + 0.40 * sw) * kFull;
      out.armRaiseR   = (0.34 - 0.40 * sw) * kFull;
      out.elFlexL     = 0.88 * kFull;
      out.elFlexR     = 0.88 * kFull;
      out.pronateL    = 0.58 * kFull;
      out.pronateR    = 0.58 * kFull;
      break;
    }
    case 'court-step-jump': {
      out.armsFold    = 0;
      out.hipHinge    = mix(0.24, -0.10, e) * kFull;
      out.trunkFlex   = mix(0.10, -0.20, e) * kFull;
      out.pelvisTilt  = mix(-0.26, -0.34, e) * kFull;
      out.headPitch   = mix(-0.08, -0.36, e) * kFull;
      out.kneeBend    = mix(0.68, 0.04, e) * kFull;
      out.ankleFlexL  = mix(0.34, -0.44, e) * kFull;
      out.ankleFlexR  = mix(0.34, -0.44, e) * kFull;
      out.legSpread   = mix(0.40, 0.18, e) * kFull;
      out.hipShift    = mix(-0.50, 0.36, e) * kFull;
      out.sideBend    = mix(0.22, -0.16, e) * kFull;
      out.trunkRotate = mix(-0.30, 0.28, e) * kFull;
      out.legSwingL   = mix(-0.26, 0.24, e) * kFull;
      out.legSwingR   = mix(0.26, -0.24, e) * kFull;
      out.armRaiseL   = mix(0.30, 2.30, e) * kFull;
      out.armRaiseR   = mix(0.30, 2.38, e) * kFull;
      out.armSpreadL  = mix(0.46, 0.18, e) * kFull;
      out.armSpreadR  = mix(0.46, 0.18, e) * kFull;
      out.elFlexL     = mix(0.94, 0.16, e) * kFull;
      out.elFlexR     = mix(0.94, 0.14, e) * kFull;
      out.pronateL    = 0.72 * kFull;
      out.pronateR    = 0.72 * kFull;
      break;
    }
    case 'gym-bench-push': {
      out.armsFold    = 0;
      out.prone       = mix(0.84, 0.74, e) * kFull;
      out.trunkFlex   = mix(-0.08, 0.10, e) * kFull;
      out.headPitch   = -0.26 * kFull;
      out.ankleFlexL  = 0.46 * kFull;
      out.ankleFlexR  = 0.46 * kFull;
      out.shoulderIn  = mix(0.16, 0.80, e) * kFull;
      out.armSpreadL  = mix(0.68, 0.16, e) * kFull;
      out.armSpreadR  = mix(0.68, 0.16, e) * kFull;
      out.armRaiseL   = mix(0.52, 1.02, e) * kFull;
      out.armRaiseR   = mix(0.52, 1.02, e) * kFull;
      out.elFlexL     = mix(1.24, 0.12, e) * kFull;
      out.elFlexR     = mix(1.24, 0.12, e) * kFull;
      out.foreYawL    = mix(0.12, 0.34, e) * kFull;
      out.foreYawR    = mix(0.12, 0.34, e) * kFull;
      out.pronateL    = 1.0 * kFull;
      out.pronateR    = 1.0 * kFull;
      out.wristExtL   = mix(0.72, 0.52, e) * kFull;
      out.wristExtR   = mix(0.72, 0.52, e) * kFull;
      break;
    }
    case 'gym-squat-lift': {
      out.armsFold    = 0;
      out.sit         = 0;
      out.kneeBend    = mix(0.04, 0.88, e) * kFull;
      out.ankleFlexL  = mix(0.0, 0.38, e) * kFull;
      out.ankleFlexR  = mix(0.0, 0.38, e) * kFull;
      out.legSpread   = mix(0.24, 0.44, e) * kFull;
      out.hipHinge    = mix(0.02, 0.50, e) * kFull;
      out.trunkFlex   = mix(-0.06, 0.08, e) * kFull;
      out.pelvisTilt  = mix(-0.12, -0.36, e) * kFull;
      out.headPitch   = mix(0.0, -0.18, e) * kFull;
      out.armRaiseL   = mix(0.20, 0.94, e) * kFull;
      out.armRaiseR   = mix(0.20, 0.94, e) * kFull;
      out.armSpreadL  = 0.14 * kFull;
      out.armSpreadR  = 0.14 * kFull;
      out.elFlexL     = mix(0.92, 0.34, e) * kFull;
      out.elFlexR     = mix(0.92, 0.34, e) * kFull;
      out.foreYawL    = 0.24 * kFull;
      out.foreYawR    = 0.24 * kFull;
      out.pronateL    = 0.92 * kFull;
      out.pronateR    = 0.92 * kFull;
      break;
    }
    case 'swim-crawl-yoga': {
      out.armsFold    = 0;
      out.trunkFlex   = -0.16 * kFull;
      out.pelvisTilt  = -0.28 * kFull;
      out.headPitch   = -0.20 * kFull;
      out.shoulderIn  = 0.36 * kFull;
      out.trunkRotate = 0.46 * sw * kFull;
      out.sideBend    = -0.16 * sw * kFull;
      out.armRaiseL   = mix(-0.46, 2.54, e) * kFull;
      out.armRaiseR   = mix(2.54, -0.46, e) * kFull;
      out.armSpreadL  = (0.16 + 0.22 * co) * kFull;
      out.armSpreadR  = (0.16 + 0.22 * co) * kFull;
      out.elFlexL     = (mix(0.44, 0.10, e) + 0.32 * co) * kFull;
      out.elFlexR     = (mix(0.10, 0.44, e) + 0.32 * co) * kFull;
      out.pronateL    = 0.86 * kFull;
      out.pronateR    = 0.86 * kFull;
      out.legSwingL   = -0.34 * sw * kFull;
      out.legSwingR   = 0.34 * sw * kFull;
      out.ankleFlexL  = -0.42 * kFull;
      out.ankleFlexR  = -0.42 * kFull;
      break;
    }
    case 'yoga-pilates-open': {
      out.armsFold    = 0;
      out.sit         = 0;
      out.legSpread   = mix(1.28, 1.46, e) * kFull;
      out.kneeBend    = mix(0.62, 0.34, e) * kFull;
      out.ankleFlexL  = mix(0.24, 0.10, e) * kFull;
      out.ankleFlexR  = mix(0.24, 0.10, e) * kFull;
      out.hipHinge    = mix(0.06, -0.10, e) * kFull;
      out.trunkFlex   = mix(0.02, -0.22, e) * kFull;
      out.pelvisTilt  = mix(-0.12, -0.30, e) * kFull;
      out.headPitch   = mix(0.02, -0.34, e) * kFull;
      out.sideBend    = mix(-0.04, 0.16, e) * kFull;
      out.armRaiseL   = mix(0.50, 2.28, e) * kFull;
      out.armRaiseR   = mix(0.50, 2.28, e) * kFull;
      out.armSpreadL  = mix(0.22, 0.42, e) * kFull;
      out.armSpreadR  = mix(0.22, 0.42, e) * kFull;
      out.elFlexL     = mix(1.18, 0.14, e) * kFull;
      out.elFlexR     = mix(1.18, 0.14, e) * kFull;
      out.foreYawL    = mix(0.56, 0.08, e) * kFull;
      out.foreYawR    = mix(0.56, 0.08, e) * kFull;
      out.pronateL    = 0.30 * kFull;
      out.pronateR    = 0.30 * kFull;
      break;
    }
    default: {
      const flexScale = phase === null && explicitU01 === null ? 1.0 : 0.35 + 0.72 * e;
      out.trunkFlex   = clamp(out.trunkFlex   * flexScale, -0.55, 1);
      out.headForward = clamp(out.headForward * flexScale, 0, 1);
      out.shoulderIn  = clamp(out.shoulderIn  * flexScale, 0, 1);
      out.pelvisTilt  = clamp(out.pelvisTilt  * flexScale, -1, 1);
      out.trunkRotate = clamp(out.trunkRotate * flexScale, -1, 1);
      out.sideBend    = clamp(out.sideBend    * flexScale, -1, 1);
      out.hipShift    = clamp(out.hipShift    * flexScale, -1, 1);
      if (raw.trunkFlex >= 0.45 && !raw.sit && !raw.hipHinge) {
        out.hipHinge  = (raw.trunkFlex * 0.55 * flexScale) * k;
        out.kneeBend  = (raw.trunkFlex * 0.24 * flexScale) * k;
      }
      if (raw.armsFold > 0.15 && raw.armsFold < 0.85 && !raw.armRaiseL && !raw.armRaiseR) {
        out.armsFold  = 0;
        out.armRaiseL = (raw.armsFold * 0.68 + 0.08 * sub) * k;
        out.armRaiseR = (raw.armsFold * 0.68 - 0.08 * sub) * k;
        out.elFlexL   = (raw.armsFold * 1.15 + 0.10 * co) * k;
        out.elFlexR   = (raw.armsFold * 1.15 - 0.10 * co) * k;
        out.foreYawL  = 0.38 * k;
        out.foreYawR  = 0.38 * k;
        out.pronateL  = 0.82 * k;
        out.pronateR  = 0.82 * k;
      } else {
        out.armsFold  = clamp(out.armsFold * flexScale, 0, 1);
      }
      break;
    }
  }
  out.trunkFlex   = clamp(out.trunkFlex,   -0.55, 1.0);
  out.headForward = clamp(out.headForward,  0.0,  1.0);
  out.shoulderIn  = clamp(out.shoulderIn,   0.0,  1.0);
  out.pelvisTilt  = clamp(out.pelvisTilt,  -1.0,  1.0);
  out.trunkRotate = clamp(out.trunkRotate, -1.0,  1.0);
  out.sideBend    = clamp(out.sideBend,    -1.0,  1.0);
  out.hipShift    = clamp(out.hipShift,    -1.0,  1.0);
  out.armsFold    = clamp(out.armsFold,     0.0,  1.0);
  out.sit         = clamp(out.sit,          0.0,  1.0);
  out.prone       = clamp(out.prone,        0.0,  1.0);
  out.headPitch   = clamp(out.headPitch,   -0.75, 0.75);
  out.legSpread   = clamp(out.legSpread,   -0.35, 1.55);
  out.hipHinge    = clamp(out.hipHinge,    -0.5,  1.2);
  out.kneeBend    = clamp(out.kneeBend,     0.0,  1.2);
  out.armRaiseL   = clamp(out.armRaiseL,   -1.05, 2.95);
  out.armRaiseR   = clamp(out.armRaiseR,   -1.05, 2.95);
  out.armSpreadL  = clamp(out.armSpreadL,  -0.6,  1.5);
  out.armSpreadR  = clamp(out.armSpreadR,  -0.6,  1.5);
  out.elFlexL     = clamp(out.elFlexL,      0.0,  2.45);
  out.elFlexR     = clamp(out.elFlexR,      0.0,  2.45);
  out.foreYawL    = clamp(out.foreYawL,    -1.5,  1.5);
  out.foreYawR    = clamp(out.foreYawR,    -1.5,  1.5);
  out.legSwingL   = clamp(out.legSwingL,   -1.10, 1.35);
  out.legSwingR   = clamp(out.legSwingR,   -1.10, 1.35);
  out.pronateL    = clamp(out.pronateL,    -0.5,  1.2);
  out.pronateR    = clamp(out.pronateR,    -0.5,  1.2);
  out.wristExtL   = clamp(out.wristExtL,   -0.85, 1.15);
  out.wristExtR   = clamp(out.wristExtR,   -0.85, 1.15);
  out.legAdductL  = clamp(out.legAdductL,   0.0,  1.2);
  out.legAdductR  = clamp(out.legAdductR,   0.0,  1.2);
  out.lieSide     = clamp(out.lieSide,      0.0,  1.15);
  out.floorSit    = clamp(out.floorSit,     0.0,  1.10);
  out.ankleFlexL  = clamp(out.ankleFlexL,  -0.95, 0.85);
  out.ankleFlexR  = clamp(out.ankleFlexR,  -0.95, 0.85);
}
let playbackPaused = false;
let pausedFreezeActive = false;
/**
 * 曲げ伸ばし（伸縮）反復アニメーションの有効・無効を切り替える。
 * @param {boolean} enabled
 */
export function setCyclicMotion(enabled = true) {
  cyclicEnabled = Boolean(enabled);
  if (cyclicEnabled) {
    lockedContractCycle = null;
  }
}
/**
 * アニメーション再生の一時停止・再開を切り替える（位相を1ミリもリセットせずその場で完全停止・再開）。
 * @param {boolean} paused
 */
export function setPaused(paused = false) {
  playbackPaused = Boolean(paused);
  if (playbackPaused) {
    pausedFreezeActive = true;
    for (const key of POSE_KEYS) {
      targetPose[key] = currentPose[key];
      velocityPose[key] = 0;
    }
  } else {
    pausedFreezeActive = false;
  }
}
export function isPaused() {
  return playbackPaused;
}
let activeSelfCareConfig = null;
export function computeSelfCarePose(phase, raw, out, config, k = 1.0) {
  for (const key of POSE_KEYS) out[key] = 0;
  if (!config) return;
  const mId = String(config.muscleId || config.id || '').toLowerCase();
  const scTool = String(config.tool || '').toLowerCase();
  const scMotion = String(config.motion || '').toLowerCase();
  const scSide = String(config.side || 'R');
  const isL = scSide === 'L';
  const t = typeof phase === 'number' ? phase : 0;
  const rollWave = Math.sin(t * 1.8);
  const glideWave = Math.sin(t * 2.1);
  if (/external-oblique|internal-oblique|latissimus-dorsi|serratus-anterior|quadratus-lumborum|intercostals/.test(mId)) {
    out.sit = 0;
    out.trunkFlex = -0.04 * k;
    out.sideBend = (isL ? -0.18 : 0.18) * k;
    if (isL) {
      out.armRaiseL = (1.76 + 0.05 * rollWave) * k;
      out.armSpreadL = 0.26 * k;
      out.elFlexL = 0.58 * k;
      out.foreYawL = 0.36 * k;
      out.pronateL = 0.35 * k;
      out.armRaiseR = 0.34 * k;
      out.elFlexR = 0.72 * k;
      out.foreYawR = 0.28 * k;
      out.pronateR = 0.85 * k;
    } else {
      out.armRaiseR = (1.76 + 0.05 * rollWave) * k;
      out.armSpreadR = 0.26 * k;
      out.elFlexR = 0.58 * k;
      out.foreYawR = 0.36 * k;
      out.pronateR = 0.35 * k;
      out.armRaiseL = 0.34 * k;
      out.elFlexL = 0.72 * k;
      out.foreYawL = 0.28 * k;
      out.pronateL = 0.85 * k;
    }
    return;
  }
  if (
    /abductor-pollicis|flexor-pollicis|opponens-pollicis|adductor-pollicis|flexor-carpi|extensor-carpi|brachioradialis|extensor-digitorum$|extensor-indicis|extensor-digiti-minimi|flexor-digitorum-(superficialis|profundus)|pronator|supinator|palmaris|thenar|-hand$/.test(
      mId,
    )
  ) {
    const isDorsalForearm = /extensor|brachioradialis|supinator/.test(mId);
    const isGlide = scMotion === 'glide' || scTool === 'hand';
    const stretchPulse = 0.5 - 0.5 * Math.cos(t * 2.1);
    const wristSwing = isGlide
      ? isDorsalForearm
        ? -0.06 - 0.36 * stretchPulse
        : 0.06 + 0.42 * stretchPulse
      : 0.12 * rollWave;
    const targetRaise = isDorsalForearm ? 0.24 : 0.14;
    const targetElFlex = isDorsalForearm ? 0.68 : 0.56;
    const targetSpread = isDorsalForearm ? 0.22 : 0.26;
    const targetYaw = isDorsalForearm ? 0.28 : -0.04;
    const targetPron = isDorsalForearm ? 0.78 : -0.24;
    out.sit = 0.92 * k;
    out.trunkFlex = 0.08 * k;
    if (isL) {
      out.armRaiseL = (targetRaise + 0.02 * rollWave) * k;
      out.elFlexL = (targetElFlex - 0.03 * rollWave) * k;
      out.armSpreadL = targetSpread * k;
      out.foreYawL = targetYaw * k;
      out.pronateL = targetPron * k;
      out.wristExtL = wristSwing * k;
      out.armRaiseR = 0.18 * k;
      out.armSpreadR = 0.16 * k;
      out.elFlexR = 0.62 * k;
      out.foreYawR = 0.12 * k;
      out.pronateR = 0.75 * k;
    } else {
      out.armRaiseR = (targetRaise + 0.02 * rollWave) * k;
      out.elFlexR = (targetElFlex - 0.03 * rollWave) * k;
      out.armSpreadR = targetSpread * k;
      out.foreYawR = targetYaw * k;
      out.pronateR = targetPron * k;
      out.wristExtR = wristSwing * k;
      out.armRaiseL = 0.18 * k;
      out.armSpreadL = 0.16 * k;
      out.elFlexL = 0.62 * k;
      out.foreYawL = 0.12 * k;
      out.pronateL = 0.75 * k;
    }
    return;
  }
  if (/biceps-brachii|brachialis|coracobrachialis/.test(mId)) {
    out.sit = 0.90 * k;
    out.trunkFlex = 0.06 * k;
    if (isL) {
      out.armRaiseL = (0.72 + 0.04 * rollWave) * k;
      out.armSpreadL = 0.34 * k;
      out.elFlexL = 0.20 * k;
      out.pronateL = 0.0;
      out.armRaiseR = 0.26 * k;
      out.elFlexR = 0.76 * k;
      out.foreYawR = 0.32 * k;
      out.pronateR = 0.85 * k;
    } else {
      out.armRaiseR = (0.72 + 0.04 * rollWave) * k;
      out.armSpreadR = 0.34 * k;
      out.elFlexR = 0.20 * k;
      out.pronateR = 0.0;
      out.armRaiseL = 0.26 * k;
      out.elFlexL = 0.76 * k;
      out.foreYawL = 0.32 * k;
      out.pronateL = 0.85 * k;
    }
    return;
  }
  if (/triceps-brachii|anconeus/.test(mId)) {
    out.sit = 0.90 * k;
    out.trunkFlex = 0.04 * k;
    if (isL) {
      out.armRaiseL = (1.32 + 0.04 * rollWave) * k;
      out.armSpreadL = 0.22 * k;
      out.elFlexL = 0.82 * k;
      out.pronateL = 0.55 * k;
      out.armRaiseR = 0.26 * k;
      out.elFlexR = 0.76 * k;
      out.foreYawR = 0.32 * k;
      out.pronateR = 0.85 * k;
    } else {
      out.armRaiseR = (1.32 + 0.04 * rollWave) * k;
      out.armSpreadR = 0.22 * k;
      out.elFlexR = 0.82 * k;
      out.pronateR = 0.55 * k;
      out.armRaiseL = 0.26 * k;
      out.elFlexL = 0.76 * k;
      out.foreYawL = 0.32 * k;
      out.pronateL = 0.85 * k;
    }
    return;
  }
  if (/adductor|pectineus|gracilis/.test(mId)) {
    out.sit = 0.88 * k;
    out.legSpread = 0.58 * k;
    out.trunkFlex = 0.06 * k;
    out.armRaiseL = 0.30 * k;
    out.armRaiseR = 0.30 * k;
    out.armSpreadL = 0.18 * k;
    out.armSpreadR = 0.18 * k;
    out.elFlexL = 0.72 * k;
    out.elFlexR = 0.72 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/tensor-fasciae-latae|gluteus-medius|gluteus-minimus|vastus-lateralis/.test(mId)) {
    out.sit = 0.92 * k;
    out.trunkFlex = 0.05 * k;
    out.sideBend = (isL ? -0.08 : 0.08) * k;
    out.armRaiseL = 0.58 * k;
    out.armRaiseR = 0.58 * k;
    out.elFlexL = 0.92 * k;
    out.elFlexR = 0.92 * k;
    out.foreYawL = 0.42 * k;
    out.foreYawR = 0.42 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/rectus-femoris|vastus-medialis|vastus-intermedius|sartorius|psoas|iliacus|tibialis-anterior|fibularis/.test(mId)) {
    if (scTool === 'hand') {
      out.sit = 0.92 * k;
      out.trunkFlex = 0.10 * k;
      const isShin = /tibialis|fibularis/.test(mId);
      const shinAnkle = isShin ? 0.32 * glideWave : 0;
      if (isL) {
        out.legSwingL = 0.28 * k;
        out.ankleFlexL = shinAnkle * k;
      } else {
        out.legSwingR = 0.28 * k;
        out.ankleFlexR = shinAnkle * k;
      }
      out.armRaiseL = 0.28 * k;
      out.armRaiseR = 0.28 * k;
      out.elFlexL = 0.68 * k;
      out.elFlexR = 0.68 * k;
      out.pronateL = 0.80 * k;
      out.pronateR = 0.80 * k;
      return;
    }
    out.prone = 1.0 * k;
    out.trunkFlex = -0.16 * k;
    out.headPitch = -0.18 * k;
    out.armRaiseL = 0.72 * k;
    out.armRaiseR = 0.72 * k;
    out.elFlexL = 1.32 * k;
    out.elFlexR = 1.32 * k;
    out.pronateL = 0.95 * k;
    out.pronateR = 0.95 * k;
    const slide = 0.08 * Math.sin(t * 1.6);
    out.legSwingL = slide * k;
    out.legSwingR = slide * k;
    return;
  }
  if (/biceps-femoris|semitendinosus|semimembranosus/.test(mId)) {
    out.sit = 0.98 * k;
    out.trunkFlex = 0.04 * k;
    const hamRoll = 0.06 * Math.sin(t * 1.6);
    if (isL) {
      out.legSwingL = (0.24 + hamRoll) * k;
      out.kneeBend = (0.16 - hamRoll) * k;
    } else {
      out.legSwingR = (0.24 + hamRoll) * k;
      out.kneeBend = (0.16 - hamRoll) * k;
    }
    out.armRaiseL = 0.26 * k;
    out.armRaiseR = 0.26 * k;
    out.elFlexL = 0.68 * k;
    out.elFlexR = 0.68 * k;
    out.foreYawL = 0.28 * k;
    out.foreYawR = 0.28 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/flexor-digitorum-brevis|abductor-hallucis|abductor-digiti-minimi-foot|quadratus-plantae|plantar|flexor-hallucis/.test(mId)) {
    if (scTool === 'hand') {
      out.sit = 0.94 * k;
      out.trunkFlex = 0.14 * k;
      if (isL) out.legSwingL = (0.34 + 0.08 * glideWave) * k;
      else out.legSwingR = (0.34 + 0.08 * glideWave) * k;
      out.armRaiseL = 0.36 * k;
      out.armRaiseR = 0.36 * k;
      out.elFlexL = 0.68 * k;
      out.elFlexR = 0.68 * k;
      return;
    }
    out.sit = 0;
    out.trunkFlex = 0.04 * k;
    out.kneeBend = (0.08 + 0.04 * (0.5 + 0.5 * rollWave)) * k;
    if (isL) {
      out.legSwingL = (0.14 + 0.04 * rollWave) * k;
      out.legSwingR = -0.18 * k;
    } else {
      out.legSwingR = (0.14 + 0.04 * rollWave) * k;
      out.legSwingL = -0.18 * k;
    }
    out.armRaiseL = 0.18 * k;
    out.armRaiseR = 0.18 * k;
    out.armSpreadL = 0.12 * k;
    out.armSpreadR = 0.12 * k;
    out.elFlexL = 0.48 * k;
    out.elFlexR = 0.48 * k;
    out.pronateL = 0.75 * k;
    out.pronateR = 0.75 * k;
    return;
  }
  if (/gastrocnemius|soleus|calcaneal|tibialis-posterior/.test(mId)) {
    out.sit = 0.95 * k;
    out.trunkFlex = 0.06 * k;
    const calfRoll = 0.08 * Math.sin(t * 1.7);
    if (isL) {
      out.legSwingL = (0.36 + calfRoll) * k;
      out.kneeBend = 0.10 * k;
    } else {
      out.legSwingR = (0.36 + calfRoll) * k;
      out.kneeBend = 0.10 * k;
    }
    out.armRaiseL = 0.26 * k;
    out.armRaiseR = 0.26 * k;
    out.elFlexL = 0.64 * k;
    out.elFlexR = 0.64 * k;
    out.foreYawL = 0.28 * k;
    out.foreYawR = 0.28 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/gluteus-maximus|piriformis|obturator|gemellus|quadratus-femoris/.test(mId)) {
    out.sit = 0.96 * k;
    out.trunkFlex = 0.05 * k;
    out.sideBend = (isL ? 0.08 : -0.08) * k;
    out.hipShift = (isL ? 0.10 : -0.10) * k;
    out.armRaiseL = 0.52 * k;
    out.armRaiseR = 0.52 * k;
    out.elFlexL = 0.88 * k;
    out.elFlexR = 0.88 * k;
    out.foreYawL = 0.38 * k;
    out.foreYawR = 0.38 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/pectoralis-minor|pectoralis-major|subclavius/.test(mId)) {
    out.sit = 0;
    out.trunkFlex = -0.06 * k;
    out.shoulderIn = -0.14 * k;
    if (isL) {
      out.armSpreadL = 0.34 * k;
      out.armRaiseL = 0.18 * k;
      out.elFlexL = 0.38 * k;
      out.pronateL = 0.65 * k;
      out.armRaiseR = 0.24 * k;
      out.armSpreadR = 0.12 * k;
      out.elFlexR = 0.72 * k;
      out.foreYawR = 0.24 * k;
      out.pronateR = 0.85 * k;
    } else {
      out.armSpreadR = 0.34 * k;
      out.armRaiseR = 0.18 * k;
      out.elFlexR = 0.38 * k;
      out.pronateR = 0.65 * k;
      out.armRaiseL = 0.24 * k;
      out.armSpreadL = 0.12 * k;
      out.elFlexL = 0.72 * k;
      out.foreYawL = 0.24 * k;
      out.pronateL = 0.85 * k;
    }
    return;
  }
  if (/sternocleidomastoid|platysma|masseter|temporalis|splenius|semispinalis|scalene|occipitalis/.test(mId)) {
    out.sit = 0.92 * k;
    out.trunkFlex = 0;
    out.headForward = 0;
    out.armRaiseL = 0.26 * k;
    out.armRaiseR = 0.26 * k;
    out.elFlexL = 0.74 * k;
    out.elFlexR = 0.74 * k;
    out.foreYawL = 0.30 * k;
    out.foreYawR = 0.30 * k;
    out.pronateL = 0.85 * k;
    out.pronateR = 0.85 * k;
    return;
  }
  if (/rhomboid/.test(mId)) {
    out.sit = 0;
    out.trunkFlex = 0.08 * k;
    out.shoulderIn = 0.28 * k;
    out.kneeBend = (0.10 + 0.08 * (0.5 + 0.5 * rollWave)) * k;
    out.armRaiseL = 0.54 * k;
    out.armRaiseR = 0.54 * k;
    out.elFlexL = 0.96 * k;
    out.elFlexR = 0.96 * k;
    out.foreYawL = 0.48 * k;
    out.foreYawR = 0.48 * k;
    out.pronateL = 0.72 * k;
    out.pronateR = 0.72 * k;
    return;
  }
  if (/teres|trapezius|levator-scapulae|infraspinatus|supraspinatus|subscapularis|deltoid/.test(mId)) {
    out.sit = 0.90 * k;
    out.trunkFlex = 0.06 * k;
    if (isL) {
      out.armRaiseL = 0.52 * k;
      out.armSpreadL = 0.18 * k;
      out.elFlexL = 0.78 * k;
      out.foreYawL = 0.36 * k;
      out.pronateL = 0.82 * k;
      out.armRaiseR = 0.26 * k;
      out.elFlexR = 0.74 * k;
      out.foreYawR = 0.28 * k;
      out.pronateR = 0.85 * k;
    } else {
      out.armRaiseR = 0.52 * k;
      out.armSpreadR = 0.18 * k;
      out.elFlexR = 0.78 * k;
      out.foreYawR = 0.36 * k;
      out.pronateR = 0.82 * k;
      out.armRaiseL = 0.26 * k;
      out.elFlexL = 0.74 * k;
      out.foreYawL = 0.28 * k;
      out.pronateL = 0.85 * k;
    }
    return;
  }
  out.sit = 0.92 * k;
  out.trunkFlex = 0.04 * k;
  out.armRaiseL = 0.26 * k;
  out.armRaiseR = 0.26 * k;
  out.elFlexL = 0.74 * k;
  out.elFlexR = 0.74 * k;
  out.foreYawL = 0.28 * k;
  out.foreYawR = 0.28 * k;
  out.pronateL = 0.82 * k;
  out.pronateR = 0.82 * k;
}
export function setSelfCarePose(config, opts = {}) {
  pausedFreezeActive = false;
  activeSelfCareConfig = config && typeof config === 'object' ? config : null;
  if (activeSelfCareConfig) {
    lockedContractCycle = null;
    activeAmount = 1.0;
    cyclicEnabled = true;
    hasActiveTargetPose = true;
    computeSelfCarePose(null, rawInputPose, baseTargetPose, activeSelfCareConfig, 1.0);
    for (const key of POSE_KEYS) targetPose[key] = baseTargetPose[key];
    if (opts && opts.immediate) {
      for (const key of POSE_KEYS) {
        currentPose[key] = targetPose[key];
        velocityPose[key] = 0;
      }
      syncUniformsFromCurrent();
    }
  }
}
export function clearSelfCarePose() {
  activeSelfCareConfig = null;
}
/**
 * 現在、クセ動作またはセルフケア姿勢の反復アニメーションが再生中かを返す。
 * @returns {boolean}
 */
export function isPoseAnimating() {
  if (playbackPaused) return false;
  return Boolean((hasActiveTargetPose && cyclicEnabled) || activeSelfCareConfig);
}
/**
 * 動作（habitId）の正規化フェーズ phase01 (0.0=最初 / 1.0=最後) の姿勢を、
 * スプリング補間なし・反復サイクル停止で 100% 決定論的に即時反映する（一覧カタログ撮影・比較検証用）。
 * @param {string|null} habitId 動作ID
 * @param {object|null} rawPose 入力ベース姿勢
 * @param {number} [phase01=1.0] 正規化フェーズ (0.0 .. 1.0)
 */
export function setHabitPhasePose(habitId, rawPose, phase01 = 1.0) {
  activeSelfCareConfig = null;
  cyclicEnabled = false;
  const uClamped = clamp(Number.isFinite(Number(phase01)) ? Number(phase01) : 1.0, 0.0, 1.0);
  lockedContractCycle = uClamped;
  hasActiveTargetPose = Boolean(habitId || (rawPose && typeof rawPose === 'object'));
  activeHabitId = habitId || null;
  activeAmount = 1.0;
  const src = rawPose && typeof rawPose === 'object' ? rawPose : {};
  for (const key of POSE_KEYS) {
    rawInputPose[key] = Number(src[key]) || 0;
  }
  if (hasActiveTargetPose) {
    computeHabitActionPose(0, rawInputPose, targetPose, activeHabitId, 1.0, uClamped);
  } else {
    for (const key of POSE_KEYS) targetPose[key] = 0;
  }
  for (const key of POSE_KEYS) {
    baseTargetPose[key] = targetPose[key];
    currentPose[key] = targetPose[key];
    velocityPose[key] = 0;
  }
  poseUniforms.uContractCycle.value = hasActiveTargetPose ? uClamped : 0.0;
  syncUniformsFromCurrent();
  return { ...currentPose };
}
/**
 * 目標姿勢を設定する。
 * @param {object|null} pose 各姿勢パラメータを持つオブジェクト（null で立位にリセット）
 * @param {number} [amount=1] ブレンド率（0=まっすぐ立位, 1=フル適用）
 * @param {{ immediate?: boolean, cyclic?: boolean, habitId?: string, selfCare?: object }} [opts] immediate:true で補間せず即時反映
 */
export function setPose(pose, amount = 1, opts = {}) {
  pausedFreezeActive = false;
  if (opts?.selfCare) {
    setSelfCarePose(opts.selfCare, opts);
    return;
  }
  activeSelfCareConfig = null;
  lockedContractCycle = null;
  const k = Number.isFinite(amount) ? clamp(amount, 0, 1.5) : 1;
  const hasPose = Boolean(pose && typeof pose === 'object' && k > 0);
  const src = hasPose ? pose : {};
  activeHabitId = hasPose ? (opts?.habitId || src.habitId || null) : null;
  activeAmount = hasPose ? k : 0;
  for (const key of POSE_KEYS) {
    rawInputPose[key] = hasPose ? Number(src[key]) || 0 : 0;
  }
  if (hasPose) {
    computeHabitActionPose(null, rawInputPose, baseTargetPose, activeHabitId, k);
  } else {
    for (const key of POSE_KEYS) baseTargetPose[key] = 0;
  }
  let magSq = 0;
  for (const key of POSE_KEYS) {
    targetPose[key] = baseTargetPose[key];
    if (key !== 'sit' && key !== 'prone') magSq += baseTargetPose[key] * baseTargetPose[key];
  }
  hasActiveTargetPose = magSq > 1e-4 || Boolean(activeHabitId);
  if (opts && typeof opts.cyclic === 'boolean') {
    cyclicEnabled = opts.cyclic;
  } else {
    cyclicEnabled = hasActiveTargetPose && !(opts && opts.immediate);
  }
  cyclicPhase = 0;
  poseUniforms.uContractCycle.value = hasActiveTargetPose ? 0.65 : 0.0;
  if (opts && opts.immediate) {
    for (const key of POSE_KEYS) {
      currentPose[key] = targetPose[key];
      velocityPose[key] = 0;
    }
    syncUniformsFromCurrent();
  }
}
/**
 * 毎フレーム呼び出し、現在の uniform 値を目標姿勢へ滑らかに追従させる。
 * 動作（habit）選択中は、その原因動作ならではのリアルな作業姿勢と連続アクションアニメーションを実行する。
 * @param {number} time 経過秒数
 * @param {number} delta フレーム時間差（秒）
 */
export function update(time, delta) {
  if (!Number.isFinite(delta) || delta <= 0) {
    return;
  }
  if (playbackPaused && pausedFreezeActive) {
    return;
  }
  const dt = Math.min(delta, 0.05);
  const ACTION_TEMPO = 0.58;
  if (hasActiveTargetPose && cyclicEnabled) {
    if (!playbackPaused) {
      cyclicPhase += dt * ACTION_TEMPO;
    }
    const rawWave = 0.5 - 0.5 * Math.cos(cyclicPhase * 2.2);
    const cycle01 = rawWave * rawWave * (3.0 - 2.0 * rawWave);
    poseUniforms.uContractCycle.value = cycle01;
    if (activeSelfCareConfig) {
      computeSelfCarePose(cyclicPhase, rawInputPose, targetPose, activeSelfCareConfig, activeAmount);
    } else {
      computeHabitActionPose(cyclicPhase, rawInputPose, targetPose, activeHabitId, activeAmount);
    }
  } else if (activeSelfCareConfig) {
    computeSelfCarePose(playbackPaused ? cyclicPhase : null, rawInputPose, targetPose, activeSelfCareConfig, activeAmount);
    poseUniforms.uContractCycle.value = 1.0;
  } else {
    for (const key of POSE_KEYS) {
      targetPose[key] = baseTargetPose[key];
    }
    poseUniforms.uContractCycle.value =
      lockedContractCycle !== null ? lockedContractCycle : hasActiveTargetPose ? 1.0 : 0.0;
  }
  const omega = 8.5; // ポーズ切替・折り返し時の急激な加減速を抑えシルクのように滑らかに追従する固有角振動数
  const exp = Math.exp(-omega * dt);
  for (const key of POSE_KEYS) {
    const x0 = currentPose[key] - targetPose[key];
    const v0 = velocityPose[key];
    if (Math.abs(x0) < 1e-5 && Math.abs(v0) < 1e-4) {
      currentPose[key] = targetPose[key];
      velocityPose[key] = 0;
      continue;
    }
    const temp = (v0 + omega * x0) * dt;
    currentPose[key] = targetPose[key] + (x0 + temp) * exp;
    velocityPose[key] = (v0 - omega * temp) * exp;
  }
  syncUniformsFromCurrent();
}
/** 姿勢を初期立位にリセットする補助関数 */
export function resetPose(immediate = false) {
  setPose(null, 0, { immediate });
}
/** 現在の姿勢パラメータのコピーを取得する補助関数 */
export function getPose() {
  return { ...currentPose };
}