import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as posture from './posture.js?v=20261122a';
const injectPose = typeof posture.injectPose === 'function' ? posture.injectPose : () => {};
const deformPoint = typeof posture.deformPoint === 'function' ? posture.deformPoint : (p) => p.clone();
const getRigRole =
  typeof posture.getRigRole === 'function'
    ? posture.getRigRole
    : () => new THREE.Vector4(-1, -1, -1, -1);
const MODEL_BASE = 'models/';
const ASSET_QUERY = '?v=20261122a';
const IDLE_TIMEOUT_MS = 1800; // アニメーション停止中・静止閲覧時に1.8秒カメラ静止で省電力スリープへ移行（触れれば0msで60fps即復帰）
const IDLE_FRAME_INTERVAL_MS = 1000; // 静止待機中は描画をほぼ停止しスマホの発熱・電池消費を最小化
const FALLBACK_BYTES = {
  'muscles.glb': 1543520,
  'skeleton.glb': 1497840,
  'head_sculpt.glb': 604132,
};
const CRANIAL_FACIAL_BONE_IDS = new Set([
  'frontal-bone',
  'left-parietal-bone',
  'right-parietal-bone',
  'occipital-bone',
  'left-temporal-bone',
  'right-temporal-bone',
  'sphenoid-bone',
  'left-zygomatic-bone',
  'right-zygomatic-bone',
  'left-nasal-bone',
  'right-nasal-bone',
  'ethmoid-bone',
  'left-maxilla',
  'right-maxilla',
  'left-lacrimal-bone',
  'right-lacrimal-bone',
  'left-palatine-bone',
  'right-palatine-bone',
  'vomer',
  'mandible',
  'left-inferior-nasal-concha',
  'right-inferior-nasal-concha',
  'hyoid-bone',
  'atlas-c1',
  'axis-c2',
  'third-cervical-vertebra-c3',
  'intervertebral-disc-c2-c3',
]);
const HEAD_FACIAL_MUSCLE_IDS = new Set([
  'epicranial-aponeurosis',
  'temporoparietalis',
  'frontalis',
  'temporalis',
  'procerus',
  'corrugator-supercilii',
  'occipitalis',
  'orbicularis-oculi',
  'nasalis',
  'levator-labii-superioris-alaeque-nasi',
  'lateral-pterygoid',
  'zygomaticus-major',
  'masseter',
  'zygomaticus-minor',
  'levator-labii-superioris',
  'medial-pterygoid',
  'levator-anguli-oris',
  'depressor-septi-nasi',
  'orbicularis-oris',
  'buccinator',
  'risorius',
  'depressor-anguli-oris',
  'depressor-labii-inferioris',
  'mentalis',
]);
const IDLE_HIDDEN_FACIAL_STRIP_IDS = new Set([
  'frontalis',
  'temporoparietalis',
  'procerus',
  'corrugator-supercilii',
  'orbicularis-oculi',
  'nasalis',
  'levator-labii-superioris-alaeque-nasi',
  'levator-labii-superioris',
  'zygomaticus-minor',
  'zygomaticus-major',
  'levator-anguli-oris',
  'depressor-septi-nasi',
  'orbicularis-oris',
  'buccinator',
  'risorius',
  'depressor-anguli-oris',
  'depressor-labii-inferioris',
  'mentalis',
]);
const MUSCLE_TF = { center: [-0.6569976806640625, -97.01134777069092, 816.8721876144409], scale: 0.004 };
const SKELETON_TF = { center: [-0.667999267578125, -109.74665069580078, 817.0244853496552], scale: 0.0025 };
const SKELETON_SCALE = MUSCLE_TF.scale / SKELETON_TF.scale; // = 1.6
const SKELETON_OFFSET = new THREE.Vector3(
  (SKELETON_TF.center[0] - MUSCLE_TF.center[0]) * MUSCLE_TF.scale, //  x =  src.x
  (SKELETON_TF.center[2] - MUSCLE_TF.center[2]) * MUSCLE_TF.scale, //  y =  src.z
  -(SKELETON_TF.center[1] - MUSCLE_TF.center[1]) * MUSCLE_TF.scale, // z = -src.y
);
const BODY_CENTER = new THREE.Vector3(0, 0, 0);
const BODY_HALF_HEIGHT = 3.35;
const BODY_HALF_WIDTH = 1.3;
const VIEW_DIRS = {
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  side: new THREE.Vector3(0.992, 0.03, 0.10).normalize(), // 真横（側面）から頭の前傾・骨盤・背骨カーブを一目で確認
  left: new THREE.Vector3(0.90, 0.05, 0.42).normalize(), // 身体の左斜め横（+X/+Z）から立体的に作業姿勢を見る
  right: new THREE.Vector3(-0.90, 0.05, 0.42).normalize(), // 身体の右斜め横（-X/+Z）から立体的に作業姿勢を見る
  'front-right': new THREE.Vector3(-0.46, 0.08, 0.88).normalize(), // 前腕・親指・鎖骨下を立体的に見る右斜め前
  'front-left': new THREE.Vector3(0.46, 0.08, 0.88).normalize(), // 左斜め前
  'back-right': new THREE.Vector3(-0.42, 0.07, -0.90).normalize(), // 肩甲骨間＋ボール＋壁パネルの3層が見える右斜め後ろ
  'back-left': new THREE.Vector3(0.42, 0.07, -0.90).normalize(), // 左斜め後ろ
  'hip-cross-right': new THREE.Vector3(-0.76, 0.14, -0.63).normalize(), // 足組み時の大殿筋・ハムストリングスのねじれ・膝まわり〜ふくらはぎ・内ももを一望する右斜め後ろ
  'sole-right': new THREE.Vector3(-0.76, -0.13, 0.64).normalize(), // 足裏＋ボール＋床マットがはっきり見える低い右斜め前
  'sole-left': new THREE.Vector3(0.76, -0.13, 0.64).normalize(), // 低い左斜め前
  'prone-side': new THREE.Vector3(-0.88, 0.16, 0.45).normalize(), // うつ伏せ太もも前ローラー＋床マットが立体的に見える右斜め横
};
const VIEW_BADGE_MAP = {
  'front-right': 'front',
  'front-left': 'front',
  'back-right': 'back',
  'back-left': 'back',
  'hip-cross-right': 'back',
  'sole-right': 'right',
  'sole-left': 'left',
  'prone-side': 'right',
};
const TAP_MOVE_PX = 6; // これ以内の移動ならタップ扱い
const TAP_MAX_MS = 700; // 長押しはタップにしない
const TWEEN_SEC = 0.62; // カメラ補間の長さ（部位オートズームが心地よく決まる速度）
const TOP_UI_CLEAR_PX = 76; // スマホ縦画面の .legend 下端＋余白の3D安全クリアランス基準値
const GHOST_OPACITY = { muscle: 0.22, bone: 0.30 };
const GHOST_TONE = new THREE.Color('#EDE6DC');
const VEIL_TONE = new THREE.Color('#EADFD3');
const DEEP_SILHOUETTE_TONE = new THREE.Color('#ECE5DA');
const XRAY_GHOST_TONE = new THREE.Color('#E3D3BA');
const XRAY_BONE_EMISSIVE = new THREE.Color('#78634B');
const DEFAULT_DEEP_MUSCLE_IDS = new Set([
  'pectoralis-minor',
  'subclavius',
  'serratus-anterior',
  'rhomboid-major',
  'rhomboid-minor',
  'levator-scapulae',
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'subscapularis',
  'coracobrachialis',
  'brachialis',
  'supinator',
  'pronator-teres',
  'pronator-quadratus',
  'anconeus',
  'flexor-digitorum-profundus',
  'flexor-pollicis-longus',
  'abductor-pollicis-longus',
  'extensor-pollicis-brevis',
  'extensor-pollicis-longus',
  'extensor-indicis',
  'opponens-pollicis',
  'adductor-pollicis',
  'flexor-pollicis-brevis',
  'opponens-digiti-minimi-hand',
  'flexor-digiti-minimi-brevis-hand',
  'diaphragm',
  'psoas-major',
  'psoas-minor',
  'iliacus',
  'quadratus-lumborum',
  'transversus-abdominis',
  'internal-oblique',
  'transversus-thoracis',
  'internal-intercostals',
  'innermost-intercostals',
  'subcostales',
  'serratus-posterior-superior',
  'serratus-posterior-inferior',
  'multifidus',
  'rotatores',
  'interspinales',
  'intertransversarii',
  'semispinalis',
  'spinalis',
  'rectus-capitis-posterior-major',
  'rectus-capitis-posterior-minor',
  'obliquus-capitis-superior',
  'obliquus-capitis-inferior',
  'longus-colli',
  'longus-capitis',
  'rectus-capitis-anterior',
  'rectus-capitis-lateralis',
  'scalenus-anterior',
  'scalenus-medius',
  'scalenus-posterior',
  'medial-pterygoid',
  'lateral-pterygoid',
  'mylohyoid',
  'geniohyoid',
  'thyrohyoid',
  'sternothyroid',
  'digastric',
  'stylohyoid',
  'omohyoid',
  'piriformis',
  'obturator-internus',
  'obturator-externus',
  'gemellus-superior',
  'gemellus-inferior',
  'quadratus-femoris',
  'gluteus-minimus',
  'iliococcygeus',
  'pubococcygeus',
  'puborectalis',
  'coccygeus',
  'pectineus',
  'adductor-brevis',
  'adductor-magnus',
  'adductor-minimus',
  'vastus-intermedius',
  'articularis-genus',
  'soleus',
  'plantaris',
  'popliteus',
  'tibialis-posterior',
  'flexor-digitorum-longus',
  'flexor-hallucis-longus',
  'quadratus-plantae',
  'flexor-hallucis-brevis',
  'adductor-hallucis',
  'flexor-digiti-minimi-brevis-foot',
]);
function inferDefaultFasciaLayer(id) {
  if (!id) return 'surface';
  if (DEFAULT_DEEP_MUSCLE_IDS.has(id)) return 'deep';
  if (/profundus|interosse|lumbrical|rotatores|multifid|psoas|iliacus|diaphragm|piriformis|obturator|gemellus/.test(id)) {
    return 'deep';
  }
  return 'surface';
}
const styleUniforms = {
  uIllust: { value: 0 },
  uIllustLight: { value: new THREE.Vector3(-3.5, 6.5, 6.0).normalize() },
  uOutline: { value: 0.0014 },
  uXRay: { value: 0 },
  uXRaySkinAlpha: { value: 0.16 },
  uBoneMuted: { value: 0 },
  uHasActiveRoles: { value: 0 },
  uHasSelection: { value: 0 },
  uPulseTime: { value: 0 },
  uDarkMode: { value: 0 },
};
const ILLUST_FRAG = /* glsl */ `
  if ( diffuseColor.a < 0.99 ) {
    vec3 nG = normalize( normal );
    vec3 vG = normalize( vViewPosition );
    float facingG = clamp( abs( dot( nG, vG ) ), 0.0, 1.0 );
    float fresG = pow( 1.0 - facingG, mix( 2.10, 1.75, uXRay ) );
    vec3 linenFillLight = mix( vec3( 0.78, 0.71, 0.62 ), vec3( 0.90, 0.85, 0.78 ), 0.45 + 0.55 * facingG );
    vec3 sepiaRimLight  = vec3( 0.205, 0.145, 0.098 );
    vec3 slateFillDark  = mix( vec3( 0.20, 0.28, 0.42 ), vec3( 0.36, 0.46, 0.62 ), 0.45 + 0.55 * facingG );
    vec3 slateRimDark   = vec3( 0.68, 0.78, 0.92 );
    vec3 linenFill = mix( linenFillLight, slateFillDark, uDarkMode );
    vec3 sepiaRim  = mix( sepiaRimLight, slateRimDark, uDarkMode );
    vec3 stdGhost  = mix( linenFill, sepiaRim, clamp( fresG * 0.80, 0.0, 0.84 ) );
    float stdA     = uUninvolved > 0.5 ? ( 0.065 + 0.245 * fresG ) : ( 0.085 + 0.265 * fresG );
    if ( uVeilMode > 2.5 ) {
      vec3 veilFill = mix( vec3( 0.88, 0.84, 0.78 ), vec3( 0.26, 0.36, 0.52 ), uDarkMode );
      vec3 veilRim  = mix( vec3( 0.32, 0.25, 0.19 ), vec3( 0.66, 0.78, 0.92 ), uDarkMode );
      stdGhost = mix( veilFill, veilRim, clamp( fresG * 0.74, 0.0, 0.80 ) );
      stdA = 0.048 + 0.125 * pow( fresG, 1.25 );
    } else if ( uVeilMode > 1.5 ) {
      stdGhost = mix( mix( vec3( 0.86, 0.81, 0.74 ), slateFillDark, uDarkMode ), sepiaRim, clamp( fresG * 0.78, 0.0, 0.82 ) );
      stdA = 0.022 + 0.155 * pow( fresG, 1.35 );
    } else if ( uVeilMode > 0.5 ) {
      if ( uRoleInvolved > 0.5 ) {
        stdGhost = mix( vec3( 0.78, 0.58, 0.40 ), mix( vec3( 0.36, 0.22, 0.12 ), slateRimDark, uDarkMode * 0.5 ), fresG * 0.68 );
        stdA = 0.13 + 0.24 * fresG;
      } else {
        stdGhost = mix( linenFill, sepiaRim, clamp( fresG * 0.78, 0.0, 0.82 ) );
        stdA = 0.055 + 0.235 * fresG;
      }
    }
    vec3 xrFill  = mix( vec3( 0.88, 0.83, 0.75 ), slateFillDark, uDarkMode );
    vec3 xrEdge  = mix( vec3( 0.30, 0.21, 0.13 ), slateRimDark, uDarkMode );
    vec3 xrGhost = mix( xrFill, xrEdge, clamp( fresG * 0.82, 0.0, 0.86 ) );
    outgoingLight = mix( stdGhost, xrGhost, uXRay );
    float xrA = clamp( uXRaySkinAlpha * ( 0.28 + 1.55 * fresG ), 0.028, 0.38 );
    diffuseColor.a = mix( stdA, xrA, uXRay );
  } else if ( uAtlasMeta.x > 0.5 ) {
    vec3 nB = normalize( normal );
    vec3 vB = normalize( vViewPosition );
    vec3 lKey = normalize( uIllustLight );
    vec3 lFill = normalize( vec3( 4.2, -1.2, 3.6 ) );
    float hlB = dot( nB, lKey ) * 0.5 + 0.5;
    float fillB = max( dot( nB, lFill ), 0.0 );
    float facingB = clamp( abs( dot( nB, vB ) ), 0.0, 1.0 );
    float cavAO = 0.84 + 0.16 * pow( facingB, 0.42 );
    vec3 boneWarm   = mix( vec3( 0.945, 0.910, 0.845 ), vec3( 0.92, 0.90, 0.86 ), uDarkMode );
    vec3 boneShadow = mix( vec3( 0.665, 0.560, 0.425 ), vec3( 0.52, 0.50, 0.48 ), uDarkMode );
    float litB = clamp( pow( hlB, 1.18 ) * 0.84 + fillB * 0.20, 0.0, 1.0 );
    if ( uIllust > 0.5 ) {
      float bandB = 0.25 + smoothstep( 0.22, 0.38, litB ) * 0.42 + smoothstep( 0.58, 0.74, litB ) * 0.33;
      litB = mix( litB, bandB, 0.65 );
    }
    vec3 colB = mix( boneShadow, boneWarm, litB ) * cavAO;
    float nEdgeB = smoothstep( 0.16, 0.54, length( fwidth( nB ) ) );
    float contourB = clamp( pow( 1.0 - facingB, 2.25 ) * mix( 0.72, 0.46, uDarkMode ) + nEdgeB * 0.30, 0.0, 0.86 );
    vec3 sepiaInkB = mix( vec3( 0.155, 0.105, 0.068 ), vec3( 0.24, 0.26, 0.32 ), uDarkMode );
    vec3 baseBoneOut = mix( colB, sepiaInkB, contourB ) + totalEmissiveRadiance * 0.25;
    if ( uSelected > 0.5 ) {
      float selRimB = pow( 1.0 - facingB, 1.9 );
      vec3 boneSelBase = vec3( 0.62, 0.38, 0.10 );
      vec3 boneSelRim  = vec3( 0.88, 0.64, 0.26 );
      baseBoneOut = mix( baseBoneOut, boneSelBase, 0.45 ) + boneSelRim * ( 0.14 + 0.28 * selRimB );
    }
    if ( uXRay > 0.01 ) {
      float rimX = pow( 1.0 - facingB, 2.05 );
      vec3 xrBoneLit  = vec3( 0.95, 0.91, 0.84 );
      vec3 xrBoneMid  = vec3( 0.74, 0.63, 0.49 );
      vec3 xrBoneInk  = vec3( 0.18, 0.12, 0.07 );
      vec3 xrBoneCol  = mix( xrBoneMid, xrBoneLit, litB );
      xrBoneCol = mix( xrBoneCol, xrBoneInk, clamp( rimX * 0.82 + nEdgeB * 0.30, 0.0, 0.88 ) );
      baseBoneOut = mix( baseBoneOut, xrBoneCol, uXRay );
    }
    outgoingLight = baseBoneOut;
  } else {
    vec3 nBase = normalize( normal );
    vec3 v0 = normalize( vViewPosition );
    vec3 lKey = normalize( uIllustLight );
    vec3 lFill = normalize( vec3( 4.2, 1.2, 3.2 ) );
    vec3 absPos = vec3( abs( vAtlasPos.x ), vAtlasPos.y, vAtlasPos.z );
    vec3 relM = absPos - uAtlasCenter;
    float sProj = dot( relM, uAtlasAxis );
    float spanLen = max( uAtlasSpan.y - uAtlasSpan.x, 0.08 );
    float uLong = clamp( ( sProj - uAtlasSpan.x ) / spanLen, 0.0, 1.0 );
    float endDist = min( uLong, 1.0 - uLong );
    float mtjBody = ( 1.0 - smoothstep( 0.02, 0.20, endDist ) ) * 0.62;
    float mtjTip  = ( 1.0 - smoothstep( 0.0, 0.065, endDist ) ) * 0.16;
    float nuchalTendonSoft = 1.0 - smoothstep( 2.34, 2.43, vAtlasPos.y );
    float endTendon = clamp( mtjBody + mtjTip, 0.0, 0.72 ) * mix( 1.0, 0.28, uIsFacialMuscle ) * nuchalTendonSoft;
    float tendonMask = clamp( max( uAtlasMeta.y, endTendon ), 0.0, 1.0 );
    float cavityAO = 1.0;
    float facingGeo = clamp( abs( dot( nBase, v0 ) ), 0.0, 1.0 );
    float underAO = 1.0 - 0.10 * smoothstep( 0.05, 0.75, -nBase.y );
    float sulcusAO = ( 0.76 + 0.24 * pow( facingGeo, 0.48 ) ) * cavityAO * underAO;
    vec3 tendonCol = vec3( 0.91, 0.87, 0.79 ); // #F4EFE6 象牙腱
    vec3 surfCol = mix( diffuseColor.rgb, tendonCol, tendonMask );
    float hlM = clamp( dot( nBase, lKey ) * 0.5 + 0.5, 0.0, 1.0 );
    float fillM = max( dot( nBase, lFill ), 0.0 );
    float diffAmt = clamp( pow( hlM, 1.24 ) * 0.82 + fillM * 0.20, 0.0, 1.0 );
    if ( uIllust > 0.5 ) {
      float bandM = 0.28 + smoothstep( 0.20, 0.36, diffAmt ) * 0.42 + smoothstep( 0.58, 0.74, diffAmt ) * 0.30;
      diffAmt = mix( diffAmt, bandM, 0.60 );
    }
    vec3 shadowMul = mix( vec3( 0.64, 0.52, 0.45 ), vec3( 0.74, 0.68, 0.60 ), tendonMask );
    vec3 shadowTone = surfCol * shadowMul;
    vec3 litTone = mix( surfCol * 1.08, vec3( 0.95, 0.91, 0.85 ), 0.18 );
    vec3 colM = mix( shadowTone, litTone, diffAmt ) * sulcusAO;
    float contourM = pow( 1.0 - facingGeo, 2.45 ) * 0.52;
    vec3 sepiaEdgeM = vec3( 0.22, 0.15, 0.10 );
    vec3 baseMusOut = mix( colM, sepiaEdgeM, contourM ) + totalEmissiveRadiance * 0.25;
    if ( uSelected > 0.5 ) {
      float isLeftV = step( 0.0, vAtlasPos.x );
      float tappedMatch = abs( uSelectSide ) < 0.2
        ? 1.0
        : ( uSelectSide > 0.0 ? mix( 0.82, 1.0, isLeftV ) : mix( 1.0, 0.82, isLeftV ) );
      float selRim = pow( 1.0 - facingGeo, 2.05 );
      vec3 defBase = vec3( 0.62, 0.38, 0.10 ); // Honey-Amber linear
      vec3 baseHue = uSelectCustom > 0.5 ? uSelectColor : defBase;
      vec3 selShadow = mix( baseHue * 0.52, vec3( 0.36, 0.21, 0.07 ), 0.35 );
      vec3 selLit    = mix( baseHue * 1.12, vec3( 0.94, 0.84, 0.62 ), 0.32 );
      vec3 selCol    = mix( selShadow, selLit, diffAmt ) * sulcusAO;
      selCol = mix( selCol, vec3( 0.24, 0.14, 0.06 ), selRim * 0.42 );
      baseMusOut = mix( baseMusOut, selCol, 0.88 * tappedMatch );
    } else if ( uUninvolved > 0.5 || uHasSelection > 0.5 ) {
      vec3 linenLow = vec3( 0.72, 0.65, 0.56 );
      vec3 linenHi  = vec3( 0.90, 0.86, 0.79 );
      vec3 warmLinen = mix( linenLow, linenHi, diffAmt ) * sulcusAO;
      warmLinen = mix( warmLinen, sepiaEdgeM, pow( 1.0 - facingGeo, 2.35 ) * 0.44 );
      baseMusOut = mix( baseMusOut, warmLinen, 0.90 );
    }
    if ( uXRay > 0.01 ) {
      float rimMX = pow( 1.0 - facingGeo, 2.1 );
      vec3 xrMusCol = mix( vec3( 0.88, 0.83, 0.75 ), vec3( 0.30, 0.21, 0.13 ), rimMX * 0.72 );
      baseMusOut = mix( baseMusOut, xrMusCol, uXRay * 0.82 );
    }
    outgoingLight = baseMusOut;
  }
`;
/** 筋肉IDから決定論的な個体差ハッシュ（[-0.5, +0.5] × 3成分）を算出（隣接筋同士の色分離を高める） */
function muscleIdVariation(id = '') {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u1 = ((h >>> 0) & 0x3ff) / 1023 - 0.5;
  const u2 = ((h >>> 10) & 0x3ff) / 1023 - 0.5;
  const u3 = ((h >>> 20) & 0x3ff) / 1023 - 0.5;
  return { u1, u2, u3 };
}
/**
 * Proposal A: Rooton 公式HP連動のやさしい水彩シャンパン・ウォームブラッシュ筋配色
 * 生々しい赤肉感を排し、清潔で温かみのあるサロン水彩イラスト調に統一
 */
function atlasColorOf(base, kind, id = '') {
  if (kind === 'bone') return new THREE.Color('#f7f3ea');
  const isTendon = /tendon|aponeurosis|linea-alba|ligament|retinaculum/.test(id);
  if (isTendon) return new THREE.Color('#f4efe6');
  const c = base.clone();
  const hsl = {};
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const { u1, u2, u3 } = muscleIdVariation(id);
  if (HEAD_FACIAL_MUSCLE_IDS.has(id)) {
    const hf = (0.046 + u1 * 0.012 + 1.0) % 1.0;
    const sf = THREE.MathUtils.clamp(0.34 + u2 * 0.06, 0.28, 0.40);
    const lf = THREE.MathUtils.clamp(0.76 + u3 * 0.05, 0.72, 0.80);
    return new THREE.Color().setHSL(hf, sf, lf, THREE.SRGBColorSpace);
  }
  const isDeep = inferDefaultFasciaLayer(id) === 'deep';
  const idBlendL = u3 * 0.75 + (hsl.l - 0.5) * 0.25;
  const h = (0.048 + u1 * 0.016 + 1.0) % 1.0; // 温かいテラコッタ・ピーチベージュ域
  const s = THREE.MathUtils.clamp(0.36 + u2 * 0.08, 0.30, 0.43);
  const lBase = isDeep ? 0.725 : 0.765;
  const l = THREE.MathUtils.clamp(lBase + idBlendL * 0.065, 0.69, 0.81);
  return new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace);
}
/** 水彩サロンイラスト配色 */
function illustColorOf(base, kind, id = '') {
  if (kind === 'bone') return new THREE.Color('#f7f3ea');
  const isTendon = /tendon|aponeurosis|linea-alba|ligament|retinaculum/.test(id);
  if (isTendon) return new THREE.Color('#f4efe6');
  const { u1, u2, u3 } = muscleIdVariation(id);
  const isDeep = inferDefaultFasciaLayer(id) === 'deep';
  const h = (0.048 + u1 * 0.014 + 1.0) % 1.0;
  const s = THREE.MathUtils.clamp(0.38 + u2 * 0.06, 0.32, 0.44);
  const l = THREE.MathUtils.clamp((isDeep ? 0.74 : 0.78) + u3 * 0.05, 0.71, 0.82);
  return new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace);
}
/** 表示用の日本語エラー（main.js はこのメッセージのみ画面に出す） */
function jaError(message, cause) {
  const err = new Error(message);
  err.ja = true;
  if (cause) err.cause = cause;
  return err;
}
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/**
 * fetch をストリームで読み、受信バイト数を逐次通知する（一時的な通信切断時は最大3回まで自動リトライ）。
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchWithProgress(url, fallbackTotal, onBytes) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fetchOpts = attempt > 0 ? { cache: 'default' } : {};
      const response = await fetch(url, fetchOpts);
      if (!response.ok) throw jaError(`データが見つかりません（${response.status}）`);
      const contentLength = Number(response.headers.get('content-length')) || 0;
      const total = contentLength || fallbackTotal || 0;
      let buf;
      if (!response.body || !response.body.getReader) {
        buf = await response.arrayBuffer();
        onBytes(buf.byteLength, buf.byteLength);
      } else if (contentLength > 0) {
        const reader = response.body.getReader();
        let bytes = new Uint8Array(contentLength);
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (received + value.byteLength > bytes.byteLength) {
            const grown = new Uint8Array(Math.max(received + value.byteLength, Math.ceil(bytes.byteLength * 1.5)));
            grown.set(bytes.subarray(0, received), 0);
            bytes = grown;
          }
          bytes.set(value, received);
          received += value.byteLength;
          onBytes(received, Math.max(total, received));
        }
        buf = received === bytes.byteLength ? bytes.buffer : bytes.buffer.slice(0, received);
      } else {
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.byteLength;
          onBytes(received, Math.max(total, received));
        }
        const bytes = new Uint8Array(received);
        let offset = 0;
        for (let i = 0; i < chunks.length; i++) {
          bytes.set(chunks[i], offset);
          offset += chunks[i].byteLength;
          chunks[i] = null;
        }
        chunks.length = 0;
        buf = bytes.buffer;
      }
      if (!isGlb(buf)) {
        throw jaError('人体モデルのファイルが壊れています。');
      }
      return buf;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  if (lastErr && lastErr.ja) throw lastErr;
  throw jaError('通信できませんでした。電波の良い場所でもう一度お試しください。', lastErr);
}
function isGlb(buffer) {
  return buffer.byteLength >= 12 && new DataView(buffer).getUint32(0, true) === 0x46546c67; // 'glTF'
}
/**
 * @param {HTMLElement} container 描画先（#stage）
 * @param {{ onProgress?: (pct:number, text:string) => void, metadata?: object }} [options]
 *   metadata: main.js 側で読み込み済みの atlas_metadata.json があれば渡すと再取得しない
 */
export async function createViewer(container, { onProgress, metadata } = {}) {
  const report = (pct, text) => {
    try {
      onProgress?.(Math.max(0, Math.min(100, Math.round(pct))), text);
    } catch (e) {
      console.warn('[viewer] onProgress でエラー', e);
    }
  };
  report(0, '準備しています…');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    throw jaError('この端末では 3D 表示を開始できませんでした。', e);
  }
  let isDarkTheme = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.65 : 2));
  renderer.setClearColor(0xf6f2ea, 1); // ライトモード初期背景 #F6F2EA（ダーク切替時は #0B132B に連動）
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('aria-label', '人体の3Dモデル');
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  let envTex = null;
  const buildEnvTexture = () => {
    try {
      if (envTex) envTex.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.35;
      pmrem.dispose();
    } catch (err) {
      console.warn('[viewer] 環境テクスチャの生成をスキップしました', err);
    }
  };
  buildEnvTexture();
  let cachedWinW = window.innerWidth || 1024;
  let cachedWinH = window.innerHeight || 768;
  let cachedStageW = container.clientWidth || cachedWinW;
  let cachedStageH = container.clientHeight || cachedWinH;
  const refreshCachedStageSize = (entry) => {
    cachedWinW = window.innerWidth || 1024;
    cachedWinH = window.innerHeight || 768;
    if (entry?.contentRect && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
      cachedStageW = Math.round(entry.contentRect.width);
      cachedStageH = Math.round(entry.contentRect.height);
    } else {
      cachedStageW = container.clientWidth || cachedWinW;
      cachedStageH = container.clientHeight || cachedWinH;
    }
  };
  const size = () => ({
    w: cachedStageW || cachedWinW,
    h: cachedStageH || cachedWinH,
  });
  const { w: w0, h: h0 } = size();
  const camera = new THREE.PerspectiveCamera(32, w0 / h0, 0.015, 80);
  renderer.setSize(w0, h0, false);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.minDistance = 0.45;
  controls.maxDistance = 40;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const hemi = new THREE.HemisphereLight(0xfffcf5, 0xd8cbb8, 1.06);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfffaf0, 1.85); // キー：左上前方・柔らかな陽光
  key.position.set(-4, 7, 6);
  const fill = new THREE.DirectionalLight(0xf6efe4, 0.96); // フィル：右前方・和紙バウンス光
  fill.position.set(5, 2, 4);
  const rim = new THREE.DirectionalLight(0xfffdf9, 0.85); // リム：背面上方
  rim.position.set(1, 5, -7);
  const lightRig = new THREE.Group();
  lightRig.add(key, fill, rim);
  for (const l of [key, fill, rim]) {
    lightRig.add(l.target);
    l.target.position.set(0, 0, 0);
  }
  camera.add(lightRig);
  lightRig.position.set(0, 0, -8);
  scene.add(camera);
  let meta = metadata;
  if (!meta) {
    try {
      const res = await fetch(MODEL_BASE + 'atlas_metadata.json' + ASSET_QUERY);
      if (!res.ok) throw new Error(String(res.status));
      meta = await res.json();
    } catch (e) {
      throw jaError('人体データの一覧を読み込めませんでした。', e);
    }
  }
  /** id -> { nameJa, groupJa, color, type } */
  const info = new Map();
  for (const m of meta.muscles || []) info.set(m.id, { ...m, kind: 'muscle' });
  for (const b of meta.bones || []) info.set(b.id, { ...b, kind: 'bone' });
  report(3, '人体モデルをダウンロード中…');
  const files = ['muscles.glb', 'skeleton.glb'];
  const allDlFiles = ['muscles.glb', 'skeleton.glb', 'head_sculpt.glb'];
  const prog = Object.fromEntries(allDlFiles.map((f) => [f, { got: 0, total: FALLBACK_BYTES[f] }]));
  const dlReport = () => {
    let got = 0;
    let total = 0;
    for (const f of allDlFiles) {
      got += prog[f].got;
      total += prog[f].total;
    }
    const mb = (n) => (n / 1048576).toFixed(1);
    report(3 + (got / Math.max(total, 1)) * 85, `人体モデルをダウンロード中… ${mb(got)} / ${mb(total)} MB`);
  };
  const [muscleBuf, skeletonBuf, headSculptBuf] = await Promise.all([
    ...files.map((f) =>
      fetchWithProgress(MODEL_BASE + f + ASSET_QUERY, FALLBACK_BYTES[f], (got, total) => {
        prog[f].got = got;
        prog[f].total = total;
        dlReport();
      }),
    ),
    fetchWithProgress(MODEL_BASE + 'head_sculpt.glb' + ASSET_QUERY, FALLBACK_BYTES['head_sculpt.glb'], (got, total) => {
      prog['head_sculpt.glb'].got = got;
      prog['head_sculpt.glb'].total = total;
      dlReport();
    }).catch((err) => {
      console.warn('[viewer] head_sculpt.glb の取得をスキップしました', err);
      prog['head_sculpt.glb'].got = prog['head_sculpt.glb'].total;
      dlReport();
      return null;
    }),
  ]);
  const buffers = [muscleBuf, skeletonBuf];
  const loader = new GLTFLoader();
  if (MeshoptDecoder) {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  const parsed = [];
  for (let i = 0; i < files.length; i++) {
    report(89 + i * 4, i === 0 ? '筋肉を組み立て中…' : '骨格を組み立て中…');
    if (!isGlb(buffers[i])) throw jaError('人体モデルのファイルが壊れています。');
    try {
      parsed.push(await loader.parseAsync(buffers[i], MODEL_BASE));
      buffers[i] = null; // 解析完了した生 ArrayBuffer を即解放しピークメモリを削減
    } catch (e) {
      throw jaError('人体モデルを展開できませんでした。', e);
    }
  }
  let headSculptScene = null;
  if (headSculptBuf && isGlb(headSculptBuf)) {
    try {
      const parsedHead = await loader.parseAsync(headSculptBuf, MODEL_BASE);
      headSculptScene = parsedHead.scene;
    } catch (err) {
      console.warn('[viewer] head_sculpt.glb の展開をスキップしました', err);
    }
  }
  const root = new THREE.Group();
  root.name = 'anatomy';
  const muscleRoot = parsed[0].scene;
  const skeletonRoot = parsed[1].scene;
  muscleRoot.name = 'muscles';
  skeletonRoot.name = 'skeleton';
  skeletonRoot.scale.setScalar(SKELETON_SCALE);
  skeletonRoot.position.copy(SKELETON_OFFSET);
  root.add(skeletonRoot, muscleRoot);
  const headSculptMeshes = [];
  const headSculptUniforms = {
    uIllust: styleUniforms.uIllust,
    uIllustLight: styleUniforms.uIllustLight,
    uXRay: styleUniforms.uXRay,
    uDarkMode: styleUniforms.uDarkMode,
    uSkullThrough: { value: 0 },
  };
  let headSculptLoaded = false;
  if (headSculptScene) {
    headSculptScene.name = 'head-sculpt';
    const headRigRole = getRigRole('frontal-bone', 'bone');
    headSculptScene.traverse((obj) => {
      if (!obj.isMesh) return;
      const isVeil = /veil/i.test(obj.name || '');
      const oldMats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const embeddedMap = oldMats[0]?.map || null;
      oldMats.forEach((m) => {
        if (m && m.map === embeddedMap) m.map = null;
        m?.dispose?.();
      });
      if (embeddedMap) {
        embeddedMap.colorSpace = THREE.SRGBColorSpace;
        embeddedMap.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() || 1);
        embeddedMap.needsUpdate = true;
      }
      if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
      obj.raycast = () => {}; // ピック判定は下の実解剖メッシュへ直接透過させる
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = false;
      if (!isVeil) {
        const coreMat = new THREE.MeshStandardMaterial({
          map: embeddedMap,
          color: 0xffffff,
          vertexColors: false,
          transparent: true,
          depthWrite: true,
          alphaTest: 0.01,
          side: THREE.FrontSide,
          roughness: 0.52,
          metalness: 0.0,
          envMapIntensity: 0.42,
        });
        coreMat.name = 'sculpt:head-core';
        coreMat.onBeforeCompile = (shader) => {
          injectPose(shader, headRigRole);
          shader.uniforms.uIllust = headSculptUniforms.uIllust;
          shader.uniforms.uIllustLight = headSculptUniforms.uIllustLight;
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>
varying vec3 vCoreWorldPos;`,
            )
            .replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              vCoreWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
uniform float uIllust;
uniform vec3 uIllustLight;
varying vec3 vCoreWorldPos;`,
            )
            .replace(
              '#include <opaque_fragment>',
              `{
                float jawCutY = 2.476
                  + 0.026 * ( 1.0 - smoothstep( 0.04, 0.28, vCoreWorldPos.z ) )
                  + 0.068 * ( 1.0 - smoothstep( -0.16, 0.04, vCoreWorldPos.z ) );
                float postSoftC = 1.0 - smoothstep( -0.20, 0.02, vCoreWorldPos.z );
                float neckFadeC = smoothstep( jawCutY - 0.008 - 0.012 * postSoftC, jawCutY + 0.016 + 0.024 * postSoftC, vCoreWorldPos.y );
                if ( neckFadeC < 0.008 ) discard;
                vec3 nBase = normalize( normal );
                vec3 v0 = normalize( vViewPosition );
                vec3 lKey = normalize( uIllustLight );
                vec3 lFill = normalize( vec3( 4.2, 1.2, 3.2 ) );
                float cavityAO = 1.0;
                float facingGeo = clamp( abs( dot( nBase, v0 ) ), 0.0, 1.0 );
                float underAO = 1.0 - 0.10 * smoothstep( 0.05, 0.75, -nBase.y );
                float sulcusAO = ( 0.76 + 0.24 * pow( facingGeo, 0.48 ) ) * cavityAO * underAO;
                vec3 surfCol = diffuseColor.rgb;
                float isTendonTex = smoothstep( 0.66, 0.84, dot( surfCol, vec3( 0.3333 ) ) )
                                  * ( 1.0 - clamp( ( surfCol.r - surfCol.g ) * 2.8, 0.0, 1.0 ) );
                float hlM = clamp( dot( nBase, lKey ) * 0.5 + 0.5, 0.0, 1.0 );
                float fillM = max( dot( nBase, lFill ), 0.0 );
                float diffAmt = clamp( pow( hlM, 1.24 ) * 0.82 + fillM * 0.20, 0.0, 1.0 );
                if ( uIllust > 0.5 ) {
                  float bandM = 0.28 + smoothstep( 0.20, 0.36, diffAmt ) * 0.42 + smoothstep( 0.58, 0.74, diffAmt ) * 0.30;
                  diffAmt = mix( diffAmt, bandM, 0.60 );
                }
                vec3 shadowMul = mix( vec3( 0.64, 0.52, 0.45 ), vec3( 0.74, 0.68, 0.60 ), isTendonTex );
                vec3 shadowTone = surfCol * shadowMul;
                vec3 litTone = mix( surfCol * 1.08, vec3( 0.95, 0.91, 0.85 ), 0.18 );
                vec3 colM = mix( shadowTone, litTone, diffAmt ) * sulcusAO;
                float rimGateC = smoothstep( 0.12, 0.72, neckFadeC );
                float contourM = pow( 1.0 - facingGeo, 2.45 ) * 0.44 * rimGateC;
                vec3 sepiaEdgeM = vec3( 0.22, 0.15, 0.10 );
                outgoingLight = mix( colM, sepiaEdgeM, contourM );
                diffuseColor.a = neckFadeC;
              }
              #include <opaque_fragment>`,
            );
        };
        coreMat.customProgramCacheKey = () => 'av-head-sculpt-core-salon-v11';
        obj.material = coreMat;
        obj.userData.isHeadVeil = false;
        obj.renderOrder = 2;
      } else {
        const veilMat = new THREE.MeshStandardMaterial({
          map: embeddedMap,
          color: 0xffffff,
          vertexColors: false,
          transparent: true,
          depthWrite: false,
          alphaTest: 0.005,
          side: THREE.FrontSide,
          roughness: 0.56,
          metalness: 0.0,
          envMapIntensity: 0.22,
        });
        veilMat.name = 'sculpt:head-veil';
        veilMat.onBeforeCompile = (shader) => {
          injectPose(shader, headRigRole);
          shader.uniforms.uIllustLight = headSculptUniforms.uIllustLight;
          shader.uniforms.uXRay = headSculptUniforms.uXRay;
          shader.uniforms.uDarkMode = headSculptUniforms.uDarkMode;
          shader.uniforms.uSkullThrough = headSculptUniforms.uSkullThrough;
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>
uniform float uXRay;
uniform float uSkullThrough;
varying vec3 vVeilWorldPos;`,
            )
            .replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              vVeilWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
              {
                float stV = clamp( max( uSkullThrough, uXRay ), 0.0, 1.0 );
                vec3 wN = normalize( mat3( modelMatrix ) * normal );
                vec3 invS = vec3(
                  1.0 / max( length( modelMatrix[0].xyz ), 1e-6 ),
                  1.0 / max( length( modelMatrix[1].xyz ), 1e-6 ),
                  1.0 / max( length( modelMatrix[2].xyz ), 1e-6 )
                );
                transformed -= ( wN * invS ) * ( 0.0026 * stV );
              }`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
uniform vec3 uIllustLight;
uniform float uXRay;
uniform float uDarkMode;
uniform float uSkullThrough;
varying vec3 vVeilWorldPos;`,
            )
            .replace(
              '#include <opaque_fragment>',
              `{
                float jawCutY = 2.476
                  + 0.026 * ( 1.0 - smoothstep( 0.04, 0.28, vVeilWorldPos.z ) )
                  + 0.068 * ( 1.0 - smoothstep( -0.16, 0.04, vVeilWorldPos.z ) );
                float st = clamp( max( uSkullThrough, uXRay ), 0.0, 1.0 );
                float vis = 1.0 - st;
                float postSoftV = 1.0 - smoothstep( -0.20, 0.02, vVeilWorldPos.z );
                float neckGateNorm = smoothstep( jawCutY + 0.003, jawCutY + 0.020 + 0.026 * postSoftV, vVeilWorldPos.y );
                float jawCutSt = jawCutY + 0.066 * postSoftV;
                float neckGateSt = smoothstep( jawCutSt - 0.010, jawCutSt + 0.024, vVeilWorldPos.y );
                float neckGate = mix( neckGateNorm, neckGateSt, st );
                if ( neckGate < 0.006 ) discard;
                float axR = abs( vVeilWorldPos.x );
                float ryR = vVeilWorldPos.y;
                float rzR = vVeilWorldPos.z;
                float frontFace = smoothstep( 0.24, 0.30, rzR );
                float eyeDomeMask = smoothstep( 0.070, 0.086, axR )
                                  * ( 1.0 - smoothstep( 0.156, 0.174, axR ) )
                                  * smoothstep( 2.844, 2.856, ryR )
                                  * ( 1.0 - smoothstep( 2.882, 2.896, ryR ) )
                                  * frontFace * vis;
                float sxEye = vVeilWorldPos.x >= 0.0 ? 1.0 : -1.0;
                vec3 wEyeDomeN = normalize( vec3( ( axR - 0.120 ) * 2.1 * sxEye, ( ryR - 2.872 ) * 4.6, 0.27 ) );
                vec3 vEyeDomeN = normalize( ( viewMatrix * vec4( wEyeDomeN, 0.0 ) ).xyz );
                vec3 nV = normalize( mix( normalize( normal ), vEyeDomeN, eyeDomeMask * 0.92 ) );
                vec3 vV = normalize( vViewPosition );
                vec3 lKey = normalize( uIllustLight );
                vec3 lFill = normalize( vec3( 4.2, 1.2, 3.2 ) );
                float hlV = clamp( dot( nV, lKey ) * 0.5 + 0.5, 0.0, 1.0 );
                float fillV = max( dot( nV, lFill ), 0.0 );
                float diffV = clamp( pow( hlV, 1.18 ) * 0.80 + fillV * 0.20, 0.0, 1.0 );
                float facingV = clamp( abs( dot( nV, vV ) ), 0.0, 1.0 );
                float fresV = pow( 1.0 - facingV, 2.30 );
                float curvAO = 0.84 + 0.16 * pow( facingV, 0.46 );
                float tEyeX = clamp( ( axR - 0.078 ) / ( 0.166 - 0.078 ), 0.0, 1.0 );
                float yLash = 2.8636 + 0.0020 * smoothstep( 0.0, 0.90, tEyeX ) - 0.0024 * sin( 3.14159265 * tEyeX );
                float lashSpan = smoothstep( 0.075, 0.086, axR ) * ( 1.0 - smoothstep( 0.156, 0.168, axR ) ) * frontFace;
                float lashVec = exp( -pow( ( ryR - yLash ) / 0.0016, 2.0 ) ) * lashSpan;
                float lashOuter = exp( -pow( ( ryR - ( yLash - 0.0005 ) ) / 0.0023, 2.0 ) ) * lashSpan * smoothstep( 0.52, 0.96, tEyeX );
                float lashTotal = clamp( lashVec + lashOuter * 0.40, 0.0, 1.0 ) * vis;
                float yFold = yLash + 0.0114 + 0.0026 * sin( 3.14159265 * tEyeX );
                float foldSpan = smoothstep( 0.082, 0.092, axR ) * ( 1.0 - smoothstep( 0.150, 0.162, axR ) ) * frontFace;
                float foldVec = exp( -pow( ( ryR - yFold ) / 0.0014, 2.0 ) ) * foldSpan * vis;
                float upperLidWarm = smoothstep( yLash - 0.0034, yLash + 0.0005, ryR )
                                   * ( 1.0 - smoothstep( yFold - 0.0015, yFold + 0.0080, ryR ) ) * lashSpan * vis;
                float lidAntiGlare = smoothstep( yLash - 0.0036, yLash - 0.0004, ryR )
                                   * ( 1.0 - smoothstep( yFold + 0.0010, yFold + 0.0085, ryR ) ) * lashSpan * vis;
                float tBrowX = clamp( ( axR - 0.050 ) / ( 0.174 - 0.050 ), 0.0, 1.0 );
                float yBrow = 2.899 + 0.0095 * sin( 3.14159265 * pow( tBrowX, 0.82 ) ) - 0.004 * smoothstep( 0.70, 1.0, tBrowX );
                float browVec = exp( -pow( ( ryR - yBrow ) / 0.0044, 2.0 ) )
                              * smoothstep( 0.048, 0.066, axR ) * ( 1.0 - smoothstep( 0.154, 0.174, axR ) ) * frontFace * vis;
                float tLipX = clamp( axR / 0.084, 0.0, 1.0 );
                float yStom = 2.5992 + 0.0018 * smoothstep( 0.0, 0.95, tLipX );
                float stomVec = exp( -pow( ( ryR - yStom ) / 0.0014, 2.0 ) )
                              * ( 1.0 - smoothstep( 0.070, 0.084, axR ) ) * smoothstep( 0.28, 0.34, rzR ) * vis;
                vec3 texCol = diffuseColor.rgb;
                float rawA = diffuseColor.a * vis;
                vec3 sepiaContour = vec3( 0.205, 0.145, 0.098 );
                vec3 lashInk      = vec3( 0.25, 0.165, 0.125 );
                vec3 softTaupe    = vec3( 0.50, 0.37, 0.31 );
                vec3 lidWarmTone  = vec3( 0.745, 0.595, 0.535 );
                texCol = mix( texCol, lidWarmTone, upperLidWarm * 0.58 );
                texCol = mix( texCol, softTaupe, clamp( foldVec * 0.40 + browVec * 0.42, 0.0, 0.65 ) );
                texCol = mix( texCol, lashInk, clamp( lashTotal * 0.85 + stomVec * 0.68, 0.0, 0.90 ) );
                rawA = max( rawA, max( lashTotal * 0.95, max( foldVec * 0.84, max( stomVec * 0.92, browVec * 0.38 ) ) ) );
                float inkMask = clamp( lashTotal + stomVec + foldVec * 0.5, 0.0, 1.0 );
                float glareBlock = max( inkMask, lidAntiGlare );
                float effDiffV = mix( diffV, min( diffV, 0.56 ), lidAntiGlare * 0.86 );
                vec3 vShadow = texCol * vec3( 0.77, 0.68, 0.61 );
                vec3 vLit    = mix( texCol * 1.02, vec3( 0.94, 0.89, 0.84 ), 0.08 * ( 1.0 - glareBlock ) );
                vec3 salonVeilCol = mix( vShadow, vLit, mix( effDiffV, 0.40, inkMask * 0.68 ) ) * curvAO;
                float fresGate = smoothstep( 0.04, 0.18, rawA ) * smoothstep( 0.18, 0.72, neckGateNorm );
                salonVeilCol = mix( salonVeilCol, sepiaContour, clamp( fresV * 0.42 * fresGate, 0.0, 0.55 ) );
                float normalA = clamp( rawA + fresV * 0.11 * fresGate, 0.0, 0.93 ) * neckGateNorm;
                vec3 linenFill = mix(
                  mix( vec3( 0.84, 0.79, 0.72 ), vec3( 0.92, 0.88, 0.82 ), 0.45 + 0.55 * facingV ),
                  mix( vec3( 0.24, 0.34, 0.50 ), vec3( 0.38, 0.50, 0.68 ), 0.45 + 0.55 * facingV ),
                  uDarkMode
                );
                vec3 rimVeilCol = mix( sepiaContour, vec3( 0.66, 0.78, 0.92 ), uDarkMode );
                vec3 linenGhostCol = mix( linenFill, rimVeilCol, clamp( fresV * 0.76, 0.0, 0.82 ) );
                float throughA = ( 0.048 + 0.155 * fresV ) * neckGateSt;
                outgoingLight = mix( salonVeilCol, linenGhostCol, st );
                diffuseColor.a = mix( normalA, throughA, st );
              }
              #include <opaque_fragment>`,
            );
        };
        veilMat.customProgramCacheKey = () => 'av-head-sculpt-veil-salon-v16';
        obj.material = veilMat;
        obj.userData.isHeadVeil = true;
        obj.renderOrder = 5;
      }
      headSculptMeshes.push(obj);
    });
    if (headSculptMeshes.length > 0) {
      root.add(headSculptScene);
      headSculptLoaded = true;
    }
  }
  scene.add(root);
  /** @type {Map<string, THREE.Mesh[]>} */
  const meshesById = new Map();
  /** @type {THREE.Mesh[]} */
  const allMeshes = [];
  scene.updateMatrixWorld(true);
  const centerCache = new Map();
  const centerAccum = new Map(); // id -> { sumL, sumR, sumBoth, cntL, cntR, cntBoth }
  const tmpBasisV = new THREE.Vector3();
  const getOrCreateAccum = (id) => {
    let acc = centerAccum.get(id);
    if (!acc) {
      acc = {
        sumL: new THREE.Vector3(),
        sumR: new THREE.Vector3(),
        sumBoth: new THREE.Vector3(),
        cntL: 0,
        cntR: 0,
        cntBoth: 0,
      };
      centerAccum.set(id, acc);
    }
    return acc;
  };
  /** 筋肉のレストポーズ主軸（筋線維方向）と起始・停止スパンを算出し、同時に左右・全体の重心を蓄積 */
  const computeAtlasFiberBasis = (obj, kind, id) => {
    const pos = obj.geometry.attributes.position;
    const acc = getOrCreateAccum(id);
    if (kind === 'bone') {
      if (pos && pos.count > 0) {
        const step = Math.max(1, Math.floor(pos.count / 450));
        for (let i = 0; i < pos.count; i += step) {
          tmpBasisV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
          acc.sumBoth.add(tmpBasisV);
          acc.cntBoth++;
          if (tmpBasisV.x > 0) {
            acc.sumL.add(tmpBasisV);
            acc.cntL++;
          } else if (tmpBasisV.x < 0) {
            acc.sumR.add(tmpBasisV);
            acc.cntR++;
          }
        }
      }
      return {
        center: new THREE.Vector3(0, 0, 0),
        axis: new THREE.Vector3(0, 1, 0),
        span: new THREE.Vector2(-0.5, 0.5),
        meta: new THREE.Vector2(1, 0),
      };
    }
    const isTendon = /tendon|aponeurosis|linea-alba|ligament|retinaculum/.test(id) ? 1 : 0;
    if (!pos || pos.count < 4) {
      return {
        center: new THREE.Vector3(0, 0, 0),
        axis: new THREE.Vector3(0, 1, 0),
        span: new THREE.Vector2(-0.2, 0.2),
        meta: new THREE.Vector2(0, isTendon),
      };
    }
    const step = Math.max(1, Math.floor(pos.count / 450));
    let mx = 0, my = 0, mz = 0, n = 0;
    const pts = [];
    for (let i = 0; i < pos.count; i += step) {
      tmpBasisV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      acc.sumBoth.add(tmpBasisV);
      acc.cntBoth++;
      if (tmpBasisV.x > 0) {
        acc.sumL.add(tmpBasisV);
        acc.cntL++;
      } else if (tmpBasisV.x < 0) {
        acc.sumR.add(tmpBasisV);
        acc.cntR++;
      }
      const ax = Math.abs(tmpBasisV.x);
      const y = tmpBasisV.y;
      const z = tmpBasisV.z;
      pts.push(ax, y, z);
      mx += ax;
      my += y;
      mz += z;
      n++;
    }
    mx /= n;
    my /= n;
    mz /= n;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (let i = 0; i < pts.length; i += 3) {
      const dx = pts[i] - mx;
      const dy = pts[i + 1] - my;
      const dz = pts[i + 2] - mz;
      xx += dx * dx;
      xy += dx * dy;
      xz += dx * dz;
      yy += dy * dy;
      yz += dy * dz;
      zz += dz * dz;
    }
    let vx = 0.25, vy = 1.0, vz = 0.15;
    for (let it = 0; it < 14; it++) {
      const nx = xx * vx + xy * vy + xz * vz;
      const ny = xy * vx + yy * vy + yz * vz;
      const nz = xz * vx + yz * vy + zz * vz;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-10) {
        vx = 0;
        vy = 1;
        vz = 0;
        break;
      }
      vx = nx / l;
      vy = ny / l;
      vz = nz / l;
    }
    let sMin = Infinity, sMax = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      const s = (pts[i] - mx) * vx + (pts[i + 1] - my) * vy + (pts[i + 2] - mz) * vz;
      if (s < sMin) sMin = s;
      if (s > sMax) sMax = s;
    }
    if (!Number.isFinite(sMin) || sMax - sMin < 0.02) {
      sMin = -0.15;
      sMax = 0.15;
    }
    return {
      center: new THREE.Vector3(mx, my, mz),
      axis: new THREE.Vector3(vx, vy, vz).normalize(),
      span: new THREE.Vector2(sMin, sMax),
      meta: new THREE.Vector2(0, isTendon),
    };
  };
  /** イラストモード（style === 'illust'）が選択されたときのみ輪郭メッシュを遅延生成 */
  const ensureHull = (obj) => {
    if (obj.userData.hull) return obj.userData.hull;
    const { structureId: id, kind, illustColor, rigRole } = obj.userData;
    const hullMat = new THREE.MeshBasicMaterial({
      color: illustColor.clone().multiplyScalar(kind === 'bone' ? 0.50 : 0.44).lerp(new THREE.Color('#6E5C4A'), 0.65),
      side: THREE.BackSide,
    });
    const hullScale = { value: kind === 'bone' ? SKELETON_SCALE : 1 };
    hullMat.onBeforeCompile = (shader) => {
      shader.uniforms.uOutline = styleUniforms.uOutline;
      shader.uniforms.uHullScale = hullScale;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uOutline;\nuniform float uHullScale;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            vec4 hullWp = modelMatrix * vec4( transformed, 1.0 );
            float hullDist = length( cameraPosition - hullWp.xyz );
            transformed += normalize( normal ) * uOutline * hullDist / uHullScale;
          }`,
        );
      injectPose(shader, rigRole);
    };
    hullMat.customProgramCacheKey = () => 'av-hull-v3';
    const hull = new THREE.Mesh(obj.geometry, hullMat);
    hull.name = `${id}:outline`;
    hull.raycast = () => {};
    hull.userData.isOutline = true;
    hull.frustumCulled = false;
    obj.add(hull);
    obj.userData.hull = hull;
    return hull;
  };
  const smoothstep01 = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const tmpConformV = new THREE.Vector3();
  const tmpInvMat = new THREE.Matrix4();
  /** 舌骨下筋群の顎下付着、および全15種の後頸・乳様突起付着筋の上項線ギザ端を頭蓋スカルプトの内側上方へ滑らかに引き上げ格納する */
  const INFRAHYOID_TUCK_IDS = new Set(['sternohyoid', 'omohyoid', 'thyrohyoid']);
  const NUCHAL_TOP_TUCK_IDS = new Set([
    'trapezius',
    'splenius-capitis',
    'splenius-cervicis',
    'sternocleidomastoid',
    'semispinalis',
    'semispinalis-capitis',
    'longissimus',
    'longissimus-capitis',
    'levator-scapulae',
    'digastric',
    'stylohyoid',
    'rectus-capitis-posterior-major',
    'rectus-capitis-posterior-minor',
    'obliquus-capitis-superior',
    'obliquus-capitis-inferior',
  ]);
  const conformCranialGeometry = (obj, id = '') => {
    const isHyoid = INFRAHYOID_TUCK_IDS.has(id);
    const isNuchal = NUCHAL_TOP_TUCK_IDS.has(id);
    const isPlatysma = id === 'platysma';
    if (!isHyoid && !isNuchal && !isPlatysma) return;
    const pos = obj.geometry?.attributes?.position;
    if (!pos || pos.count === 0) return;
    obj.updateMatrixWorld(true);
    tmpInvMat.copy(obj.matrixWorld).invert();
    const nextArr = new Float32Array(pos.count * 3);
    let changed = false;
    for (let i = 0; i < pos.count; i++) {
      tmpConformV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      let wx = tmpConformV.x;
      let wy = tmpConformV.y;
      let wz = tmpConformV.z;
      if (isHyoid && wy > 2.30) {
        const tHyoid = smoothstep01(2.30, 2.48, wy);
        wz -= 0.052 * tHyoid;
        wy += 0.018 * tHyoid;
        changed = true;
      } else if (isNuchal && wy > 2.48 && wz < 0.18) {
        const tTop = smoothstep01(2.48, 2.64, wy) * smoothstep01(0.18, 0.02, wz);
        if (tTop > 1e-4) {
          wy += 0.020 * tTop;
          wx *= 1.0 - 0.22 * tTop;
          const zExcess = Math.min(0.0, wz + 0.215);
          wz -= 0.55 * zExcess * tTop;
          changed = true;
        }
      } else if (isPlatysma && wy > 2.44) {
        const tEar = smoothstep01(2.44, 2.57, wy) * smoothstep01(0.22, 0.04, wz);
        const tChin = smoothstep01(2.455, 2.495, wy) * smoothstep01(0.16, 0.25, wz);
        if (tEar > 1e-4 || tChin > 1e-4) {
          wx *= 1.0 - 0.20 * tEar - 0.05 * tChin;
          wz -= 0.018 * tChin;
          wy += 0.016 * tChin + 0.014 * tEar;
          changed = true;
        }
      }
      tmpConformV.set(wx, wy, wz).applyMatrix4(tmpInvMat);
      nextArr[i * 3] = tmpConformV.x;
      nextArr[i * 3 + 1] = tmpConformV.y;
      nextArr[i * 3 + 2] = tmpConformV.z;
    }
    if (!changed) return;
    obj.geometry = obj.geometry.clone();
    obj.geometry.setAttribute('position', new THREE.BufferAttribute(nextArr, 3));
    obj.geometry.deleteAttribute('normal');
    obj.geometry.computeVertexNormals();
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  };
  /** 下顎骨（mandible）の自然な閉口レスト補正（顎関節 TMJ 軸まわりに顎先を上前方へ閉口回転） */
  const conformMandibleRest = (obj, id = '') => {
    if (id !== 'mandible') return;
    const pos = obj.geometry?.attributes?.position;
    if (!pos || pos.count === 0) return;
    obj.updateMatrixWorld(true);
    tmpInvMat.copy(obj.matrixWorld).invert();
    const nextArr = new Float32Array(pos.count * 3);
    const pivY = 2.695;
    const pivZ = 0.025;
    const ang = 0.088;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    for (let i = 0; i < pos.count; i++) {
      tmpConformV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      const wx = tmpConformV.x;
      const wy = tmpConformV.y;
      const wz = tmpConformV.z;
      const ny = pivY + (wy - pivY) * c + (wz - pivZ) * s;
      const nz = pivZ + (wz - pivZ) * c - (wy - pivY) * s;
      tmpConformV.set(wx, ny, nz).applyMatrix4(tmpInvMat);
      nextArr[i * 3] = tmpConformV.x;
      nextArr[i * 3 + 1] = tmpConformV.y;
      nextArr[i * 3 + 2] = tmpConformV.z;
    }
    const prevNorm = obj.geometry.attributes.normal;
    obj.geometry = obj.geometry.clone();
    obj.geometry.setAttribute('position', new THREE.BufferAttribute(nextArr, 3));
    obj.geometry.deleteAttribute('normal');
    obj.geometry.computeVertexNormals();
    const newNorm = obj.geometry.attributes.normal;
    if (prevNorm && newNorm && newNorm.count === prevNorm.count && newNorm.count > 0) {
      let dotCheck = 0;
      const checkStep = Math.max(1, Math.floor(newNorm.count / 32));
      for (let k = 0; k < newNorm.count; k += checkStep) {
        dotCheck +=
          prevNorm.getX(k) * newNorm.getX(k) +
          prevNorm.getY(k) * newNorm.getY(k) +
          prevNorm.getZ(k) * newNorm.getZ(k);
      }
      if (dotCheck < 0) {
        const arr = newNorm.array;
        for (let k = 0; k < arr.length; k++) arr[k] = -arr[k];
        newNorm.needsUpdate = true;
      }
    }
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  };
  /**
   * 人間の自然な肉付き・紡錘状の力こぶ（上腕二頭筋 長頭・短頭）と主要表層筋の解剖学的スカルプト。
   * 起始・停止の腱付着端は変位 0 にアンカー固定し、骨や隣接筋とのめり込み・Zファイティングをゼロに保つ。
   */
  const SCULPT_MUSCLE_IDS = new Set([
    'biceps-brachii',
    'brachialis',
    'triceps-brachii',
    'deltoid',
    'pectoralis-major',
    'gastrocnemius',
    'rectus-femoris',
    'vastus-lateralis',
    'vastus-medialis',
  ]);
  const sculptHumanMusculature = (obj, id = '') => {
    if (!SCULPT_MUSCLE_IDS.has(id)) return;
    const pos = obj.geometry?.attributes?.position;
    if (!pos || pos.count === 0) return;
    obj.updateMatrixWorld(true);
    tmpInvMat.copy(obj.matrixWorld).invert();
    const nextArr = new Float32Array(pos.count * 3);
    let changed = false;
    for (let i = 0; i < pos.count; i++) {
      tmpConformV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      let wx = tmpConformV.x;
      let wy = tmpConformV.y;
      let wz = tmpConformV.z;
      const sx = wx >= 0 ? 1 : -1;
      let ax = Math.abs(wx);
      if (id === 'biceps-brachii') {
        if (wy > 0.92 && wy < 1.88) {
          const anchorMask = smoothstep01(0.92, 1.05, wy) * (1 - smoothstep01(1.75, 1.88, wy));
          if (anchorMask > 1e-4) {
            const dMain = (wy - 1.38) / (wy < 1.38 ? 0.31 : 0.34);
            const mainBell = Math.exp(-dMain * dMain * 1.45);
            const pinchBell = smoothstep01(1.46, 1.60, wy) * (1 - smoothstep01(1.66, 1.78, wy));
            const fusiformY = anchorMask * Math.min(1.06, mainBell * 0.88 + pinchBell * 0.56);
            const tArm = Math.max(0, Math.min(1, (wy - 1.10) / (1.70 - 1.10)));
            const cx = 0.84 + (0.72 - 0.84) * tArm;
            const dx = ax - cx;
            const widthGain = 0.31 * fusiformY;
            const latOutward = smoothstep01(-0.015, 0.055, dx) * (0.014 * mainBell + 0.018 * pinchBell) * anchorMask;
            ax = cx + dx * (1 + widthGain) + latOutward;
            const frontWeight = smoothstep01(-0.075, 0.025, wz);
            const archX = Math.max(0.28, 1 - Math.pow(dx / 0.150, 2) * 0.40);
            const liftZ = (0.060 * mainBell + 0.026 * pinchBell) * anchorMask * frontWeight * archX;
            const cleftMaskY = smoothstep01(1.12, 1.30, wy) * (1 - smoothstep01(1.68, 1.84, wy));
            const cleft = Math.exp(-Math.pow((dx + 0.003) / 0.022, 2));
            const cleftDepth = 0.0062 * cleft * cleftMaskY * frontWeight;
            wx = sx * ax;
            wz += liftZ - cleftDepth;
            changed = true;
          }
        }
      } else if (id === 'brachialis') {
        if (wy > 1.00 && wy < 1.58) {
          const mB = smoothstep01(1.00, 1.14, wy) * (1 - smoothstep01(1.45, 1.58, wy));
          const latB = smoothstep01(0.81, 0.90, ax);
          if (mB * latB > 1e-4) {
            ax += 0.015 * mB * latB;
            wx = sx * ax;
            changed = true;
          }
        }
      } else if (id === 'triceps-brachii') {
        if (wy > 1.12 && wy < 1.84) {
          const mT = smoothstep01(1.12, 1.28, wy) * (1 - smoothstep01(1.68, 1.84, wy));
          const backW = smoothstep01(0.17, 0.27, -wz);
          const latHeadY = smoothstep01(1.22, 1.38, wy) * (1 - smoothstep01(1.66, 1.82, wy));
          const latHeadX = smoothstep01(0.77, 0.88, ax);
          if (mT * backW > 1e-4 || latHeadY * latHeadX > 1e-4) {
            wz -= 0.026 * mT * backW;
            ax += 0.018 * latHeadY * latHeadX;
            wx = sx * ax;
            changed = true;
          }
        }
      } else if (id === 'deltoid') {
        if (wy > 1.62 && wy < 2.04) {
          const mD = smoothstep01(1.62, 1.74, wy) * (1 - smoothstep01(1.94, 2.04, wy));
          if (mD > 1e-4) {
            ax += 0.012 * mD * smoothstep01(0.74, 0.87, ax);
            wz += 0.011 * mD * smoothstep01(-0.04, 0.06, wz);
            wz -= 0.011 * mD * smoothstep01(0.24, 0.36, -wz);
            wx = sx * ax;
            changed = true;
          }
        }
      } else if (id === 'pectoralis-major') {
        if (wy > 1.30 && wy < 2.04) {
          const mPY = smoothstep01(1.30, 1.46, wy) * (1 - smoothstep01(1.90, 2.04, wy));
          const mPX = smoothstep01(0.06, 0.16, ax) * (1 - smoothstep01(0.48, 0.62, ax));
          const mPZ = smoothstep01(0.20, 0.38, wz);
          if (mPY * mPX * mPZ > 1e-4) {
            wz += 0.015 * mPY * mPX * mPZ;
            changed = true;
          }
        }
      } else if (id === 'gastrocnemius') {
        if (wy > -2.38 && wy < -1.48) {
          const mGY = smoothstep01(-2.38, -2.14, wy) * (1 - smoothstep01(-1.66, -1.48, wy));
          const mGZ = smoothstep01(0.24, 0.36, -wz);
          if (mGY * mGZ > 1e-4) {
            const calfCleft = Math.exp(-Math.pow((ax - 0.322) / 0.026, 2));
            wz -= (0.016 - 0.004 * calfCleft) * mGY * mGZ;
            ax += (ax - 0.322) * 0.055 * mGY * mGZ;
            wx = sx * ax;
            changed = true;
          }
        }
      } else if (id === 'rectus-femoris') {
        if (wy > -1.55 && wy < 0.02) {
          const mRY = smoothstep01(-1.55, -1.16, wy) * (1 - smoothstep01(-0.22, 0.02, wy));
          const mRZ = smoothstep01(0.08, 0.19, wz);
          if (mRY * mRZ > 1e-4) {
            wz += 0.014 * mRY * mRZ;
            changed = true;
          }
        }
      } else if (id === 'vastus-lateralis') {
        if (wy > -1.56 && wy < -0.20) {
          const mVLY = smoothstep01(-1.56, -1.20, wy) * (1 - smoothstep01(-0.42, -0.20, wy));
          if (mVLY > 1e-4) {
            ax += 0.015 * mVLY * smoothstep01(0.46, 0.57, ax);
            wz += 0.009 * mVLY * smoothstep01(0.04, 0.14, wz);
            wx = sx * ax;
            changed = true;
          }
        }
      } else if (id === 'vastus-medialis') {
        if (wy > -1.58 && wy < -0.35) {
          const mVMY = smoothstep01(-1.58, -1.30, wy) * (1 - smoothstep01(-0.56, -0.35, wy));
          if (mVMY > 1e-4) {
            ax -= 0.012 * mVMY * smoothstep01(0.10, 0.22, 0.38 - ax);
            wz += 0.012 * mVMY * smoothstep01(0.04, 0.15, wz);
            wx = sx * ax;
            changed = true;
          }
        }
      }
      tmpConformV.set(wx, wy, wz).applyMatrix4(tmpInvMat);
      nextArr[i * 3] = tmpConformV.x;
      nextArr[i * 3 + 1] = tmpConformV.y;
      nextArr[i * 3 + 2] = tmpConformV.z;
    }
    if (!changed) return;
    const prevNorm = obj.geometry.attributes.normal;
    obj.geometry = obj.geometry.clone();
    obj.geometry.setAttribute('position', new THREE.BufferAttribute(nextArr, 3));
    obj.geometry.deleteAttribute('normal');
    obj.geometry.computeVertexNormals();
    const newNorm = obj.geometry.attributes.normal;
    if (prevNorm && newNorm && newNorm.count === prevNorm.count && newNorm.count > 0) {
      let dotCheck = 0;
      const checkStep = Math.max(1, Math.floor(newNorm.count / 32));
      for (let k = 0; k < newNorm.count; k += checkStep) {
        dotCheck +=
          prevNorm.getX(k) * newNorm.getX(k) +
          prevNorm.getY(k) * newNorm.getY(k) +
          prevNorm.getZ(k) * newNorm.getZ(k);
      }
      if (dotCheck < 0) {
        const arr = newNorm.array;
        for (let k = 0; k < arr.length; k++) arr[k] = -arr[k];
        newNorm.needsUpdate = true;
      }
    }
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  };
  /** 首・顎下・鎖骨・肩甲帯・表情咀嚼筋の座標ベース法線ウェルディング（0.25mm空間バケット＋同方向半球ガードでUV分割/フラット面のカクつきを100%解消） */
  const SMOOTH_NECK_MUSCLE_IDS = new Set([
    'platysma',
    'sternocleidomastoid',
    'trapezius',
    'omohyoid',
    'sternohyoid',
    'thyrohyoid',
    'sternothyroid',
    'digastric',
    'mylohyoid',
    'stylohyoid',
    'geniohyoid',
    'splenius-capitis',
    'splenius-cervicis',
    'semispinalis',
    'semispinalis-capitis',
    'longissimus',
    'longissimus-capitis',
    'rectus-capitis-posterior-major',
    'rectus-capitis-posterior-minor',
    'obliquus-capitis-superior',
    'obliquus-capitis-inferior',
    'levator-scapulae',
    'scalenus-anterior',
    'scalenus-medius',
    'scalenus-posterior',
    'pectoralis-major',
    'pectoralis-minor',
    'deltoid',
    'subclavius',
    'longus-colli',
    'longus-capitis',
    ...HEAD_FACIAL_MUSCLE_IDS,
  ]);
  const smoothWeldedNeckNormals = (obj, id = '') => {
    if (!SMOOTH_NECK_MUSCLE_IDS.has(id)) return;
    const geom = obj.geometry;
    const pos = geom?.attributes?.position;
    if (!pos || pos.count < 3) return;
    const prevNorm = geom.attributes.normal;
    const nextGeom = geom.clone();
    obj.updateMatrixWorld(true);
    const mw = obj.matrixWorld;
    const me = mw.elements;
    const vCount = pos.count;
    const worldPos = new Float32Array(vCount * 3);
    if (id === 'platysma') {
      tmpInvMat.copy(mw).invert();
      const nextPos = new Float32Array(vCount * 3);
      for (let i = 0; i < vCount; i++) {
        tmpConformV.fromBufferAttribute(pos, i).applyMatrix4(mw);
        let wx = tmpConformV.x;
        const wy = tmpConformV.y;
        let wz = tmpConformV.z;
        const neckBand = smoothstep01(2.12, 2.22, wy) * (1 - smoothstep01(2.43, 2.48, wy));
        if (neckBand > 1e-4) {
          const rx = wx;
          const rz = wz + 0.035;
          const rLen = Math.hypot(rx, rz) || 1;
          wx += (rx / rLen) * 0.0026 * neckBand;
          wz += (rz / rLen) * 0.0026 * neckBand;
        }
        worldPos[i * 3] = wx;
        worldPos[i * 3 + 1] = wy;
        worldPos[i * 3 + 2] = wz;
        tmpConformV.set(wx, wy, wz).applyMatrix4(tmpInvMat);
        nextPos[i * 3] = tmpConformV.x;
        nextPos[i * 3 + 1] = tmpConformV.y;
        nextPos[i * 3 + 2] = tmpConformV.z;
      }
      nextGeom.setAttribute('position', new THREE.BufferAttribute(nextPos, 3));
    } else {
      const curPos = nextGeom.attributes.position;
      for (let i = 0; i < vCount; i++) {
        tmpConformV.fromBufferAttribute(curPos, i).applyMatrix4(mw);
        worldPos[i * 3] = tmpConformV.x;
        worldPos[i * 3 + 1] = tmpConformV.y;
        worldPos[i * 3 + 2] = tmpConformV.z;
      }
    }
    const ownN = new Float32Array(vCount * 3);
    const idxAttr = nextGeom.index;
    const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(vCount / 3);
    for (let t = 0; t < triCount; t++) {
      const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
      const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
      const ax = worldPos[i0 * 3], ay = worldPos[i0 * 3 + 1], az = worldPos[i0 * 3 + 2];
      const e1x = worldPos[i1 * 3] - ax, e1y = worldPos[i1 * 3 + 1] - ay, e1z = worldPos[i1 * 3 + 2] - az;
      const e2x = worldPos[i2 * 3] - ax, e2y = worldPos[i2 * 3 + 1] - ay, e2z = worldPos[i2 * 3 + 2] - az;
      const fnx = e1y * e2z - e1z * e2y;
      const fny = e1z * e2x - e1x * e2z;
      const fnz = e1x * e2y - e1y * e2x;
      ownN[i0 * 3] += fnx; ownN[i0 * 3 + 1] += fny; ownN[i0 * 3 + 2] += fnz;
      ownN[i1 * 3] += fnx; ownN[i1 * 3 + 1] += fny; ownN[i1 * 3 + 2] += fnz;
      ownN[i2 * 3] += fnx; ownN[i2 * 3 + 1] += fny; ownN[i2 * 3 + 2] += fnz;
    }
    const buckets = new Map();
    const vKeys = new Float64Array(vCount);
    for (let i = 0; i < vCount; i++) {
      const bx = Math.max(0, Math.min(65535, Math.round(worldPos[i * 3] * 4000) + 32768));
      const by = Math.max(0, Math.min(65535, Math.round(worldPos[i * 3 + 1] * 4000) + 32768));
      const bz = Math.max(0, Math.min(65535, Math.round(worldPos[i * 3 + 2] * 4000) + 32768));
      const key = bx + by * 65536 + bz * 4294967296;
      vKeys[i] = key;
      let grp = buckets.get(key);
      if (!grp) {
        grp = [i];
        buckets.set(key, grp);
      } else {
        grp.push(i);
      }
    }
    const weldedW = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      const ox = ownN[i * 3], oy = ownN[i * 3 + 1], oz = ownN[i * 3 + 2];
      const oLen = Math.hypot(ox, oy, oz);
      if (oLen < 1e-12) {
        weldedW[i * 3 + 2] = 1;
        continue;
      }
      const ux = ox / oLen, uy = oy / oLen, uz = oz / oLen;
      const grp = buckets.get(vKeys[i]);
      let sx = ox, sy = oy, sz = oz;
      if (grp && grp.length > 1) {
        for (let k = 0; k < grp.length; k++) {
          const j = grp[k];
          if (j === i) continue;
          const jx = ownN[j * 3], jy = ownN[j * 3 + 1], jz = ownN[j * 3 + 2];
          const jLen = Math.hypot(jx, jy, jz);
          if (jLen > 1e-12 && (ux * jx + uy * jy + uz * jz) / jLen > 0.15) {
            sx += jx;
            sy += jy;
            sz += jz;
          }
        }
      }
      const sLen = Math.hypot(sx, sy, sz) || 1;
      weldedW[i * 3] = sx / sLen;
      weldedW[i * 3 + 1] = sy / sLen;
      weldedW[i * 3 + 2] = sz / sLen;
    }
    const repOf = new Int32Array(vCount);
    for (let i = 0; i < vCount; i++) {
      const grp = buckets.get(vKeys[i]);
      let rep = i;
      if (grp && grp.length > 1) {
        const wx = weldedW[i * 3], wy = weldedW[i * 3 + 1], wz = weldedW[i * 3 + 2];
        for (let k = 0; k < grp.length; k++) {
          const cand = grp[k];
          if (wx * weldedW[cand * 3] + wy * weldedW[cand * 3 + 1] + wz * weldedW[cand * 3 + 2] > 0.25) {
            rep = cand;
            break;
          }
        }
      }
      repOf[i] = rep;
    }
    let curW = weldedW;
    for (let iter = 0; iter < 3; iter++) {
      const adjSum = new Float32Array(vCount * 3);
      const adjCnt = new Uint16Array(vCount);
      const accumEdge = (u0, u1) => {
        const a = repOf[u0], b = repOf[u1];
        if (a === b) return;
        const dotAB =
          curW[a * 3] * curW[b * 3] +
          curW[a * 3 + 1] * curW[b * 3 + 1] +
          curW[a * 3 + 2] * curW[b * 3 + 2];
        if (dotAB > 0.30) {
          adjSum[a * 3] += curW[b * 3]; adjSum[a * 3 + 1] += curW[b * 3 + 1]; adjSum[a * 3 + 2] += curW[b * 3 + 2];
          adjCnt[a]++;
          adjSum[b * 3] += curW[a * 3]; adjSum[b * 3 + 1] += curW[a * 3 + 1]; adjSum[b * 3 + 2] += curW[a * 3 + 2];
          adjCnt[b]++;
        }
      };
      for (let t = 0; t < triCount; t++) {
        const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
        const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
        accumEdge(i0, i1);
        accumEdge(i1, i2);
        accumEdge(i2, i0);
      }
      const nxtW = new Float32Array(vCount * 3);
      for (let i = 0; i < vCount; i++) {
        const r = repOf[i];
        let nx = curW[r * 3], ny = curW[r * 3 + 1], nz = curW[r * 3 + 2];
        const c = adjCnt[r];
        if (c > 0) {
          nx = nx * 0.52 + (adjSum[r * 3] / c) * 0.48;
          ny = ny * 0.52 + (adjSum[r * 3 + 1] / c) * 0.48;
          nz = nz * 0.52 + (adjSum[r * 3 + 2] / c) * 0.48;
        }
        const l = Math.hypot(nx, ny, nz) || 1;
        nxtW[i * 3] = nx / l;
        nxtW[i * 3 + 1] = ny / l;
        nxtW[i * 3 + 2] = nz / l;
      }
      curW = nxtW;
    }
    const smoothW = curW;
    const localN = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      const wx = smoothW[i * 3], wy = smoothW[i * 3 + 1], wz = smoothW[i * 3 + 2];
      const grp = buckets.get(vKeys[i]);
      let fx = wx, fy = wy, fz = wz;
      if (grp && grp.length > 1) {
        for (let k = 0; k < grp.length; k++) {
          const j = grp[k];
          if (j === i) continue;
          const jx = smoothW[j * 3], jy = smoothW[j * 3 + 1], jz = smoothW[j * 3 + 2];
          if (wx * jx + wy * jy + wz * jz > 0.25) {
            fx += jx; fy += jy; fz += jz;
          }
        }
      }
      const lx = me[0] * fx + me[1] * fy + me[2] * fz;
      const ly = me[4] * fx + me[5] * fy + me[6] * fz;
      const lz = me[8] * fx + me[9] * fy + me[10] * fz;
      const lLen = Math.hypot(lx, ly, lz) || 1;
      localN[i * 3] = lx / lLen;
      localN[i * 3 + 1] = ly / lLen;
      localN[i * 3 + 2] = lz / lLen;
    }
    nextGeom.deleteAttribute('normal');
    const newNorm = new THREE.BufferAttribute(localN, 3);
    if (prevNorm && prevNorm.count === vCount && vCount > 0) {
      let dotCheck = 0;
      const step = Math.max(1, Math.floor(vCount / 32));
      for (let k = 0; k < vCount; k += step) {
        dotCheck +=
          prevNorm.getX(k) * newNorm.getX(k) +
          prevNorm.getY(k) * newNorm.getY(k) +
          prevNorm.getZ(k) * newNorm.getZ(k);
      }
      if (dotCheck < 0) {
        for (let k = 0; k < localN.length; k++) localN[k] = -localN[k];
      }
    }
    nextGeom.setAttribute('normal', newNorm);
    if (id === 'platysma') {
      nextGeom.computeBoundingBox();
      nextGeom.computeBoundingSphere();
    }
    obj.geometry = nextGeom;
  };
  const register = (group, kind) => {
    const srcMeshes = [];
    group.traverse((obj) => {
      if (obj.isMesh && !obj.userData.isOutline) srcMeshes.push(obj);
    });
    for (const obj of srcMeshes) {
      const id = obj.userData.structureId || obj.name;
      conformCranialGeometry(obj, id);
      if (kind === 'bone') conformMandibleRest(obj, id);
      if (kind === 'muscle') {
        sculptHumanMusculature(obj, id);
        smoothWeldedNeckNormals(obj, id);
      }
      const data = info.get(id);
      const baseColor = new THREE.Color(data?.color || (kind === 'bone' ? '#dfd0b4' : '#64748b'));
      const atlasColor = atlasColorOf(baseColor, kind, id);
      const illustColor = illustColorOf(baseColor, kind, id);
      const atlasBasis = computeAtlasFiberBasis(obj, kind, id);
      const rigRole = getRigRole(id, kind);
      const old = Array.isArray(obj.material) ? obj.material : [obj.material];
      old.forEach((m) => m?.dispose?.());
      const mat = new THREE.MeshStandardMaterial({
        color: atlasColor.clone(),
        roughness: kind === 'bone' ? 0.58 : 0.42,
        metalness: 0,
        envMapIntensity: kind === 'bone' ? 0.55 : 0.52,
      });
      mat.name = `${kind}:${id}`;
      const matUniforms = {
        uIllust: styleUniforms.uIllust,
        uIllustLight: styleUniforms.uIllustLight,
        uXRay: styleUniforms.uXRay,
        uXRaySkinAlpha: styleUniforms.uXRaySkinAlpha,
        uBoneMuted: styleUniforms.uBoneMuted,
        uHasActiveRoles: styleUniforms.uHasActiveRoles,
        uHasSelection: styleUniforms.uHasSelection,
        uPulseTime: styleUniforms.uPulseTime,
        uDarkMode: styleUniforms.uDarkMode,
        uVeilMode: { value: 0 },
        uUninvolved: { value: 0 },
        uIsFacialMuscle: { value: kind === 'muscle' && HEAD_FACIAL_MUSCLE_IDS.has(id) ? 1 : 0 },
        uRoleInvolved: { value: 0 },
        uSelected: { value: 0 },
        uSelectSide: { value: 0 },
        uSelectCustom: { value: 0 },
        uSelectColor: { value: new THREE.Color('#CFA058') },
        uAtlasCenter: { value: atlasBasis.center },
        uAtlasAxis: { value: atlasBasis.axis },
        uAtlasSpan: { value: atlasBasis.span },
        uAtlasMeta: { value: atlasBasis.meta },
      };
      mat.onBeforeCompile = (shader) => {
        injectPose(shader, rigRole);
        Object.assign(shader.uniforms, matUniforms);
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vAtlasPos;\nvarying vec3 vAtlasAxisView;\nuniform vec3 uAtlasAxis;',
          )
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvAtlasPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;\nvAtlasAxisView = normalize( normalMatrix * vec3( position.x < 0.0 ? -uAtlasAxis.x : uAtlasAxis.x, uAtlasAxis.y, uAtlasAxis.z ) );',
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vAtlasPos;\nvarying vec3 vAtlasAxisView;\nuniform float uIllust;\nuniform vec3 uIllustLight;\nuniform float uXRay;\nuniform float uXRaySkinAlpha;\nuniform float uBoneMuted;\nuniform float uHasActiveRoles;\nuniform float uHasSelection;\nuniform float uPulseTime;\nuniform float uDarkMode;\nuniform float uVeilMode;\nuniform float uUninvolved;\nuniform float uIsFacialMuscle;\nuniform float uRoleInvolved;\nuniform float uSelected;\nuniform float uSelectSide;\nuniform float uSelectCustom;\nuniform vec3 uSelectColor;\nuniform vec3 uAtlasCenter;\nuniform vec3 uAtlasAxis;\nuniform vec2 uAtlasSpan;\nuniform vec2 uAtlasMeta;',
          )
          .replace('#include <opaque_fragment>', `${ILLUST_FRAG}\n#include <opaque_fragment>`);
      };
      mat.customProgramCacheKey = () => 'av-base-atlas-v19';
      obj.material = mat;
      obj.userData.matUniforms = matUniforms;
      if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      obj.userData.structureId = id;
      obj.userData.kind = kind;
      obj.userData.fasciaLayer = kind === 'muscle' ? inferDefaultFasciaLayer(id) : 'bone';
      obj.userData.rigRole = rigRole;
      obj.userData.atlasBasis = atlasBasis;
      obj.userData.baseColor = baseColor;
      obj.userData.atlasColor = atlasColor;
      obj.userData.illustColor = illustColor;
      obj.userData.hull = null;
      obj.userData.ghost = false;
      obj.userData.veilMode = 0;
      obj.castShadow = false;
      obj.receiveShadow = false;
      obj.frustumCulled = false;
      if (!meshesById.has(id)) meshesById.set(id, []);
      meshesById.get(id).push(obj);
      allMeshes.push(obj);
    }
  };
  register(muscleRoot, 'muscle');
  register(skeletonRoot, 'bone');
  if (!allMeshes.length) throw jaError('人体モデルの中身が空でした。');
  for (const [id, acc] of centerAccum) {
    const all = acc.cntBoth ? acc.sumBoth.clone().divideScalar(acc.cntBoth) : new THREE.Vector3();
    centerCache.set(`${id}|both`, all);
    centerCache.set(`${id}|L`, acc.cntL ? acc.sumL.clone().divideScalar(acc.cntL) : all.clone());
    centerCache.set(`${id}|R`, acc.cntR ? acc.sumR.clone().divideScalar(acc.cntR) : all.clone());
  }
  centerAccum.clear();
  const extremityVeilMeshes = [];
  const extremityVeilUniforms = {
    uIllustLight: headSculptUniforms.uIllustLight,
    uXRay: headSculptUniforms.uXRay,
    uDarkMode: headSculptUniforms.uDarkMode,
    uSkullThrough: headSculptUniforms.uSkullThrough,
    uDeepLayer: { value: 0 },
  };
  {
    const HAND_INCLUDE_RE =
      /carpal|scaphoid|lunate|triquetr|pisiform|trapez|capitate|hamate|metacarp|phalanx|thumb|finger|pollic|digit|indicis|interosse|lumbrical|thenar|hypothenar|carpi|palmar|radius|ulna|pronator-quadratus/i;
    const HAND_EXCLUDE_RE =
      /toe|halluc|metatars|tarsal|calcane|talus|navicular|cuboid|cuneiform|foot|plantar|tibia|fibula/i;
    const FOOT_INCLUDE_RE =
      /calcane|talus|navicular|cuboid|cuneiform|metatars|toe|sesamoid-bones-of-the-foot|halluc|plantar|digitorum-brevis|digitorum-longus|extensor-digitorum|lumbricals-foot|interossei|digiti-minimi.*foot|abductor-digiti-minimi-foot|fibularis|tibialis|soleus|tibia|fibula/i;
    const FOOT_EXCLUDE_RE =
      /hand|carpal|metacarp|pollic|finger|thumb|palmar|carpi|radius|ulna/i;
    const handMeshes = [];
    const footMeshes = [];
    for (const m of allMeshes) {
      const id = m.userData.structureId || m.name || '';
      if (!HAND_EXCLUDE_RE.test(id) && HAND_INCLUDE_RE.test(id)) handMeshes.push(m);
      if (!FOOT_EXCLUDE_RE.test(id) && FOOT_INCLUDE_RE.test(id)) footMeshes.push(m);
    }
    const cOffX = [0, 1, 0, 1, 0, 1, 0, 1];
    const cOffY = [0, 0, 1, 1, 0, 0, 1, 1];
    const cOffZ = [0, 0, 0, 0, 1, 1, 1, 1];
    const edgeA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
    const edgeB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
    const cornerVals = new Float32Array(8);
    const tmpExtV = new THREE.Vector3();
    const handChains = [
      ['scaphoid', 'trapezium', 'first-metacarpal-bone', 'thumb-proximal-phalanx', 'thumb-distal-phalanx'],
      ['capitate', 'second-metacarpal-bone', 'index-finger-proximal-phalanx', 'index-finger-middle-phalanx', 'index-finger-distal-phalanx'],
      ['capitate', 'third-metacarpal-bone', 'middle-finger-proximal-phalanx', 'middle-finger-middle-phalanx', 'middle-finger-distal-phalanx'],
      ['hamate', 'fourth-metacarpal-bone', 'ring-finger-proximal-phalanx', 'ring-finger-middle-phalanx', 'ring-finger-distal-phalanx'],
      ['hamate', 'fifth-metacarpal-bone', 'little-finger-proximal-phalanx', 'little-finger-middle-phalanx', 'little-finger-distal-phalanx'],
      ['second-metacarpal-bone', 'third-metacarpal-bone', 'fourth-metacarpal-bone', 'fifth-metacarpal-bone'],
    ];
    const footChains = [
      ['calcaneus', 'talus', 'navicular', 'medial-cuneiform', 'first-metatarsal-bone', 'big-toe-proximal-phalanx', 'big-toe-distal-phalanx'],
      ['navicular', 'intermediate-cuneiform', 'second-metatarsal-bone', 'second-toe-proximal-phalanx', 'second-toe-middle-phalanx', 'second-toe-distal-phalanx'],
      ['navicular', 'lateral-cuneiform', 'third-metatarsal-bone', 'third-toe-proximal-phalanx', 'third-toe-middle-phalanx', 'third-toe-distal-phalanx'],
      ['calcaneus', 'cuboid', 'fourth-metatarsal-bone', 'fourth-toe-proximal-phalanx', 'fourth-toe-middle-phalanx', 'fourth-toe-distal-phalanx'],
      ['cuboid', 'fifth-metatarsal-bone', 'little-toe-proximal-phalanx', 'little-toe-middle-phalanx', 'little-toe-distal-phalanx'],
      ['first-metatarsal-bone', 'second-metatarsal-bone', 'third-metatarsal-bone', 'fourth-metatarsal-bone', 'fifth-metatarsal-bone'],
    ];
    const buildSingleExtremityVeil = (isHand, isLeft, rigRole) => {
      const q = isHand ? 86 : 72;
      const bucketMap = new Map();
      const pts = []; // [x, y, z, radius, fingerChannel]
      const addSample = (wx, wy, wz, r, ch) => {
        const kx = Math.round(wx * q) + 2048;
        const ky = Math.round(wy * q) + 2048;
        const kz = Math.round(wz * q) + 2048;
        const key = kx + ky * 4096 + kz * 16777216;
        const prev = bucketMap.get(key);
        if (prev !== undefined) {
          if (r > pts[prev + 3]) pts[prev + 3] = r;
          if (pts[prev + 4] === 0 && ch !== 0) pts[prev + 4] = ch;
          return;
        }
        bucketMap.set(key, pts.length);
        pts.push(wx, wy, wz, r, ch);
      };
      const classifyFinger = (id, wy) => {
        if (!isHand) return 0;
        if (/thumb/i.test(id) || (/pollic/i.test(id) && wy < -0.14)) return 1;
        if (/index-finger|indicis/i.test(id)) return 2;
        if (/middle-finger/i.test(id)) return 3;
        if (/ring-finger/i.test(id)) return 4;
        if (/little-finger/i.test(id) || (/digiti-minimi/i.test(id) && wy < -0.28)) return 5;
        return 0;
      };
      const pointRadius = (wy, wz) => {
        if (isHand) {
          if (wy < -0.45) return 0.0112;
          if (wy < -0.32) return 0.0124;
          if (wy < -0.04) return 0.0168;
          return 0.0150;
        }
        if (wz > 0.32) return 0.0148;
        if (wy > -2.96) return 0.0162;
        return 0.0182;
      };
      const inRegion = (wx, wy) => {
        if (isHand) {
          return (isLeft ? wx > 0.55 : wx < -0.55) && Math.abs(wx) > 0.72 && wy < 0.14 && wy > -0.65;
        }
        return (isLeft ? wx > 0.05 : wx < -0.05) && wy < -2.72 && wy > -3.33;
      };
      const boneCentroids = new Map();
      const candidates = isHand ? handMeshes : footMeshes;
      for (const m of candidates) {
        const id = m.userData.structureId || m.name || '';
        const isBone = m.userData.kind === 'bone';
        if (isBone && (isLeft ? id.startsWith('right-') : id.startsWith('left-'))) continue;
        const pos = m.geometry?.attributes?.position;
        if (!pos || pos.count === 0) continue;
        const mw = m.matrixWorld;
        const vCount = pos.count;
        const step = vCount > 1800 ? Math.ceil(vCount / 1800) : 1;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let sc = 0;
        for (let i = 0; i < vCount; i += step) {
          tmpExtV.fromBufferAttribute(pos, i).applyMatrix4(mw);
          const wx = tmpExtV.x;
          const wy = tmpExtV.y;
          const wz = tmpExtV.z;
          if (!inRegion(wx, wy)) continue;
          addSample(wx, wy, wz, pointRadius(wy, wz), classifyFinger(id, wy));
          if (isBone) {
            sx += wx;
            sy += wy;
            sz += wz;
            sc++;
          }
        }
        if (isBone && sc > 0) {
          const clean = id.replace(/^(left|right)-/, '');
          boneCentroids.set(clean, [sx / sc, sy / sc, sz / sc, classifyFinger(id, sy / sc)]);
        }
      }
      for (const chain of isHand ? handChains : footChains) {
        for (let c = 0; c < chain.length - 1; c++) {
          const a = boneCentroids.get(chain[c]);
          const b = boneCentroids.get(chain[c + 1]);
          if (!a || !b) continue;
          const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
          const steps = Math.max(2, Math.ceil(dist / 0.010));
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const px = a[0] + (b[0] - a[0]) * u;
            const py = a[1] + (b[1] - a[1]) * u;
            const pz = a[2] + (b[2] - a[2]) * u;
            addSample(px, py, pz, pointRadius(py, pz) * 0.96, b[3] || a[3] || 0);
          }
        }
      }
      const nPts = pts.length / 5;
      if (nPts < 16) return null;
      let minX = Infinity;
      let minY = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < nPts; i++) {
        const x = pts[i * 5];
        const y = pts[i * 5 + 1];
        const z = pts[i * 5 + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      const pad = 0.030;
      minX -= pad;
      minY -= pad;
      minZ -= pad;
      maxX += pad;
      maxY += pad;
      maxZ += pad;
      const nx = isHand ? 40 : 34;
      const ny = isHand ? 48 : 34;
      const nz = isHand ? 28 : 48;
      const dx = (maxX - minX) / (nx - 1);
      const dy = (maxY - minY) / (ny - 1);
      const dz = (maxZ - minZ) / (nz - 1);
      const totalVoxels = nx * ny * nz;
      const sdf = new Float32Array(totalVoxels).fill(1.0);
      const ownerCh = new Uint8Array(totalVoxels);
      const kSmooth = isHand ? 0.0062 : 0.0105;
      for (let p = 0; p < nPts; p++) {
        const px = pts[p * 5];
        const py = pts[p * 5 + 1];
        const pz = pts[p * 5 + 2];
        const pr = pts[p * 5 + 3];
        const pch = pts[p * 5 + 4];
        const reach = pr + kSmooth + 0.013;
        const i0 = Math.max(0, Math.floor((px - reach - minX) / dx));
        const i1 = Math.min(nx - 1, Math.ceil((px + reach - minX) / dx));
        const j0 = Math.max(0, Math.floor((py - reach - minY) / dy));
        const j1 = Math.min(ny - 1, Math.ceil((py + reach - minY) / dy));
        const k0 = Math.max(0, Math.floor((pz - reach - minZ) / dz));
        const k1 = Math.min(nz - 1, Math.ceil((pz + reach - minZ) / dz));
        for (let k = k0; k <= k1; k++) {
          const gz = minZ + k * dz - pz;
          const gz2 = gz * gz;
          const kOff = k * nx * ny;
          for (let j = j0; j <= j1; j++) {
            const gy = minY + j * dy - py;
            const gyz2 = gz2 + gy * gy;
            const jkOff = kOff + j * nx;
            for (let i = i0; i <= i1; i++) {
              const gx = minX + i * dx - px;
              const d = Math.sqrt(gyz2 + gx * gx) - pr;
              const idxV = jkOff + i;
              const cur = sdf[idxV];
              if (d >= cur + kSmooth) continue;
              const curCh = ownerCh[idxV];
              if (cur > 0.5) {
                sdf[idxV] = d;
                ownerCh[idxV] = pch;
              } else if (pch === 0 || curCh === 0 || pch === curCh) {
                if (d < cur && pch !== 0) ownerCh[idxV] = pch;
                const h = Math.max(kSmooth - Math.abs(cur - d), 0) / kSmooth;
                sdf[idxV] = Math.min(cur, d) - h * h * kSmooth * 0.25;
              } else if (d < cur) {
                sdf[idxV] = Math.max(d, -0.5 * (cur + d) - 0.0015);
                ownerCh[idxV] = pch;
              } else {
                sdf[idxV] = Math.max(cur, -0.5 * (cur + d) - 0.0015);
              }
            }
          }
        }
      }
      const cellVertIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
      const outPos = [];
      const rawIdx = [];
      const vIdx = (i, j, k) => i + j * nx + k * nx * ny;
      const cIdx = (i, j, k) => i + j * (nx - 1) + k * (nx - 1) * (ny - 1);
      for (let k = 0; k < nz - 1; k++) {
        for (let j = 0; j < ny - 1; j++) {
          for (let i = 0; i < nx - 1; i++) {
            let mask = 0;
            for (let c = 0; c < 8; c++) {
              const val = sdf[vIdx(i + cOffX[c], j + cOffY[c], k + cOffZ[c])];
              cornerVals[c] = val;
              if (val < 0) mask |= 1 << c;
            }
            if (mask === 0 || mask === 255) continue;
            let sx = 0;
            let sy = 0;
            let sz = 0;
            let cnt = 0;
            for (let e = 0; e < 12; e++) {
              const a = edgeA[e];
              const b = edgeB[e];
              const va = cornerVals[a];
              const vb = cornerVals[b];
              if ((va < 0) !== (vb < 0)) {
                const t = va / (va - vb);
                sx += cOffX[a] + (cOffX[b] - cOffX[a]) * t;
                sy += cOffY[a] + (cOffY[b] - cOffY[a]) * t;
                sz += cOffZ[a] + (cOffZ[b] - cOffZ[a]) * t;
                cnt++;
              }
            }
            cellVertIdx[cIdx(i, j, k)] = outPos.length / 3;
            outPos.push(
              minX + (i + sx / cnt) * dx,
              minY + (j + sy / cnt) * dy,
              minZ + (k + sz / cnt) * dz,
            );
          }
        }
      }
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            const s0 = sdf[vIdx(i, j, k)];
            const sX = sdf[vIdx(i + 1, j, k)];
            if ((s0 < 0) !== (sX < 0)) {
              const c0 = cellVertIdx[cIdx(i, j - 1, k - 1)];
              const c1 = cellVertIdx[cIdx(i, j, k - 1)];
              const c2 = cellVertIdx[cIdx(i, j, k)];
              const c3 = cellVertIdx[cIdx(i, j - 1, k)];
              if (c0 >= 0 && c1 >= 0 && c2 >= 0 && c3 >= 0) {
                if (s0 < 0) rawIdx.push(c0, c1, c2, c0, c2, c3);
                else rawIdx.push(c0, c2, c1, c0, c3, c2);
              }
            }
            const sY = sdf[vIdx(i, j + 1, k)];
            if ((s0 < 0) !== (sY < 0)) {
              const c0 = cellVertIdx[cIdx(i - 1, j, k - 1)];
              const c1 = cellVertIdx[cIdx(i - 1, j, k)];
              const c2 = cellVertIdx[cIdx(i, j, k)];
              const c3 = cellVertIdx[cIdx(i, j, k - 1)];
              if (c0 >= 0 && c1 >= 0 && c2 >= 0 && c3 >= 0) {
                if (s0 < 0) rawIdx.push(c0, c1, c2, c0, c2, c3);
                else rawIdx.push(c0, c2, c1, c0, c3, c2);
              }
            }
            const sZ = sdf[vIdx(i, j, k + 1)];
            if ((s0 < 0) !== (sZ < 0)) {
              const c0 = cellVertIdx[cIdx(i - 1, j - 1, k)];
              const c1 = cellVertIdx[cIdx(i, j - 1, k)];
              const c2 = cellVertIdx[cIdx(i, j, k)];
              const c3 = cellVertIdx[cIdx(i - 1, j, k)];
              if (c0 >= 0 && c1 >= 0 && c2 >= 0 && c3 >= 0) {
                if (s0 < 0) rawIdx.push(c0, c1, c2, c0, c2, c3);
                else rawIdx.push(c0, c2, c1, c0, c3, c2);
              }
            }
          }
        }
      }
      const rawVCnt = outPos.length / 3;
      if (rawVCnt < 12 || rawIdx.length < 12) return null;
      const headEdge = new Int32Array(rawVCnt).fill(-1);
      const edgeTo = new Int32Array(rawIdx.length * 2);
      const edgeNext = new Int32Array(rawIdx.length * 2);
      let edgePtr = 0;
      const pushDirEdge = (u, w) => {
        edgeTo[edgePtr] = w;
        edgeNext[edgePtr] = headEdge[u];
        headEdge[u] = edgePtr++;
      };
      for (let t = 0; t < rawIdx.length; t += 3) {
        const a = rawIdx[t];
        const b = rawIdx[t + 1];
        const c = rawIdx[t + 2];
        pushDirEdge(a, b);
        pushDirEdge(b, a);
        pushDirEdge(b, c);
        pushDirEdge(c, b);
        pushDirEdge(c, a);
        pushDirEdge(a, c);
      }
      const compId = new Int32Array(rawVCnt).fill(-1);
      const bfsQueue = new Int32Array(rawVCnt);
      let bestComp = 0;
      let bestSize = 0;
      let curComp = 0;
      for (let i = 0; i < rawVCnt; i++) {
        if (compId[i] >= 0 || headEdge[i] < 0) continue;
        let qh = 0;
        let qt = 0;
        bfsQueue[qt++] = i;
        compId[i] = curComp;
        while (qh < qt) {
          const u = bfsQueue[qh++];
          for (let e = headEdge[u]; e >= 0; e = edgeNext[e]) {
            const w = edgeTo[e];
            if (compId[w] < 0) {
              compId[w] = curComp;
              bfsQueue[qt++] = w;
            }
          }
        }
        if (qt > bestSize) {
          bestSize = qt;
          bestComp = curComp;
        }
        curComp++;
      }
      const remap = new Int32Array(rawVCnt).fill(-1);
      const cleanPos = [];
      for (let i = 0; i < rawVCnt; i++) {
        if (compId[i] === bestComp) {
          remap[i] = cleanPos.length / 3;
          cleanPos.push(outPos[i * 3], outPos[i * 3 + 1], outPos[i * 3 + 2]);
        }
      }
      const outIdx = [];
      for (let t = 0; t < rawIdx.length; t += 3) {
        const a = remap[rawIdx[t]];
        const b = remap[rawIdx[t + 1]];
        const c = remap[rawIdx[t + 2]];
        if (a >= 0 && b >= 0 && c >= 0) outIdx.push(a, b, c);
      }
      let posArr = new Float32Array(cleanPos);
      const vCnt = posArr.length / 3;
      const sumArr = new Float32Array(vCnt * 3);
      const degArr = new Uint16Array(vCnt);
      const smoothPass = (lambda) => {
        sumArr.fill(0);
        degArr.fill(0);
        for (let t = 0; t < outIdx.length; t += 3) {
          const a = outIdx[t];
          const b = outIdx[t + 1];
          const c = outIdx[t + 2];
          sumArr[a * 3] += posArr[b * 3] + posArr[c * 3];
          sumArr[a * 3 + 1] += posArr[b * 3 + 1] + posArr[c * 3 + 1];
          sumArr[a * 3 + 2] += posArr[b * 3 + 2] + posArr[c * 3 + 2];
          degArr[a] += 2;
          sumArr[b * 3] += posArr[a * 3] + posArr[c * 3];
          sumArr[b * 3 + 1] += posArr[a * 3 + 1] + posArr[c * 3 + 1];
          sumArr[b * 3 + 2] += posArr[a * 3 + 2] + posArr[c * 3 + 2];
          degArr[b] += 2;
          sumArr[c * 3] += posArr[a * 3] + posArr[b * 3];
          sumArr[c * 3 + 1] += posArr[a * 3 + 1] + posArr[b * 3 + 1];
          sumArr[c * 3 + 2] += posArr[a * 3 + 2] + posArr[b * 3 + 2];
          degArr[c] += 2;
        }
        const nxt = new Float32Array(vCnt * 3);
        for (let i = 0; i < vCnt; i++) {
          const dCnt = degArr[i];
          if (dCnt > 0) {
            nxt[i * 3] = posArr[i * 3] + lambda * (sumArr[i * 3] / dCnt - posArr[i * 3]);
            nxt[i * 3 + 1] = posArr[i * 3 + 1] + lambda * (sumArr[i * 3 + 1] / dCnt - posArr[i * 3 + 1]);
            nxt[i * 3 + 2] = posArr[i * 3 + 2] + lambda * (sumArr[i * 3 + 2] / dCnt - posArr[i * 3 + 2]);
          } else {
            nxt[i * 3] = posArr[i * 3];
            nxt[i * 3 + 1] = posArr[i * 3 + 1];
            nxt[i * 3 + 2] = posArr[i * 3 + 2];
          }
        }
        posArr = nxt;
      };
      for (let it = 0; it < 3; it++) {
        smoothPass(0.50);
        smoothPass(-0.48);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setIndex(outIdx);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const isFootUniform = { value: isHand ? 0 : 1 };
      const extMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#DFC2B8'),
        transparent: true,
        depthWrite: false,
        alphaTest: 0.004,
        side: THREE.FrontSide,
        roughness: 0.56,
        metalness: 0.0,
        envMapIntensity: 0.22,
      });
      const label = `${isHand ? 'hand' : 'foot'}-${isLeft ? 'L' : 'R'}`;
      extMat.name = `sculpt:extremity-veil-${label}`;
      extMat.onBeforeCompile = (shader) => {
        injectPose(shader, rigRole);
        shader.uniforms.uIllustLight = extremityVeilUniforms.uIllustLight;
        shader.uniforms.uXRay = extremityVeilUniforms.uXRay;
        shader.uniforms.uDarkMode = extremityVeilUniforms.uDarkMode;
        shader.uniforms.uSkullThrough = extremityVeilUniforms.uSkullThrough;
        shader.uniforms.uDeepLayer = extremityVeilUniforms.uDeepLayer;
        shader.uniforms.uIsFootVeil = isFootUniform;
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
uniform float uXRay;
uniform float uSkullThrough;
uniform float uDeepLayer;
varying vec3 vExtWorldPos;`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vExtWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
            {
              float stE = clamp( max( max( uSkullThrough, uXRay ), uDeepLayer ), 0.0, 1.0 );
              transformed += normalize( normal ) * ( 0.0024 * ( 1.0 - stE ) - 0.0018 * stE );
            }`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
uniform vec3 uIllustLight;
uniform float uXRay;
uniform float uDarkMode;
uniform float uSkullThrough;
uniform float uDeepLayer;
uniform float uIsFootVeil;
varying vec3 vExtWorldPos;`,
          )
          .replace(
            '#include <opaque_fragment>',
            `{
              float wristFade = 1.0 - smoothstep( -0.005, 0.042, vExtWorldPos.y );
              float ankleFade = 1.0 - smoothstep( -2.985, -2.775, vExtWorldPos.y );
              float collarGate = mix( wristFade, ankleFade, step( 0.5, uIsFootVeil ) );
              if ( collarGate < 0.005 ) discard;
              float st = clamp( max( max( uSkullThrough, uXRay ), uDeepLayer ), 0.0, 1.0 );
              vec3 nE = normalize( normal );
              vec3 vE = normalize( vViewPosition );
              vec3 lKey = normalize( uIllustLight );
              vec3 lFill = normalize( vec3( 4.2, 1.2, 3.2 ) );
              float hlE = clamp( dot( nE, lKey ) * 0.5 + 0.5, 0.0, 1.0 );
              float fillE = max( dot( nE, lFill ), 0.0 );
              float diffE = clamp( pow( hlE, 1.18 ) * 0.80 + fillE * 0.20, 0.0, 1.0 );
              float facingE = clamp( abs( dot( nE, vE ) ), 0.0, 1.0 );
              float fresE = pow( 1.0 - facingE, 2.25 );
              float curvAO = 0.85 + 0.15 * pow( facingE, 0.46 );
              vec3 sepiaContour = vec3( 0.205, 0.145, 0.098 );
              vec3 peachShadow = diffuseColor.rgb * vec3( 0.72, 0.61, 0.55 );
              vec3 peachLit    = mix( diffuseColor.rgb * 1.03, vec3( 0.950, 0.895, 0.855 ), 0.16 );
              vec3 salonVeilCol = mix( peachShadow, peachLit, diffE ) * curvAO;
              float fresGate = smoothstep( 0.12, 0.68, collarGate );
              salonVeilCol = mix( salonVeilCol, sepiaContour, clamp( fresE * 0.44 * fresGate, 0.0, 0.56 ) );
              float baseVeilA = mix( 0.91, 0.95, smoothstep( 0.0, 1.0, 1.0 - facingE ) );
              float normalA = clamp( baseVeilA + fresE * 0.04 * fresGate, 0.0, 0.96 ) * collarGate;
              vec3 linenFill = mix(
                mix( vec3( 0.82, 0.77, 0.69 ), vec3( 0.91, 0.87, 0.80 ), 0.45 + 0.55 * facingE ),
                mix( vec3( 0.24, 0.34, 0.50 ), vec3( 0.38, 0.50, 0.68 ), 0.45 + 0.55 * facingE ),
                uDarkMode
              );
              vec3 rimVeilCol = mix( sepiaContour, vec3( 0.66, 0.78, 0.92 ), uDarkMode );
              vec3 linenGhostCol = mix( linenFill, rimVeilCol, clamp( fresE * 0.76, 0.0, 0.82 ) );
              float throughA = ( 0.048 + 0.155 * fresE ) * collarGate;
              outgoingLight = mix( salonVeilCol, linenGhostCol, st );
              diffuseColor.a = mix( normalA, throughA, st );
            }
            #include <opaque_fragment>`,
          );
      };
      extMat.customProgramCacheKey = () => `av-extremity-veil-${label}-v2`;
      const veilMesh = new THREE.Mesh(geo, extMat);
      veilMesh.name = `extremity-veil-${label}`;
      veilMesh.raycast = () => {}; // タップ判定を透過し、指先・母指球・足底などの筋肉・骨タップを妨げない
      veilMesh.castShadow = false;
      veilMesh.receiveShadow = false;
      veilMesh.frustumCulled = false;
      veilMesh.renderOrder = 4;
      veilMesh.userData.isExtremityVeil = true;
      root.add(veilMesh);
      extremityVeilMeshes.push(veilMesh);
      return veilMesh;
    };
    const handRigL =
      meshesById.get('left-third-metacarpal-bone')?.[0]?.userData?.rigRole ||
      getRigRole('left-third-metacarpal-bone', 'bone');
    const handRigR =
      meshesById.get('right-third-metacarpal-bone')?.[0]?.userData?.rigRole ||
      getRigRole('right-third-metacarpal-bone', 'bone');
    const footRigL = new THREE.Vector4(1.0, 1.5, 0.0, 0.0);
    const footRigR = new THREE.Vector4(1.0, 1.5, 0.0, 0.0);
    buildSingleExtremityVeil(true, true, handRigL);
    buildSingleExtremityVeil(true, false, handRigR);
    buildSingleExtremityVeil(false, true, footRigL);
    buildSingleExtremityVeil(false, false, footRigR);
  }
  const layer = { muscle: 'on', bone: 'on' };
  const hidden = new Set();
  /** ghostOthers で「残す」ID 集合（null = ゴーストなし） */
  let keep = null;
  /** ライン・クセ・連鎖に関係する筋肉 ID 集合（空でない時はそれ以外の筋肉を94%無彩色ダークスレート化） */
  const activeRoleIds = new Set();
  /** id -> THREE.Color | null（null = ローズクリムゾンで発光） */
  const highlights = new Map();
  let highlightSide = 'both'; // 'L' | 'R' | 'both'
  let style = 'real';
  let xrayMode = false;
  let xrayTarget = 0;
  let xraySkinOpacity = 0.16;
  /** 一体型アプリの表示レイヤー（'muscle' = 3D立体筋肉 / 'fascia' = 白い骨格＋極薄サロン輪郭ヴェール＋11本3D筋膜シート） */
  let unifiedLayerMode = 'muscle';
  /** data.js の MUSCLE_LAYERS ({ [id]: 'surface' | 'deep' }) を保持 */
  const customMuscleLayers = new Map();
  /** 'see-through'（重ね透視：初期デフォルト） | 'surface'（表層のみ） | 'deep'（深層のみ） */
  let fasciaLayerMode = 'see-through';
  /** 現在アクティブな深層筋 ID 集合（'see-through' モード時の自動コラーゲンベール透視トリガー） */
  const activeDeepSet = new Set();
  const resolveMuscleLayer = (id) => customMuscleLayers.get(id) || inferDefaultFasciaLayer(id);
  const applyState = () => {
    const illust = style === 'illust';
    const isUnifiedFascia = unifiedLayerMode === 'fascia';
    const hasSel = highlights.size > 0 ? 1 : 0;
    const hasActiveRoles = activeRoleIds.size > 0;
    styleUniforms.uHasSelection.value = isUnifiedFascia ? 0 : hasSel;
    styleUniforms.uHasActiveRoles.value = !isUnifiedFascia && hasActiveRoles ? 1 : 0;
    styleUniforms.uBoneMuted.value = 0;
    const selSideVal = highlightSide === 'L' ? 1 : highlightSide === 'R' ? -1 : 0;
    const hasActiveDeep = activeDeepSet.size > 0;
    const shouldSeeSkullThrough =
      isUnifiedFascia ||
      hasActiveRoles ||
      keep !== null ||
      hasSel > 0 ||
      xrayMode ||
      fasciaLayerMode === 'deep' ||
      layer.muscle === 'ghost';
    headSculptUniforms.uSkullThrough.value = shouldSeeSkullThrough ? 1 : 0;
    extremityVeilUniforms.uDeepLayer.value = isUnifiedFascia || fasciaLayerMode === 'deep' ? 1 : 0;
    if (headSculptLoaded) {
      for (const hm of headSculptMeshes) {
        if (hm.userData.isHeadVeil) {
          hm.visible = layer.muscle !== 'off';
        } else {
          hm.visible = layer.muscle !== 'off' && !shouldSeeSkullThrough;
        }
      }
    }
    for (const em of extremityVeilMeshes) {
      em.visible = layer.muscle !== 'off';
    }
    for (const mesh of allMeshes) {
      const { structureId: id, kind, matUniforms } = mesh.userData;
      const baseColor = illust ? mesh.userData.illustColor : mesh.userData.atlasColor;
      const mode = layer[kind];
      const mLayer = kind === 'muscle' ? (mesh.userData.fasciaLayer || resolveMuscleLayer(id)) : 'bone';
      if (isUnifiedFascia) {
        if (kind === 'bone') {
          mesh.visible = true;
          mesh.userData.ghost = false;
          mesh.userData.veilMode = 0;
          if (matUniforms) {
            matUniforms.uVeilMode.value = 0;
            matUniforms.uUninvolved.value = 0;
            matUniforms.uRoleInvolved.value = 0;
            matUniforms.uSelected.value = 0;
            matUniforms.uSelectSide.value = 0;
            matUniforms.uSelectCustom.value = 0;
          }
          if (mesh.userData.hull) mesh.userData.hull.visible = false;
          const mat = mesh.material;
          if (mat.transparent) {
            mat.transparent = false;
            mat.needsUpdate = true;
          }
          mat.opacity = 1;
          mat.depthWrite = true;
          mesh.renderOrder = 0;
          mat.color.copy(baseColor);
          mat.emissive.setRGB(0, 0, 0);
          mat.emissiveIntensity = 0;
        } else {
          const showBodySilhouette =
            mode !== 'off' &&
            !hidden.has(id) &&
            mLayer === 'surface' &&
            !HEAD_FACIAL_MUSCLE_IDS.has(id);
          mesh.visible = showBodySilhouette;
          mesh.userData.ghost = true;
          mesh.userData.veilMode = 3;
          if (matUniforms) {
            matUniforms.uVeilMode.value = 3;
            matUniforms.uUninvolved.value = 1;
            matUniforms.uRoleInvolved.value = 0;
            matUniforms.uSelected.value = 0;
            matUniforms.uSelectSide.value = 0;
            matUniforms.uSelectCustom.value = 0;
          }
          if (mesh.userData.hull) mesh.userData.hull.visible = false;
          const mat = mesh.material;
          if (!mat.transparent) {
            mat.transparent = true;
            mat.needsUpdate = true;
          }
          mat.opacity = 0.10;
          mat.depthWrite = false;
          mesh.renderOrder = 1;
          mat.color.copy(baseColor).lerp(GHOST_TONE, 0.55);
          mat.emissive.setRGB(0, 0, 0);
          mat.emissiveIntensity = 0;
        }
        continue;
      }
      const hideByFasciaMode = kind === 'muscle' && fasciaLayerMode === 'surface' && mLayer === 'deep';
      const hideSkullBehindSculpt = headSculptLoaded && !shouldSeeSkullThrough && CRANIAL_FACIAL_BONE_IDS.has(id);
      const isHighlightedOrActiveRole =
        highlights.has(id) ||
        activeRoleIds.has(id) ||
        (keep !== null && keep.has(id));
      const hideIdleFacialStrip =
        kind === 'muscle' &&
        (headSculptLoaded
          ? !isHighlightedOrActiveRole &&
            !(fasciaLayerMode === 'deep' && mLayer === 'deep') &&
            HEAD_FACIAL_MUSCLE_IDS.has(id)
          : !isHighlightedOrActiveRole && IDLE_HIDDEN_FACIAL_STRIP_IDS.has(id));
      mesh.visible =
        kind === 'bone'
          ? !hideSkullBehindSculpt
          : mode !== 'off' &&
            !hidden.has(id) &&
            !hideByFasciaMode &&
            !hideIdleFacialStrip;
      const isHighlighted = highlights.has(id);
      const customCol = isHighlighted ? highlights.get(id) : null;
      const isRoleInvolved = kind === 'muscle' && (hasActiveRoles ? activeRoleIds.has(id) : (keep !== null ? keep.has(id) : false));
      const isUninvolvedMuscle =
        kind === 'muscle' &&
        !isHighlighted &&
        (hasActiveRoles ? !activeRoleIds.has(id) : (keep !== null ? !keep.has(id) : false));
      const xrayMuscleGhost = xrayMode && kind === 'muscle' && !isHighlighted;
      let ghost = false;
      let veilMode = 0; // 0: 通常ゴースト, 1: 重ね透視コラーゲンベール, 2: 深層モード極薄ガラス輪郭シルエット
      const uninvolvedOrNonSelected =
        isUninvolvedMuscle || (hasSel > 0 && !isHighlighted && !isRoleInvolved);
      if (kind === 'muscle') {
        if (fasciaLayerMode === 'deep') {
          if (mLayer === 'surface') {
            ghost = true;
            veilMode = 2;
          } else {
            ghost = !isHighlighted && (mode === 'ghost' || uninvolvedOrNonSelected || xrayMuscleGhost);
            veilMode = 0;
          }
        } else if (fasciaLayerMode === 'surface') {
          ghost = !isHighlighted && (mode === 'ghost' || uninvolvedOrNonSelected || xrayMuscleGhost);
          veilMode = 0;
        } else {
          if (hasActiveDeep && mLayer === 'surface') {
            ghost = true;
            veilMode = 1;
          } else if (hasActiveDeep && mLayer === 'deep' && activeDeepSet.has(id)) {
            ghost = !isHighlighted && (mode === 'ghost' || xrayMuscleGhost);
            veilMode = 0;
          } else {
            ghost = !isHighlighted && (mode === 'ghost' || uninvolvedOrNonSelected || xrayMuscleGhost);
            veilMode = 0;
          }
        }
      } else {
        ghost = false;
        veilMode = 0;
      }
      if (matUniforms) {
        matUniforms.uVeilMode.value = veilMode;
        matUniforms.uUninvolved.value = isUninvolvedMuscle ? 1 : 0;
        matUniforms.uRoleInvolved.value = isRoleInvolved ? 1 : 0;
        matUniforms.uSelected.value = isHighlighted && !ghost ? 1 : 0;
        matUniforms.uSelectSide.value = isHighlighted ? selSideVal : 0;
        matUniforms.uSelectCustom.value = customCol ? 1 : 0;
        if (customCol) matUniforms.uSelectColor.value.copy(customCol);
      }
      mesh.userData.ghost = ghost;
      mesh.userData.veilMode = veilMode;
      if (illust) {
        const hull = ensureHull(mesh);
        hull.visible = !ghost;
      } else if (mesh.userData.hull) {
        mesh.userData.hull.visible = false;
      }
      const mat = mesh.material;
      if (mat.transparent !== ghost) {
        mat.transparent = ghost;
        mat.needsUpdate = true;
      }
      if (ghost) {
        if (xrayMode && kind === 'muscle') {
          mat.opacity = xraySkinOpacity;
        } else if (veilMode === 2) {
          mat.opacity = 0.06;
        } else if (veilMode === 1) {
          mat.opacity = 0.18;
        } else {
          mat.opacity = GHOST_OPACITY[kind];
        }
      } else {
        mat.opacity = 1;
      }
      mat.depthWrite = !ghost;
      mesh.renderOrder = ghost ? (veilMode === 1 ? 2 : 1) : 0;
      if (ghost) {
        if (xrayMode) {
          mat.color.copy(baseColor).lerp(XRAY_GHOST_TONE, 0.68);
        } else if (veilMode === 2) {
          mat.color.copy(baseColor).lerp(DEEP_SILHOUETTE_TONE, 0.72);
        } else if (veilMode === 1) {
          mat.color.copy(baseColor).lerp(VEIL_TONE, 0.38);
        } else {
          mat.color.copy(baseColor).lerp(GHOST_TONE, 0.45);
        }
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      } else if (isHighlighted) {
        mat.color.copy(baseColor);
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      } else if (xrayMode && kind === 'bone') {
        mat.color.copy(baseColor).lerp(XRAY_GHOST_TONE, 0.28);
        mat.emissive.copy(XRAY_BONE_EMISSIVE);
        mat.emissiveIntensity = 0.20;
      } else {
        mat.color.copy(baseColor);
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
    }
  };
  applyState();
  const v = new THREE.Vector3();
  /**
   * 構造のジオメトリ頂点（ワールド座標）の重心を返す。
   * side: 'L' = x>0（身体の左）, 'R' = x<0（身体の右）, 'both' = 全体。
   * 該当側に頂点がない場合は全体の重心にフォールバック。未知の ID は null。
   */
  const getCenter = (id, side = 'both') => {
    const s = side === 'L' || side === 'R' ? side : 'both';
    const cacheKey = `${id}|${s}`;
    if (centerCache.has(cacheKey)) return centerCache.get(cacheKey).clone();
    const list = meshesById.get(id);
    if (!list || !list.length) return null;
    const sum = { L: new THREE.Vector3(), R: new THREE.Vector3(), both: new THREE.Vector3() };
    const cnt = { L: 0, R: 0, both: 0 };
    for (const mesh of list) {
      mesh.updateWorldMatrix(true, false);
      const pos = mesh.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 450));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        sum.both.add(v);
        cnt.both++;
        if (v.x > 0) {
          sum.L.add(v);
          cnt.L++;
        } else if (v.x < 0) {
          sum.R.add(v);
          cnt.R++;
        }
      }
    }
    const all = cnt.both ? sum.both.clone().divideScalar(cnt.both) : new THREE.Vector3();
    centerCache.set(`${id}|both`, all);
    centerCache.set(`${id}|L`, cnt.L ? sum.L.divideScalar(cnt.L) : all.clone());
    centerCache.set(`${id}|R`, cnt.R ? sum.R.divideScalar(cnt.R) : all.clone());
    return centerCache.get(cacheKey).clone();
  };
  let tween = null; // { t, fromTarget, toTarget, fromDir, rot, fromDist, toDist }
  const qTmp = new THREE.Quaternion();
  const qIdentity = new THREE.Quaternion();
  const stopDamping = () => {
    controls._sphericalDelta?.set?.(0, 0, 0);
    controls._panOffset?.set?.(0, 0, 0);
    if (typeof controls._scale === 'number') controls._scale = 1;
  };
  const flyTo = (target, dir, dist, immediate = false) => {
    const d = dir.clone().normalize();
    const clampedDist = THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance);
    stopDamping();
    if (immediate) {
      tween = null;
      controls.target.copy(target);
      camera.position.copy(target).addScaledVector(d, clampedDist);
      camera.lookAt(target);
      controls.update();
      return;
    }
    const offset = camera.position.clone().sub(controls.target);
    const fromDist = Math.max(offset.length(), 1e-4);
    const fromDir = offset.divideScalar(fromDist);
    const fromTheta = Math.atan2(fromDir.x, fromDir.z);
    const toTheta = Math.atan2(d.x, d.z);
    let dTheta = Math.atan2(Math.sin(toTheta - fromTheta), Math.cos(toTheta - fromTheta));
    if (Math.abs(Math.abs(dTheta) - Math.PI) < 1e-3) {
      dTheta = Math.PI;
    }
    const fromPhi = Math.acos(THREE.MathUtils.clamp(fromDir.y, -0.999, 0.999));
    const toPhi = Math.acos(THREE.MathUtils.clamp(d.y, -0.999, 0.999));
    tween = {
      t: 0,
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      fromTheta,
      dTheta,
      fromPhi,
      toPhi,
      fromDist,
      toDist: clampedDist,
    };
  };
  const stepTween = (delta) => {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + delta / TWEEN_SEC);
    const k = easeInOutCubic(tween.t);
    const theta = tween.fromTheta + tween.dTheta * k;
    const phi = THREE.MathUtils.lerp(tween.fromPhi, tween.toPhi, k);
    const sinPhi = Math.sin(phi);
    const dir = v.set(sinPhi * Math.sin(theta), Math.cos(phi), sinPhi * Math.cos(theta));
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    const dist = THREE.MathUtils.lerp(tween.fromDist, tween.toDist, k);
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.lookAt(controls.target);
    if (tween.t >= 1) tween = null;
  };
  /** 半径 r の球が画面に収まる距離（縦長画面も考慮） */
  const fitDistance = (halfH, halfW) => {
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const tanV = Math.tan(vHalf);
    const tanH = tanV * camera.aspect;
    return Math.max(halfH / tanV, halfW / tanH);
  };
  let cachedUiEl = null;
  let cachedToastEl = null;
  let cachedScModalEl = null;
  let cachedRailEl = null;
  let cachedLegendEl = null;
  let cachedToastH = 0;
  let cachedScModalH = 0;
  let cachedLegendBottom = TOP_UI_CLEAR_PX;
  let observedToastEl = null;
  let observedScModalEl = null;
  let observedLegendEl = null;
  const uiBoxObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const boxH =
              entry.borderBoxSize?.[0]?.blockSize ??
              entry.contentRect?.height ??
              0;
            if (entry.target === cachedToastEl) cachedToastH = Math.round(boxH);
            else if (entry.target === cachedScModalEl) cachedScModalH = Math.round(boxH);
            else if (entry.target === cachedLegendEl) {
              cachedLegendBottom = Math.round(cachedLegendEl.getBoundingClientRect().bottom);
            }
          }
        })
      : null;
  const ensureUiBoxObserved = () => {
    if (!cachedUiEl) cachedUiEl = document.getElementById('ui-root');
    if (!cachedUiEl) return;
    if (!cachedToastEl) cachedToastEl = cachedUiEl.querySelector('.toast');
    if (!cachedScModalEl) cachedScModalEl = cachedUiEl.querySelector('.selfcare-modal');
    if (!cachedRailEl) cachedRailEl = cachedUiEl.querySelector('.rail');
    if (!cachedLegendEl) cachedLegendEl = cachedUiEl.querySelector('.legend');
    if (cachedToastEl && observedToastEl !== cachedToastEl) {
      observedToastEl = cachedToastEl;
      uiBoxObserver?.observe(cachedToastEl);
    }
    if (cachedScModalEl && observedScModalEl !== cachedScModalEl) {
      observedScModalEl = cachedScModalEl;
      uiBoxObserver?.observe(cachedScModalEl);
    }
    if (cachedLegendEl && observedLegendEl !== cachedLegendEl) {
      observedLegendEl = cachedLegendEl;
      cachedLegendBottom = Math.round(cachedLegendEl.getBoundingClientRect().bottom);
      uiBoxObserver?.observe(cachedLegendEl);
    }
  };
  const readTopUiClearPx = () => 0;
  const readRightRailClearPx = () => 0;
  const readSheetVis = () => 0;
  let smoothSheetVis = 0;
  let lastOffsetX = 0;
  let lastOffsetY = 0;
  let lastViewW = 0;
  let lastViewH = 0;
  let isHomeFullBodyFraming = true;
  let homeZoomSettling = false;
  const homeZoomDirTmp = new THREE.Vector3();
  const clearViewportFrac = (_fallbackVis = 0, _exactVis = false) => 0.87;
  const clearHorizFrac = () => 0.90;
  const fitClearDistance = (halfH, halfW, fallbackVis = 0, exactVis = false) => {
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const tanV = Math.tan(vHalf);
    const tanH = tanV * camera.aspect;
    const effTanV = tanV * clearViewportFrac(fallbackVis, exactVis);
    const effTanH = tanH * clearHorizFrac();
    return Math.max(halfH / Math.max(effTanV, 0.08), halfW / Math.max(effTanH, 0.06));
  };
  const syncCameraViewOffset = (force = false) => {
    const { w, h } = size();
    if (!w || !h) return;
    if (force || lastOffsetX !== 0 || lastOffsetY !== 0 || camera.view?.enabled) {
      camera.clearViewOffset();
      lastOffsetX = 0;
      lastOffsetY = 0;
      lastViewW = w;
      lastViewH = h;
    }
  };
  const homeTarget = () => new THREE.Vector3(BODY_CENTER.x, BODY_CENTER.y, BODY_CENTER.z);
  const homeDistance = () =>
    fitClearDistance(BODY_HALF_HEIGHT * 1.09, BODY_HALF_WIDTH * 1.14, 0, true) + 0.32;
  const stepSheetViewOffset = (delta) => {
    syncCameraViewOffset(false);
    if (isHomeFullBodyFraming && !tween && !xrayMode) {
      const neededDist = homeDistance();
      homeZoomDirTmp.copy(camera.position).sub(controls.target);
      const curDist = homeZoomDirTmp.length();
      if (curDist > 1e-4) {
        const diff = neededDist - curDist;
        if (Math.abs(diff) >= 0.05) homeZoomSettling = true;
        if (homeZoomSettling) {
          const zAlpha = delta > 0 ? 1 - Math.exp(-delta * 12) : 1;
          const nextDist = Math.abs(diff) < 0.004 ? neededDist : curDist + diff * zAlpha;
          if (Math.abs(neededDist - nextDist) < 0.004) homeZoomSettling = false;
          homeZoomDirTmp.multiplyScalar(nextDist / curDist);
          camera.position.copy(controls.target).add(homeZoomDirTmp);
        }
      }
    } else {
      homeZoomSettling = false;
    }
  };
  let currentView = 'front';
  let lastNotifiedView = 'front';
  const viewChangeCbs = [];
  const detectCameraView = () => {
    const dx = camera.position.x - controls.target.x;
    const dz = camera.position.z - controls.target.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    if (Math.abs(nx) >= 0.94 && Math.abs(nz) <= 0.34) return 'side';
    return Math.abs(nz) >= Math.abs(nx) ? (nz >= 0 ? 'front' : 'back') : (nx >= 0 ? 'left' : 'right');
  };
  const checkViewChange = (forcedView) => {
    const rawView = forcedView && VIEW_DIRS[forcedView] ? forcedView : detectCameraView();
    const nextView = VIEW_BADGE_MAP[rawView] || rawView;
    currentView = nextView;
    if (nextView === lastNotifiedView) return;
    lastNotifiedView = nextView;
    for (const cb of viewChangeCbs) {
      try {
        cb(nextView);
      } catch (err) {
        console.error('[viewer] onViewChange コールバックでエラー', err);
      }
    }
  };
  syncCameraViewOffset(true);
  flyTo(homeTarget(), VIEW_DIRS.front, homeDistance(), true);
  controls.addEventListener('start', () => {
    tween = null; // ユーザー操作が入ったら補間を中断
    isHomeFullBodyFraming = false;
    homeZoomSettling = false;
  });
  const pickCbs = [];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const activePointers = new Map();
  let tapCandidate = null; // { id, x, y, time }
  const pickRestA = new THREE.Vector3();
  const pickRestB = new THREE.Vector3();
  const pickRestC = new THREE.Vector3();
  const pickHitTmp = new THREE.Vector3();
  const pickBestPt = new THREE.Vector3();
  const pickBoxTmp = new THREE.Box3();
  const pickCornerTmp = new THREE.Vector3();
  /** 指定候補メッシュ群に対して姿勢変形後の三角形交差判定を実行し、最近傍ヒットを返す */
  const raycastDeformedCandidates = (ray, candidates) => {
    if (!candidates.length) return null;
    let bestMesh = null;
    let bestSide = 'both';
    let bestDistSq = Infinity;
    for (const mesh of candidates) {
      const geo = mesh.geometry;
      const pos = geo?.attributes?.position;
      if (!pos) continue;
      const rigRole = mesh.userData.rigRole;
      mesh.updateWorldMatrix(true, false);
      const mw = mesh.matrixWorld;
      if (geo.boundingBox) {
        pickBoxTmp.makeEmpty();
        const { min, max } = geo.boundingBox;
        for (let ix = 0; ix < 2; ix++) {
          for (let iy = 0; iy < 2; iy++) {
            for (let iz = 0; iz < 2; iz++) {
              pickCornerTmp
                .set(ix ? max.x : min.x, iy ? max.y : min.y, iz ? max.z : min.z)
                .applyMatrix4(mw);
              pickBoxTmp.expandByPoint(deformPoint(pickCornerTmp, rigRole, false));
            }
          }
        }
        pickBoxTmp.expandByScalar(0.05);
        if (!ray.intersectsBox(pickBoxTmp)) continue;
      }
      const idxAttr = geo.index;
      const triCount = idxAttr ? idxAttr.count / 3 : pos.count / 3;
      for (let t = 0; t < triCount; t++) {
        const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
        const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
        pickRestA.fromBufferAttribute(pos, i0).applyMatrix4(mw);
        pickRestB.fromBufferAttribute(pos, i1).applyMatrix4(mw);
        pickRestC.fromBufferAttribute(pos, i2).applyMatrix4(mw);
        const defA = deformPoint(pickRestA, rigRole, false);
        const defB = deformPoint(pickRestB, rigRole, false);
        const defC = deformPoint(pickRestC, rigRole, false);
        const hit = ray.intersectTriangle(defA, defB, defC, false, pickHitTmp);
        if (hit) {
          const dSq = ray.origin.distanceToSquared(pickHitTmp);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestMesh = mesh;
            const avgRestX = (pickRestA.x + pickRestB.x + pickRestC.x) / 3;
            bestSide = Math.abs(avgRestX) < 0.015 ? 'both' : avgRestX >= 0 ? 'L' : 'R';
            pickBestPt.copy(pickHitTmp);
          }
        }
      }
    }
    if (bestMesh) {
      return {
        id: bestMesh.userData.structureId,
        kind: bestMesh.userData.kind,
        fasciaLayer: bestMesh.userData.fasciaLayer,
        side: bestSide,
        point: pickBestPt.clone(),
        distSq: bestDistSq,
      };
    }
    const hits = raycaster.intersectObjects(candidates, false);
    if (!hits.length) return null;
    const hit0 = hits[0];
    const side0 = Math.abs(hit0.point.x) < 0.015 ? 'both' : hit0.point.x >= 0 ? 'L' : 'R';
    return {
      id: hit0.object.userData.structureId,
      kind: hit0.object.userData.kind,
      fasciaLayer: hit0.object.userData.fasciaLayer,
      side: side0,
      point: hit0.point.clone(),
      distSq: hit0.distance * hit0.distance,
    };
  };
  /**
   * 姿勢変形と2層レイヤーモード（'see-through' | 'surface' | 'deep'）に完全対応した高精度レイピッキング。
   * - 'deep' モード: 表層（surface）筋を完全にスキップし、奥の深層（deep）筋に直接ヒットさせる
   * - 'surface' モード: 表層（surface）筋のみをタップ対象にする
   * - 'see-through' モード: 深層コンテキスト中は透けて見えている奥の深層筋へ優先ヒットし、深層筋のない箇所では表層筋も自然にタップ可能
   */
  const pickAt = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray;
    if (unifiedLayerMode === 'fascia') {
      const fasciaPickCandidates = allMeshes.filter(
        (m) => m.userData.kind === 'muscle' && !hidden.has(m.userData.structureId),
      );
      const hit = raycastDeformedCandidates(ray, fasciaPickCandidates);
      if (hit) return { id: hit.id, side: hit.side, point: hit.point };
      const boneCandidates = allMeshes.filter((m) => m.visible && m.userData.kind === 'bone');
      const boneHit = raycastDeformedCandidates(ray, boneCandidates);
      return boneHit ? { id: boneHit.id, side: boneHit.side, point: boneHit.point } : null;
    }
    if (fasciaLayerMode === 'deep') {
      const deepCandidates = allMeshes.filter(
        (m) =>
          (m.visible && !m.userData.ghost && (m.userData.kind !== 'muscle' || m.userData.fasciaLayer === 'deep')) ||
          (headSculptLoaded &&
            !xrayMode &&
            layer.muscle === 'on' &&
            m.userData.kind === 'muscle' &&
            m.userData.fasciaLayer === 'deep' &&
            !hidden.has(m.userData.structureId) &&
            HEAD_FACIAL_MUSCLE_IDS.has(m.userData.structureId)),
      );
      const hit = raycastDeformedCandidates(ray, deepCandidates);
      return hit ? { id: hit.id, side: hit.side, point: hit.point } : null;
    }
    if (fasciaLayerMode === 'surface') {
      const solidSurface = allMeshes.filter(
        (m) =>
          m.visible &&
          !m.userData.ghost &&
          (m.userData.kind !== 'muscle' || m.userData.fasciaLayer === 'surface'),
      );
      const primary = raycastDeformedCandidates(ray, solidSurface);
      if (headSculptLoaded && !xrayMode && layer.muscle === 'on') {
        const surfHeadMuscles = allMeshes.filter(
          (m) =>
            m.userData.kind === 'muscle' &&
            m.userData.fasciaLayer === 'surface' &&
            !hidden.has(m.userData.structureId) &&
            HEAD_FACIAL_MUSCLE_IDS.has(m.userData.structureId),
        );
        const headHit = raycastDeformedCandidates(ray, surfHeadMuscles);
        if (headHit && (!primary || primary.kind === 'bone' || headHit.distSq <= primary.distSq + 1e-3)) {
          return { id: headHit.id, side: headHit.side, point: headHit.point };
        }
      }
      if (primary && primary.kind === 'muscle') {
        return { id: primary.id, side: primary.side, point: primary.point };
      }
      if (keep !== null && !xrayMode && layer.muscle === 'on') {
        const ghostedSurfaceMuscles = allMeshes.filter(
          (m) =>
            m.visible &&
            m.userData.ghost &&
            m.userData.kind === 'muscle' &&
            m.userData.fasciaLayer === 'surface',
        );
        const surfHit = raycastDeformedCandidates(ray, ghostedSurfaceMuscles);
        if (surfHit && (!primary || surfHit.distSq <= primary.distSq + 1e-4)) {
          return { id: surfHit.id, side: surfHit.side, point: surfHit.point };
        }
      }
      return primary ? { id: primary.id, side: primary.side, point: primary.point } : null;
    }
    const solidCandidates = allMeshes.filter((m) => m.visible && !m.userData.ghost);
    const primary = raycastDeformedCandidates(ray, solidCandidates);
    if (headSculptLoaded && !xrayMode && layer.muscle === 'on') {
      const headMuscleMeshes = allMeshes.filter(
        (m) =>
          m.userData.kind === 'muscle' &&
          !hidden.has(m.userData.structureId) &&
          HEAD_FACIAL_MUSCLE_IDS.has(m.userData.structureId),
      );
      const headHit = raycastDeformedCandidates(ray, headMuscleMeshes);
      if (headHit && (!primary || primary.kind === 'bone' || headHit.distSq <= primary.distSq + 1e-3)) {
        return { id: headHit.id, side: headHit.side, point: headHit.point };
      }
    }
    if (primary && primary.kind === 'muscle') {
      return { id: primary.id, side: primary.side, point: primary.point };
    }
    if ((activeDeepSet.size > 0 || keep !== null) && !xrayMode && layer.muscle === 'on') {
      const veilMuscles = allMeshes.filter(
        (m) => m.visible && m.userData.ghost && m.userData.kind === 'muscle',
      );
      const veilHit = raycastDeformedCandidates(ray, veilMuscles);
      if (veilHit && (!primary || veilHit.distSq <= primary.distSq + 1e-4)) {
        return { id: veilHit.id, side: veilHit.side, point: veilHit.point };
      }
    }
    return primary ? { id: primary.id, side: primary.side, point: primary.point } : null;
  };
  canvas.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1 && e.button === 0) {
      tapCandidate = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now(), moved: false };
    } else {
      tapCandidate = null; // 2本指（ピンチ）や右クリックはタップにしない
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (tapCandidate && tapCandidate.pointerId === e.pointerId) {
      if (Math.hypot(e.clientX - tapCandidate.x, e.clientY - tapCandidate.y) > TAP_MOVE_PX) tapCandidate.moved = true;
    }
  });
  const endPointer = (e, cancelled) => {
    activePointers.delete(e.pointerId);
    const tc = tapCandidate;
    if (!tc || tc.pointerId !== e.pointerId) return;
    tapCandidate = null;
    if (cancelled || tc.moved) return;
    if (Math.hypot(e.clientX - tc.x, e.clientY - tc.y) > TAP_MOVE_PX) return;
    if (performance.now() - tc.time > TAP_MAX_MS) return;
    const picked = pickAt(e.clientX, e.clientY);
    if (!picked || !picked.id) return;
    for (const cb of pickCbs) {
      try {
        cb(picked.id, picked);
      } catch (err) {
        console.error('[viewer] onPick コールバックでエラー', err);
      }
    }
  };
  canvas.addEventListener('pointerup', (e) => endPointer(e, false));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') activePointers.delete(e.pointerId);
  });
  const resize = (entry = null) => {
    refreshCachedStageSize(entry);
    const { w, h } = size();
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.65 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    smoothSheetVis = readSheetVis();
    syncCameraViewOffset(true);
    camera.updateProjectionMatrix();
  };
  const stageResizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => resize(entries?.[0] || null))
      : null;
  stageResizeObserver?.observe(container);
  const onWinResize = () => resize(null);
  const onOrientationChange = () => setTimeout(() => resize(null), 200);
  window.addEventListener('resize', onWinResize);
  window.addEventListener('orientationchange', onOrientationChange);
  resize(null);
  const frameCbs = [];
  const clock = new THREE.Clock();
  let elapsed = 0;
  let contextLost = false;
  let isStageVisible = true;
  let lastActivityMs = performance.now();
  let lastRenderedMs = 0;
  let keepAwakePredicate = null;
  let wasExternalBusy = false;
  const lastCamPos = camera.position.clone();
  const lastCamTarget = controls.target.clone();
  const wakeRenderLoop = () => {
    const now = performance.now();
    if (now - lastActivityMs >= IDLE_TIMEOUT_MS) {
      clock.getDelta(); // 省電力待機中の経過時間を破棄して復帰初フレームのジャンプを防ぐ
    }
    lastActivityMs = now;
    lastRenderedMs = 0; // 待ち時間0msで即座に次フレームから60fpsフルアニメーションへ復帰
  };
  const stageIntersectionObserver =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries?.[0];
            if (!entry) return;
            const visibleNow = Boolean(entry.isIntersecting && entry.intersectionRatio > 0);
            if (visibleNow && !isStageVisible) {
              clock.getDelta();
              wakeRenderLoop();
            }
            isStageVisible = visibleNow;
          },
          { threshold: 0 },
        )
      : null;
  stageIntersectionObserver?.observe(container);
  const WAKE_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'keydown', 'input', 'click'];
  for (const ev of WAKE_EVENTS) {
    window.addEventListener(ev, wakeRenderLoop, { capture: true, passive: true });
  }
  controls.addEventListener('start', wakeRenderLoop);
  controls.addEventListener('change', wakeRenderLoop);
  const onVisibilityChange = () => {
    if (!document.hidden) {
      clock.getDelta(); // 非表示中の経過時間を破棄して復帰ジャンプを防ぐ
      wakeRenderLoop();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  const renderTick = () => {
    if (document.hidden || contextLost) return;
    const externalBusy = typeof keepAwakePredicate === 'function' ? Boolean(keepAwakePredicate()) : false;
    if (!isStageVisible && !externalBusy) return;
    const nowMs = performance.now();
    ensureUiBoxObserved();
    const xraySettling = Math.abs(styleUniforms.uXRay.value - xrayTarget) > 1e-3;
    const scModalOpen = Boolean(cachedScModalEl && !cachedScModalEl.hidden);
    const busyNow = externalBusy || scModalOpen;
    const camMoved =
      camera.position.distanceToSquared(lastCamPos) > 1e-7 ||
      controls.target.distanceToSquared(lastCamTarget) > 1e-7;
    if (tween !== null || xraySettling || camMoved || (busyNow && !wasExternalBusy)) {
      lastActivityMs = nowMs;
    }
    wasExternalBusy = busyNow;
    if (!busyNow && nowMs - lastActivityMs >= IDLE_TIMEOUT_MS) {
      if (nowMs - lastRenderedMs < IDLE_FRAME_INTERVAL_MS) {
        return;
      }
    }
    lastRenderedMs = nowMs;
    const delta = Math.min(clock.getDelta(), 0.1); // タブ復帰・省電力間引き時の大ジャンプを抑える
    elapsed += delta;
    styleUniforms.uPulseTime.value = elapsed;
    if (Math.abs(styleUniforms.uXRay.value - xrayTarget) > 1e-4) {
      const kX = Math.min(1, delta * 7.5);
      styleUniforms.uXRay.value += (xrayTarget - styleUniforms.uXRay.value) * kX;
      if (Math.abs(styleUniforms.uXRay.value - xrayTarget) <= 1e-3) {
        styleUniforms.uXRay.value = xrayTarget;
      }
    }
    stepSheetViewOffset(delta);
    stepTween(delta);
    controls.update();
    lastCamPos.copy(camera.position);
    lastCamTarget.copy(controls.target);
    if (!tween) checkViewChange();
    for (const cb of frameCbs) {
      try {
        cb(elapsed, delta);
      } catch (err) {
        console.error('[viewer] onFrame コールバックでエラー', err);
      }
    }
    renderer.render(scene, camera);
  };
  const onContextLost = (e) => {
    e.preventDefault();
    contextLost = true;
    renderer.setAnimationLoop(null);
    console.warn('[viewer] WebGL context lost — 描画ループを一時停止し自動復旧を待機します');
  };
  const onContextRestored = () => {
    console.info('[viewer] WebGL context restored — 3Dシーンを自動復旧します');
    contextLost = false;
    clock.getDelta();
    buildEnvTexture();
    applyState();
    resize(null);
    wakeRenderLoop();
    renderer.setAnimationLoop(renderTick);
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);
  renderer.setAnimationLoop(renderTick);
  report(100, '準備ができました');
  const idsToSet = (ids) => new Set((ids || []).filter((id) => meshesById.has(id)));
  /** 指定 ID 群のワールド AABB（左右 side 指定と目標姿勢変形後の頂点座標を厳密に考慮） */
  const cornerTmp = new THREE.Vector3();
  const boundsOf = (ids, side = 'both') => {
    const wantSide = side === 'L' || side === 'R' ? side : 'both';
    const box = new THREE.Box3();
    const fallbackBox = new THREE.Box3();
    for (const id of ids) {
      for (const mesh of meshesById.get(id) || []) {
        const rigRole = mesh.userData.rigRole;
        mesh.updateWorldMatrix(true, false);
        const pos = mesh.geometry?.attributes?.position;
        if (pos && pos.count > 0) {
          const step = Math.max(1, Math.floor(pos.count / 360));
          for (let i = 0; i < pos.count; i += step) {
            cornerTmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            const restX = cornerTmp.x;
            const targetPt = deformPoint(cornerTmp, rigRole, true);
            fallbackBox.expandByPoint(targetPt);
            const sideMatch =
              wantSide === 'both' ||
              (wantSide === 'L' && restX >= -0.02) ||
              (wantSide === 'R' && restX <= 0.02);
            if (sideMatch) {
              box.expandByPoint(targetPt);
            }
          }
        }
      }
    }
    return box.isEmpty() ? fallbackBox : box;
  };
  const api = {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    /** @returns {THREE.Mesh[]} */
    getMeshes: (id) => meshesById.get(id) || [],
    getCenter,
    getDeformedCenter: (id, side) => {
      const c = getCenter(id, side);
      const rigRole = meshesById.get(id)?.[0]?.userData.rigRole;
      return c ? deformPoint(c, rigRole, true) : null;
    },
    allIds: () => [...meshesById.keys()],
    /** 構造の日本語情報（nameJa, groupJa, color, kind） */
    info: (id) => info.get(id) || null,
    kindOf: (id) => info.get(id)?.kind || meshesById.get(id)?.[0]?.userData.kind || null,
    showAttachmentPins: () => false,
    focusAttachmentPole: () => false,
    clearAttachmentPins: () => {},
    showPins: () => false,
    clearPins: () => {},
    activePinId: () => null,
    /**
     * data.js の MUSCLE_LAYERS ({ [id]: 'surface' | 'deep' }) を設定し全筋メッシュへ反映する
     * @param {Record<string, 'surface'|'deep'> | Map<string, 'surface'|'deep'>} layerObj
     */
    setMuscleLayers(layerObj) {
      wakeRenderLoop();
      customMuscleLayers.clear();
      if (layerObj instanceof Map) {
        for (const [id, lv] of layerObj.entries()) {
          if (lv === 'surface' || lv === 'deep') customMuscleLayers.set(id, lv);
        }
      } else if (layerObj && typeof layerObj === 'object') {
        for (const [id, lv] of Object.entries(layerObj)) {
          if (lv === 'surface' || lv === 'deep') customMuscleLayers.set(id, lv);
        }
      }
      for (const mesh of allMeshes) {
        if (mesh.userData.kind === 'muscle') {
          mesh.userData.fasciaLayer = resolveMuscleLayer(mesh.userData.structureId);
        }
      }
      applyState();
    },
    getMuscleLayer: (id) => resolveMuscleLayer(id),
    /**
     * アナトミートレイン2層（表層 / 深層）シースルー＆切り替えモードを設定
     * @param {'see-through'|'surface'|'deep'} mode
     * @param {{ immediate?: boolean }} [opts]
     */
    setFasciaLayerMode(mode, _opts = {}) {
      if (mode !== 'see-through' && mode !== 'surface' && mode !== 'deep') return;
      wakeRenderLoop();
      fasciaLayerMode = mode;
      applyState();
    },
    getFasciaLayerMode: () => fasciaLayerMode,
    /**
     * 現在アクティブな深層筋 ID 配列/Set を通知する（'see-through' モード時の自動コラーゲンベール透視トリガー）
     * @param {Iterable<string>|null|undefined} deepIds
     */
    setActiveDeepContext(deepIds) {
      wakeRenderLoop();
      activeDeepSet.clear();
      if (deepIds) {
        for (const id of deepIds) {
          if (meshesById.has(id) && resolveMuscleLayer(id) === 'deep') {
            activeDeepSet.add(id);
          }
        }
      }
      applyState();
    },
    /** 表示スタイル（'illust' = 医学イラスト調 / 'real' = 写実的） */
    setStyle(mode) {
      if (mode !== 'illust' && mode !== 'real') return;
      wakeRenderLoop();
      style = mode;
      styleUniforms.uIllust.value = style === 'illust' ? 1 : 0;
      applyState();
    },
    getStyle: () => style,
    /**
     * レントゲン透視（X-Ray Fluoroscope）モードの切り替え
     * @param {boolean} enabled true=レントゲン透視ON / false=通常表示へ滑らかに戻す
     * @param {{ skinOpacity?: number, immediate?: boolean }} [opts]
     */
    setXRayMode(enabled, opts = {}) {
      wakeRenderLoop();
      xrayMode = Boolean(enabled);
      xrayTarget = xrayMode ? 1 : 0;
      if (Number.isFinite(opts?.skinOpacity)) {
        xraySkinOpacity = THREE.MathUtils.clamp(Number(opts.skinOpacity), 0.02, 0.6);
      } else {
        xraySkinOpacity = 0.16;
      }
      styleUniforms.uXRaySkinAlpha.value = xraySkinOpacity;
      if (opts?.immediate) {
        styleUniforms.uXRay.value = xrayTarget;
      }
      applyState();
    },
    isXRayMode: () => xrayMode,
    /** レイヤー（筋/骨）の表示モード（骨格は消去不可とし常時白い骨格 'on' に固定） */
    setLayer(kind, mode) {
      if (!(kind in layer)) return;
      if (kind === 'bone') {
        layer.bone = 'on';
        styleUniforms.uBoneMuted.value = 0;
        wakeRenderLoop();
        applyState();
        return 'on';
      }
      const valid = ['on', 'ghost', 'off'];
      if (!valid.includes(mode)) return;
      wakeRenderLoop();
      layer[kind] = mode;
      styleUniforms.uBoneMuted.value = 0;
      applyState();
      return layer[kind];
    },
    getLayer: (kind) => layer[kind],
    getBoneLayerMode: () => layer.bone,
    syncUiClearanceNow() {
      ensureUiBoxObserved();
      if (cachedToastEl && !cachedToastEl.hidden) {
        cachedToastH = Math.round(cachedToastEl.getBoundingClientRect().height);
      }
      if (cachedScModalEl && !cachedScModalEl.hidden) {
        cachedScModalH = Math.round(cachedScModalEl.getBoundingClientRect().height);
      }
      if (cachedLegendEl && !cachedLegendEl.hidden) {
        cachedLegendBottom = Math.round(cachedLegendEl.getBoundingClientRect().bottom);
      }
      smoothSheetVis = readSheetVis();
      syncCameraViewOffset(true);
      wakeRenderLoop();
    },
    /**
     * ライン・クセ・連鎖に関係する筋肉 ID 配列を設定する。
     * 1つ以上ある間は関係のない筋肉を 94% マットな無彩色ダークスレートへ退避させ、空配列で元のサーモンピンクに戻す。
     * @param {Iterable<string>|null|undefined} ids
     */
    setActiveRoleIds(ids = []) {
      wakeRenderLoop();
      activeRoleIds.clear();
      if (ids) {
        for (const id of ids) {
          if (meshesById.has(id)) activeRoleIds.add(id);
        }
      }
      applyState();
    },
    /**
     * 指定 ID を発光させる。ids が空なら発光を全解除。
     * color 省略時はローズクリムゾン（#E11D48）で発光。
     */
    highlight(ids, color = '#CFA058', opts = {}) {
      wakeRenderLoop();
      highlights.clear();
      highlightSide = opts?.side === 'L' || opts?.side === 'R' ? opts.side : 'both';
      const c = color ? new THREE.Color(color) : new THREE.Color('#CFA058');
      for (const id of idsToSet(ids)) highlights.set(id, c);
      applyState();
    },
    /** 指定 ID 以外を半透明（ゴースト）にする。空配列・null で解除。 */
    ghostOthers(ids) {
      wakeRenderLoop();
      const set = idsToSet(ids);
      keep = set.size ? set : null; // 有効な ID が1つもなければ全身ゴーストにはしない
      applyState();
    },
    /**
     * 見た目（ゴースト・役割スレート退避・発光・深層透視コンテキスト）を初期化し、カメラを全身正面へ戻す。
     * @param {{ camera?: boolean }} [opts] camera:false でカメラは動かさない
     */
    resetLook({ camera: moveCamera = true } = {}) {
      wakeRenderLoop();
      keep = null;
      activeRoleIds.clear();
      highlights.clear();
      activeDeepSet.clear();
      xrayMode = false;
      xrayTarget = 0;
      applyState();
      if (moveCamera) {
        isHomeFullBodyFraming = true;
        homeZoomSettling = false;
        flyTo(homeTarget(), VIEW_DIRS.front, homeDistance());
        checkViewChange('front');
      }
    },
    home() {
      wakeRenderLoop();
      isHomeFullBodyFraming = true;
      homeZoomSettling = false;
      flyTo(homeTarget(), VIEW_DIRS.front, homeDistance());
      checkViewChange('front');
    },
    hide(ids) {
      const list = Array.isArray(ids) ? ids : [ids];
      let changed = false;
      for (const id of list) {
        const meshes = meshesById.get(id);
        if (!meshes || !meshes.length) continue;
        if (meshes[0].userData?.kind === 'bone') continue;
        hidden.add(id);
        changed = true;
      }
      if (!changed) return;
      wakeRenderLoop();
      applyState();
    },
    unhide(ids) {
      wakeRenderLoop();
      const list = Array.isArray(ids) ? ids : typeof ids === 'string' && ids ? [ids] : [];
      for (const id of list) hidden.delete(id);
      applyState();
      return [...hidden];
    },
    showAll() {
      wakeRenderLoop();
      hidden.clear();
      activeRoleIds.clear();
      applyState();
    },
    isHidden: (id) => hidden.has(id),
    hiddenIds: () => [...hidden],
    /**
     * 今の視点から見えている一番外側の筋肉を一層はがす（「はがす」ボタン用）。
     * 画面全体にレイを格子状に飛ばし、最初に当たった筋肉をまとめて非表示にする。
     * @returns {string[]} 非表示にした ID
     */
    peel() {
      wakeRenderLoop();
      let targets = allMeshes.filter((m) => m.visible && !m.userData.ghost && m.userData.kind === 'muscle');
      if (!targets.length) {
        targets = allMeshes.filter((m) => m.visible && m.userData.kind === 'muscle');
      }
      if (!targets.length) return [];
      const cols = camera.aspect < 1 ? 14 : 24;
      const rows = camera.aspect < 1 ? 26 : 16;
      const found = new Set();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ndc.set(((c + 0.5) / cols) * 2 - 1, ((r + 0.5) / rows) * 2 - 1);
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObjects(targets, false)[0];
          if (hit) found.add(hit.object.userData.structureId);
        }
      }
      for (const id of found) hidden.add(id);
      applyState();
      return [...found];
    },
    /** 一体型アプリの表示レイヤー（'fascia' | 'muscle'）を瞬時に切り替え（カメラ・ポーズ不変） */
    setUnifiedLayerMode(mode) {
      if (mode !== 'fascia' && mode !== 'muscle') return unifiedLayerMode;
      if (unifiedLayerMode === mode) return unifiedLayerMode;
      wakeRenderLoop();
      unifiedLayerMode = mode;
      applyState();
      return unifiedLayerMode;
    },
    getUnifiedLayerMode: () => unifiedLayerMode,
    /** ライト（#F6F2EA）⇄ ダーク（#0B132B）3D背景＆シェーダー連動 */
    setDarkTheme(dark) {
      const next = Boolean(dark);
      isDarkTheme = next;
      styleUniforms.uDarkMode.value = next ? 1 : 0;
      renderer.setClearColor(next ? 0x0b132b : 0xf6f2ea, 1);
      wakeRenderLoop();
      return isDarkTheme;
    },
    getDarkTheme: () => isDarkTheme,
    /** 統合3D筋膜シート生成用に解析済みGLBルートを返す（追加通信 0 byte） */
    getRoots: () => ({ muscleRoot, skeletonRoot }),
    /**
     * 指定構造が画面に収まるようスムーズに寄る。
     * @param {string[]} ids 空なら全身
     * @param {{ view?: 'front'|'back'|'left'|'right', inspectorOpen?: boolean, selfCareModal?: boolean }} [opts] 寄るときの向き（省略時は現在の向き）
     */
    focus(ids, opts = {}) {
      wakeRenderLoop();
      const dir = opts.view && VIEW_DIRS[opts.view]
        ? VIEW_DIRS[opts.view]
        : camera.position.clone().sub(controls.target).normalize();
      if (opts.view && VIEW_DIRS[opts.view]) checkViewChange(opts.view);
      else checkViewChange();
      const valid = [...idsToSet(ids)];
      if (!valid.length) {
        isHomeFullBodyFraming = true;
        homeZoomSettling = false;
        flyTo(homeTarget(), dir, homeDistance());
        return;
      }
      isHomeFullBodyFraming = false;
      homeZoomSettling = false;
      const side = opts.side === 'L' || opts.side === 'R' ? opts.side : 'both';
      const box = boundsOf(valid, side);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      if (!opts.inspectorOpen && !opts.selfCareModal && box.max.y > 2.45 && sz.y < 2.25) {
        const crownPt = deformPoint(
          new THREE.Vector3(0, 3.34, 0.04),
          getRigRole('frontal-bone', 'bone'),
          true,
        );
        if (crownPt.y > 2.25) {
          const wantTop = crownPt.y + 0.04;
          if (wantTop > box.max.y) box.max.y = wantTop;
          box.getCenter(center);
          box.getSize(sz);
        }
      }
      const hDirLen = Math.hypot(dir.x, dir.z) || 1;
      const horiz = (sz.x * Math.abs(dir.z) + sz.z * Math.abs(dir.x)) / hDirLen;
      const depthSpan = (sz.x * Math.abs(dir.x) + sz.z * Math.abs(dir.z)) / hDirLen;
      const minFloorH = opts.closeSelfCare ? 0.36 : opts.inspectorOpen ? 0.50 : 0.56;
      const minFloorW = opts.closeSelfCare ? 0.32 : opts.inspectorOpen ? 0.42 : 0.48;
      const halfH = Math.max(sz.y * 0.5, minFloorH);
      const halfW = Math.max(horiz * 0.5, minFloorW);
      const padMul = opts.selfCareModal ? 1.24 : opts.inspectorOpen ? 1.28 : 1.28;
      const rawDist =
        fitClearDistance(halfH * padMul, halfW * (padMul + 0.06), 0, true) +
        depthSpan * 0.45;
      const minDist = opts.closeSelfCare
        ? 2.65
        : opts.selfCareModal
          ? Math.max(3.8, homeDistance() * 0.44)
          : 2.65;
      const dist = THREE.MathUtils.clamp(rawDist, minDist, homeDistance() * 1.12);
      flyTo(center, dir, dist);
    },
    /** 視点切り替え（注視点・距離は保ったまま向きだけスムーズに回す。opts.immediate=true で即時反映、opts.resetFraming=true で全身中央に戻す） */
    view(name, opts = {}) {
      wakeRenderLoop();
      const dir = VIEW_DIRS[name];
      if (!dir) return;
      if (opts && opts.resetFraming) {
        isHomeFullBodyFraming = true;
        homeZoomSettling = false;
      }
      const baseTarget =
        opts && opts.resetFraming
          ? homeTarget()
          : tween
            ? tween.toTarget.clone()
            : controls.target.clone();
      if (baseTarget.distanceTo(BODY_CENTER) < 0.25) {
        isHomeFullBodyFraming = true;
        homeZoomSettling = false;
      }
      let dist = isHomeFullBodyFraming
        ? homeDistance()
        : tween
          ? tween.toDist
          : camera.position.distanceTo(controls.target);
      if (name === 'side' && !isHomeFullBodyFraming) {
        dist = Math.max(dist, 6.8);
      }
      flyTo(baseTarget, dir, dist, Boolean(opts && opts.immediate));
      checkViewChange(name);
    },
    setView(name) {
      api.view(name);
    },
    currentView: () => currentView,
    /** cb(viewName) — カメラの主方向（'front'|'back'|'left'|'right'）が変化したとき */
    onViewChange(cb) {
      if (typeof cb === 'function') viewChangeCbs.push(cb);
      return () => {
        const i = viewChangeCbs.indexOf(cb);
        if (i >= 0) viewChangeCbs.splice(i, 1);
      };
    },
    /** cb(id) — ドラッグでない短いタップで、ゴーストでない可視 Mesh に当たったとき */
    onPick(cb) {
      if (typeof cb === 'function') pickCbs.push(cb);
      return () => {
        const i = pickCbs.indexOf(cb);
        if (i >= 0) pickCbs.splice(i, 1);
      };
    },
    /** cb(time, delta) — 毎フレーム（秒単位） */
    onFrame(cb) {
      if (typeof cb === 'function') frameCbs.push(cb);
      return () => {
        const i = frameCbs.indexOf(cb);
        if (i >= 0) frameCbs.splice(i, 1);
      };
    },
    /** セルフケア器具やX線スキャン中など、60fps を維持すべき外部アニメーション条件を登録 */
    setKeepAwakePredicate(fn) {
      keepAwakePredicate = typeof fn === 'function' ? fn : null;
    },
    wake: wakeRenderLoop,
    dispose() {
      renderer.setAnimationLoop(null);
      for (const ev of WAKE_EVENTS) {
        window.removeEventListener(ev, wakeRenderLoop, { capture: true });
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      canvas.removeEventListener('webglcontextlost', onContextLost, false);
      canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
      stageResizeObserver?.disconnect();
      stageIntersectionObserver?.disconnect();
      uiBoxObserver?.disconnect();
      controls.dispose();
      envTex?.dispose?.();
      for (const m of allMeshes) {
        m.geometry.dispose();
        m.material.dispose();
        m.userData.hull?.material?.dispose?.();
      }
      for (const hm of headSculptMeshes) {
        hm.geometry.dispose();
        hm.material.dispose();
      }
      for (const em of extremityVeilMeshes) {
        em.geometry.dispose();
        em.material.dispose();
      }
      renderer.dispose();
      canvas.remove();
    },
  };
  return api;
}