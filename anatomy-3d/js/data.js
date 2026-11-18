// =============================================================
// data.js — 筋膜ライン 3D のデータ定義（解剖学・労働衛生バイオメカニクス担当）
// 出典: Thomas W. Myers "Anatomy Trains"（3rd/4th ed.）の各ライン走行に準拠。
// 筋 ID はすべて models/atlas_metadata.json の muscles[].id に実在するもののみ。
// 表示用フィールドは日本語のみ（英語はコメントに限る）。
// 座標の左右: side 'R' = 本人の右側（-X）, 'L' = 本人の左側（+X）。
// =============================================================

// -------------------------------------------------------------
// pose ヘルパー（v1.1）: 未指定のキーは 0（まっすぐ立位）で埋める。
// trunkFlex/headForward/shoulderIn/armsFold/sit: 0..1
// pelvisTilt: +後傾 / -前傾、trunkRotate: +左へねじれ、sideBend: +左へ傾く、hipShift: +骨盤が左へ
// -------------------------------------------------------------
function P(o = {}) {
  return {
    trunkFlex: 0, headForward: 0, shoulderIn: 0, pelvisTilt: 0,
    trunkRotate: 0, sideBend: 0, hipShift: 0, armsFold: 0, sit: 0,
    ...o,
  };
}

// -------------------------------------------------------------
// CATEGORIES — 3大カテゴリー定義（仕事・日常・スポーツ）
// -------------------------------------------------------------
export const CATEGORIES = [
  {
    id: 'work',
    name: '仕事・職業',
    short: '仕事',
    sub: 'デスクワーク・美容師・整体介護・現場運転・接客',
    groups: ['デスクワーク', '美容師・理容師', '整体師・介護・看護', '土木・建築・運転', '立ち仕事・料理・接客'],
  },
  {
    id: 'daily',
    name: '日常動作・家事',
    short: '日常・家事',
    sub: '家事・育児抱っこ・座り方・立ち方・睡眠・カバン',
    groups: ['家事・育児', '姿勢・睡眠・カバン'],
  },
  {
    id: 'sports',
    name: 'スポーツ・運動',
    short: 'スポーツ',
    sub: 'ゴルフ・テニス野球・ラン・筋トレ・ヨガ水泳',
    groups: ['ゴルフ・球技・ラケット', 'ランニング・サッカー・自転車', '筋トレ・ヨガ・水泳'],
  },
];

// -------------------------------------------------------------
// BODY_PARTS — 気になる痛み・違和感の部位辞書（5部位）
// -------------------------------------------------------------
export const BODY_PARTS = [
  { id: 'neck-jaw', label: '首・頭・あご', keywords: ['首', 'ストレートネック', 'あご', '顎', '食いしばり', '頭の重さ', '目の疲れ', '顔たるみ'] },
  { id: 'shoulder-arm', label: '肩・腕・手', keywords: ['肩の重さ', '腕が上がりづらい', '巻き肩', '腕', '肘', '手首', '親指', '手首の張り'] },
  { id: 'chest-back', label: '胸・背中・呼吸', keywords: ['背中', '肩甲骨', '猫背', '胸', '呼吸', '息が浅い', 'みぞおち'] },
  { id: 'waist-pelvis', label: '腰・骨盤・お尻', keywords: ['腰の重さ', '急な腰の張り', '反り腰', '骨盤', 'お尻の上', 'お尻'] },
  { id: 'hip-leg', label: '股関節・ひざ・足', keywords: ['股関節', '太もも', 'もも裏', 'ひざ', '膝', 'ふくらはぎ', 'すね', '足裏', 'むくみ'] },
];

// -------------------------------------------------------------
// TRIGGER_LINES — 全12本のトリガーライン（筋膜の連続ライン）＆トリガーポイント（点）マスター
// Single Source of Truth: ここを1箇所直せば全45動作の selfCare 等に自動反映される。
// fasciaChain は骨の駅をまたいで引き合う筋膜の隣接順（旧参照互換用エイリアス arrowPath も保持）。
// -------------------------------------------------------------
export const TRIGGER_LINES = [
  {
    id: 'TL-01',
    code: 'TL-01',
    goldenId: 'GL-01',
    name: '親指〜力こぶ〜胸の奥トリガーライン',
    shortName: '親指〜胸の奥',
    lineId: 'DFAL',
    cameraView: 'front',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '', // ← 撮影後にYouTube URLを貼る欄
    youtubeTitle: '【肩の重だるさ】親指〜力こぶ〜鎖骨の下トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '肩甲骨のあいだ・首のうしろ',
    causalSummary: '手作業やスマホで親指〜胸の奥が縮んでねじれ固定するため、綱引きに負けた背中や肩がずっと引っ張られています',
    quickCheck: '反対の手で「鎖骨の下のくぼみ」を軽く押さえて胸側へ寄せたまま肩を回すと、スッと軽く回るのを体感できます',
    safetyNote: '',
    point: 'つらい肩を強く揉まずに「①親指のふくらみ ➔ ②力こぶ ➔ ③鎖骨の下（胸の奥）」の順にゆるめると、前側の引っ張りが和らいで肩甲骨がスッと元の位置に戻りやすくなります。',
    pulledMuscles: ['rhomboid-major', 'trapezius', 'infraspinatus'],
    fasciaChain: ['abductor-pollicis-brevis', 'brachioradialis', 'biceps-brachii', 'pectoralis-minor', 'rhomboid-major'],
    arrowPath: ['abductor-pollicis-brevis', 'brachioradialis', 'biceps-brachii', 'pectoralis-minor', 'rhomboid-major'],
    shortenCore: ['pectoralis-minor', 'abductor-pollicis-brevis'],
    shortenLinked: ['biceps-brachii', 'brachioradialis', 'coracobrachialis'],
    lengthenAntagonist: ['rhomboid-major', 'infraspinatus', 'trapezius'],
    lengthenLinked: ['rhomboid-minor', 'levator-scapulae'],
    stationBridges: [
      { from: 'abductor-pollicis-brevis', to: 'brachioradialis', stationJa: '手首の親指側の骨', crossSide: false },
      { from: 'brachioradialis', to: 'biceps-brachii', stationJa: '肘の前〜親指側の骨', crossSide: false },
      { from: 'biceps-brachii', to: 'pectoralis-minor', stationJa: '鎖骨の下の奥（烏口突起）', crossSide: false },
      { from: 'pectoralis-minor', to: 'rhomboid-major', stationJa: '肩甲骨の内側の縁（スイッチ）', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'abductor-pollicis-brevis',
        label: '① 母指球',
        easyLabel: '① 親指のふくらみ',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'glide',
        strokeTarget: 'brachioradialis',
        durationSec: 30,
        step: '① 親指のふくらみを反対の親指で押さえたまま、手首をゆっくり反らしたり曲げたりする',
      },
      {
        id: 'biceps-brachii',
        label: '② 力こぶ',
        easyLabel: '② 力こぶ（腕の前）',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'pectoralis-minor',
        durationSec: 30,
        step: '② テーブルに置いたローラーに力こぶを乗せてゆっくり転がす',
      },
      {
        id: 'pectoralis-minor',
        label: '③ 小胸筋',
        easyLabel: '③ 鎖骨の下（胸の奥）',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'stroke',
        strokeTarget: 'rhomboid-major',
        durationSec: 30,
        step: '③ 4本の指の腹を鎖骨の下のくぼみに添え、胸の真ん中から肩先へやさしくさすり流す',
      },
    ],
  },
  {
    id: 'TL-02',
    code: 'TL-02',
    goldenId: 'GL-02',
    name: '胸〜首すじ〜あごトリガーライン',
    shortName: '胸〜首前〜あご',
    lineId: 'SFL',
    cameraView: 'front',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【うつむき首・食いしばり】胸〜首すじ〜あごトリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '首のうしろ・頭の付け根・あごまわり',
    causalSummary: 'うつむき姿勢や噛みしめで胸〜首の前側〜あごが縮んで固まるため、頭が前へ引かれて首のうしろがずっと引っ張られやすくなります',
    quickCheck: '鎖骨の上に両手を当てて皮膚をそっと下へ引きながら上を向くと、首のうしろが詰まらずスッと動かしやすくなります',
    safetyNote: '⚠️ 首の前側は血管・神経が近いためボールを強く押し当てず、指を添えてやさしく伸ばしてください',
    point: '首のうしろを強く揉むのではなく、頭を前へ引っ張っている「①鎖骨の下 ➔ ②鎖骨の上〜首すじ ➔ ③エラ・あご」をやさしくゆるめると、頭がスッと自然な位置に戻りやすくなります。',
    pulledMuscles: ['semispinalis', 'splenius-capitis', 'zygomaticus-major'],
    fasciaChain: ['flexor-carpi-radialis', 'biceps-brachii', 'pectoralis-major', 'platysma', 'sternocleidomastoid', 'masseter'],
    arrowPath: ['flexor-carpi-radialis', 'biceps-brachii', 'pectoralis-major', 'platysma', 'sternocleidomastoid', 'masseter'],
    shortenCore: ['sternocleidomastoid', 'pectoralis-major', 'masseter'],
    shortenLinked: ['platysma', 'scalenus-anterior', 'temporalis'],
    lengthenAntagonist: ['semispinalis', 'splenius-capitis', 'digastric'],
    lengthenLinked: ['zygomaticus-major', 'levator-scapulae'],
    stationBridges: [
      { from: 'pectoralis-major', to: 'sternocleidomastoid', stationJa: '胸の真ん中の骨・鎖骨の内側', crossSide: false },
      { from: 'platysma', to: 'masseter', stationJa: '下あごの縁〜エラまわり', crossSide: false },
      { from: 'sternocleidomastoid', to: 'splenius-capitis', stationJa: '耳のうしろの丸い骨（乳様突起）', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'pectoralis-major',
        label: '① 鎖骨下',
        easyLabel: '① 鎖骨の下（胸の上）',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'sternocleidomastoid',
        durationSec: 30,
        step: '① 鎖骨の下（胸の上側）にボールをそっと当てて小さくくるくるゆるめる',
      },
      {
        id: 'sternocleidomastoid',
        label: '② 首前横',
        easyLabel: '② 鎖骨の上〜首すじ（手で行う）',
        tool: 'hand',
        toolLabel: '✋ 手でやさしく',
        motion: 'stroke',
        strokeTarget: 'masseter',
        durationSec: 30,
        step: '② 鎖骨の上に指を添えて皮膚を軽く下へ引きながら、首をゆっくり反対へ傾けて伸ばす（※喉仏の横や脈打つ場所は押さない）',
      },
      {
        id: 'masseter',
        label: '③ エラ・顎',
        easyLabel: '③ エラ・あごの横',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'circle',
        strokeTarget: 'temporalis',
        durationSec: 30,
        step: '③ 奥歯の力を抜いて少し隙間をあけ、指の腹でエラ〜こめかみをくるくるゆるめる',
      },
    ],
  },
  {
    id: 'TL-03',
    code: 'TL-03',
    goldenId: 'GL-03',
    name: '脇の下〜ろっ骨横〜肩甲骨トリガーライン',
    shortName: '脇の下〜肩甲骨',
    lineId: 'SBAL',
    cameraView: 'left',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【腕が上がりづらい・肩の引っかかり】脇の下〜ろっ骨横トリガーラインのゆるめ方',
    videoDuration: '80秒',
    pulledLabel: '肩の上・腕の付け根',
    causalSummary: '腕を使う作業で脇の下〜ろっ骨の横が縮んで貼りつくため、肩甲骨にブレーキがかかり腕を上げるたび肩が引っかかりやすくなります',
    quickCheck: '反対の手で「脇の下のうしろ側」を軽くつまんだまま腕を上げると、肩の引っかかりが減ってスッと上がりやすくなります',
    safetyNote: '',
    point: '肩の上を揉むのではなく「①脇の前 ➔ ②脇のうしろ ➔ ③ろっ骨の横」を順にゆるめて肩甲骨の滑りを引き出すと、腕がスッと軽く上がりやすくなります。',
    pulledMuscles: ['deltoid', 'supraspinatus', 'levator-scapulae'],
    fasciaChain: ['pectoralis-minor', 'serratus-anterior', 'latissimus-dorsi', 'teres-minor', 'deltoid', 'levator-scapulae'],
    arrowPath: ['pectoralis-minor', 'serratus-anterior', 'latissimus-dorsi', 'teres-minor', 'deltoid', 'levator-scapulae'],
    shortenCore: ['pectoralis-minor', 'latissimus-dorsi'],
    shortenLinked: ['serratus-anterior', 'teres-major', 'subscapularis'],
    lengthenAntagonist: ['supraspinatus', 'deltoid', 'teres-minor'],
    lengthenLinked: ['levator-scapulae', 'rhomboid-major'],
    stationBridges: [
      { from: 'pectoralis-minor', to: 'serratus-anterior', stationJa: 'ろっ骨の前〜横の壁', crossSide: false },
      { from: 'serratus-anterior', to: 'rhomboid-major', stationJa: '肩甲骨の内側の縁（スイッチ）', crossSide: false },
      { from: 'latissimus-dorsi', to: 'deltoid', stationJa: '二の腕の付け根の骨', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'pectoralis-minor',
        label: '① 脇の前',
        easyLabel: '① 鎖骨の下〜脇の前',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'stroke',
        strokeTarget: 'serratus-anterior',
        durationSec: 30,
        step: '① 4本の指の腹を鎖骨の下〜脇の前側にそっと添え、外へ向けてやさしくさすり流す',
      },
      {
        id: 'latissimus-dorsi',
        label: '② 脇の後ろ',
        easyLabel: '② 脇のうしろ（背中の端）',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'teres-minor',
        durationSec: 30,
        step: '② 脇のうしろ側（背中の端）にローラーを当ててゆっくり往復転がす',
      },
      {
        id: 'serratus-anterior',
        label: '③ 肋骨の横',
        easyLabel: '③ ろっ骨の横（脇の下）',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'rhomboid-major',
        durationSec: 20,
        step: '③ ろっ骨の横（脇の下）にローラーを当て、肩甲骨側へコロコロ転がす',
      },
    ],
  },
  {
    id: 'TL-04',
    code: 'TL-04',
    goldenId: 'GL-04',
    name: 'みぞおち〜お腹の奥トリガーライン',
    shortName: 'みぞおち〜お腹の奥',
    lineId: 'DFL',
    cameraView: 'front',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【浅い呼吸・背中の張り】みぞおち〜お腹の奥トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '背中全体・腰のまん中',
    causalSummary: 'お尻ずらし座りでみぞおち〜お腹の奥が縮んで丸く固まるため、反対側の背中がずっと引き伸ばされて息まで浅くなりやすくなります',
    quickCheck: 'ろっ骨の下（みぞおちの横）に指先をそっと添えて息を吐きながら背すじを起こすと、胸がラクに広がりやすくなります',
    safetyNote: '⚠️ みぞおちの骨の上やドクドク脈打つ場所は避け、食後すぐ・妊娠中・強い痛みがある時は行わないでください',
    point: '丸まって縮こまった「①ろっ骨の下 ➔ ②お腹の縦ライン ➔ ③脚の付け根の奥」をやさしくゆるめると、深い呼吸と骨盤の立ち上がりが戻りやすくなります。',
    pulledMuscles: ['longissimus', 'multifidus', 'iliocostalis'],
    fasciaChain: ['psoas-major', 'diaphragm', 'rectus-abdominis', 'sternocleidomastoid', 'longissimus'],
    arrowPath: ['psoas-major', 'diaphragm', 'rectus-abdominis', 'sternocleidomastoid', 'longissimus'],
    shortenCore: ['diaphragm', 'rectus-abdominis'],
    shortenLinked: ['psoas-major', 'iliacus', 'transversus-thoracis'],
    lengthenAntagonist: ['longissimus', 'multifidus', 'iliocostalis'],
    lengthenLinked: ['semispinalis', 'trapezius'],
    stationBridges: [
      { from: 'diaphragm', to: 'psoas-major', stationJa: 'みぞおちの奥（横隔膜〜腰の骨）', crossSide: false },
      { from: 'pectoralis-major', to: 'rectus-abdominis', stationJa: '下のろっ骨・みぞおち前', crossSide: false },
      { from: 'psoas-major', to: 'iliacus', stationJa: '脚の付け根の奥（小転子）', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'diaphragm',
        label: '① みぞおち',
        easyLabel: '① ろっ骨の下（みぞおち横）',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'circle',
        strokeTarget: 'rectus-abdominis',
        durationSec: 30,
        step: '① ろっ骨の下のやわらかい部分（みぞおち横）に4本の指をそっと添え、深呼吸しながらゆるめる（※真ん中の骨は押さない）',
      },
      {
        id: 'rectus-abdominis',
        label: '② お腹縦',
        easyLabel: '② お腹の縦ライン',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'psoas-major',
        durationSec: 30,
        step: '② お腹の縦ラインに沿って、手でローラーをやさしくコロコロ転がす',
      },
      {
        id: 'psoas-major',
        label: '③ 股関節奥',
        easyLabel: '③ 脚の付け根の奥',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'circle',
        strokeTarget: 'iliacus',
        durationSec: 30,
        step: '③ 脚の付け根の内側（骨盤の出っ張りの少し内側）に指をそっと添えて深呼吸しながらゆるめる',
      },
    ],
  },
  {
    id: 'TL-05',
    code: 'TL-05',
    goldenId: 'GL-05',
    name: '脚の付け根×もも裏トリガーライン',
    shortName: '脚の付け根×もも裏',
    lineId: 'DFL',
    cameraView: 'left',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【立つと腰が伸びづらい】脚の付け根×もも裏トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '腰の下のほう・お尻の上',
    causalSummary: '座りっぱなしで脚の付け根の奥ともも裏が縮んで骨盤を前後ロックするため、立つ時に腰ばかりが無理に引っ張られやすくなります',
    quickCheck: 'イスから立つ前に「脚の付け根の内側」を指で軽く押さえながら立ち上がると、腰がスッと伸びやすくなるのを体感できます',
    safetyNote: '⚠️ 脚の付け根のドクドク脈打つ場所や強い痛み・しびれが出る場所は避け、食後すぐ・妊娠中・強い痛みがある時は行わないでください',
    point: 'つらい腰を強く揉むのではなく、骨盤を前後から引っ張っている「①脚の付け根の奥 ➔ ②太もものうしろ ➔ ③お尻」を順にゆるめると腰がスッと伸びやすくなります。',
    pulledMuscles: ['multifidus', 'longissimus', 'iliocostalis'],
    fasciaChain: ['biceps-femoris', 'gluteus-maximus', 'psoas-major', 'iliacus', 'multifidus'],
    arrowPath: ['biceps-femoris', 'gluteus-maximus', 'psoas-major', 'iliacus', 'multifidus'],
    shortenCore: ['psoas-major', 'biceps-femoris'],
    shortenLinked: ['iliacus', 'semitendinosus', 'quadratus-lumborum'],
    lengthenAntagonist: ['gluteus-maximus', 'multifidus'],
    lengthenLinked: ['longissimus', 'iliocostalis'],
    stationBridges: [
      { from: 'psoas-major', to: 'iliacus', stationJa: '脚の付け根の奥（小転子）', crossSide: false },
      { from: 'biceps-femoris', to: 'gluteus-maximus', stationJa: 'お尻の下の骨（坐骨・靭帯）', crossSide: false },
      { from: 'biceps-femoris', to: 'multifidus', stationJa: 'お尻の下の骨〜仙骨の膜', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'psoas-major',
        label: '① 腸腰筋',
        easyLabel: '① 脚の付け根の奥',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'circle',
        strokeTarget: 'iliacus',
        durationSec: 30,
        step: '① イスに浅く座り、脚の付け根の前側（骨盤の内側）に指をそっと添えて深呼吸しながらゆるめる',
      },
      {
        id: 'biceps-femoris',
        label: '② もも裏',
        easyLabel: '② 太もものうしろ',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'gluteus-maximus',
        durationSec: 30,
        step: '② イスに座ったまま太もものうしろにローラーを挟み、前後に転がす',
      },
      {
        id: 'gluteus-maximus',
        label: '③ お尻',
        easyLabel: '③ お尻のふくらみ',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'multifidus',
        durationSec: 30,
        step: '③ イスにお尻でボールを挟んで座り、小さく体重を乗せてゆるめる',
      },
    ],
  },
  {
    id: 'TL-06',
    code: 'TL-06',
    goldenId: 'GL-06',
    name: 'ふくらはぎ〜もも裏〜背中トリガーライン',
    shortName: 'ふくらはぎ〜背面',
    lineId: 'SBL',
    cameraView: 'back',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【中腰・前かがみの腰の重さ】ふくらはぎ〜もも裏〜背中トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '腰から背中・もも裏全体',
    causalSummary: '前かがみ作業や走る衝撃でふくらはぎ〜もも裏が縮んで固まるため、背中のシートが下へ引かれて腰が重だるくなりやすくなります',
    quickCheck: 'イスに座って片方の「ふくらはぎの真ん中」を両手で軽くもみほぐしてから前屈すると、腰やもも裏の突っ張りが和らぐのを体感できます',
    safetyNote: '',
    point: '前かがみ姿勢で張りつめた「①ふくらはぎ ➔ ②太もものうしろ ➔ ③脇の下〜背中の横」を順番にゆるめると、背面の引っ張りが和らいで腰が軽くなりやすくなります。',
    pulledMuscles: ['longissimus', 'multifidus', 'iliocostalis'],
    fasciaChain: ['gastrocnemius', 'biceps-femoris', 'gluteus-maximus', 'longissimus', 'latissimus-dorsi'],
    arrowPath: ['gastrocnemius', 'biceps-femoris', 'gluteus-maximus', 'longissimus', 'latissimus-dorsi'],
    shortenCore: ['gastrocnemius', 'biceps-femoris'],
    shortenLinked: ['soleus', 'semitendinosus', 'latissimus-dorsi'],
    lengthenAntagonist: ['tibialis-anterior', 'gluteus-maximus'],
    lengthenLinked: ['longissimus', 'multifidus', 'iliocostalis'],
    stationBridges: [
      { from: 'gastrocnemius', to: 'biceps-femoris', stationJa: 'ひざ裏の交差点', crossSide: false },
      { from: 'biceps-femoris', to: 'longissimus', stationJa: 'お尻の下の骨〜お尻の真ん中の骨', crossSide: false },
      { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '背中〜腰の筋膜シート（斜め交差）', crossSide: true },
    ],
    triggerPoints: [
      {
        id: 'gastrocnemius',
        label: '① ふくらはぎ',
        easyLabel: '① ふくらはぎの真ん中',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'biceps-femoris',
        durationSec: 30,
        step: '① 床またはイスの前で、ふくらはぎをローラーに乗せてコロコロ転がす',
      },
      {
        id: 'biceps-femoris',
        label: '② もも裏',
        easyLabel: '② 太もものうしろ',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'gluteus-maximus',
        durationSec: 30,
        step: '② 太もものうしろにローラーを当ててゆっくり往復転がす',
      },
      {
        id: 'latissimus-dorsi',
        label: '③ 脇〜広背筋',
        easyLabel: '③ 脇の下〜背中の横',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'longissimus',
        durationSec: 30,
        step: '③ 脇の下〜背中の横にローラーを当ててコロコロ転がす',
      },
    ],
  },
  {
    id: 'TL-07',
    code: 'TL-07',
    goldenId: 'GL-07',
    name: '骨盤の横〜お尻横〜脇腹トリガーライン',
    shortName: 'お尻横〜脇腹',
    lineId: 'LL',
    cameraView: 'right',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【片側の腰の重さ・お尻の張り】骨盤の横〜脇腹トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '片側の腰・お尻の横',
    causalSummary: '片足重心や足組みで骨盤の横〜脇腹が縮んでねじれ固定するため、反対へ傾いた腰やお尻の横がずっと引っ張られやすくなります',
    quickCheck: 'ズボンの前ポケット横（骨盤の出っ張りのすぐ下）を指で軽く押さえながら足踏みをすると、脚がスッと軽く上がるのを体感できます',
    safetyNote: '',
    point: '片側への体重かけや足組みで固まった「①ポケットの横 ➔ ②お尻の横の上側 ➔ ③脇腹」をゆるめると、骨盤の傾きとねじれが整いやすくなります。',
    pulledMuscles: ['quadratus-lumborum', 'multifidus'],
    fasciaChain: ['tensor-fasciae-latae', 'gluteus-medius', 'external-oblique', 'quadratus-lumborum', 'multifidus'],
    arrowPath: ['tensor-fasciae-latae', 'gluteus-medius', 'external-oblique', 'quadratus-lumborum', 'multifidus'],
    shortenCore: ['tensor-fasciae-latae', 'quadratus-lumborum'],
    shortenLinked: ['external-oblique', 'internal-oblique', 'adductor-longus'],
    lengthenAntagonist: ['gluteus-medius', 'gluteus-minimus'],
    lengthenLinked: ['multifidus', 'fibularis-longus'],
    stationBridges: [
      { from: 'external-oblique', to: 'tensor-fasciae-latae', stationJa: '腰の前の出っ張り骨（ASIS）', crossSide: false },
      { from: 'external-oblique', to: 'gluteus-medius', stationJa: '骨盤の横の縁', crossSide: false },
      { from: 'diaphragm', to: 'quadratus-lumborum', stationJa: '一番下のろっ骨〜腰の横', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'tensor-fasciae-latae',
        label: '① 骨盤前横',
        easyLabel: '① ポケットの横〜外もも',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'gluteus-medius',
        durationSec: 30,
        step: '① 床マットの上でズボンのポケット横〜外ももにローラーを挟み、ゆっくり転がす',
      },
      {
        id: 'gluteus-medius',
        label: '② お尻横上',
        easyLabel: '② お尻の横の上側',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'quadratus-lumborum',
        durationSec: 30,
        step: '② お尻の横の上側にボールを当てて円を描くようにゆるめる',
      },
      {
        id: 'external-oblique',
        label: '③ 脇腹',
        easyLabel: '③ 脇腹（くびれの横）',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'quadratus-lumborum',
        durationSec: 30,
        step: '③ 脇腹〜骨盤の横にローラーを当ててやさしくコロコロ転がす',
      },
    ],
  },
  {
    id: 'TL-08',
    code: 'TL-08',
    goldenId: 'GL-08',
    name: 'すね〜前もも〜脚の付け根トリガーライン',
    shortName: '前もも〜すね',
    lineId: 'SFL',
    cameraView: 'front',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【反り腰・前ももの張り】すね〜前もも〜脚の付け根トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '反りやすい腰・ふくらはぎ',
    causalSummary: 'つま先重心や立ちっぱなしですね〜前もも〜脚の付け根が縮むため、骨盤が前へ傾いてロックされ腰が反って張りやすくなります',
    quickCheck: '立ったまま片膝を曲げて足首を持ち、前ももを10秒軽く伸ばしてから立つと、腰の反り感がフッと落ち着くのを体感できます',
    safetyNote: '⚠️ 脚の付け根のドクドク脈打つ場所や強い痛み・しびれが出る場所は避け、食後すぐ・妊娠中・強い痛みがある時は行わないでください',
    point: '腰の反り感を和らげるには、骨盤を前へ引っ張っている「①すねの外側 ➔ ②太ももの前側 ➔ ③脚の付け根の前側」を順にゆるめるのがポイントです。',
    pulledMuscles: ['longissimus', 'gastrocnemius'],
    fasciaChain: ['tibialis-anterior', 'rectus-femoris', 'psoas-major', 'iliacus', 'longissimus'],
    arrowPath: ['tibialis-anterior', 'rectus-femoris', 'psoas-major', 'iliacus', 'longissimus'],
    shortenCore: ['rectus-femoris', 'psoas-major'],
    shortenLinked: ['tibialis-anterior', 'iliacus', 'vastus-lateralis'],
    lengthenAntagonist: ['gluteus-maximus', 'biceps-femoris', 'rectus-abdominis'],
    lengthenLinked: ['longissimus', 'gastrocnemius'],
    stationBridges: [
      { from: 'tibialis-anterior', to: 'rectus-femoris', stationJa: 'ひざのお皿〜ひざ下の骨', crossSide: false },
      { from: 'rectus-femoris', to: 'iliacus', stationJa: '骨盤の前側の出っ張り（ASIS下）', crossSide: false },
      { from: 'psoas-major', to: 'iliacus', stationJa: '脚の付け根の奥（小転子）', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'tibialis-anterior',
        label: '① すね外側',
        easyLabel: '① すねの外側',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'rectus-femoris',
        durationSec: 30,
        step: '① 床マットの上ですねの外側をローラーに乗せ、ゆっくり往復転がす',
      },
      {
        id: 'rectus-femoris',
        label: '② 前もも',
        easyLabel: '② 太ももの前側',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'psoas-major',
        durationSec: 30,
        step: '② 床マットの上でうつ伏せになり、太ももの前側にローラーを挟んでゆっくり転がす',
      },
      {
        id: 'psoas-major',
        label: '③ 股関節前',
        easyLabel: '③ 脚の付け根の前側',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'circle',
        strokeTarget: 'iliacus',
        durationSec: 30,
        step: '③ 脚の付け根の前側（骨盤の内側）に指をそっと添えて深呼吸しながらゆるめる',
      },
    ],
  },
  {
    id: 'TL-09',
    code: 'TL-09',
    goldenId: 'GL-09',
    name: '足裏〜ふくらはぎ〜ひざ裏トリガーライン',
    shortName: '足裏〜ふくらはぎ',
    lineId: 'SBL',
    cameraView: 'back',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【足裏の張り・夕方のパンパン感】足裏〜ふくらはぎ〜ひざ裏トリガーラインのゆるめ方',
    videoDuration: '80秒',
    pulledLabel: '足裏・ふくらはぎ・ひざ裏',
    causalSummary: '立ち仕事や歩きすぎで足裏〜アキレス腱上が縮んで硬くなるため、ふくらはぎやひざ裏までピンと引かれて重だるくなりやすくなります',
    quickCheck: 'イスに座って片方の「土踏まず」を親指で10秒ぐーっと押してから立つと、地面に足裏がピタッと吸い付く軽さを体感できます',
    safetyNote: '',
    point: '足の重だるさや夕方のパンパン感は「①土踏まず ➔ ②ふくらはぎの下側 ➔ ③ひざ裏のすぐ下」の順で下から上へほぐすと軽くなりやすくなります。',
    pulledMuscles: ['biceps-femoris', 'semitendinosus', 'tibialis-anterior'],
    fasciaChain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    arrowPath: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    shortenCore: ['flexor-digitorum-brevis', 'soleus'],
    shortenLinked: ['gastrocnemius', 'tibialis-posterior', 'calcaneal-tendon'],
    lengthenAntagonist: ['tibialis-anterior', 'extensor-digitorum-longus'],
    lengthenLinked: ['biceps-femoris', 'semitendinosus'],
    stationBridges: [
      { from: 'flexor-digitorum-brevis', to: 'soleus', stationJa: 'かかとの骨の裏〜足裏の膜', crossSide: false },
      { from: 'soleus', to: 'gastrocnemius', stationJa: 'アキレス腱の合流部', crossSide: false },
      { from: 'gastrocnemius', to: 'biceps-femoris', stationJa: 'ひざ裏の交差点', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'flexor-digitorum-brevis',
        label: '① 足裏',
        easyLabel: '① 土踏まず（足の裏）',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'roll',
        strokeTarget: 'soleus',
        durationSec: 30,
        step: '① 土踏まず（足の裏）でボールを踏んで前後にコロコロ転がす（30秒）',
      },
      {
        id: 'soleus',
        label: '② アキレス腱上',
        easyLabel: '② ふくらはぎの下側',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'gastrocnemius',
        durationSec: 30,
        step: '② ふくらはぎの下側（アキレス腱の上）をローラーに乗せて往復転がす（30秒）',
      },
      {
        id: 'gastrocnemius',
        label: '③ ふくらはぎ上',
        easyLabel: '③ ひざ裏のすぐ下',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'biceps-femoris',
        durationSec: 20,
        step: '③ ひざ裏のすぐ下（ふくらはぎの上部）にボールを当ててくるくるゆるめる（20秒）',
      },
    ],
  },
  {
    id: 'TL-10',
    code: 'TL-10',
    goldenId: 'GL-10',
    name: '頭のうしろ〜首すじ〜肩甲骨トリガーライン',
    shortName: '頭のうしろ〜肩甲骨',
    lineId: 'SBL',
    cameraView: 'back',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【目の奥の重さ・背中の板張り】頭のうしろ〜首すじ〜肩甲骨トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '目の奥・頭のうしろ・肩甲骨のあいだ',
    causalSummary: '画面をのぞき込むクセで頭の付け根〜首すじが縮んで固まるため、肩甲骨のあいだまで引っ張られて板のように突っ張りやすくなります',
    quickCheck: '頭のうしろのくぼみに両手の親指をそっと添え、目を閉じてゆっくり2回深呼吸すると、目の奥や首すじがフッと緩むのを体感できます',
    safetyNote: '⚠️ 頭を強く押しつけすぎず、めまいやしびれを感じたらすぐに中止してください',
    point: '目の奥の重さや背中の板のような張りは「①頭のうしろのくぼみ ➔ ②首と肩の境目 ➔ ③肩甲骨のあいだ」をやさしくゆるめるとラクになりやすくなります。',
    pulledMuscles: ['trapezius', 'semispinalis', 'longissimus'],
    fasciaChain: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major', 'trapezius'],
    arrowPath: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major', 'trapezius'],
    shortenCore: ['rectus-capitis-posterior-minor', 'levator-scapulae'],
    shortenLinked: ['rectus-capitis-posterior-major', 'sternocleidomastoid', 'pectoralis-minor'],
    lengthenAntagonist: ['longus-capitis', 'longus-colli'],
    lengthenLinked: ['splenius-capitis', 'rhomboid-major', 'trapezius', 'semispinalis'],
    stationBridges: [
      { from: 'rectus-capitis-posterior-major', to: 'occipitalis', stationJa: '頭のうしろのくぼみ（後頭骨）', crossSide: false },
      { from: 'splenius-capitis', to: 'rhomboid-major', stationJa: '首の下〜背中の上の背骨（交差）', crossSide: true },
      { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上の角', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'splenius-capitis',
        label: '① 後頭部下',
        easyLabel: '① 頭のうしろのくぼみ',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'levator-scapulae',
        durationSec: 30,
        step: '① 頭のうしろのくぼみにボールを軽く当てて、小さく円を描きゆるめる（30秒）',
      },
      {
        id: 'levator-scapulae',
        label: '② 首の付け根',
        easyLabel: '② 首と肩の境目',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'rhomboid-major',
        durationSec: 30,
        step: '② 首と肩の角（付け根）にボールを当ててやさしくくるくるゆるめる（30秒）',
      },
      {
        id: 'rhomboid-major',
        label: '③ 肩甲骨の間',
        easyLabel: '③ 肩甲骨のあいだ',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'roll',
        strokeTarget: 'trapezius',
        durationSec: 30,
        step: '③ 壁と背中のあいだにボールを挟み、ひざを軽く動かして肩甲骨の内側を転がす（30秒）',
      },
    ],
  },
  {
    id: 'TL-11',
    code: 'TL-11',
    goldenId: 'GL-11',
    name: '手首〜肘の外側〜肩うしろトリガーライン',
    shortName: '手首〜肘〜肩うしろ',
    lineId: 'SBAL',
    cameraView: 'right',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【手首・肘の外側の負担・荷物持ち】前腕〜肘外側〜肩うしろトリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: '手首・肘の外側・肩のうしろ',
    causalSummary: 'マウスや包丁・荷物持ちで手首〜前腕が縮んでねじれ固定するため、肘の外側から肩のうしろまでピンと引っ張られやすくなります',
    quickCheck: '肘を曲げた時に盛り上がる「前腕の外側」を反対の手で軽くつまみながら手首を動かすと、手首や肘がスッと軽く動くのを体感できます',
    safetyNote: '',
    point: '手首や肘の外側の違和感は、指先から肩までつながる「①肘の外側 ➔ ②二の腕のうしろ ➔ ③肩甲骨のうしろ」の3点をゆるめると動かしやすくなります。',
    pulledMuscles: ['extensor-carpi-radialis-longus', 'infraspinatus', 'trapezius'],
    fasciaChain: ['brachioradialis', 'extensor-carpi-radialis-longus', 'triceps-brachii', 'deltoid', 'infraspinatus'],
    arrowPath: ['brachioradialis', 'extensor-carpi-radialis-longus', 'triceps-brachii', 'deltoid', 'infraspinatus'],
    shortenCore: ['brachioradialis', 'extensor-carpi-radialis-longus'],
    shortenLinked: ['extensor-digitorum', 'pronator-teres', 'biceps-brachii'],
    lengthenAntagonist: ['flexor-carpi-ulnaris', 'supinator'],
    lengthenLinked: ['triceps-brachii', 'infraspinatus', 'deltoid'],
    stationBridges: [
      { from: 'brachioradialis', to: 'deltoid', stationJa: '二の腕の外側の筋膜の壁', crossSide: false },
      { from: 'extensor-carpi-radialis-longus', to: 'triceps-brachii', stationJa: '肘の外側〜二の腕のうしろ', crossSide: false },
      { from: 'triceps-brachii', to: 'infraspinatus', stationJa: '肩のうしろ〜肩甲骨', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'brachioradialis',
        label: '① 肘の外側',
        easyLabel: '① 肘の外側〜腕の親指側',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'glide',
        strokeTarget: 'triceps-brachii',
        durationSec: 30,
        step: '① 肘の外側〜前腕のふくらみを親指で押さえたまま、手首をゆっくり反らしたり曲げたりする（30秒）',
      },
      {
        id: 'triceps-brachii',
        label: '② 二の腕後ろ',
        easyLabel: '② 二の腕のうしろ',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'deltoid',
        durationSec: 30,
        step: '② 二の腕のうしろをローラーに乗せてゆっくり往復転がす（30秒）',
      },
      {
        id: 'infraspinatus',
        label: '③ 肩甲骨の上',
        easyLabel: '③ 肩甲骨のうしろ',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'deltoid',
        durationSec: 30,
        step: '③ 肩甲骨のうしろ（背中の上側）にボールを当てて円を描くようにゆるめる（30秒）',
      },
    ],
  },
  {
    id: 'TL-12',
    code: 'TL-12',
    goldenId: 'GL-12',
    name: '内もも〜脚の付け根〜お尻の奥トリガーライン',
    shortName: '内もも〜お尻の奥',
    lineId: 'DFL',
    cameraView: 'front',
    xrayOpacity: 0.28,
    speed: 1.0,
    strokeSpan: 0.75,
    youtubeUrl: '',
    youtubeTitle: '【股関節の詰まり・お尻の奥の重さ】内もも〜お尻の奥トリガーラインのゆるめ方',
    videoDuration: '90秒',
    pulledLabel: 'お尻のえくぼの奥・股関節',
    causalSummary: '床座りや足組みで内もも〜脚の付け根内側が縮んで内へ引き込むため、綱引きに負けたお尻の奥がずっと引っ張られやすくなります',
    quickCheck: 'イスに座って「内ももの真ん中」を両手で10秒軽くもみほぐしてから膝を開くと、股関節がスッと開きやすくなるのを体感できます',
    safetyNote: '',
    point: '股関節の開きにくさやお尻の奥の重だるさは「①内もも ➔ ②脚の付け根の内側 ➔ ③お尻のえくぼの奥」をセットでゆるめるとスムーズに動かしやすくなります。',
    pulledMuscles: ['gluteus-medius', 'multifidus', 'biceps-femoris'],
    fasciaChain: ['adductor-longus', 'pectineus', 'piriformis', 'gluteus-maximus'],
    arrowPath: ['adductor-longus', 'pectineus', 'piriformis', 'gluteus-maximus'],
    shortenCore: ['adductor-longus', 'pectineus'],
    shortenLinked: ['adductor-magnus', 'psoas-major', 'tensor-fasciae-latae'],
    lengthenAntagonist: ['gluteus-medius', 'piriformis', 'gluteus-maximus'],
    lengthenLinked: ['multifidus', 'biceps-femoris'],
    stationBridges: [
      { from: 'adductor-longus', to: 'pectineus', stationJa: '下腹の骨（恥骨前面）', crossSide: false },
      { from: 'pectineus', to: 'psoas-major', stationJa: '脚の付け根の奥（小転子〜恥骨）', crossSide: false },
      { from: 'adductor-magnus', to: 'pubococcygeus', stationJa: 'お尻の下の内側〜骨盤の底', crossSide: false },
    ],
    triggerPoints: [
      {
        id: 'adductor-longus',
        label: '① 内もも',
        easyLabel: '① 内ももの真ん中',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'pectineus',
        durationSec: 30,
        step: '① うつ伏せで片膝を曲げ、内ももの真ん中をローラーでゆっくり転がす（30秒）',
      },
      {
        id: 'pectineus',
        label: '② 付け根内側',
        easyLabel: '② 脚の付け根の内側',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'psoas-major',
        durationSec: 30,
        step: '② 脚の付け根の内側にボールをそっと当ててやさしくゆるめる（30秒）',
      },
      {
        id: 'piriformis',
        label: '③ お尻の奥',
        easyLabel: '③ お尻のえくぼの奥',
        tool: 'ball',
        toolLabel: '🎾 ボール',
        motion: 'circle',
        strokeTarget: 'gluteus-maximus',
        durationSec: 30,
        step: '③ お尻のえくぼの奥にボールを当ててゆっくりくるくるゆるめる（30秒）',
      },
    ],
  },
];

// 互換用エイリアス
export const GOLDEN_LINES = TRIGGER_LINES;

// -------------------------------------------------------------
// LINES — 11枚の筋膜シート（面）。track は原典の走行順に並べる。
// -------------------------------------------------------------
export const LINES = [
  {
    id: 'SBL',
    name: '背面の筋膜シート（浅後）',
    tag: '背中シート',
    color: '#C89648',
    oneLine: '足裏から額まで、体のうしろ全体を面で包んで支える筋膜シート',
    track: [
      'flexor-digitorum-brevis',
      'abductor-digiti-minimi-foot',
      'calcaneal-tendon',
      'gastrocnemius',
      'biceps-femoris',
      'semitendinosus',
      'semimembranosus',
      'gluteus-maximus',
      'iliocostalis',
      'longissimus',
      'spinalis',
      'semispinalis',
      'rectus-capitis-posterior-major',
      'rectus-capitis-posterior-minor',
      'occipitalis',
      'epicranial-aponeurosis',
      'frontalis',
    ],
    path: [
      'flexor-digitorum-brevis',
      'calcaneal-tendon',
      'gastrocnemius',
      'biceps-femoris',
      'gluteus-maximus',
      'iliocostalis',
      'longissimus',
      'semispinalis',
      'rectus-capitis-posterior-major',
      'occipitalis',
      'epicranial-aponeurosis',
      'frontalis',
    ],
    stations: ['足の指裏', 'かかとの骨', 'ひざ裏の上', 'お尻の下の骨', 'お尻の真ん中の骨', '頭のうしろのくぼみ', 'まゆ毛の上'],
    side: 'both',
  },
  {
    id: 'SFL',
    name: '前面の筋膜シート（浅前）',
    tag: '前シート',
    color: '#C87864',
    oneLine: '足の甲からお腹・胸・首まで、体の前側を面でつなぐ筋膜シート',
    track: [
      'extensor-digitorum-brevis',
      'extensor-hallucis-brevis',
      'extensor-digitorum-longus',
      'extensor-hallucis-longus',
      'tibialis-anterior',
      'vastus-medialis',
      'vastus-intermedius',
      'vastus-lateralis',
      'rectus-femoris',
      'pyramidalis',
      'rectus-abdominis',
      'pectoralis-major',
      'sternocleidomastoid',
    ],
    path: [
      'extensor-digitorum-brevis',
      'extensor-digitorum-longus',
      'tibialis-anterior',
      'rectus-femoris',
      'rectus-abdominis',
      'pectoralis-major',
      'sternocleidomastoid',
    ],
    stations: ['足の指の甲', 'ひざのお皿の下', 'ひざのお皿', '下腹の骨', 'ろっ骨の前', '胸の真ん中の骨', '耳のうしろの骨'],
    side: 'both',
  },
  {
    id: 'LL',
    name: '側面の筋膜シート（外側）',
    tag: '横シート',
    color: '#BA8280',
    oneLine: '外くるぶしから太もも横・脇腹・耳うしろまで、横揺れを支える帯状シート',
    track: [
      'fibularis-brevis',
      'fibularis-longus',
      'vastus-lateralis',
      'tensor-fasciae-latae',
      'gluteus-maximus',
      'gluteus-medius',
      'external-oblique',
      'internal-oblique',
      'external-intercostals',
      'internal-intercostals',
      'splenius-capitis',
      'sternocleidomastoid',
    ],
    path: [
      'fibularis-brevis',
      'fibularis-longus',
      'vastus-lateralis',
      'tensor-fasciae-latae',
      'external-oblique',
      'external-intercostals',
      'sternocleidomastoid',
    ],
    stations: ['足裏の真ん中', 'ひざ外側の出っ張り骨', 'ひざ下の外側', '腰の横の骨', 'ろっ骨の横', '耳のうしろの骨'],
    side: 'both',
  },
  {
    id: 'SPL',
    name: 'らせんの筋膜シート',
    tag: 'らせんシート',
    color: '#7F9E82',
    oneLine: '頭から背中・お腹・足裏へ、体を斜めに包み込む筋膜シート',
    track: [
      'splenius-capitis',
      'splenius-cervicis',
      'rhomboid-minor',
      'rhomboid-major',
      'serratus-anterior',
      'external-oblique',
      'linea-alba',
      'internal-oblique',
      'tensor-fasciae-latae',
      'vastus-lateralis',
      'tibialis-anterior',
      'fibularis-longus',
      'biceps-femoris',
      'longissimus',
      'iliocostalis',
    ],
    path: [
      'tibialis-anterior',
      'vastus-lateralis',
      'tensor-fasciae-latae',
      'internal-oblique',
      'linea-alba',
      'external-oblique',
      'serratus-anterior',
      'rhomboid-major',
      'splenius-capitis',
    ],
    crossAt: [5],
    stations: ['頭のうしろのくぼみ', '背中の背骨', '肩甲骨の内側', 'ろっ骨の横', '腰の前の出っ張り骨', 'ひざ下の外側', '土踏まずの骨', 'ひざ外側の出っ張り骨', 'お尻の下の骨', 'お尻の真ん中の骨'],
    side: 'cross',
  },
  {
    id: 'DFL',
    name: '体の芯の筋膜シート（深前）',
    tag: '体の芯シート',
    color: '#6E90A6',
    oneLine: '土踏まずから内もも・骨盤の奥・横隔膜・あご下まで、芯を包む深層シート',
    track: [
      'tibialis-posterior',
      'flexor-digitorum-longus',
      'flexor-hallucis-longus',
      'popliteus',
      'adductor-magnus',
      'adductor-minimus',
      'adductor-brevis',
      'adductor-longus',
      'pubococcygeus',
      'iliococcygeus',
      'pectineus',
      'iliacus',
      'psoas-major',
      'quadratus-lumborum',
      'diaphragm',
      'transversus-thoracis',
      'scalenus-anterior',
      'scalenus-medius',
      'longus-colli',
      'longus-capitis',
      'sternohyoid',
      'omohyoid',
      'mylohyoid',
      'digastric',
      'masseter',
      'temporalis',
    ],
    path: [
      'flexor-digitorum-longus',
      'tibialis-posterior',
      'popliteus',
      'adductor-magnus',
      'adductor-brevis',
      'pectineus',
      'iliacus',
      'psoas-major',
      'diaphragm',
      'transversus-thoracis',
      'scalenus-anterior',
      'mylohyoid',
      'masseter',
      'temporalis',
    ],
    stations: ['土踏まずの奥', 'すねの骨の裏側', 'ひざの内側の上', 'お尻の下の内側', '脚の付け根の奥', '腰の背骨の前', '胸の骨の裏側', '頭の底の骨', 'のどの上の骨', '下あごの骨'],
    side: 'both',
  },
  {
    id: 'SFAL',
    name: '腕の前シート（表層）',
    tag: '腕の前',
    color: '#BD8E56',
    oneLine: '胸の表面から二の腕・手のひらまでを面でつなぐ筋膜シート',
    track: [
      'pectoralis-major',
      'latissimus-dorsi',
      'coracobrachialis',
      'biceps-brachii',
      'pronator-teres',
      'flexor-carpi-radialis',
      'palmaris-longus',
      'flexor-carpi-ulnaris',
      'flexor-digitorum-superficialis',
      'flexor-digitorum-profundus',
      'lumbricals-hand',
    ],
    path: [
      'pectoralis-major',
      'coracobrachialis',
      'biceps-brachii',
      'pronator-teres',
      'flexor-carpi-radialis',
      'flexor-digitorum-superficialis',
      'lumbricals-hand',
    ],
    stations: ['鎖骨の内側', '胸のろっ骨', '二の腕の内側', '肘の内側の出っ張り', '手首の手のひら側', '指の手のひら側'],
    side: 'both',
  },
  {
    id: 'DFAL',
    name: '腕の前シート（親指〜胸の奥）',
    tag: '親指〜胸奥',
    color: '#A88458',
    oneLine: '親指のふくらみから力こぶ・鎖骨の下の奥までつながる深層シート',
    track: [
      'pectoralis-minor',
      'subclavius',
      'coracobrachialis',
      'biceps-brachii',
      'brachialis',
      'brachioradialis',
      'pronator-teres',
      'abductor-pollicis-brevis',
      'flexor-pollicis-brevis',
      'opponens-pollicis',
    ],
    path: [
      'pectoralis-minor',
      'coracobrachialis',
      'biceps-brachii',
      'brachialis',
      'brachioradialis',
      'abductor-pollicis-brevis',
    ],
    stations: ['胸のろっ骨（3〜5番目）', '鎖骨の下の奥', '肘の前側', '手首の親指側', '親指の付け根の骨', '親指の外側'],
    side: 'both',
  },
  {
    id: 'SBAL',
    name: '腕のうしろシート（表層）',
    tag: '腕のうしろ',
    color: '#7B9896',
    oneLine: '背中・肩から肘の外側・手の甲までを面で包む筋膜シート',
    track: [
      'trapezius',
      'deltoid',
      'triceps-brachii',
      'anconeus',
      'extensor-carpi-radialis-longus',
      'extensor-carpi-radialis-brevis',
      'extensor-digitorum',
      'extensor-digiti-minimi',
      'extensor-carpi-ulnaris',
    ],
    path: [
      'trapezius',
      'deltoid',
      'triceps-brachii',
      'anconeus',
      'extensor-carpi-radialis-longus',
      'extensor-digitorum',
    ],
    stations: ['頭のうしろのくぼみ', '背中の背骨', '肩甲骨の上の出っ張り', '肩の外側の真ん中', '肘の外側の出っ張り', '指の甲側'],
    side: 'both',
  },
  {
    id: 'DBAL',
    name: '腕のうしろシート（小指〜肩甲骨）',
    tag: '小指〜肩甲骨',
    color: '#8D829C',
    oneLine: '小指の外側から二の腕・肩甲骨の奥までつながる深層シート',
    track: [
      'levator-scapulae',
      'rhomboid-minor',
      'rhomboid-major',
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'subscapularis',
      'triceps-brachii',
      'anconeus',
      'extensor-carpi-ulnaris',
      'abductor-digiti-minimi-hand',
      'flexor-digiti-minimi-brevis-hand',
    ],
    path: [
      'levator-scapulae',
      'rhomboid-minor',
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'triceps-brachii',
      'anconeus',
      'extensor-carpi-ulnaris',
      'abductor-digiti-minimi-hand',
    ],
    stations: ['首の骨の横', '肩甲骨の内側', '肩の関節の骨', '肘の先端の骨', '手首の小指側', '小指の外側'],
    side: 'both',
  },
  {
    id: 'BFL',
    name: '背中の斜め連動シート',
    tag: '背の斜め',
    color: '#8B9974',
    oneLine: '片方の広背筋から腰の筋膜を通り、反対側のお尻・太ももへ斜めに張るシート',
    track: [
      'latissimus-dorsi',
      'gluteus-maximus',
      'vastus-lateralis',
    ],
    path: [
      'vastus-lateralis',
      'gluteus-maximus',
      'latissimus-dorsi',
    ],
    crossAt: [2],
    stations: ['二の腕の骨', '背中〜腰の筋膜シート', 'お尻の真ん中の骨', '太ももの骨', 'ひざのお皿', 'ひざのお皿の下'],
    side: 'cross',
  },
  {
    id: 'FFL',
    name: '前側の斜め連動シート',
    tag: '前の斜め',
    color: '#C6856C',
    oneLine: '片方の胸からお腹を通り、反対側の内ももへ斜めに張る筋膜シート',
    track: [
      'pectoralis-major',
      'rectus-abdominis',
      'pyramidalis',
      'adductor-longus',
    ],
    path: [
      'adductor-longus',
      'pyramidalis',
      'rectus-abdominis',
      'pectoralis-major',
    ],
    crossAt: [1],
    stations: ['二の腕の骨', '胸の下のろっ骨', '下腹の骨', '太ももの内側裏'],
    side: 'cross',
  },
];

// -------------------------------------------------------------
// MUSCLE_LAYERS — 全177筋の表層（Express: 多関節・浅層ライン）vs 深層（Local: 単関節・姿勢保持・深層ライン）分類
// Thomas Myers "Anatomy Trains" の深さ規則・Express vs Local 原則に準拠。
// -------------------------------------------------------------
export const MUSCLE_LAYERS = Object.freeze({
  // 頭部・顔面・咀嚼（24）
  'frontalis': 'surface',
  'occipitalis': 'surface',
  'epicranial-aponeurosis': 'surface',
  'temporoparietalis': 'surface',
  'orbicularis-oculi': 'surface',
  'corrugator-supercilii': 'deep',
  'procerus': 'surface',
  'nasalis': 'surface',
  'depressor-septi-nasi': 'deep',
  'levator-labii-superioris-alaeque-nasi': 'surface',
  'levator-labii-superioris': 'surface',
  'zygomaticus-minor': 'surface',
  'zygomaticus-major': 'surface',
  'levator-anguli-oris': 'deep',
  'risorius': 'surface',
  'orbicularis-oris': 'surface',
  'buccinator': 'deep',
  'depressor-anguli-oris': 'surface',
  'depressor-labii-inferioris': 'surface',
  'mentalis': 'deep',
  'masseter': 'surface',
  'temporalis': 'deep',
  'medial-pterygoid': 'deep',
  'lateral-pterygoid': 'deep',

  // 頸部・舌骨・斜角筋・椎前筋（17）
  'platysma': 'surface',
  'sternocleidomastoid': 'surface',
  'digastric': 'deep',
  'stylohyoid': 'deep',
  'mylohyoid': 'deep',
  'geniohyoid': 'deep',
  'sternohyoid': 'surface',
  'omohyoid': 'deep',
  'sternothyroid': 'deep',
  'thyrohyoid': 'deep',
  'scalenus-anterior': 'deep',
  'scalenus-medius': 'deep',
  'scalenus-posterior': 'deep',
  'longus-colli': 'deep',
  'longus-capitis': 'deep',
  'rectus-capitis-anterior': 'deep',
  'rectus-capitis-lateralis': 'deep',

  // 背部・脊柱・後頭下筋（22）
  'trapezius': 'surface',
  'latissimus-dorsi': 'surface',
  'levator-scapulae': 'deep',
  'rhomboid-major': 'deep',
  'rhomboid-minor': 'deep',
  'serratus-posterior-superior': 'deep',
  'serratus-posterior-inferior': 'deep',
  'splenius-capitis': 'surface',
  'splenius-cervicis': 'deep',
  'iliocostalis': 'surface',
  'longissimus': 'surface',
  'spinalis': 'deep',
  'semispinalis': 'deep',
  'multifidus': 'deep',
  'rotatores': 'deep',
  'interspinales': 'deep',
  'intertransversarii': 'deep',
  'levatores-costarum': 'deep',
  'rectus-capitis-posterior-major': 'deep',
  'rectus-capitis-posterior-minor': 'deep',
  'obliquus-capitis-superior': 'deep',
  'obliquus-capitis-inferior': 'deep',

  // 胸郭・横隔膜・腹壁・骨盤底（21）
  'pectoralis-major': 'surface',
  'pectoralis-minor': 'deep',
  'subclavius': 'deep',
  'serratus-anterior': 'surface',
  'external-intercostals': 'surface',
  'internal-intercostals': 'deep',
  'innermost-intercostals': 'deep',
  'transversus-thoracis': 'deep',
  'diaphragm': 'deep',
  'rectus-abdominis': 'surface',
  'pyramidalis': 'surface',
  'linea-alba': 'surface',
  'external-oblique': 'surface',
  'internal-oblique': 'deep',
  'transversus-abdominis': 'deep',
  'quadratus-lumborum': 'deep',
  'pubococcygeus': 'deep',
  'puborectalis': 'deep',
  'iliococcygeus': 'deep',
  'coccygeus': 'deep',
  'external-anal-sphincter': 'deep',

  // 肩甲帯・上腕・前腕・手内在筋（40）
  'deltoid': 'surface',
  'supraspinatus': 'deep',
  'infraspinatus': 'deep',
  'teres-minor': 'deep',
  'teres-major': 'surface',
  'subscapularis': 'deep',
  'biceps-brachii': 'surface',
  'brachialis': 'deep',
  'coracobrachialis': 'deep',
  'triceps-brachii': 'surface',
  'anconeus': 'deep',
  'brachioradialis': 'surface',
  'pronator-teres': 'surface',
  'flexor-carpi-radialis': 'surface',
  'palmaris-longus': 'surface',
  'flexor-carpi-ulnaris': 'surface',
  'flexor-digitorum-superficialis': 'surface',
  'flexor-digitorum-profundus': 'deep',
  'flexor-pollicis-longus': 'deep',
  'pronator-quadratus': 'deep',
  'supinator': 'deep',
  'extensor-carpi-radialis-longus': 'surface',
  'extensor-carpi-radialis-brevis': 'surface',
  'extensor-digitorum': 'surface',
  'extensor-digiti-minimi': 'surface',
  'extensor-carpi-ulnaris': 'surface',
  'abductor-pollicis-longus': 'deep',
  'extensor-pollicis-brevis': 'deep',
  'extensor-pollicis-longus': 'deep',
  'extensor-indicis': 'deep',
  'abductor-pollicis-brevis': 'deep',
  'flexor-pollicis-brevis': 'deep',
  'opponens-pollicis': 'deep',
  'adductor-pollicis': 'deep',
  'abductor-digiti-minimi-hand': 'deep',
  'flexor-digiti-minimi-brevis-hand': 'deep',
  'opponens-digiti-minimi-hand': 'deep',
  'lumbricals-hand': 'deep',
  'palmar-interossei': 'deep',
  'dorsal-interossei-hand': 'deep',

  // 股関節・臀部・大腿（26）
  'iliacus': 'deep',
  'psoas-major': 'deep',
  'gluteus-maximus': 'surface',
  'gluteus-medius': 'surface',
  'gluteus-minimus': 'deep',
  'tensor-fasciae-latae': 'surface',
  'piriformis': 'deep',
  'gemellus-superior': 'deep',
  'obturator-internus': 'deep',
  'gemellus-inferior': 'deep',
  'quadratus-femoris': 'deep',
  'obturator-externus': 'deep',
  'sartorius': 'surface',
  'rectus-femoris': 'surface',
  'vastus-lateralis': 'surface',
  'vastus-medialis': 'surface',
  'vastus-intermedius': 'deep',
  'pectineus': 'deep',
  'adductor-longus': 'surface',
  'adductor-brevis': 'deep',
  'adductor-magnus': 'deep',
  'adductor-minimus': 'deep',
  'gracilis': 'surface',
  'biceps-femoris': 'surface',
  'semitendinosus': 'surface',
  'semimembranosus': 'deep',

  // 下腿・足部（27）
  'tibialis-anterior': 'surface',
  'extensor-hallucis-longus': 'deep',
  'extensor-digitorum-longus': 'surface',
  'fibularis-tertius': 'surface',
  'fibularis-longus': 'surface',
  'fibularis-brevis': 'deep',
  'gastrocnemius': 'surface',
  'soleus': 'deep',
  'plantaris': 'deep',
  'calcaneal-tendon': 'surface',
  'popliteus': 'deep',
  'flexor-digitorum-longus': 'deep',
  'flexor-hallucis-longus': 'deep',
  'tibialis-posterior': 'deep',
  'extensor-digitorum-brevis': 'surface',
  'extensor-hallucis-brevis': 'surface',
  'abductor-hallucis': 'surface',
  'flexor-digitorum-brevis': 'surface',
  'abductor-digiti-minimi-foot': 'surface',
  'quadratus-plantae': 'deep',
  'lumbricals-foot': 'deep',
  'flexor-hallucis-brevis': 'deep',
  'adductor-hallucis': 'deep',
  'flexor-digiti-minimi-brevis-foot': 'deep',
  'opponens-digiti-minimi-foot': 'deep',
  'plantar-interossei': 'deep',
  'dorsal-interossei-foot': 'deep',
});

const MUSCLE_ID_ALIASES = Object.freeze({
  'semispinalis-capitis': 'semispinalis',
  'psoas-minor': 'psoas-major',
  'pelvic-floor': 'pubococcygeus',
  'levator-ani': 'pubococcygeus',
});

function normalizeMuscleId(id) {
  if (typeof id !== 'string' || !id) return '';
  const stripped = id.trim().replace(/^(left|right)-/i, '').replace(/_(l|r)$/i, '');
  return MUSCLE_ID_ALIASES[stripped] || stripped;
}

/**
 * 筋IDから表層（'surface'）か深層（'deep'）を返す。
 * @param {string} id
 * @returns {'surface' | 'deep'}
 */
export function getMuscleLayer(id) {
  const norm = normalizeMuscleId(id);
  return MUSCLE_LAYERS[norm] === 'deep' ? 'deep' : 'surface';
}

// -------------------------------------------------------------
// FASCIA_STATION_BRIDGES — 骨の駅（Station）・分岐器（Switch）・ロータリー（Roundhouse）で
// 筋膜の張力が受け渡される解剖学ブリッジ定義（全16駅グループ＋局所筋膜連結）
// -------------------------------------------------------------
export const FASCIA_STATION_BRIDGES = [
  // 1. 烏口突起（肩の前の突起：深前腕線の要衝）
  { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', lineIds: ['DFAL'], crossSide: false },
  { from: 'pectoralis-minor', to: 'coracobrachialis', stationJa: '肩の前の突起（烏口突起）', lineIds: ['DFAL'], crossSide: false },
  { from: 'coracobrachialis', to: 'brachialis', stationJa: '二の腕の骨の膜', lineIds: ['DFAL'], crossSide: false },

  // 2. 肩甲骨の内側の縁・棘突起（スイッチポイント）
  { from: 'rhomboid-major', to: 'serratus-anterior', stationJa: '肩甲骨の内側の縁', lineIds: ['SPL'], crossSide: false },
  { from: 'rhomboid-minor', to: 'serratus-anterior', stationJa: '肩甲骨の内側の縁', lineIds: ['SPL'], crossSide: false },
  { from: 'rhomboid-major', to: 'infraspinatus', stationJa: '肩甲骨の内側の縁', lineIds: ['DBAL'], crossSide: false },
  { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上角', lineIds: ['DBAL'], crossSide: false },
  { from: 'splenius-capitis', to: 'rhomboid-major', stationJa: '首〜背中の背骨の突起（左右交差）', lineIds: ['SPL'], crossSide: true },
  { from: 'splenius-cervicis', to: 'rhomboid-minor', stationJa: '首〜背中の背骨の突起（左右交差）', lineIds: ['SPL'], crossSide: true },

  // 3. ろっ骨の外側（前鋸筋と腹斜筋・肋間筋の噛み合い）
  { from: 'serratus-anterior', to: 'external-oblique', stationJa: 'ろっ骨の外側（第5〜9肋骨）', lineIds: ['SPL'], crossSide: false },
  { from: 'pectoralis-major', to: 'rectus-abdominis', stationJa: '胸の下のろっ骨軟骨', lineIds: ['SFL', 'FFL'], crossSide: false },
  { from: 'external-oblique', to: 'external-intercostals', stationJa: 'ろっ骨の横の縁', lineIds: ['LL'], crossSide: false },
  { from: 'internal-oblique', to: 'internal-intercostals', stationJa: '下のろっ骨の内側', lineIds: ['LL'], crossSide: false },

  // 4. お腹の真ん中の白線・恥骨結合（左右交差）
  { from: 'external-oblique', to: 'internal-oblique', stationJa: 'お腹の真ん中の白線（左右交差）', lineIds: ['SPL'], crossSide: true },
  { from: 'linea-alba', to: 'rectus-abdominis', stationJa: 'お腹の真ん中の白線', lineIds: ['SFL', 'FFL'], crossSide: false },
  { from: 'rectus-abdominis', to: 'adductor-longus', stationJa: '恥骨の前の腱膜（左右交差）', lineIds: ['FFL'], crossSide: true },
  { from: 'pectoralis-major', to: 'adductor-longus', stationJa: 'お腹の白線〜恥骨（左右交差）', lineIds: ['FFL'], crossSide: true },

  // 5. 腰背部の厚い筋膜（胸腰筋膜・仙骨の左右交差）
  { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '腰の後ろの厚い筋膜（左右交差）', lineIds: ['BFL'], crossSide: true },
  { from: 'gluteus-maximus', to: 'vastus-lateralis', stationJa: 'お尻の外側〜太もも外側の筋膜帯', lineIds: ['BFL', 'LL'], crossSide: false },
  { from: 'latissimus-dorsi', to: 'teres-major', stationJa: '脇のうしろの筋膜束', lineIds: ['SFAL'], crossSide: false },

  // 6. 骨盤の前の出っ張り（上前腸骨棘・ラウンドハウス）
  { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', lineIds: ['SPL', 'LL'], crossSide: false },
  { from: 'external-oblique', to: 'gluteus-medius', stationJa: '骨盤の上の縁（腸骨稜）', lineIds: ['LL'], crossSide: false },
  { from: 'gluteus-medius', to: 'tensor-fasciae-latae', stationJa: '骨盤の横の筋膜', lineIds: ['LL'], crossSide: false },
  { from: 'tensor-fasciae-latae', to: 'sartorius', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', lineIds: ['SFL', 'LL'], crossSide: false },
  { from: 'iliacus', to: 'rectus-femoris', stationJa: '骨盤の前の奥（下前腸骨棘）', lineIds: ['DFL', 'SFL'], crossSide: false },

  // 7. 恥骨・小転子・骨盤底（脚の付け根の内側中継駅）
  { from: 'rectus-abdominis', to: 'pectineus', stationJa: '下腹の恥骨の上縁', lineIds: ['SFL', 'DFL'], crossSide: false },
  { from: 'pyramidalis', to: 'adductor-longus', stationJa: '恥骨の前の結合部（左右交差）', lineIds: ['SFL', 'FFL'], crossSide: true },
  { from: 'psoas-major', to: 'pectineus', stationJa: '太ももの付け根の内側（小転子）', lineIds: ['DFL'], crossSide: false },
  { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', lineIds: ['DFL'], crossSide: false },
  { from: 'pectineus', to: 'adductor-brevis', stationJa: '太もも内側の筋膜の壁', lineIds: ['DFL'], crossSide: false },
  { from: 'adductor-longus', to: 'gracilis', stationJa: '恥骨の下の縁', lineIds: ['DFL', 'FFL'], crossSide: false },
  { from: 'adductor-magnus', to: 'pubococcygeus', stationJa: '骨盤の底の筋膜アーチ', lineIds: ['DFL'], crossSide: false },
  { from: 'obturator-internus', to: 'pubococcygeus', stationJa: '骨盤の内側の筋膜（腱弓）', lineIds: ['DFL'], crossSide: false },
  { from: 'piriformis', to: 'coccygeus', stationJa: '仙骨の前の筋膜', lineIds: ['DFL'], crossSide: false },
  { from: 'piriformis', to: 'gluteus-maximus', stationJa: '仙骨の横の靱帯（仙結節靱帯）', lineIds: ['DFL', 'SBL'], crossSide: false },

  // 8. 坐骨（お尻の下の骨）・仙結節靱帯
  { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', lineIds: ['SBL', 'SPL'], crossSide: false },
  { from: 'biceps-femoris', to: 'multifidus', stationJa: '坐骨〜仙骨の背側筋膜', lineIds: ['SBL'], crossSide: false },
  { from: 'semitendinosus', to: 'gluteus-maximus', stationJa: 'お尻の下の骨（坐骨結節）', lineIds: ['SBL'], crossSide: false },
  { from: 'semimembranosus', to: 'iliocostalis', stationJa: '坐骨〜腰背部の筋膜', lineIds: ['SBL'], crossSide: false },
  { from: 'longissimus', to: 'iliocostalis', stationJa: '背骨の横の筋膜シート', lineIds: ['SBL', 'SPL'], crossSide: false },

  // 9. ひざのお皿とすねの前の出っ張り（脛骨粗面）
  { from: 'rectus-femoris', to: 'tibialis-anterior', stationJa: 'ひざのお皿とすねの上の出っ張り', lineIds: ['SFL'], crossSide: false },
  { from: 'vastus-lateralis', to: 'tibialis-anterior', stationJa: 'ひざ外側の支帯とすねの上', lineIds: ['SFL', 'SPL'], crossSide: false },
  { from: 'vastus-medialis', to: 'tibialis-anterior', stationJa: 'ひざ内側の支帯とすねの上', lineIds: ['SFL'], crossSide: false },
  { from: 'tibialis-anterior', to: 'extensor-digitorum-longus', stationJa: 'すねの前の筋膜区画', lineIds: ['SFL'], crossSide: false },
  { from: 'extensor-digitorum-longus', to: 'extensor-digitorum-brevis', stationJa: '足首の前の支帯', lineIds: ['SFL'], crossSide: false },

  // 10. すねの外側の骨の頭（腓骨頭）と足裏のあぶみ
  { from: 'biceps-femoris', to: 'fibularis-longus', stationJa: 'ひざ下の外側の出っ張り（腓骨頭）', lineIds: ['SPL'], crossSide: false },
  { from: 'tensor-fasciae-latae', to: 'fibularis-longus', stationJa: '太もも外側の腸脛靱帯〜腓骨頭', lineIds: ['LL'], crossSide: false },
  { from: 'tibialis-anterior', to: 'fibularis-longus', stationJa: '土踏まずの骨（足裏のあぶみ）', lineIds: ['SPL'], crossSide: false },
  { from: 'fibularis-longus', to: 'fibularis-brevis', stationJa: '外くるぶしのうしろの腱鞘', lineIds: ['LL'], crossSide: false },

  // 11. ひざ裏の噛み合い・かかとの骨と足底腱膜
  { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', lineIds: ['SBL'], crossSide: false },
  { from: 'popliteus', to: 'tibialis-posterior', stationJa: 'ひざ裏の奥の筋膜', lineIds: ['DFL'], crossSide: false },
  { from: 'adductor-magnus', to: 'tibialis-posterior', stationJa: '太もも内側の腱のトンネル〜すね裏', lineIds: ['DFL'], crossSide: false },
  { from: 'tibialis-posterior', to: 'flexor-digitorum-longus', stationJa: '内くるぶしの奥のトンネル', lineIds: ['DFL'], crossSide: false },
  { from: 'gastrocnemius', to: 'calcaneal-tendon', stationJa: 'アキレス腱の合流部', lineIds: ['SBL'], crossSide: false },
  { from: 'soleus', to: 'calcaneal-tendon', stationJa: 'アキレス腱の深層合流部', lineIds: ['SBL'], crossSide: false },
  { from: 'calcaneal-tendon', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜〜足裏の腱膜', lineIds: ['SBL'], crossSide: false },
  { from: 'gastrocnemius', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨（足底腱膜の連結）', lineIds: ['SBL'], crossSide: false },
  { from: 'soleus', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜', lineIds: ['SBL'], crossSide: false },
  { from: 'flexor-digitorum-brevis', to: 'abductor-hallucis', stationJa: 'かかとの内側の足底腱膜', lineIds: ['SBL'], crossSide: false },

  // 12. みぞおちのドーム（横隔膜と腸腰筋・腰方形筋の交差）
  { from: 'diaphragm', to: 'psoas-major', stationJa: 'みぞおちの奥の横隔膜脚（内側弓状靱帯）', lineIds: ['DFL'], crossSide: false },
  { from: 'diaphragm', to: 'quadratus-lumborum', stationJa: 'ろっ骨の下縁（外側弓状靱帯）', lineIds: ['DFL'], crossSide: false },
  { from: 'diaphragm', to: 'transversus-thoracis', stationJa: 'みぞおちの剣状突起の裏', lineIds: ['DFL'], crossSide: false },
  { from: 'diaphragm', to: 'transversus-abdominis', stationJa: 'ろっ骨の内側の軟骨縁', lineIds: ['DFL'], crossSide: false },
  { from: 'transversus-thoracis', to: 'scalenus-anterior', stationJa: '胸の上の奥の筋膜ドーム', lineIds: ['DFL'], crossSide: false },
  { from: 'longus-colli', to: 'scalenus-anterior', stationJa: '首の骨の前側の筋膜（椎前筋膜）', lineIds: ['DFL'], crossSide: false },

  // 13. 鎖骨・胸骨柄（胸の上の中継駅）
  { from: 'sternocleidomastoid', to: 'pectoralis-major', stationJa: '鎖骨の内側・胸骨の上端', lineIds: ['SFL'], crossSide: false },
  { from: 'sternocleidomastoid', to: 'sternohyoid', stationJa: '胸骨の上端の裏側', lineIds: ['SFL', 'DFL'], crossSide: false },
  { from: 'subclavius', to: 'pectoralis-minor', stationJa: '鎖骨の下の胸筋膜（鎖骨胸筋筋膜）', lineIds: ['DFAL'], crossSide: false },
  { from: 'trapezius', to: 'deltoid', stationJa: '鎖骨の外側と肩峰（肩の屋根）', lineIds: ['SBAL'], crossSide: false },

  // 14. 耳の後ろの骨（乳様突起）・後頭骨稜・帽状腱膜
  { from: 'sternocleidomastoid', to: 'splenius-capitis', stationJa: '耳の後ろの出っ張り骨（乳様突起）', lineIds: ['LL'], crossSide: false },
  { from: 'semispinalis', to: 'occipitalis', stationJa: '頭のうしろの骨の段差（上項線）', lineIds: ['SBL'], crossSide: false },
  { from: 'rectus-capitis-posterior-minor', to: 'occipitalis', stationJa: '頭の付け根の奥（後頭骨）', lineIds: ['SBL'], crossSide: false },
  { from: 'occipitalis', to: 'epicranial-aponeurosis', stationJa: '後頭部の帽状腱膜', lineIds: ['SBL'], crossSide: false },
  { from: 'epicranial-aponeurosis', to: 'frontalis', stationJa: '頭頂の帽状腱膜〜おでこ', lineIds: ['SBL'], crossSide: false },
  { from: 'frontalis', to: 'orbicularis-oculi', stationJa: 'まゆ毛の骨の縁', lineIds: ['SBL'], crossSide: false },

  // 15. 下あごの骨・舌骨（のど仏の上の浮いた骨）
  { from: 'masseter', to: 'temporalis', stationJa: 'ほお骨のアーチと下あごの突起', lineIds: ['DFL'], crossSide: false },
  { from: 'medial-pterygoid', to: 'mylohyoid', stationJa: '下あごの内側の縁', lineIds: ['DFL'], crossSide: false },
  { from: 'digastric', to: 'sternohyoid', stationJa: 'のどの上の浮いた骨（舌骨）', lineIds: ['DFL'], crossSide: false },
  { from: 'omohyoid', to: 'scalenus-anterior', stationJa: '首の前の筋膜ループ（舌骨〜肩甲骨）', lineIds: ['DFL'], crossSide: false },
  { from: 'platysma', to: 'depressor-anguli-oris', stationJa: '下あごの縁の筋膜', lineIds: ['SFL'], crossSide: false },
  { from: 'zygomaticus-major', to: 'orbicularis-oris', stationJa: '口角の筋膜の結び目（モダイオラス）', lineIds: ['SFL'], crossSide: false },

  // 16. 肘の内側・外側の出っ張り（上顆）と手首の骨
  { from: 'biceps-brachii', to: 'supinator', stationJa: '肘の前側の橈骨粗面', lineIds: ['DFAL'], crossSide: false },
  { from: 'biceps-brachii', to: 'pronator-teres', stationJa: '肘の内側の上腕二頭筋腱膜', lineIds: ['DFAL', 'SFAL'], crossSide: false },
  { from: 'supinator', to: 'abductor-pollicis-brevis', stationJa: '手首の親指側の骨（茎状突起）', lineIds: ['DFAL'], crossSide: false },
  { from: 'flexor-pollicis-longus', to: 'flexor-pollicis-brevis', stationJa: '手首のトンネル（手根管）〜親指の付け根', lineIds: ['DFAL'], crossSide: false },
  { from: 'pectoralis-major', to: 'pronator-teres', stationJa: '二の腕の内側の筋間中隔〜内側上顆', lineIds: ['SFAL'], crossSide: false },
  { from: 'pronator-teres', to: 'flexor-carpi-radialis', stationJa: '肘の内側の出っ張り（内側上顆）', lineIds: ['SFAL'], crossSide: false },
  { from: 'flexor-carpi-radialis', to: 'flexor-digitorum-superficialis', stationJa: '手首の手のひら側の支帯（屈筋支帯）', lineIds: ['SFAL'], crossSide: false },
  { from: 'deltoid', to: 'brachioradialis', stationJa: '二の腕の外側の筋間中隔', lineIds: ['SBAL'], crossSide: false },
  { from: 'brachioradialis', to: 'extensor-carpi-radialis-longus', stationJa: '肘の外側の出っ張り（外側上顆）', lineIds: ['SBAL'], crossSide: false },
  { from: 'extensor-carpi-radialis-longus', to: 'extensor-digitorum', stationJa: '手首の甲側の支帯（伸筋支帯）', lineIds: ['SBAL'], crossSide: false },
  { from: 'infraspinatus', to: 'triceps-brachii', stationJa: '肩関節のうしろ〜二の腕の裏', lineIds: ['DBAL'], crossSide: false },
  { from: 'triceps-brachii', to: 'extensor-carpi-ulnaris', stationJa: '肘の先端の骨（肘頭）〜尺骨の縁', lineIds: ['DBAL'], crossSide: false },
  { from: 'extensor-carpi-ulnaris', to: 'abductor-digiti-minimi-hand', stationJa: '手首の小指側の豆状骨', lineIds: ['DBAL'], crossSide: false },
];

// 単独筋および経線末端・深層補助筋を主要筋膜ラインへ結ぶ局所筋膜連結マップ
const LOCAL_FASCIA_NEIGHBORS = Object.freeze({
  'temporoparietalis': { linked: ['epicranial-aponeurosis', 'temporalis', 'occipitalis'], stationJa: '側頭部の筋膜〜帽状腱膜', lineIds: ['SBL', 'DFL'] },
  'orbicularis-oculi': { linked: ['frontalis', 'corrugator-supercilii', 'zygomaticus-minor'], stationJa: 'まゆ毛と目のまわりの骨縁', lineIds: ['SBL'] },
  'corrugator-supercilii': { linked: ['frontalis', 'procerus', 'orbicularis-oculi'], stationJa: '眉間の骨膜', lineIds: ['SBL'] },
  'procerus': { linked: ['frontalis', 'corrugator-supercilii', 'nasalis'], stationJa: '眉間〜鼻根の筋膜', lineIds: ['SBL'] },
  'nasalis': { linked: ['procerus', 'levator-labii-superioris-alaeque-nasi', 'depressor-septi-nasi'], stationJa: '鼻軟骨〜上あごの筋膜', lineIds: ['SBL', 'SFL'] },
  'depressor-septi-nasi': { linked: ['orbicularis-oris', 'nasalis', 'levator-labii-superioris'], stationJa: '鼻の下の上あご骨膜', lineIds: ['SFL'] },
  'levator-labii-superioris-alaeque-nasi': { linked: ['levator-labii-superioris', 'orbicularis-oculi', 'orbicularis-oris'], stationJa: '目頭の下〜上唇の筋膜', lineIds: ['SFL'] },
  'levator-labii-superioris': { linked: ['zygomaticus-minor', 'orbicularis-oris', 'orbicularis-oculi'], stationJa: 'ほおの上部〜上唇の筋膜', lineIds: ['SFL'] },
  'zygomaticus-minor': { linked: ['zygomaticus-major', 'levator-labii-superioris', 'orbicularis-oris'], stationJa: 'ほお骨の前面〜上唇', lineIds: ['SFL'] },
  'zygomaticus-major': { linked: ['orbicularis-oris', 'risorius', 'masseter'], stationJa: 'ほお骨〜口角の結び目', lineIds: ['SFL', 'DFL'] },
  'levator-anguli-oris': { linked: ['orbicularis-oris', 'zygomaticus-major', 'buccinator'], stationJa: '上あごのくぼみ〜口角', lineIds: ['DFL'] },
  'risorius': { linked: ['platysma', 'masseter', 'orbicularis-oris'], stationJa: 'えらの前の咬筋筋膜〜口角', lineIds: ['SFL', 'DFL'] },
  'orbicularis-oris': { linked: ['buccinator', 'zygomaticus-major', 'depressor-anguli-oris'], stationJa: '口角の筋膜の結び目（モダイオラス）', lineIds: ['SFL', 'DFL'] },
  'buccinator': { linked: ['orbicularis-oris', 'masseter', 'medial-pterygoid'], stationJa: '奥歯のうしろの筋膜縫線', lineIds: ['DFL'] },
  'depressor-anguli-oris': { linked: ['platysma', 'orbicularis-oris', 'depressor-labii-inferioris'], stationJa: '下あごの縁〜口角', lineIds: ['SFL'] },
  'depressor-labii-inferioris': { linked: ['platysma', 'mentalis', 'orbicularis-oris'], stationJa: '下あごの前面〜下唇', lineIds: ['SFL'] },
  'mentalis': { linked: ['depressor-labii-inferioris', 'orbicularis-oris', 'platysma'], stationJa: 'あご先の骨膜', lineIds: ['SFL'] },
  'masseter': { linked: ['temporalis', 'medial-pterygoid', 'sternocleidomastoid', 'scalenus-anterior'], stationJa: 'ほお骨のアーチ〜下あごの角', lineIds: ['DFL'] },
  'temporalis': { linked: ['masseter', 'medial-pterygoid', 'epicranial-aponeurosis', 'scalenus-anterior'], stationJa: 'こめかみの側頭筋膜〜下あごの突起', lineIds: ['DFL'] },
  'medial-pterygoid': { linked: ['masseter', 'temporalis', 'mylohyoid', 'scalenus-anterior'], stationJa: '下あごの内側の角（翼突筋スリング）', lineIds: ['DFL'] },
  'lateral-pterygoid': { linked: ['medial-pterygoid', 'stylohyoid', 'longus-capitis', 'scalenus-anterior'], stationJa: 'あごの関節円板〜頭蓋底の蝶形骨', lineIds: ['DFL'] },
  'platysma': { linked: ['pectoralis-major', 'sternocleidomastoid', 'depressor-anguli-oris'], stationJa: '鎖骨の上の筋膜〜下あごの縁', lineIds: ['SFL'] },
  'digastric': { linked: ['mylohyoid', 'stylohyoid', 'sternohyoid', 'omohyoid'], stationJa: 'のどの上の浮いた骨（舌骨の腱ループ）', lineIds: ['DFL'] },
  'stylohyoid': { linked: ['digastric', 'mylohyoid', 'geniohyoid', 'longus-capitis'], stationJa: '耳の奥の突起〜舌骨', lineIds: ['DFL'] },
  'geniohyoid': { linked: ['mylohyoid', 'digastric', 'stylohyoid', 'thyrohyoid'], stationJa: '下あごの裏〜舌骨', lineIds: ['DFL'] },
  'sternothyroid': { linked: ['sternohyoid', 'omohyoid', 'transversus-thoracis', 'scalenus-anterior'], stationJa: '胸骨の裏側〜のど仏の軟骨', lineIds: ['SFL', 'DFL'] },
  'thyrohyoid': { linked: ['geniohyoid', 'mylohyoid', 'digastric', 'scalenus-anterior'], stationJa: 'のど仏の軟骨〜舌骨', lineIds: ['DFL'] },
  'scalenus-posterior': { linked: ['scalenus-medius', 'scalenus-anterior', 'levator-scapulae', 'serratus-anterior'], stationJa: '首の横突起〜第2ろっ骨', lineIds: ['DFL'] },
  'rectus-capitis-anterior': { linked: ['longus-capitis', 'longus-colli', 'rectus-capitis-lateralis', 'scalenus-anterior'], stationJa: '頭の底の骨〜第1頸椎の前側', lineIds: ['DFL'] },
  'rectus-capitis-lateralis': { linked: ['rectus-capitis-anterior', 'obliquus-capitis-superior', 'scalenus-medius'], stationJa: '環椎（第1頸椎）の横突起', lineIds: ['DFL', 'SBL'] },
  'obliquus-capitis-superior': { linked: ['rectus-capitis-posterior-major', 'rectus-capitis-posterior-minor', 'obliquus-capitis-inferior', 'semispinalis'], stationJa: '第1頸椎の横突起〜後頭骨', lineIds: ['SBL'] },
  'obliquus-capitis-inferior': { linked: ['rectus-capitis-posterior-major', 'obliquus-capitis-superior', 'splenius-capitis', 'semispinalis'], stationJa: '第2頸椎の棘突起〜第1頸椎の横突起', lineIds: ['SBL', 'SPL'] },
  'serratus-posterior-superior': { linked: ['rhomboid-minor', 'splenius-cervicis', 'external-intercostals'], stationJa: '上部のろっ骨の後面', lineIds: ['SPL', 'DBAL'] },
  'serratus-posterior-inferior': { linked: ['latissimus-dorsi', 'iliocostalis', 'quadratus-lumborum'], stationJa: '胸腰筋膜と下部のろっ骨', lineIds: ['SBL', 'BFL'] },
  'rotatores': { linked: ['multifidus', 'semispinalis', 'intertransversarii'], stationJa: '背骨の椎弓と横突起', lineIds: ['SBL'] },
  'interspinales': { linked: ['multifidus', 'spinalis', 'semispinalis'], stationJa: '背骨の棘突起のあいだ', lineIds: ['SBL'] },
  'intertransversarii': { linked: ['multifidus', 'quadratus-lumborum', 'longissimus'], stationJa: '背骨の横突起のあいだ', lineIds: ['SBL', 'DFL'] },
  'levatores-costarum': { linked: ['external-intercostals', 'iliocostalis', 'longissimus'], stationJa: '背骨の横突起〜ろっ骨角', lineIds: ['SBL', 'LL'] },
  'innermost-intercostals': { linked: ['internal-intercostals', 'diaphragm', 'transversus-thoracis'], stationJa: 'ろっ骨の内側の胸内筋膜', lineIds: ['DFL', 'LL'] },
  'transversus-abdominis': { linked: ['internal-oblique', 'quadratus-lumborum', 'linea-alba', 'pubococcygeus'], stationJa: 'お腹の深層コルセット〜胸腰筋膜', lineIds: ['DFL'] },
  'puborectalis': { linked: ['pubococcygeus', 'iliococcygeus', 'coccygeus', 'obturator-internus'], stationJa: '恥骨の裏〜骨盤底のハンモック', lineIds: ['DFL'] },
  'external-anal-sphincter': { linked: ['puborectalis', 'pubococcygeus', 'iliococcygeus'], stationJa: '骨盤底の中心腱', lineIds: ['DFL'] },
  'pronator-quadratus': { linked: ['flexor-pollicis-longus', 'flexor-digitorum-profundus', 'pronator-teres', 'abductor-pollicis-brevis'], stationJa: '手首の奥の骨間膜', lineIds: ['DFAL'] },
  'abductor-pollicis-longus': { linked: ['extensor-pollicis-brevis', 'supinator', 'abductor-pollicis-brevis'], stationJa: '前腕の骨間膜〜親指の付け根', lineIds: ['DFAL', 'SBAL'] },
  'extensor-pollicis-brevis': { linked: ['abductor-pollicis-longus', 'extensor-pollicis-longus', 'brachioradialis'], stationJa: '手首の親指側の腱鞘', lineIds: ['SBAL', 'DFAL'] },
  'extensor-pollicis-longus': { linked: ['extensor-pollicis-brevis', 'extensor-indicis', 'extensor-carpi-radialis-brevis'], stationJa: '橈骨背側の突起（リスター結節）', lineIds: ['SBAL'] },
  'extensor-indicis': { linked: ['extensor-digitorum', 'extensor-pollicis-longus', 'extensor-carpi-ulnaris'], stationJa: '手首の甲側の伸筋支帯', lineIds: ['SBAL'] },
  'adductor-pollicis': { linked: ['flexor-pollicis-brevis', 'opponens-pollicis', 'palmar-interossei', 'flexor-digitorum-profundus'], stationJa: '手のひらの中手骨〜親指の付け根', lineIds: ['DFAL'] },
  'opponens-digiti-minimi-hand': { linked: ['abductor-digiti-minimi-hand', 'flexor-digiti-minimi-brevis-hand', 'palmar-interossei', 'flexor-carpi-ulnaris'], stationJa: '手首の有鈎骨〜小指の中手骨', lineIds: ['DBAL'] },
  'lumbricals-hand': { linked: ['flexor-digitorum-profundus', 'flexor-digitorum-superficialis', 'palmar-interossei'], stationJa: '手のひらの深屈筋腱', lineIds: ['SFAL', 'DFAL'] },
  'palmar-interossei': { linked: ['adductor-pollicis', 'lumbricals-hand', 'abductor-digiti-minimi-hand'], stationJa: '手のひらの中手骨の膜', lineIds: ['DFAL', 'DBAL'] },
  'dorsal-interossei-hand': { linked: ['extensor-digitorum', 'abductor-digiti-minimi-hand', 'adductor-pollicis'], stationJa: '手の甲の中手骨の膜', lineIds: ['SBAL', 'DBAL'] },
  'gluteus-minimus': { linked: ['gluteus-medius', 'tensor-fasciae-latae', 'gemellus-superior', 'vastus-lateralis'], stationJa: '骨盤の外側面〜太ももの大転子前縁', lineIds: ['LL'] },
  'gemellus-superior': { linked: ['piriformis', 'obturator-internus', 'gluteus-minimus'], stationJa: '太ももの外側の出っ張り（大転子）', lineIds: ['DFL'] },
  'gemellus-inferior': { linked: ['obturator-internus', 'quadratus-femoris', 'piriformis'], stationJa: '太ももの外側の出っ張り（大転子）', lineIds: ['DFL'] },
  'quadratus-femoris': { linked: ['gemellus-inferior', 'adductor-magnus', 'gluteus-maximus'], stationJa: '坐骨〜大腿骨の後面', lineIds: ['DFL', 'SBL'] },
  'obturator-externus': { linked: ['obturator-internus', 'pectineus', 'adductor-brevis'], stationJa: '骨盤の閉鎖膜〜大腿骨頸部', lineIds: ['DFL'] },
  'sartorius': { linked: ['tensor-fasciae-latae', 'iliacus', 'gracilis'], stationJa: '骨盤の前〜ひざ内側の鵞足', lineIds: ['SFL', 'DFL'] },
  'fibularis-tertius': { linked: ['extensor-digitorum-longus', 'tibialis-anterior', 'extensor-digitorum-brevis', 'dorsal-interossei-foot'], stationJa: 'すねの下部〜足の小指側の甲（第5中足骨底）', lineIds: ['SFL'] },
  'plantaris': { linked: ['gastrocnemius', 'soleus', 'calcaneal-tendon', 'popliteus'], stationJa: 'ひざ裏の外側上顆〜かかとの骨', lineIds: ['SBL'] },
  'quadratus-plantae': { linked: ['flexor-digitorum-longus', 'flexor-digitorum-brevis', 'lumbricals-foot', 'calcaneal-tendon'], stationJa: 'かかとの骨の足底面〜長趾屈筋腱', lineIds: ['SBL', 'DFL'] },
  'lumbricals-foot': { linked: ['flexor-digitorum-longus', 'quadratus-plantae', 'flexor-digitorum-brevis'], stationJa: '足裏の長趾屈筋腱', lineIds: ['SBL', 'DFL'] },
  'flexor-hallucis-brevis': { linked: ['abductor-hallucis', 'flexor-hallucis-longus', 'adductor-hallucis'], stationJa: '足の親指の付け根（種子骨）', lineIds: ['SBL', 'DFL'] },
  'adductor-hallucis': { linked: ['flexor-hallucis-brevis', 'tibialis-posterior', 'fibularis-longus'], stationJa: '足裏の横アーチの靭帯', lineIds: ['DFL', 'SPL'] },
  'flexor-digiti-minimi-brevis-foot': { linked: ['abductor-digiti-minimi-foot', 'opponens-digiti-minimi-foot', 'fibularis-brevis'], stationJa: '足の小指側（第5中足骨底）', lineIds: ['SBL', 'LL'] },
  'opponens-digiti-minimi-foot': { linked: ['abductor-digiti-minimi-foot', 'flexor-digiti-minimi-brevis-foot', 'fibularis-longus'], stationJa: '足裏外側の立方骨鞘', lineIds: ['SBL', 'LL'] },
  'plantar-interossei': { linked: ['quadratus-plantae', 'adductor-hallucis', 'tibialis-posterior'], stationJa: '足裏の中足骨の膜', lineIds: ['DFL', 'SBL'] },
  'dorsal-interossei-foot': { linked: ['extensor-digitorum-brevis', 'extensor-digitorum-longus', 'fibularis-tertius'], stationJa: '足の甲の中足骨の膜', lineIds: ['SFL'] },
});

// -------------------------------------------------------------
// ANTAGONIST_MAP — 全177筋の表裏拮抗（Locked-Short に対して Locked-Long で張る対側筋）マップ
// -------------------------------------------------------------
export const ANTAGONIST_MAP = {
  // 頭部・顔面・咀嚼（24）
  'frontalis': ['corrugator-supercilii', 'procerus', 'orbicularis-oculi'],
  'occipitalis': ['sternocleidomastoid', 'longus-capitis', 'frontalis'],
  'epicranial-aponeurosis': ['sternocleidomastoid', 'platysma', 'masseter'],
  'temporoparietalis': ['masseter', 'platysma', 'depressor-anguli-oris'],
  'orbicularis-oculi': ['frontalis', 'levator-labii-superioris', 'occipitalis'],
  'corrugator-supercilii': ['frontalis', 'occipitalis', 'epicranial-aponeurosis'],
  'procerus': ['frontalis', 'occipitalis', 'epicranial-aponeurosis'],
  'nasalis': ['frontalis', 'orbicularis-oris', 'levator-labii-superioris'],
  'depressor-septi-nasi': ['frontalis', 'nasalis', 'levator-labii-superioris-alaeque-nasi'],
  'levator-labii-superioris-alaeque-nasi': ['depressor-labii-inferioris', 'depressor-anguli-oris', 'platysma'],
  'levator-labii-superioris': ['depressor-labii-inferioris', 'depressor-anguli-oris', 'platysma'],
  'zygomaticus-minor': ['depressor-anguli-oris', 'depressor-labii-inferioris', 'platysma'],
  'zygomaticus-major': ['depressor-anguli-oris', 'platysma', 'depressor-labii-inferioris'],
  'levator-anguli-oris': ['depressor-anguli-oris', 'platysma', 'mentalis'],
  'risorius': ['orbicularis-oris', 'buccinator', 'mentalis'],
  'orbicularis-oris': ['zygomaticus-major', 'risorius', 'depressor-anguli-oris'],
  'buccinator': ['masseter', 'risorius', 'zygomaticus-major'],
  'depressor-anguli-oris': ['zygomaticus-major', 'levator-anguli-oris', 'levator-labii-superioris'],
  'depressor-labii-inferioris': ['levator-labii-superioris', 'orbicularis-oris', 'zygomaticus-minor'],
  'mentalis': ['depressor-labii-inferioris', 'platysma', 'digastric'],
  'masseter': ['digastric', 'mylohyoid', 'splenius-capitis', 'semispinalis'],
  'temporalis': ['digastric', 'mylohyoid', 'geniohyoid', 'splenius-capitis'],
  'medial-pterygoid': ['digastric', 'mylohyoid', 'lateral-pterygoid'],
  'lateral-pterygoid': ['masseter', 'temporalis', 'digastric'],

  // 頸部・舌骨・斜角筋・椎前筋（17）
  'platysma': ['splenius-capitis', 'semispinalis', 'zygomaticus-major'],
  'sternocleidomastoid': ['splenius-capitis', 'semispinalis', 'longus-colli', 'splenius-cervicis'],
  'digastric': ['masseter', 'temporalis', 'medial-pterygoid'],
  'stylohyoid': ['sternohyoid', 'omohyoid', 'sternothyroid'],
  'mylohyoid': ['masseter', 'temporalis', 'sternohyoid'],
  'geniohyoid': ['masseter', 'sternohyoid', 'omohyoid'],
  'sternohyoid': ['digastric', 'mylohyoid', 'splenius-capitis'],
  'omohyoid': ['digastric', 'stylohyoid', 'trapezius'],
  'sternothyroid': ['thyrohyoid', 'digastric', 'semispinalis'],
  'thyrohyoid': ['sternothyroid', 'sternohyoid', 'omohyoid'],
  'scalenus-anterior': ['splenius-capitis', 'semispinalis', 'splenius-cervicis', 'levator-scapulae'],
  'scalenus-medius': ['splenius-capitis', 'splenius-cervicis', 'semispinalis'],
  'scalenus-posterior': ['splenius-cervicis', 'semispinalis', 'rhomboid-minor'],
  'longus-colli': ['semispinalis', 'splenius-capitis', 'rectus-capitis-posterior-major'],
  'longus-capitis': ['rectus-capitis-posterior-major', 'rectus-capitis-posterior-minor', 'semispinalis'],
  'rectus-capitis-anterior': ['rectus-capitis-posterior-minor', 'rectus-capitis-posterior-major', 'obliquus-capitis-superior'],
  'rectus-capitis-lateralis': ['obliquus-capitis-inferior', 'splenius-capitis', 'sternocleidomastoid'],

  // 背部・脊柱・後頭下筋（22）
  'trapezius': ['pectoralis-minor', 'serratus-anterior', 'pectoralis-major', 'subclavius'],
  'latissimus-dorsi': ['deltoid', 'supraspinatus', 'pectoralis-minor', 'serratus-anterior'],
  'levator-scapulae': ['serratus-anterior', 'pectoralis-minor', 'trapezius'],
  'rhomboid-major': ['pectoralis-minor', 'serratus-anterior', 'pectoralis-major', 'subclavius'],
  'rhomboid-minor': ['pectoralis-minor', 'subclavius', 'serratus-anterior'],
  'serratus-posterior-superior': ['pectoralis-minor', 'internal-intercostals', 'transversus-thoracis'],
  'serratus-posterior-inferior': ['external-oblique', 'rectus-abdominis', 'diaphragm'],
  'splenius-capitis': ['sternocleidomastoid', 'scalenus-anterior', 'longus-capitis'],
  'splenius-cervicis': ['sternocleidomastoid', 'scalenus-anterior', 'longus-colli'],
  'iliocostalis': ['rectus-abdominis', 'external-oblique', 'internal-oblique', 'psoas-major'],
  'longissimus': ['rectus-abdominis', 'psoas-major', 'external-oblique', 'iliacus'],
  'spinalis': ['rectus-abdominis', 'transversus-abdominis', 'psoas-major'],
  'semispinalis': ['sternocleidomastoid', 'longus-colli', 'scalenus-anterior'],
  'multifidus': ['psoas-major', 'rectus-abdominis', 'transversus-abdominis', 'iliacus'],
  'rotatores': ['internal-oblique', 'external-oblique', 'transversus-abdominis'],
  'interspinales': ['rectus-abdominis', 'longus-colli', 'psoas-major'],
  'intertransversarii': ['external-oblique', 'internal-oblique', 'scalenus-medius'],
  'levatores-costarum': ['internal-intercostals', 'transversus-thoracis', 'internal-oblique'],
  'rectus-capitis-posterior-major': ['longus-capitis', 'longus-colli', 'rectus-capitis-anterior'],
  'rectus-capitis-posterior-minor': ['longus-capitis', 'rectus-capitis-anterior', 'longus-colli'],
  'obliquus-capitis-superior': ['longus-capitis', 'rectus-capitis-anterior', 'sternocleidomastoid'],
  'obliquus-capitis-inferior': ['longus-colli', 'sternocleidomastoid', 'scalenus-anterior'],

  // 胸郭・横隔膜・腹壁・骨盤底（21）
  'pectoralis-major': ['rhomboid-major', 'infraspinatus', 'trapezius', 'teres-minor'],
  'pectoralis-minor': ['rhomboid-major', 'rhomboid-minor', 'trapezius', 'infraspinatus'],
  'subclavius': ['rhomboid-minor', 'trapezius', 'infraspinatus'],
  'serratus-anterior': ['rhomboid-major', 'rhomboid-minor', 'levator-scapulae'],
  'external-intercostals': ['internal-intercostals', 'transversus-thoracis', 'quadratus-lumborum'],
  'internal-intercostals': ['external-intercostals', 'serratus-posterior-superior', 'diaphragm'],
  'innermost-intercostals': ['external-intercostals', 'diaphragm', 'levatores-costarum'],
  'transversus-thoracis': ['iliocostalis', 'longissimus', 'external-intercostals'],
  'diaphragm': ['longissimus', 'iliocostalis', 'transversus-abdominis', 'splenius-cervicis'],
  'rectus-abdominis': ['longissimus', 'iliocostalis', 'multifidus', 'spinalis'],
  'pyramidalis': ['multifidus', 'gluteus-maximus', 'longissimus'],
  'linea-alba': ['longissimus', 'multifidus', 'iliocostalis'],
  'external-oblique': ['longissimus', 'multifidus', 'gluteus-medius', 'quadratus-lumborum'],
  'internal-oblique': ['multifidus', 'gluteus-medius', 'longissimus'],
  'transversus-abdominis': ['multifidus', 'longissimus', 'diaphragm'],
  'quadratus-lumborum': ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
  'pubococcygeus': ['diaphragm', 'rectus-abdominis', 'gluteus-maximus'],
  'puborectalis': ['diaphragm', 'gluteus-maximus', 'piriformis'],
  'iliococcygeus': ['diaphragm', 'gluteus-medius', 'piriformis'],
  'coccygeus': ['iliacus', 'psoas-major', 'diaphragm'],
  'external-anal-sphincter': ['diaphragm', 'transversus-abdominis', 'gluteus-maximus'],

  // 肩甲帯・上腕・前腕・手内在筋（40）
  'deltoid': ['latissimus-dorsi', 'pectoralis-major', 'teres-major'],
  'supraspinatus': ['latissimus-dorsi', 'pectoralis-major', 'subscapularis'],
  'infraspinatus': ['subscapularis', 'pectoralis-major', 'pectoralis-minor'],
  'teres-minor': ['subscapularis', 'pectoralis-major', 'latissimus-dorsi'],
  'teres-major': ['supraspinatus', 'infraspinatus', 'deltoid'],
  'subscapularis': ['infraspinatus', 'teres-minor', 'rhomboid-major'],
  'biceps-brachii': ['triceps-brachii', 'anconeus', 'infraspinatus'],
  'brachialis': ['triceps-brachii', 'anconeus', 'deltoid'],
  'coracobrachialis': ['deltoid', 'triceps-brachii', 'infraspinatus'],
  'triceps-brachii': ['biceps-brachii', 'brachialis', 'brachioradialis'],
  'anconeus': ['biceps-brachii', 'brachialis', 'pronator-teres'],
  'brachioradialis': ['triceps-brachii', 'supinator', 'extensor-carpi-ulnaris'],
  'pronator-teres': ['supinator', 'biceps-brachii', 'infraspinatus', 'extensor-carpi-radialis-brevis'],
  'flexor-carpi-radialis': ['extensor-carpi-radialis-longus', 'extensor-carpi-radialis-brevis', 'extensor-digitorum'],
  'palmaris-longus': ['extensor-digitorum', 'extensor-carpi-radialis-brevis', 'triceps-brachii'],
  'flexor-carpi-ulnaris': ['extensor-carpi-ulnaris', 'extensor-digiti-minimi', 'extensor-digitorum'],
  'flexor-digitorum-superficialis': ['extensor-digitorum', 'extensor-carpi-radialis-longus', 'triceps-brachii'],
  'flexor-digitorum-profundus': ['extensor-digitorum', 'extensor-indicis', 'extensor-digiti-minimi'],
  'flexor-pollicis-longus': ['extensor-pollicis-longus', 'extensor-pollicis-brevis', 'abductor-pollicis-longus'],
  'pronator-quadratus': ['supinator', 'biceps-brachii', 'extensor-carpi-radialis-longus'],
  'supinator': ['pronator-teres', 'pronator-quadratus', 'flexor-carpi-radialis'],
  'extensor-carpi-radialis-longus': ['flexor-carpi-radialis', 'flexor-carpi-ulnaris', 'pronator-teres'],
  'extensor-carpi-radialis-brevis': ['flexor-carpi-radialis', 'palmaris-longus', 'flexor-digitorum-superficialis'],
  'extensor-digitorum': ['flexor-digitorum-superficialis', 'flexor-digitorum-profundus', 'palmaris-longus'],
  'extensor-digiti-minimi': ['flexor-digitorum-superficialis', 'flexor-digiti-minimi-brevis-hand', 'flexor-carpi-ulnaris'],
  'extensor-carpi-ulnaris': ['flexor-carpi-radialis', 'flexor-carpi-ulnaris', 'abductor-pollicis-longus'],
  'abductor-pollicis-longus': ['adductor-pollicis', 'flexor-pollicis-brevis', 'opponens-pollicis'],
  'extensor-pollicis-brevis': ['flexor-pollicis-brevis', 'flexor-pollicis-longus', 'opponens-pollicis'],
  'extensor-pollicis-longus': ['flexor-pollicis-longus', 'flexor-pollicis-brevis', 'adductor-pollicis'],
  'extensor-indicis': ['flexor-digitorum-profundus', 'flexor-digitorum-superficialis', 'lumbricals-hand'],
  'abductor-pollicis-brevis': ['adductor-pollicis', 'extensor-pollicis-longus', 'rhomboid-major'],
  'flexor-pollicis-brevis': ['extensor-pollicis-brevis', 'extensor-pollicis-longus', 'abductor-pollicis-longus'],
  'opponens-pollicis': ['extensor-pollicis-longus', 'abductor-pollicis-longus', 'extensor-digitorum'],
  'adductor-pollicis': ['abductor-pollicis-brevis', 'abductor-pollicis-longus', 'extensor-pollicis-brevis'],
  'abductor-digiti-minimi-hand': ['palmar-interossei', 'flexor-pollicis-brevis', 'adductor-pollicis'],
  'flexor-digiti-minimi-brevis-hand': ['extensor-digiti-minimi', 'extensor-digitorum', 'extensor-carpi-ulnaris'],
  'opponens-digiti-minimi-hand': ['extensor-digiti-minimi', 'extensor-carpi-ulnaris', 'dorsal-interossei-hand'],
  'lumbricals-hand': ['extensor-digitorum', 'dorsal-interossei-hand', 'flexor-digitorum-superficialis'],
  'palmar-interossei': ['dorsal-interossei-hand', 'abductor-digiti-minimi-hand', 'abductor-pollicis-brevis'],
  'dorsal-interossei-hand': ['palmar-interossei', 'adductor-pollicis', 'flexor-digitorum-superficialis'],

  // 股関節・臀部・大腿（26）
  'iliacus': ['gluteus-maximus', 'biceps-femoris', 'multifidus', 'semitendinosus'],
  'psoas-major': ['gluteus-maximus', 'multifidus', 'longissimus', 'biceps-femoris'],
  'gluteus-maximus': ['psoas-major', 'iliacus', 'rectus-femoris', 'pectineus'],
  'gluteus-medius': ['adductor-longus', 'adductor-magnus', 'quadratus-lumborum', 'pectineus'],
  'gluteus-minimus': ['adductor-brevis', 'adductor-longus', 'piriformis', 'quadratus-lumborum'],
  'tensor-fasciae-latae': ['gluteus-maximus', 'piriformis', 'adductor-magnus', 'semimembranosus'],
  'piriformis': ['tensor-fasciae-latae', 'adductor-longus', 'gluteus-minimus', 'pectineus'],
  'gemellus-superior': ['tensor-fasciae-latae', 'gluteus-minimus', 'adductor-longus'],
  'obturator-internus': ['tensor-fasciae-latae', 'adductor-longus', 'pectineus'],
  'gemellus-inferior': ['tensor-fasciae-latae', 'gluteus-minimus', 'adductor-brevis'],
  'quadratus-femoris': ['tensor-fasciae-latae', 'iliacus', 'gluteus-minimus'],
  'obturator-externus': ['gluteus-minimus', 'tensor-fasciae-latae', 'gluteus-medius'],
  'sartorius': ['gluteus-maximus', 'semimembranosus', 'biceps-femoris'],
  'rectus-femoris': ['biceps-femoris', 'semitendinosus', 'gluteus-maximus', 'semimembranosus'],
  'vastus-lateralis': ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
  'vastus-medialis': ['semimembranosus', 'semitendinosus', 'biceps-femoris'],
  'vastus-intermedius': ['biceps-femoris', 'semimembranosus', 'popliteus'],
  'pectineus': ['gluteus-medius', 'piriformis', 'gluteus-maximus'],
  'adductor-longus': ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae', 'piriformis'],
  'adductor-brevis': ['gluteus-medius', 'gluteus-minimus', 'piriformis'],
  'adductor-magnus': ['gluteus-medius', 'tensor-fasciae-latae', 'iliacus'],
  'adductor-minimus': ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
  'gracilis': ['gluteus-medius', 'tensor-fasciae-latae', 'biceps-femoris'],
  'biceps-femoris': ['rectus-femoris', 'vastus-lateralis', 'iliacus', 'tibialis-anterior'],
  'semitendinosus': ['rectus-femoris', 'vastus-medialis', 'iliacus'],
  'semimembranosus': ['rectus-femoris', 'vastus-medialis', 'vastus-intermedius'],

  // 下腿・足部（27）
  'tibialis-anterior': ['gastrocnemius', 'soleus', 'fibularis-longus', 'tibialis-posterior'],
  'extensor-hallucis-longus': ['flexor-hallucis-longus', 'flexor-hallucis-brevis', 'gastrocnemius'],
  'extensor-digitorum-longus': ['flexor-digitorum-longus', 'flexor-digitorum-brevis', 'soleus'],
  'fibularis-tertius': ['tibialis-posterior', 'soleus', 'flexor-digitorum-longus'],
  'fibularis-longus': ['tibialis-anterior', 'tibialis-posterior', 'abductor-hallucis'],
  'fibularis-brevis': ['tibialis-posterior', 'tibialis-anterior', 'flexor-digitorum-longus'],
  'gastrocnemius': ['tibialis-anterior', 'extensor-digitorum-longus', 'extensor-hallucis-longus'],
  'soleus': ['tibialis-anterior', 'extensor-digitorum-longus', 'fibularis-tertius'],
  'plantaris': ['tibialis-anterior', 'vastus-medialis', 'extensor-digitorum-longus'],
  'calcaneal-tendon': ['tibialis-anterior', 'extensor-digitorum-longus', 'extensor-hallucis-longus'],
  'popliteus': ['vastus-lateralis', 'rectus-femoris', 'biceps-femoris'],
  'flexor-digitorum-longus': ['extensor-digitorum-longus', 'extensor-digitorum-brevis', 'tibialis-anterior'],
  'flexor-hallucis-longus': ['extensor-hallucis-longus', 'extensor-hallucis-brevis', 'tibialis-anterior'],
  'tibialis-posterior': ['fibularis-longus', 'fibularis-brevis', 'extensor-digitorum-longus'],
  'extensor-digitorum-brevis': ['flexor-digitorum-brevis', 'quadratus-plantae', 'plantar-interossei'],
  'extensor-hallucis-brevis': ['flexor-hallucis-brevis', 'abductor-hallucis', 'flexor-hallucis-longus'],
  'abductor-hallucis': ['adductor-hallucis', 'fibularis-longus', 'extensor-hallucis-brevis'],
  'flexor-digitorum-brevis': ['extensor-digitorum-longus', 'extensor-digitorum-brevis', 'tibialis-anterior'],
  'abductor-digiti-minimi-foot': ['adductor-hallucis', 'plantar-interossei', 'tibialis-anterior'],
  'quadratus-plantae': ['extensor-digitorum-longus', 'extensor-digitorum-brevis', 'tibialis-anterior'],
  'lumbricals-foot': ['extensor-digitorum-longus', 'extensor-digitorum-brevis', 'dorsal-interossei-foot'],
  'flexor-hallucis-brevis': ['extensor-hallucis-longus', 'extensor-hallucis-brevis', 'tibialis-anterior'],
  'adductor-hallucis': ['abductor-hallucis', 'extensor-hallucis-longus', 'tibialis-anterior'],
  'flexor-digiti-minimi-brevis-foot': ['extensor-digitorum-longus', 'fibularis-tertius', 'extensor-digitorum-brevis'],
  'opponens-digiti-minimi-foot': ['tibialis-anterior', 'abductor-hallucis', 'dorsal-interossei-foot'],
  'plantar-interossei': ['dorsal-interossei-foot', 'abductor-hallucis', 'abductor-digiti-minimi-foot'],
  'dorsal-interossei-foot': ['plantar-interossei', 'adductor-hallucis', 'flexor-digitorum-brevis'],
};

const COUNTER_LINE_FALLBACK = Object.freeze({
  SFL: 'SBL',
  SBL: 'SFL',
  DFAL: 'DBAL',
  SFAL: 'SBAL',
  DBAL: 'DFAL',
  SBAL: 'SFAL',
  FFL: 'BFL',
  BFL: 'FFL',
  DFL: 'SBL',
  LL: 'DFL',
  SPL: 'DFL',
});

function getLineNeighbors(muscleId) {
  const neighbors = [];
  const lineIds = [];
  for (const line of LINES) {
    const idx = line.track.indexOf(muscleId);
    if (idx === -1) continue;
    lineIds.push(line.id);
    for (const d of [-1, 1, -2, 2]) {
      const cand = line.track[idx + d];
      if (cand && cand !== muscleId && !neighbors.includes(cand)) {
        neighbors.push(cand);
      }
    }
  }
  for (const br of FASCIA_STATION_BRIDGES) {
    if (br.from === muscleId && !neighbors.includes(br.to)) neighbors.push(br.to);
    if (br.to === muscleId && !neighbors.includes(br.from)) neighbors.push(br.from);
    if (br.from === muscleId || br.to === muscleId) {
      for (const lid of br.lineIds || []) {
        if (!lineIds.includes(lid)) lineIds.push(lid);
      }
    }
  }
  const local = LOCAL_FASCIA_NEIGHBORS[muscleId];
  if (local) {
    for (const m of local.linked) {
      if (m !== muscleId && !neighbors.includes(m)) neighbors.push(m);
    }
    for (const lid of local.lineIds || []) {
      if (!lineIds.includes(lid)) lineIds.push(lid);
    }
  }
  return { neighbors, lineIds };
}

function collectBridgesForChain(coreList, shortLinked, antagList, longLinked, maxCount = 4) {
  const activeSet = new Set([...coreList, ...shortLinked, ...antagList, ...longLinked]);
  const coreSet = new Set(coreList);
  const scored = [];
  const seenPairs = new Set();

  for (const br of FASCIA_STATION_BRIDGES) {
    const hasFrom = activeSet.has(br.from);
    const hasTo = activeSet.has(br.to);
    if (!hasFrom && !hasTo) continue;
    const pairKey = br.from < br.to ? `${br.from}::${br.to}` : `${br.to}::${br.from}`;
    if (seenPairs.has(pairKey)) continue;
    let score = 0;
    if (hasFrom && hasTo) score += 10;
    if (coreSet.has(br.from) || coreSet.has(br.to)) score += 6;
    if (br.crossSide) score += 1;
    if (score >= 6) {
      seenPairs.add(pairKey);
      scored.push({
        score,
        bridge: {
          from: br.from,
          to: br.to,
          stationJa: br.stationJa,
          crossSide: Boolean(br.crossSide),
        },
      });
    }
  }

  for (const m of [...coreList, ...shortLinked]) {
    const local = LOCAL_FASCIA_NEIGHBORS[m];
    if (!local) continue;
    for (const target of local.linked) {
      if (!activeSet.has(target)) continue;
      const pairKey = m < target ? `${m}::${target}` : `${target}::${m}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      scored.push({
        score: coreSet.has(m) ? 12 : 7,
        bridge: {
          from: m,
          to: target,
          stationJa: local.stationJa,
          crossSide: false,
        },
      });
    }
  }

  // 万一2件未満の場合は core / shortLinked に接続する駅ブリッジで補完
  if (scored.length < 2) {
    for (const br of FASCIA_STATION_BRIDGES) {
      if (!coreSet.has(br.from) && !coreSet.has(br.to) && !shortLinked.includes(br.from) && !shortLinked.includes(br.to)) {
        continue;
      }
      const pairKey = br.from < br.to ? `${br.from}::${br.to}` : `${br.to}::${br.from}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      scored.push({
        score: 3,
        bridge: {
          from: br.from,
          to: br.to,
          stationJa: br.stationJa,
          crossSide: Boolean(br.crossSide),
        },
      });
      if (scored.length >= 3) break;
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(2, Math.min(5, maxCount))).map((s) => s.bridge);
}

/**
 * 任意の筋ID（177筋すべて対応）を起点に、筋膜の双方向張力ネットワークを純粋計算する。
 * 重複優先順位: shortenCore > shortenLinked > lengthenAntagonist > lengthenLinked
 * @param {string} seedMuscleId
 * @param {{ maxLinked?: number, maxAntagonist?: number, maxBridges?: number }} [opts]
 */
export function computeMyofascialChain(seedMuscleId, opts = {}) {
  const normSeed = normalizeMuscleId(seedMuscleId);
  if (!normSeed || !MUSCLE_LAYERS[normSeed]) {
    return {
      seedMuscleId: normSeed || '',
      layer: 'surface',
      shortenCore: [],
      shortenLinked: [],
      lengthenAntagonist: [],
      lengthenLinked: [],
      shorten: [],
      lengthen: [],
      bridges: [],
      stationBridges: [],
      involvedLineIds: [],
    };
  }

  const maxLinked = Math.max(2, Math.min(4, Number(opts.maxLinked) || 3));
  const maxAntagonist = Math.max(2, Math.min(4, Number(opts.maxAntagonist) || 3));
  const maxBridges = Math.max(2, Math.min(5, Number(opts.maxBridges) || 4));

  const used = new Set([normSeed]);
  const shortenCore = [normSeed];
  const directAntagSet = new Set(ANTAGONIST_MAP[normSeed] || []);

  // 1) shortenLinked: 同一ライン・骨の駅ブリッジ上の隣接筋（拮抗筋を除外）
  const { neighbors: seedNeighbors, lineIds } = getLineNeighbors(normSeed);
  const shortenLinked = [];
  for (const cand of seedNeighbors) {
    if (!MUSCLE_LAYERS[cand] || used.has(cand) || directAntagSet.has(cand)) continue;
    shortenLinked.push(cand);
    used.add(cand);
    if (shortenLinked.length >= maxLinked) break;
  }
  if (shortenLinked.length < 2) {
    for (const first of [...shortenLinked]) {
      const { neighbors: secondHop } = getLineNeighbors(first);
      for (const cand of secondHop) {
        if (!MUSCLE_LAYERS[cand] || used.has(cand) || directAntagSet.has(cand)) continue;
        shortenLinked.push(cand);
        used.add(cand);
        if (shortenLinked.length >= maxLinked) break;
      }
      if (shortenLinked.length >= 2) break;
    }
  }

  // 2) lengthenAntagonist: 対側で引き伸ばされて張る拮抗筋（2〜4筋）
  const lengthenAntagonist = [];
  for (const ant of ANTAGONIST_MAP[normSeed] || []) {
    if (!MUSCLE_LAYERS[ant] || used.has(ant)) continue;
    lengthenAntagonist.push(ant);
    used.add(ant);
    if (lengthenAntagonist.length >= maxAntagonist) break;
  }
  if (lengthenAntagonist.length < 2) {
    const counterLineId = COUNTER_LINE_FALLBACK[lineIds[0]] || 'SBL';
    const counterLine = LINES.find((l) => l.id === counterLineId);
    if (counterLine) {
      for (const cand of counterLine.track) {
        if (!MUSCLE_LAYERS[cand] || used.has(cand)) continue;
        lengthenAntagonist.push(cand);
        used.add(cand);
        if (lengthenAntagonist.length >= maxAntagonist) break;
      }
    }
  }

  // 3) lengthenLinked: 拮抗筋と骨の駅・同一経線で連なる周辺伸張筋（2〜4筋）
  const lengthenLinked = [];
  for (const ant of lengthenAntagonist) {
    const { neighbors: antNeighbors } = getLineNeighbors(ant);
    for (const cand of antNeighbors) {
      if (!MUSCLE_LAYERS[cand] || used.has(cand)) continue;
      lengthenLinked.push(cand);
      used.add(cand);
      if (lengthenLinked.length >= maxLinked) break;
    }
    if (lengthenLinked.length >= maxLinked) break;
  }

  // 4) involvedLineIds: 関与する筋膜ラインID一覧
  const involvedLineIds = [...lineIds];
  for (const m of shortenLinked) {
    for (const line of LINES) {
      if (line.track.includes(m) && !involvedLineIds.includes(line.id)) {
        involvedLineIds.push(line.id);
      }
    }
  }

  // 5) bridges: この張力ネットワーク内で骨の駅をまたぐブリッジ（2〜5件）
  const bridges = collectBridgesForChain(shortenCore, shortenLinked, lengthenAntagonist, lengthenLinked, maxBridges);

  return {
    seedMuscleId: normSeed,
    layer: getMuscleLayer(normSeed),
    shortenCore,
    shortenLinked,
    lengthenAntagonist,
    lengthenLinked,
    shorten: [...shortenCore, ...shortenLinked],
    lengthen: [...lengthenAntagonist, ...lengthenLinked],
    bridges,
    stationBridges: bridges,
    involvedLineIds,
  };
}

// -------------------------------------------------------------
// OCCUPATIONS — 仕事5種＋日常2種＋スポーツ3種＝全10サブカテゴリー
// -------------------------------------------------------------
export const OCCUPATIONS = [
  {
    id: 'beautician',
    category: 'work',
    name: '美容師・理容師',
    sub: '肘上げカット・前かがみシャンプー・ネイル施術',
    habits: ['hair-cut-arm', 'hair-shampoo-bend', 'stand-hip-r', 'nail-eye-fine'],
  },
  {
    id: 'deskwork',
    category: 'work',
    name: 'デスクワーク',
    sub: 'PC・マウス・スマホ・座りっぱなし',
    habits: ['desk-round', 'phone-neck', 'leg-cross-r', 'laptop-low-screen', 'mouse-wrist-strain'],
  },
  {
    id: 'therapist',
    category: 'work',
    name: '整体師・介護・看護',
    sub: '親指での押し作業・前かがみ施術・抱え介助・病棟移動',
    habits: ['therapist-press', 'care-lift-bend', 'stand-hip-l', 'nurse-ward-walk'],
  },
  {
    id: 'housework',
    category: 'daily',
    name: '家事・育児',
    sub: '片腰抱っこ・洗濯干し・料理・ベビーカー',
    habits: ['childcare-hip-l', 'laundry-reach', 'vacuum-dish-bend', 'sofa-slouch', 'kitchen-knife-chop', 'stroller-cart-push'],
  },
  {
    id: 'construction',
    category: 'work',
    name: '土木・建築・運転',
    sub: '重い荷物の持ち上げ・頭上の作業・運転・配送',
    habits: ['heavy-lift-dig', 'overhead-tool', 'drive-long', 'delivery-carry-box'],
  },
  {
    id: 'standing-cook',
    category: 'work',
    name: '立ち仕事・料理・接客',
    sub: 'レジ立ちっぱなし・フライパンやトレイ保持',
    habits: ['cook-pan-hold', 'sway-back', 'arms-fold', 'register-stand-long'],
  },
  {
    id: 'daily-posture',
    category: 'daily',
    name: '姿勢・睡眠・カバン',
    sub: '片肩カバン・寝転びスマホ・食いしばり・床座り',
    habits: ['bag-shoulder-r', 'sleep-side-curl', 'phone-bed-side', 'teeth-clench-night', 'floor-sit-cross', 'heels-commute-walk'],
  },
  {
    id: 'sports-swing',
    category: 'sports',
    name: 'ゴルフ・球技・ラケット',
    sub: 'ゴルフスイング・テニス・野球・コート競技',
    habits: ['golf-swing-rot', 'tennis-baseball-arm', 'volleyball-smash', 'court-step-jump'],
  },
  {
    id: 'sports-run',
    category: 'sports',
    name: 'ランニング・サッカー・自転車',
    sub: 'ランニング・ロードバイク・サッカー・登山',
    habits: ['running-strike', 'cycling-aero', 'soccer-kick', 'hiking-mountain-walk'],
  },
  {
    id: 'sports-gym',
    category: 'sports',
    name: '筋トレ・ヨガ・水泳',
    sub: 'ベンチプレス・スクワット・水泳・ヨガ開脚',
    habits: ['gym-bench-push', 'gym-squat-lift', 'swim-crawl-yoga', 'yoga-pilates-open'],
  },
];

// -------------------------------------------------------------
// HABITS — 仕事・日常・スポーツの代表動作とクセ（全45個）
// shorten = 縮んでしわが寄る側、lengthen = 引き伸ばされて張る側、
// chain = 固まりが広がる順番、yore = 筋膜のよれが生じる交差点（1〜3筋）。
// triggerLineId で12本のトリガーライン（TRIGGER_LINES）と自動結合。
// -------------------------------------------------------------
export const HABITS = [
  // ================ 1. 美容師・理容師（work） ================
  {
    id: 'hair-cut-arm',
    category: 'work',
    bodyParts: ['shoulder-arm', 'chest-back', 'neck-jaw'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.15, headForward: 0.4, shoulderIn: 0.65, armsFold: 0.75 }),
    group: '美容師・理容師',
    occupation: '美容師・理容師',
    label: '肘上げハサミ・ドライヤー',
    lines: ['DFAL', 'SFAL', 'DBAL'],
    side: 'both',
    shorten: ['abductor-pollicis-brevis', 'flexor-pollicis-longus', 'biceps-brachii', 'pectoralis-minor', 'subclavius'],
    lengthen: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus', 'trapezius'],
    shortenCore: ['pectoralis-minor', 'abductor-pollicis-brevis'],
    shortenLinked: ['biceps-brachii', 'flexor-pollicis-longus', 'subclavius'],
    lengthenAntagonist: ['rhomboid-major', 'infraspinatus'],
    lengthenLinked: ['rhomboid-minor', 'trapezius'],
    stationBridges: [
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'biceps-brachii', to: 'supinator', stationJa: '肘の前側の橈骨粗面', crossSide: false },
      { from: 'rhomboid-major', to: 'infraspinatus', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['abductor-pollicis-brevis', 'biceps-brachii', 'coracobrachialis', 'pectoralis-minor', 'rhomboid-major'],
    yore: ['pectoralis-minor', 'biceps-brachii', 'abductor-pollicis-brevis'],
    twist: 0.25,
    feel: '肩の奥がズーンと重だるい',
    symptom: '肩の重だるさ・首すじの張り・親指の疲れ',
    similar: ['laundry-reach', 'overhead-tool', 'desk-round'],
  },
  {
    id: 'hair-shampoo-bend',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg', 'chest-back'],
    triggerLineId: 'TL-05',
    goldenLineId: 'GL-05',
    pose: P({ trunkFlex: 0.65, headForward: 0.5, shoulderIn: 0.55, pelvisTilt: -0.35, armsFold: 0.5 }),
    group: '美容師・理容師',
    occupation: '美容師・理容師',
    label: '前かがみシャンプー',
    lines: ['SBL', 'DFL', 'SFAL'],
    side: 'both',
    shorten: ['psoas-major', 'iliacus', 'pectoralis-major', 'flexor-digitorum-superficialis', 'quadratus-lumborum'],
    lengthen: ['longissimus', 'iliocostalis', 'multifidus', 'gluteus-maximus', 'biceps-femoris'],
    shortenCore: ['psoas-major', 'iliacus'],
    shortenLinked: ['quadratus-lumborum', 'pectoralis-major', 'flexor-digitorum-superficialis'],
    lengthenAntagonist: ['multifidus', 'gluteus-maximus', 'longissimus'],
    lengthenLinked: ['iliocostalis', 'biceps-femoris'],
    stationBridges: [
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'diaphragm', to: 'psoas-major', stationJa: 'みぞおちの奥の横隔膜脚（内側弓状靱帯）', crossSide: false },
      { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', crossSide: false },
    ],
    chain: ['flexor-digitorum-superficialis', 'pectoralis-major', 'psoas-major', 'multifidus', 'longissimus'],
    yore: ['psoas-major', 'multifidus', 'quadratus-lumborum'],
    twist: 0.25,
    feel: '立つ時に腰が引っ張られて伸びない',
    symptom: '立つと腰が伸びづらい・もも裏の張り',
    similar: ['vacuum-dish-bend', 'therapist-press', 'care-lift-bend'],
  },
  {
    id: 'stand-hip-r',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({ sideBend: 0.2, hipShift: -0.6 }),
    group: '美容師・理容師',
    occupation: '美容師・理容師',
    label: '右足に体重をかけて立つ',
    lines: ['LL', 'DFL'],
    side: 'R',
    shorten: ['quadratus-lumborum', 'internal-oblique', 'external-oblique', 'adductor-longus'],
    lengthen: ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
    shortenCore: ['quadratus-lumborum', 'adductor-longus'],
    shortenLinked: ['internal-oblique', 'external-oblique'],
    lengthenAntagonist: ['gluteus-medius', 'gluteus-minimus'],
    lengthenLinked: ['tensor-fasciae-latae', 'fibularis-longus'],
    stationBridges: [
      { from: 'external-oblique', to: 'gluteus-medius', stationJa: '骨盤の上の縁（腸骨稜）', crossSide: false },
      { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', crossSide: false },
      { from: 'tensor-fasciae-latae', to: 'fibularis-longus', stationJa: '太もも外側の腸脛靱帯〜腓骨頭', crossSide: false },
    ],
    chain: ['gluteus-medius', 'tensor-fasciae-latae', 'quadratus-lumborum', 'internal-oblique', 'external-intercostals'],
    yore: ['tensor-fasciae-latae', 'gluteus-medius', 'quadratus-lumborum'],
    twist: 0.3,
    feel: '右の腰とお尻の横だけ張る',
    symptom: '右お尻の張り・股関節の引っかかり',
    similar: ['stand-hip-l', 'leg-cross-r', 'childcare-hip-l'],
  },

  // ================ 2. デスクワーク（work） ================
  {
    id: 'desk-round',
    category: 'work',
    bodyParts: ['shoulder-arm', 'chest-back', 'neck-jaw'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.4, headForward: 0.7, shoulderIn: 0.7, pelvisTilt: 0.3, sit: 1 }),
    group: 'デスクワーク',
    occupation: 'デスクワーク',
    label: '肘浮かせPC・マウス',
    lines: ['DFAL', 'SFAL', 'SBAL'],
    side: 'both',
    shorten: ['pectoralis-minor', 'pectoralis-major', 'subclavius', 'subscapularis', 'sternocleidomastoid'],
    lengthen: ['rhomboid-major', 'rhomboid-minor', 'trapezius', 'infraspinatus'],
    shortenCore: ['pectoralis-minor', 'subclavius'],
    shortenLinked: ['pectoralis-major', 'subscapularis', 'sternocleidomastoid'],
    lengthenAntagonist: ['rhomboid-major', 'rhomboid-minor'],
    lengthenLinked: ['trapezius', 'infraspinatus'],
    stationBridges: [
      { from: 'subclavius', to: 'pectoralis-minor', stationJa: '鎖骨の下の胸筋膜（鎖骨胸筋筋膜）', crossSide: false },
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'rhomboid-major', to: 'infraspinatus', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['pectoralis-minor', 'subclavius', 'coracobrachialis', 'biceps-brachii'],
    yore: ['pectoralis-minor', 'subclavius', 'rhomboid-minor'],
    twist: 0.2,
    feel: '肩が前に巻き背中が張る',
    symptom: '肩甲骨の内側の重だるさ・巻き肩・腕の張り',
    similar: ['hair-cut-arm', 'arms-fold', 'drive-long'],
  },
  {
    id: 'phone-neck',
    category: 'work',
    bodyParts: ['neck-jaw', 'shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-02',
    goldenLineId: 'GL-02',
    pose: P({ trunkFlex: 0.4, headForward: 0.9, shoulderIn: 0.4, armsFold: 0.4 }),
    group: 'デスクワーク',
    occupation: 'デスクワーク',
    label: 'スマホ・書類のうつむき',
    lines: ['SBL', 'SFL', 'DFL'],
    side: 'both',
    shorten: ['rectus-capitis-posterior-major', 'rectus-capitis-posterior-minor', 'obliquus-capitis-inferior', 'sternocleidomastoid', 'pectoralis-minor'],
    lengthen: ['longus-colli', 'longus-capitis', 'splenius-cervicis', 'rhomboid-minor'],
    shortenCore: ['rectus-capitis-posterior-minor', 'sternocleidomastoid'],
    shortenLinked: ['rectus-capitis-posterior-major', 'obliquus-capitis-inferior', 'pectoralis-minor'],
    lengthenAntagonist: ['longus-colli', 'longus-capitis'],
    lengthenLinked: ['splenius-cervicis', 'rhomboid-minor'],
    stationBridges: [
      { from: 'rectus-capitis-posterior-minor', to: 'occipitalis', stationJa: '頭の付け根の奥（後頭骨）', crossSide: false },
      { from: 'sternocleidomastoid', to: 'pectoralis-major', stationJa: '鎖骨の内側・胸骨の上端', crossSide: false },
      { from: 'splenius-cervicis', to: 'rhomboid-minor', stationJa: '首〜背中の背骨の突起（左右交差）', crossSide: true },
    ],
    chain: ['rectus-capitis-posterior-minor', 'semispinalis', 'splenius-capitis', 'levator-scapulae', 'trapezius'],
    yore: ['rectus-capitis-posterior-minor', 'splenius-capitis', 'sternocleidomastoid'],
    twist: 0.1,
    feel: '首のうしろが詰まって苦しい',
    symptom: '首の付け根の詰まり・目の奥の重さ・頭の重だるさ',
    similar: ['desk-round', 'sofa-slouch', 'therapist-press'],
  },
  {
    id: 'leg-cross-r',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({ pelvisTilt: 0.3, trunkRotate: 0.2, sideBend: -0.15, hipShift: 0.2, sit: 1 }),
    group: 'デスクワーク',
    occupation: 'デスクワーク',
    label: '足を組んで座る',
    lines: ['LL', 'SPL'],
    side: 'R',
    shorten: ['tensor-fasciae-latae', 'adductor-longus', 'pectineus', 'quadratus-lumborum'],
    lengthen: ['gluteus-medius', 'piriformis', 'gluteus-maximus'],
    shortenCore: ['tensor-fasciae-latae', 'adductor-longus'],
    shortenLinked: ['pectineus', 'quadratus-lumborum'],
    lengthenAntagonist: ['gluteus-medius', 'piriformis'],
    lengthenLinked: ['gluteus-maximus', 'biceps-femoris'],
    stationBridges: [
      { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', crossSide: false },
      { from: 'psoas-major', to: 'pectineus', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'piriformis', to: 'gluteus-maximus', stationJa: '仙骨の横の靱帯（仙結節靱帯）', crossSide: false },
    ],
    chain: ['tensor-fasciae-latae', 'internal-oblique', 'external-oblique', 'serratus-anterior', 'rhomboid-major'],
    yore: ['tensor-fasciae-latae', 'piriformis', 'internal-oblique'],
    twist: 0.6,
    feel: '片側のお尻の横と腰が張る',
    symptom: '片側のお尻の奥の重だるさ・骨盤の傾き',
    similar: ['stand-hip-r', 'childcare-hip-l', 'drive-long'],
  },

  // ================ 3. 整体師・介護・看護（work） ================
  {
    id: 'therapist-press',
    category: 'work',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.45, headForward: 0.45, shoulderIn: 0.65, pelvisTilt: -0.2, armsFold: 0.55 }),
    group: '整体師・介護・看護',
    occupation: '整体師・介護・看護',
    label: '前かがみで親指を使う施術・手作業',
    lines: ['DFAL', 'SFAL', 'SFL'],
    side: 'both',
    shorten: ['abductor-pollicis-brevis', 'flexor-pollicis-longus', 'pronator-teres', 'pectoralis-major', 'pectoralis-minor'],
    lengthen: ['rhomboid-major', 'infraspinatus', 'trapezius', 'longissimus'],
    shortenCore: ['abductor-pollicis-brevis', 'flexor-pollicis-longus'],
    shortenLinked: ['pronator-teres', 'pectoralis-minor', 'pectoralis-major'],
    lengthenAntagonist: ['rhomboid-major', 'infraspinatus'],
    lengthenLinked: ['trapezius', 'longissimus'],
    stationBridges: [
      { from: 'flexor-pollicis-longus', to: 'flexor-pollicis-brevis', stationJa: '手首のトンネル（手根管）〜親指の付け根', crossSide: false },
      { from: 'pectoralis-major', to: 'pronator-teres', stationJa: '二の腕の内側の筋間中隔〜内側上顆', crossSide: false },
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
    ],
    chain: ['abductor-pollicis-brevis', 'pronator-teres', 'biceps-brachii', 'pectoralis-minor', 'rhomboid-major'],
    yore: ['abductor-pollicis-brevis', 'pronator-teres', 'pectoralis-minor'],
    twist: 0.25,
    feel: '親指から胸が詰まり背中がつらい',
    symptom: '手首・親指まわりの負担・前腕の張り・背中の疲れ',
    similar: ['hair-cut-arm', 'cook-pan-hold', 'hair-shampoo-bend'],
  },
  {
    id: 'care-lift-bend',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg', 'chest-back'],
    triggerLineId: 'TL-05',
    goldenLineId: 'GL-05',
    pose: P({ trunkFlex: 0.7, headForward: 0.4, shoulderIn: 0.5, pelvisTilt: 0.2, trunkRotate: 0.2, armsFold: 0.65 }),
    group: '整体師・介護・看護',
    occupation: '整体師・介護・看護',
    label: '中腰の介助・抱え上げ',
    lines: ['SBL', 'DFL', 'BFL'],
    side: 'both',
    shorten: ['psoas-major', 'iliacus', 'biceps-brachii', 'pectoralis-major', 'rectus-abdominis'],
    lengthen: ['multifidus', 'longissimus', 'iliocostalis', 'gluteus-maximus', 'biceps-femoris'],
    shortenCore: ['psoas-major', 'iliacus'],
    shortenLinked: ['biceps-brachii', 'pectoralis-major', 'rectus-abdominis'],
    lengthenAntagonist: ['multifidus', 'gluteus-maximus', 'longissimus'],
    lengthenLinked: ['iliocostalis', 'biceps-femoris'],
    stationBridges: [
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '腰の後ろの厚い筋膜（左右交差）', crossSide: true },
      { from: 'biceps-femoris', to: 'multifidus', stationJa: '坐骨〜仙骨の背側筋膜', crossSide: false },
    ],
    chain: ['biceps-brachii', 'psoas-major', 'quadratus-lumborum', 'multifidus', 'gluteus-maximus'],
    yore: ['psoas-major', 'multifidus', 'gluteus-maximus'],
    twist: 0.35,
    feel: '腰の奥が抜けるように重い',
    symptom: '急な腰のこわばりへの不安・お尻の上の重だるさ',
    similar: ['heavy-lift-dig', 'hair-shampoo-bend', 'childcare-hip-l'],
  },
  {
    id: 'stand-hip-l',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({ sideBend: -0.2, hipShift: 0.6 }),
    group: '整体師・介護・看護',
    occupation: '整体師・介護・看護',
    label: '左足に体重をかけて立つ',
    lines: ['LL', 'DFL'],
    side: 'L',
    shorten: ['quadratus-lumborum', 'internal-oblique', 'external-oblique', 'adductor-longus'],
    lengthen: ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
    shortenCore: ['quadratus-lumborum', 'adductor-longus'],
    shortenLinked: ['internal-oblique', 'external-oblique'],
    lengthenAntagonist: ['gluteus-medius', 'gluteus-minimus'],
    lengthenLinked: ['tensor-fasciae-latae', 'fibularis-longus'],
    stationBridges: [
      { from: 'external-oblique', to: 'gluteus-medius', stationJa: '骨盤の上の縁（腸骨稜）', crossSide: false },
      { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', crossSide: false },
      { from: 'tensor-fasciae-latae', to: 'fibularis-longus', stationJa: '太もも外側の腸脛靱帯〜腓骨頭', crossSide: false },
    ],
    chain: ['gluteus-medius', 'tensor-fasciae-latae', 'quadratus-lumborum', 'internal-oblique', 'external-intercostals'],
    yore: ['tensor-fasciae-latae', 'gluteus-medius', 'quadratus-lumborum'],
    twist: 0.3,
    feel: '左の腰とお尻の横だけ張る',
    symptom: '左お尻の張り・左股関節の違和感',
    similar: ['childcare-hip-l', 'stand-hip-r', 'leg-cross-r'],
  },

  // ================ 4. 家事・育児（daily） ================
  {
    id: 'childcare-hip-l',
    category: 'daily',
    bodyParts: ['waist-pelvis', 'shoulder-arm', 'hip-leg'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({ shoulderIn: 0.3, sideBend: -0.2, hipShift: 0.5, armsFold: 0.6 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: '片腰での子ども抱っこ',
    lines: ['LL', 'DFAL', 'SPL'],
    side: 'L',
    shorten: ['biceps-brachii', 'pectoralis-minor', 'quadratus-lumborum', 'internal-oblique', 'adductor-longus'],
    lengthen: ['gluteus-medius', 'tensor-fasciae-latae', 'latissimus-dorsi', 'rhomboid-major'],
    shortenCore: ['quadratus-lumborum', 'biceps-brachii'],
    shortenLinked: ['pectoralis-minor', 'internal-oblique', 'adductor-longus'],
    lengthenAntagonist: ['gluteus-medius', 'rhomboid-major'],
    lengthenLinked: ['tensor-fasciae-latae', 'latissimus-dorsi'],
    stationBridges: [
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'external-oblique', to: 'internal-oblique', stationJa: 'お腹の真ん中の白線（左右交差）', crossSide: true },
      { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', crossSide: false },
    ],
    chain: ['biceps-brachii', 'pectoralis-minor', 'external-oblique', 'quadratus-lumborum', 'gluteus-medius'],
    yore: ['quadratus-lumborum', 'tensor-fasciae-latae', 'biceps-brachii'],
    twist: 0.5,
    feel: '片側の腰と腕がパンパン',
    symptom: '片側の腰の重さ・抱っこ腕の手首まわりの負担',
    similar: ['stand-hip-l', 'cook-pan-hold', 'care-lift-bend'],
  },
  {
    id: 'laundry-reach',
    category: 'daily',
    bodyParts: ['shoulder-arm', 'chest-back', 'waist-pelvis'],
    triggerLineId: 'TL-03',
    goldenLineId: 'GL-03',
    pose: P({ trunkFlex: -0.15, headForward: 0.35, shoulderIn: 0.6, pelvisTilt: -0.45, armsFold: 0.65 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: '腕を上げる洗濯干し・高い所の拭き掃除',
    lines: ['SBAL', 'DFAL', 'SFL'],
    side: 'both',
    shorten: ['deltoid', 'supraspinatus', 'trapezius', 'pectoralis-minor', 'longissimus'],
    lengthen: ['latissimus-dorsi', 'serratus-anterior', 'rectus-abdominis'],
    shortenCore: ['supraspinatus', 'pectoralis-minor'],
    shortenLinked: ['deltoid', 'trapezius', 'longissimus'],
    lengthenAntagonist: ['latissimus-dorsi', 'serratus-anterior'],
    lengthenLinked: ['rectus-abdominis', 'rhomboid-major'],
    stationBridges: [
      { from: 'trapezius', to: 'deltoid', stationJa: '鎖骨の外側と肩峰（肩の屋根）', crossSide: false },
      { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上角', crossSide: false },
      { from: 'rhomboid-major', to: 'serratus-anterior', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['deltoid', 'supraspinatus', 'trapezius', 'pectoralis-minor', 'longissimus'],
    yore: ['supraspinatus', 'trapezius', 'pectoralis-minor'],
    twist: 0.2,
    feel: '腕を上げると肩が引っかかる',
    symptom: '腕が上がりづらい・肩の引っかかり・反り腰',
    similar: ['overhead-tool', 'hair-cut-arm', 'sway-back'],
  },
  {
    id: 'vacuum-dish-bend',
    category: 'daily',
    bodyParts: ['chest-back', 'waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-06',
    goldenLineId: 'GL-06',
    pose: P({ trunkFlex: 0.45, headForward: 0.55, shoulderIn: 0.55, pelvisTilt: -0.25, trunkRotate: 0.15, armsFold: 0.45 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: '前かがみ掃除機・洗い物',
    lines: ['SBL', 'SPL', 'SFAL'],
    side: 'both',
    shorten: ['pectoralis-major', 'flexor-digitorum-superficialis', 'psoas-major', 'external-oblique', 'gastrocnemius'],
    lengthen: ['longissimus', 'iliocostalis', 'semispinalis', 'rhomboid-major', 'biceps-femoris'],
    shortenCore: ['psoas-major', 'pectoralis-major'],
    shortenLinked: ['flexor-digitorum-superficialis', 'external-oblique', 'gastrocnemius'],
    lengthenAntagonist: ['longissimus', 'iliocostalis', 'biceps-femoris'],
    lengthenLinked: ['semispinalis', 'rhomboid-major'],
    stationBridges: [
      { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
      { from: 'external-oblique', to: 'internal-oblique', stationJa: 'お腹の真ん中の白線（左右交差）', crossSide: true },
    ],
    chain: ['flexor-digitorum-superficialis', 'pectoralis-major', 'external-oblique', 'longissimus', 'gastrocnemius'],
    yore: ['longissimus', 'external-oblique', 'gastrocnemius'],
    twist: 0.3,
    feel: '背中からふくらはぎまで張る',
    symptom: '背中の張り・腰の重さ・脚のパンパン感',
    similar: ['hair-shampoo-bend', 'cook-pan-hold', 'heavy-lift-dig'],
  },
  {
    id: 'sofa-slouch',
    category: 'daily',
    bodyParts: ['chest-back', 'waist-pelvis', 'neck-jaw'],
    triggerLineId: 'TL-04',
    goldenLineId: 'GL-04',
    pose: P({ trunkFlex: 0.8, headForward: 0.7, shoulderIn: 0.4, pelvisTilt: 0.9, sit: 1 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: 'ソファーでお尻ずらし座り（ズッコケ座り）',
    lines: ['SFL', 'DFL', 'SBL'],
    side: 'both',
    shorten: ['rectus-abdominis', 'psoas-major', 'iliacus', 'diaphragm', 'sternocleidomastoid', 'pectoralis-minor'],
    lengthen: ['longissimus', 'iliocostalis', 'multifidus', 'semispinalis', 'splenius-cervicis', 'trapezius'],
    shortenCore: ['rectus-abdominis', 'diaphragm', 'psoas-major'],
    shortenLinked: ['iliacus', 'sternocleidomastoid', 'pectoralis-minor'],
    lengthenAntagonist: ['multifidus', 'longissimus', 'iliocostalis'],
    lengthenLinked: ['semispinalis', 'splenius-cervicis', 'trapezius'],
    stationBridges: [
      { from: 'diaphragm', to: 'psoas-major', stationJa: 'みぞおちの奥の横隔膜脚（内側弓状靱帯）', crossSide: false },
      { from: 'pectoralis-major', to: 'rectus-abdominis', stationJa: '胸の下のろっ骨軟骨', crossSide: false },
      { from: 'rectus-abdominis', to: 'pectineus', stationJa: '下腹の恥骨の上縁', crossSide: false },
    ],
    chain: ['rectus-abdominis', 'psoas-major', 'diaphragm', 'scalenus-anterior', 'sternocleidomastoid'],
    yore: ['psoas-major', 'diaphragm', 'rectus-abdominis'],
    twist: 0.1,
    feel: 'みぞおちが詰まり息が浅い',
    symptom: '浅い呼吸・背中の張り・立つ時の腰の重さ',
    similar: ['phone-neck', 'drive-long', 'desk-round'],
  },

  // ================ 5. 土木・建築・運転（work） ================
  {
    id: 'heavy-lift-dig',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg', 'chest-back'],
    triggerLineId: 'TL-06',
    goldenLineId: 'GL-06',
    pose: P({ trunkFlex: 0.65, headForward: 0.35, shoulderIn: 0.45, pelvisTilt: -0.2, trunkRotate: 0.3, armsFold: 0.55 }),
    group: '土木・建築・運転',
    occupation: '土木・建築・運転',
    label: '中腰での重い荷物持ち・スコップ作業',
    lines: ['BFL', 'SBL', 'DFL'],
    side: 'both',
    shorten: ['biceps-brachii', 'flexor-digitorum-profundus', 'psoas-major', 'quadratus-lumborum', 'biceps-femoris'],
    lengthen: ['latissimus-dorsi', 'gluteus-maximus', 'multifidus', 'longissimus', 'iliocostalis'],
    shortenCore: ['quadratus-lumborum', 'psoas-major', 'biceps-femoris'],
    shortenLinked: ['biceps-brachii', 'flexor-digitorum-profundus'],
    lengthenAntagonist: ['gluteus-maximus', 'multifidus', 'longissimus'],
    lengthenLinked: ['latissimus-dorsi', 'iliocostalis'],
    stationBridges: [
      { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '腰の後ろの厚い筋膜（左右交差）', crossSide: true },
      { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', crossSide: false },
      { from: 'diaphragm', to: 'quadratus-lumborum', stationJa: 'ろっ骨の下縁（外側弓状靱帯）', crossSide: false },
    ],
    chain: ['flexor-digitorum-profundus', 'biceps-brachii', 'latissimus-dorsi', 'gluteus-maximus', 'biceps-femoris'],
    yore: ['quadratus-lumborum', 'gluteus-maximus', 'biceps-femoris'],
    twist: 0.45,
    feel: '腰からもも裏まで鉛のように重い',
    symptom: '腰の強い張り・お尻〜もも裏の鉛のような重さ',
    similar: ['care-lift-bend', 'vacuum-dish-bend', 'hair-shampoo-bend'],
  },
  {
    id: 'overhead-tool',
    category: 'work',
    bodyParts: ['shoulder-arm', 'neck-jaw', 'chest-back'],
    triggerLineId: 'TL-03',
    goldenLineId: 'GL-03',
    pose: P({ trunkFlex: -0.2, headForward: 0.4, shoulderIn: 0.55, pelvisTilt: -0.5, armsFold: 0.7 }),
    group: '土木・建築・運転',
    occupation: '土木・建築・運転',
    label: '頭より上での工具・天井作業',
    lines: ['SBAL', 'DBAL', 'SFL'],
    side: 'both',
    shorten: ['deltoid', 'trapezius', 'levator-scapulae', 'flexor-carpi-radialis', 'longissimus'],
    lengthen: ['latissimus-dorsi', 'triceps-brachii', 'rectus-abdominis', 'psoas-major'],
    shortenCore: ['deltoid', 'levator-scapulae'],
    shortenLinked: ['trapezius', 'flexor-carpi-radialis', 'longissimus'],
    lengthenAntagonist: ['latissimus-dorsi', 'triceps-brachii'],
    lengthenLinked: ['rectus-abdominis', 'psoas-major'],
    stationBridges: [
      { from: 'trapezius', to: 'deltoid', stationJa: '鎖骨の外側と肩峰（肩の屋根）', crossSide: false },
      { from: 'deltoid', to: 'brachioradialis', stationJa: '二の腕の外側の筋間中隔', crossSide: false },
      { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上角', crossSide: false },
    ],
    chain: ['flexor-carpi-radialis', 'deltoid', 'levator-scapulae', 'trapezius', 'longissimus'],
    yore: ['deltoid', 'levator-scapulae', 'longissimus'],
    twist: 0.25,
    feel: '首から肩・腕がパンパン',
    symptom: '首や肩の強いこり・腕のだるさ・首すじの張り',
    similar: ['laundry-reach', 'hair-cut-arm', 'sway-back'],
  },
  {
    id: 'drive-long',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg', 'shoulder-arm'],
    triggerLineId: 'TL-05',
    goldenLineId: 'GL-05',
    pose: P({ trunkFlex: 0.45, headForward: 0.65, shoulderIn: 0.6, pelvisTilt: 0.65, sit: 1, armsFold: 0.45 }),
    group: '土木・建築・運転',
    occupation: '土木・建築・運転',
    label: '長時間の運転・ペダル操作',
    lines: ['DFL', 'SBL', 'SFAL'],
    side: 'R',
    shorten: ['psoas-major', 'iliacus', 'tibialis-anterior', 'pectoralis-major', 'biceps-femoris'],
    lengthen: ['gluteus-maximus', 'multifidus', 'longissimus', 'rhomboid-major'],
    shortenCore: ['psoas-major', 'iliacus', 'tibialis-anterior'],
    shortenLinked: ['pectoralis-major', 'biceps-femoris'],
    lengthenAntagonist: ['gluteus-maximus', 'multifidus'],
    lengthenLinked: ['longissimus', 'rhomboid-major'],
    stationBridges: [
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'rectus-femoris', to: 'tibialis-anterior', stationJa: 'ひざのお皿とすねの上の出っ張り', crossSide: false },
      { from: 'biceps-femoris', to: 'multifidus', stationJa: '坐骨〜仙骨の背側筋膜', crossSide: false },
    ],
    chain: ['tibialis-anterior', 'psoas-major', 'iliacus', 'pectoralis-major', 'sternocleidomastoid'],
    yore: ['psoas-major', 'tibialis-anterior', 'biceps-femoris'],
    twist: 0.3,
    feel: '車から降りる時に腰が固まってつらい',
    symptom: '車を降りる時の腰のこわばり・お尻の張り・すねの疲れ',
    similar: ['sofa-slouch', 'leg-cross-r', 'desk-round'],
  },

  // ================ 6. 立ち仕事・料理・接客（work） ================
  {
    id: 'cook-pan-hold',
    category: 'work',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.25, headForward: 0.35, shoulderIn: 0.55, trunkRotate: 0.2, armsFold: 0.65 }),
    group: '立ち仕事・料理・接客',
    occupation: '立ち仕事・料理・接客',
    label: '片手フライパン・トレイ保持',
    lines: ['SFAL', 'DFAL', 'FFL'],
    side: 'L',
    shorten: ['flexor-carpi-radialis', 'brachioradialis', 'biceps-brachii', 'pectoralis-major', 'internal-oblique'],
    lengthen: ['extensor-carpi-radialis-longus', 'triceps-brachii', 'rhomboid-major', 'infraspinatus'],
    shortenCore: ['flexor-carpi-radialis', 'biceps-brachii'],
    shortenLinked: ['brachioradialis', 'pectoralis-major', 'internal-oblique'],
    lengthenAntagonist: ['extensor-carpi-radialis-longus', 'triceps-brachii'],
    lengthenLinked: ['rhomboid-major', 'infraspinatus'],
    customTriggerPoints: [
      {
        id: 'flexor-carpi-radialis',
        label: '① 前腕の内側',
        easyLabel: '① 前腕の内側〜手首',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'glide',
        strokeTarget: 'biceps-brachii',
        durationSec: 30,
        step: '① 肘の内側から少し下のふくらみを親指で押さえたまま、手首をゆっくり反らしたり曲げたりする',
      },
      {
        id: 'biceps-brachii',
        label: '② 力こぶ',
        easyLabel: '② 力こぶ（腕の前）',
        tool: 'roller',
        toolLabel: '🛞 ローラー',
        motion: 'roll',
        strokeTarget: 'pectoralis-minor',
        durationSec: 30,
        step: '② テーブルに置いたローラーに力こぶを乗せてゆっくり転がす',
      },
      {
        id: 'pectoralis-minor',
        label: '③ 鎖骨の下',
        easyLabel: '③ 鎖骨の下（胸の奥）',
        tool: 'hand',
        toolLabel: '🤲 指でやる',
        motion: 'stroke',
        strokeTarget: 'rhomboid-major',
        durationSec: 30,
        step: '③ 4本の指の腹を鎖骨の下のくぼみに添え、胸の真ん中から肩先へやさしくさすり流す',
      },
    ],
    stationBridges: [
      { from: 'biceps-brachii', to: 'pronator-teres', stationJa: '肘の内側の上腕二頭筋腱膜', crossSide: false },
      { from: 'pectoralis-major', to: 'adductor-longus', stationJa: 'お腹の白線〜恥骨（左右交差）', crossSide: true },
      { from: 'brachioradialis', to: 'extensor-carpi-radialis-longus', stationJa: '肘の外側の出っ張り（外側上顆）', crossSide: false },
    ],
    chain: ['flexor-carpi-radialis', 'biceps-brachii', 'pectoralis-major', 'rectus-abdominis', 'adductor-longus'],
    yore: ['brachioradialis', 'biceps-brachii', 'pectoralis-major'],
    twist: 0.35,
    feel: '肘から手首までだるさが抜けない',
    symptom: '肘〜手首の重だるさ・片側の肩こり',
    similar: ['therapist-press', 'childcare-hip-l', 'vacuum-dish-bend'],
  },
  {
    id: 'sway-back',
    category: 'work',
    bodyParts: ['waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-08',
    goldenLineId: 'GL-08',
    pose: P({ headForward: 0.2, pelvisTilt: -0.7 }),
    group: '立ち仕事・料理・接客',
    occupation: '立ち仕事・料理・接客',
    label: '反り腰・ヒール立ち',
    lines: ['DFL', 'SBL', 'SFL'],
    side: 'both',
    shorten: ['psoas-major', 'iliacus', 'rectus-femoris', 'gastrocnemius', 'soleus', 'longissimus'],
    lengthen: ['rectus-abdominis', 'gluteus-maximus', 'biceps-femoris', 'tibialis-anterior'],
    shortenCore: ['psoas-major', 'rectus-femoris'],
    shortenLinked: ['iliacus', 'gastrocnemius', 'soleus', 'longissimus'],
    lengthenAntagonist: ['rectus-abdominis', 'gluteus-maximus'],
    lengthenLinked: ['biceps-femoris', 'tibialis-anterior'],
    stationBridges: [
      { from: 'iliacus', to: 'rectus-femoris', stationJa: '骨盤の前の奥（下前腸骨棘）', crossSide: false },
      { from: 'rectus-femoris', to: 'tibialis-anterior', stationJa: 'ひざのお皿とすねの上の出っ張り', crossSide: false },
      { from: 'gastrocnemius', to: 'calcaneal-tendon', stationJa: 'アキレス腱の合流部', crossSide: false },
    ],
    chain: ['gastrocnemius', 'rectus-femoris', 'psoas-major', 'iliacus', 'longissimus'],
    yore: ['psoas-major', 'rectus-femoris', 'gastrocnemius'],
    twist: 0.1,
    feel: '腰が反って前ももが張る',
    symptom: '反り腰のつらさ・前ももとふくらはぎの張り',
    similar: ['laundry-reach', 'overhead-tool', 'stand-hip-r'],
  },
  {
    id: 'arms-fold',
    category: 'work',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.1, shoulderIn: 0.5, trunkRotate: 0.1, armsFold: 1 }),
    group: '立ち仕事・料理・接客',
    occupation: '立ち仕事・料理・接客',
    label: '腕を組むクセ',
    lines: ['DFAL', 'SFAL', 'DBAL'],
    side: 'both',
    shorten: ['pectoralis-minor', 'pectoralis-major', 'coracobrachialis', 'biceps-brachii'],
    lengthen: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus', 'teres-minor'],
    shortenCore: ['pectoralis-minor', 'pectoralis-major'],
    shortenLinked: ['coracobrachialis', 'biceps-brachii'],
    lengthenAntagonist: ['rhomboid-major', 'infraspinatus'],
    lengthenLinked: ['rhomboid-minor', 'teres-minor'],
    stationBridges: [
      { from: 'pectoralis-minor', to: 'coracobrachialis', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'rhomboid-major', to: 'infraspinatus', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['pectoralis-minor', 'pectoralis-major', 'coracobrachialis', 'biceps-brachii'],
    yore: ['pectoralis-minor', 'coracobrachialis', 'biceps-brachii'],
    twist: 0.3,
    feel: '胸が縮み肩甲骨のあいだが張る',
    symptom: '肩甲骨のあいだのこり・巻き肩・浅い呼吸',
    similar: ['desk-round', 'hair-cut-arm', 'cook-pan-hold'],
  },

  // ================ 7. 姿勢・睡眠・カバン（daily） ================
  {
    id: 'bag-shoulder-r',
    category: 'daily',
    bodyParts: ['shoulder-arm', 'waist-pelvis'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({
      shoulderIn: 0.35,
      sideBend: 0.25,
      hipShift: -0.45,
      trunkRotate: -0.15,
      armRaiseR: 0.14,
      armSpreadR: 0.14,
      elFlexR: 2.26,
      foreYawR: 0.34,
      pronateR: 0.24,
    }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: '片方の肩に重いカバン・リュックをかける',
    lines: ['LL', 'SPL', 'SBAL'],
    side: 'R',
    shorten: ['trapezius', 'levator-scapulae', 'quadratus-lumborum', 'external-oblique', 'tensor-fasciae-latae'],
    lengthen: ['gluteus-medius', 'rhomboid-major', 'latissimus-dorsi'],
    shortenCore: ['levator-scapulae', 'quadratus-lumborum'],
    shortenLinked: ['trapezius', 'external-oblique', 'tensor-fasciae-latae'],
    lengthenAntagonist: ['gluteus-medius', 'rhomboid-major'],
    lengthenLinked: ['latissimus-dorsi', 'serratus-anterior'],
    stationBridges: [
      { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上角', crossSide: false },
      { from: 'external-oblique', to: 'gluteus-medius', stationJa: '骨盤の上の縁（腸骨稜）', crossSide: false },
      { from: 'gluteus-medius', to: 'tensor-fasciae-latae', stationJa: '骨盤の横の筋膜', crossSide: false },
    ],
    chain: ['trapezius', 'levator-scapulae', 'external-oblique', 'quadratus-lumborum', 'gluteus-medius'],
    yore: ['levator-scapulae', 'quadratus-lumborum', 'gluteus-medius'],
    twist: 0.4,
    feel: '片方の肩と反対の腰が張る',
    symptom: '片肩のこり・骨盤の傾き・片側の腰の張り',
    similar: ['childcare-hip-l', 'stand-hip-r', 'leg-cross-r'],
  },
  {
    id: 'sleep-side-curl',
    category: 'daily',
    bodyParts: ['neck-jaw', 'shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-02',
    goldenLineId: 'GL-02',
    pose: P({ trunkFlex: 0.5, headForward: 0.75, shoulderIn: 0.8, pelvisTilt: 0.4, armsFold: 0.7 }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: '横向きで丸まって寝る・高い枕',
    lines: ['SFL', 'DFAL', 'DFL'],
    side: 'both',
    shorten: ['pectoralis-minor', 'pectoralis-major', 'sternocleidomastoid', 'scalenus-anterior', 'masseter'],
    lengthen: ['rhomboid-major', 'rhomboid-minor', 'splenius-capitis', 'semispinalis'],
    shortenCore: ['pectoralis-minor', 'sternocleidomastoid'],
    shortenLinked: ['pectoralis-major', 'scalenus-anterior', 'masseter'],
    lengthenAntagonist: ['rhomboid-major', 'splenius-capitis'],
    lengthenLinked: ['rhomboid-minor', 'semispinalis'],
    stationBridges: [
      { from: 'sternocleidomastoid', to: 'pectoralis-major', stationJa: '鎖骨の内側・胸骨の上端', crossSide: false },
      { from: 'sternocleidomastoid', to: 'splenius-capitis', stationJa: '耳の後ろの出っ張り骨（乳様突起）', crossSide: false },
      { from: 'masseter', to: 'temporalis', stationJa: 'ほお骨のアーチと下あごの突起', crossSide: false },
    ],
    chain: ['pectoralis-minor', 'pectoralis-major', 'sternocleidomastoid', 'scalenus-anterior', 'masseter'],
    yore: ['pectoralis-minor', 'sternocleidomastoid', 'masseter'],
    twist: 0.3,
    feel: '朝起きると首・肩・あごがガチガチ',
    symptom: '朝起きた時の首や肩のこわばり・食いしばり',
    similar: ['phone-neck', 'arms-fold', 'sofa-slouch'],
  },

  // ================ 8. ゴルフ・球技・ラケット（sports） ================
  {
    id: 'golf-swing-rot',
    category: 'sports',
    bodyParts: ['waist-pelvis', 'chest-back', 'shoulder-arm'],
    triggerLineId: 'TL-07',
    goldenLineId: 'GL-07',
    pose: P({ trunkFlex: 0.3, shoulderIn: 0.4, trunkRotate: 0.65, sideBend: -0.2, hipShift: 0.35, armsFold: 0.5 }),
    group: 'ゴルフ・球技・ラケット',
    occupation: 'ゴルフ・球技・ラケット',
    label: 'ゴルフのスイング・体を強くひねる動き',
    lines: ['SPL', 'LL', 'BFL'],
    side: 'R',
    shorten: ['external-oblique', 'internal-oblique', 'quadratus-lumborum', 'tensor-fasciae-latae', 'latissimus-dorsi'],
    lengthen: ['gluteus-medius', 'multifidus', 'rhomboid-major', 'piriformis'],
    shortenCore: ['external-oblique', 'internal-oblique'],
    shortenLinked: ['quadratus-lumborum', 'tensor-fasciae-latae', 'latissimus-dorsi'],
    lengthenAntagonist: ['gluteus-medius', 'multifidus'],
    lengthenLinked: ['rhomboid-major', 'piriformis'],
    stationBridges: [
      { from: 'external-oblique', to: 'internal-oblique', stationJa: 'お腹の真ん中の白線（左右交差）', crossSide: true },
      { from: 'internal-oblique', to: 'tensor-fasciae-latae', stationJa: '骨盤の前の出っ張り（上前腸骨棘）', crossSide: false },
      { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '腰の後ろの厚い筋膜（左右交差）', crossSide: true },
    ],
    chain: ['tensor-fasciae-latae', 'gluteus-medius', 'internal-oblique', 'external-oblique', 'latissimus-dorsi'],
    yore: ['quadratus-lumborum', 'gluteus-medius', 'external-oblique'],
    twist: 0.75,
    feel: 'スイング後に片側の腰と背中がつらい',
    symptom: '体をひねる時の腰の張り・お尻横の張り・脇腹のつっぱり',
    similar: ['leg-cross-r', 'heavy-lift-dig', 'tennis-baseball-arm'],
  },
  {
    id: 'tennis-baseball-arm',
    category: 'sports',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.15, shoulderIn: 0.6, trunkRotate: 0.45, armsFold: 0.55 }),
    group: 'ゴルフ・球技・ラケット',
    occupation: 'ゴルフ・球技・ラケット',
    label: 'テニス・野球の投球やラケットスイング',
    lines: ['SFAL', 'DFAL', 'FFL'],
    side: 'R',
    shorten: ['pronator-teres', 'flexor-carpi-radialis', 'brachioradialis', 'biceps-brachii', 'pectoralis-minor', 'pectoralis-major'],
    lengthen: ['infraspinatus', 'teres-minor', 'rhomboid-major', 'extensor-carpi-radialis-brevis'],
    shortenCore: ['pronator-teres', 'pectoralis-minor'],
    shortenLinked: ['flexor-carpi-radialis', 'brachioradialis', 'biceps-brachii', 'pectoralis-major'],
    lengthenAntagonist: ['infraspinatus', 'teres-minor'],
    lengthenLinked: ['rhomboid-major', 'extensor-carpi-radialis-brevis'],
    stationBridges: [
      { from: 'pronator-teres', to: 'flexor-carpi-radialis', stationJa: '肘の内側の出っ張り（内側上顆）', crossSide: false },
      { from: 'biceps-brachii', to: 'pronator-teres', stationJa: '肘の内側の上腕二頭筋腱膜', crossSide: false },
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
    ],
    chain: ['pronator-teres', 'brachioradialis', 'biceps-brachii', 'pectoralis-minor', 'infraspinatus'],
    yore: ['pronator-teres', 'biceps-brachii', 'pectoralis-minor'],
    twist: 0.55,
    feel: '肘や肩の前が引っ張られてつらい',
    symptom: '肘の外側のズキズキ・振る時の肩の引っかかり・腕と胸の張り',
    similar: ['cook-pan-hold', 'hair-cut-arm', 'golf-swing-rot'],
  },
  {
    id: 'volleyball-smash',
    category: 'sports',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-03',
    goldenLineId: 'GL-03',
    pose: P({ trunkFlex: -0.25, headForward: 0.25, shoulderIn: 0.55, pelvisTilt: -0.45, trunkRotate: 0.3, armsFold: 0.65 }),
    group: 'ゴルフ・球技・ラケット',
    occupation: 'ゴルフ・球技・ラケット',
    label: 'バレー・バドミントンの頭上スマッシュ',
    lines: ['SBAL', 'DBAL', 'BFL'],
    side: 'R',
    shorten: ['pectoralis-minor', 'latissimus-dorsi', 'subscapularis', 'teres-major', 'deltoid'],
    lengthen: ['supraspinatus', 'infraspinatus', 'teres-minor', 'serratus-anterior'],
    shortenCore: ['pectoralis-minor', 'latissimus-dorsi'],
    shortenLinked: ['subscapularis', 'teres-major', 'deltoid'],
    lengthenAntagonist: ['supraspinatus', 'infraspinatus'],
    lengthenLinked: ['teres-minor', 'serratus-anterior'],
    stationBridges: [
      { from: 'latissimus-dorsi', to: 'teres-major', stationJa: '脇のうしろの筋膜束', crossSide: false },
      { from: 'latissimus-dorsi', to: 'gluteus-maximus', stationJa: '腰の後ろの厚い筋膜（左右交差）', crossSide: true },
      { from: 'rhomboid-major', to: 'serratus-anterior', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['pectoralis-minor', 'latissimus-dorsi', 'teres-major', 'supraspinatus', 'deltoid'],
    yore: ['latissimus-dorsi', 'pectoralis-minor', 'teres-minor'],
    twist: 0.5,
    feel: '腕を振り上げると肩の奥が詰まる',
    symptom: '腕を大きく振り上げる時の肩の違和感・肩甲骨の引っかかり',
    similar: ['overhead-tool', 'laundry-reach', 'swim-crawl-yoga'],
  },

  // ================ 9. ランニング・サッカー・自転車（sports） ================
  {
    id: 'running-strike',
    category: 'sports',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-06',
    goldenLineId: 'GL-06',
    pose: P({ trunkFlex: 0.2, pelvisTilt: -0.25, hipShift: -0.25, armsFold: 0.45 }),
    group: 'ランニング・サッカー・自転車',
    occupation: 'ランニング・サッカー・自転車',
    label: 'ランニング・ジョギングの着地衝撃',
    lines: ['SBL', 'LL', 'DFL'],
    side: 'both',
    shorten: ['gastrocnemius', 'soleus', 'biceps-femoris', 'tensor-fasciae-latae', 'flexor-digitorum-brevis'],
    lengthen: ['tibialis-anterior', 'gluteus-maximus', 'gluteus-medius', 'longissimus'],
    shortenCore: ['gastrocnemius', 'biceps-femoris'],
    shortenLinked: ['soleus', 'tensor-fasciae-latae', 'flexor-digitorum-brevis'],
    lengthenAntagonist: ['tibialis-anterior', 'gluteus-maximus'],
    lengthenLinked: ['gluteus-medius', 'longissimus'],
    stationBridges: [
      { from: 'gastrocnemius', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨（足底腱膜の連結）', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
      { from: 'tensor-fasciae-latae', to: 'fibularis-longus', stationJa: '太もも外側の腸脛靱帯〜腓骨頭', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'gastrocnemius', 'biceps-femoris', 'gluteus-maximus', 'longissimus'],
    yore: ['gastrocnemius', 'biceps-femoris', 'tensor-fasciae-latae'],
    twist: 0.25,
    feel: 'ふくらはぎから太もも裏・足裏が張る',
    symptom: '走った後のひざ外側の張り・足裏のピンとした張り・ふくらはぎの疲れ',
    similar: ['soccer-kick', 'cycling-aero', 'vacuum-dish-bend'],
  },
  {
    id: 'cycling-aero',
    category: 'sports',
    bodyParts: ['waist-pelvis', 'hip-leg', 'neck-jaw'],
    triggerLineId: 'TL-05',
    goldenLineId: 'GL-05',
    pose: P({ trunkFlex: 0.7, headForward: 0.65, shoulderIn: 0.55, pelvisTilt: 0.45, sit: 0.85, armsFold: 0.5 }),
    group: 'ランニング・サッカー・自転車',
    occupation: 'ランニング・サッカー・自転車',
    label: '自転車・ロードバイクの前かがみペダルこぎ',
    lines: ['DFL', 'SFL', 'SBL'],
    side: 'both',
    shorten: ['psoas-major', 'iliacus', 'rectus-femoris', 'biceps-femoris', 'rectus-capitis-posterior-major'],
    lengthen: ['gluteus-maximus', 'multifidus', 'longissimus', 'iliocostalis'],
    shortenCore: ['psoas-major', 'rectus-femoris'],
    shortenLinked: ['iliacus', 'biceps-femoris', 'rectus-capitis-posterior-major'],
    lengthenAntagonist: ['gluteus-maximus', 'multifidus'],
    lengthenLinked: ['longissimus', 'iliocostalis'],
    stationBridges: [
      { from: 'iliacus', to: 'rectus-femoris', stationJa: '骨盤の前の奥（下前腸骨棘）', crossSide: false },
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', crossSide: false },
    ],
    chain: ['rectus-femoris', 'psoas-major', 'iliacus', 'multifidus', 'longissimus'],
    yore: ['psoas-major', 'rectus-femoris', 'biceps-femoris'],
    twist: 0.2,
    feel: '脚の付け根が詰まり腰と首がつらい',
    symptom: '前かがみ走行後の腰の重さ・股関節の詰まり・首うしろの張り',
    similar: ['drive-long', 'gym-squat-lift', 'hair-shampoo-bend'],
  },
  {
    id: 'soccer-kick',
    category: 'sports',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-08',
    goldenLineId: 'GL-08',
    pose: P({ trunkFlex: 0.15, pelvisTilt: -0.45, trunkRotate: 0.35, sideBend: 0.15, hipShift: -0.35 }),
    group: 'ランニング・サッカー・自転車',
    occupation: 'ランニング・サッカー・自転車',
    label: 'サッカーのキック・ダッシュ切り返し',
    lines: ['SFL', 'FFL', 'DFL'],
    side: 'R',
    shorten: ['rectus-femoris', 'vastus-lateralis', 'psoas-major', 'iliacus', 'adductor-longus', 'tibialis-anterior'],
    lengthen: ['gluteus-maximus', 'biceps-femoris', 'semitendinosus', 'gastrocnemius'],
    shortenCore: ['rectus-femoris', 'adductor-longus'],
    shortenLinked: ['vastus-lateralis', 'psoas-major', 'iliacus', 'tibialis-anterior'],
    lengthenAntagonist: ['gluteus-maximus', 'biceps-femoris'],
    lengthenLinked: ['semitendinosus', 'gastrocnemius'],
    stationBridges: [
      { from: 'rectus-femoris', to: 'tibialis-anterior', stationJa: 'ひざのお皿とすねの上の出っ張り', crossSide: false },
      { from: 'rectus-abdominis', to: 'adductor-longus', stationJa: '恥骨の前の腱膜（左右交差）', crossSide: true },
      { from: 'psoas-major', to: 'pectineus', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
    ],
    chain: ['tibialis-anterior', 'rectus-femoris', 'adductor-longus', 'psoas-major', 'longissimus'],
    yore: ['rectus-femoris', 'adductor-longus', 'psoas-major'],
    twist: 0.5,
    feel: '前ももと脚の付け根がパンパンに張る',
    symptom: '脚の付け根まわりの張り・前ももの張り・反り腰',
    similar: ['running-strike', 'sway-back', 'gym-squat-lift'],
  },

  // ================ 10. 筋トレ・ヨガ・水泳（sports） ================
  {
    id: 'gym-bench-push',
    category: 'sports',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-01',
    goldenLineId: 'GL-01',
    pose: P({ trunkFlex: 0.1, shoulderIn: 0.75, armsFold: 0.65 }),
    group: '筋トレ・ヨガ・水泳',
    occupation: '筋トレ・ヨガ・水泳',
    label: 'ベンチプレス・腕立て伏せ（押す運動）',
    lines: ['SFAL', 'DFAL', 'SFL'],
    side: 'both',
    shorten: ['pectoralis-major', 'pectoralis-minor', 'subclavius', 'deltoid', 'coracobrachialis', 'triceps-brachii'],
    lengthen: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus', 'teres-minor'],
    shortenCore: ['pectoralis-major', 'pectoralis-minor'],
    shortenLinked: ['subclavius', 'deltoid', 'coracobrachialis', 'triceps-brachii'],
    lengthenAntagonist: ['rhomboid-major', 'infraspinatus'],
    lengthenLinked: ['rhomboid-minor', 'teres-minor'],
    stationBridges: [
      { from: 'subclavius', to: 'pectoralis-minor', stationJa: '鎖骨の下の胸筋膜（鎖骨胸筋筋膜）', crossSide: false },
      { from: 'pectoralis-minor', to: 'coracobrachialis', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'rhomboid-major', to: 'infraspinatus', stationJa: '肩甲骨の内側の縁', crossSide: false },
    ],
    chain: ['pectoralis-major', 'pectoralis-minor', 'coracobrachialis', 'biceps-brachii', 'rhomboid-major'],
    yore: ['pectoralis-minor', 'pectoralis-major', 'coracobrachialis'],
    twist: 0.2,
    feel: '胸が縮こまり肩の前がつっぱる',
    symptom: '押す動作での肩前の違和感・強い巻き肩・肩甲骨の張り',
    similar: ['arms-fold', 'desk-round', 'tennis-baseball-arm'],
  },
  {
    id: 'gym-squat-lift',
    category: 'sports',
    bodyParts: ['waist-pelvis', 'hip-leg'],
    triggerLineId: 'TL-05',
    goldenLineId: 'GL-05',
    pose: P({ trunkFlex: 0.55, pelvisTilt: -0.4, sit: 0.6, armsFold: 0.35 }),
    group: '筋トレ・ヨガ・水泳',
    occupation: '筋トレ・ヨガ・水泳',
    label: 'スクワット・デッドリフトの負荷',
    lines: ['SBL', 'DFL', 'BFL'],
    side: 'both',
    shorten: ['psoas-major', 'iliacus', 'rectus-femoris', 'quadratus-lumborum', 'biceps-femoris'],
    lengthen: ['multifidus', 'longissimus', 'iliocostalis', 'gluteus-maximus'],
    shortenCore: ['psoas-major', 'quadratus-lumborum'],
    shortenLinked: ['iliacus', 'rectus-femoris', 'biceps-femoris'],
    lengthenAntagonist: ['multifidus', 'gluteus-maximus'],
    lengthenLinked: ['longissimus', 'iliocostalis'],
    stationBridges: [
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'diaphragm', to: 'quadratus-lumborum', stationJa: 'ろっ骨の下縁（外側弓状靱帯）', crossSide: false },
      { from: 'biceps-femoris', to: 'multifidus', stationJa: '坐骨〜仙骨の背側筋膜', crossSide: false },
    ],
    chain: ['biceps-femoris', 'gluteus-maximus', 'psoas-major', 'quadratus-lumborum', 'multifidus'],
    yore: ['psoas-major', 'biceps-femoris', 'multifidus'],
    twist: 0.25,
    feel: 'トレーニング後に腰の奥とお尻が重だるい',
    symptom: '運動後の腰の重さ・股関節の詰まり・もも裏の張り',
    similar: ['heavy-lift-dig', 'care-lift-bend', 'cycling-aero'],
  },
  {
    id: 'swim-crawl-yoga',
    category: 'sports',
    bodyParts: ['shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-03',
    goldenLineId: 'GL-03',
    pose: P({ trunkFlex: -0.15, shoulderIn: 0.65, pelvisTilt: -0.35, trunkRotate: 0.25, armsFold: 0.6 }),
    group: '筋トレ・ヨガ・水泳',
    occupation: '筋トレ・ヨガ・水泳',
    label: '水泳クロール・ヨガの腕上げポーズ',
    lines: ['SBAL', 'SFAL', 'SPL'],
    side: 'both',
    shorten: ['latissimus-dorsi', 'pectoralis-minor', 'subscapularis', 'teres-major', 'serratus-anterior'],
    lengthen: ['supraspinatus', 'infraspinatus', 'teres-minor', 'rhomboid-major'],
    shortenCore: ['latissimus-dorsi', 'pectoralis-minor'],
    shortenLinked: ['subscapularis', 'teres-major', 'serratus-anterior'],
    lengthenAntagonist: ['supraspinatus', 'infraspinatus'],
    lengthenLinked: ['teres-minor', 'rhomboid-major'],
    stationBridges: [
      { from: 'latissimus-dorsi', to: 'teres-major', stationJa: '脇のうしろの筋膜束', crossSide: false },
      { from: 'rhomboid-major', to: 'serratus-anterior', stationJa: '肩甲骨の内側の縁', crossSide: false },
      { from: 'serratus-anterior', to: 'external-oblique', stationJa: 'ろっ骨の外側（第5〜9肋骨）', crossSide: false },
    ],
    chain: ['pectoralis-minor', 'latissimus-dorsi', 'serratus-anterior', 'supraspinatus', 'deltoid'],
    yore: ['latissimus-dorsi', 'pectoralis-minor', 'serratus-anterior'],
    twist: 0.35,
    feel: 'クロールや腕上げで肩がゴリゴリ鳴る',
    symptom: '腕を回す時の肩の引っかかり・脇の下〜肩甲骨の張り',
    similar: ['volleyball-smash', 'laundry-reach', 'overhead-tool'],
  },

  // ================ 11. 追加15項目（仕事・日常・スポーツ拡充） ================
  {
    id: 'nail-eye-fine',
    category: 'work',
    bodyParts: ['neck-jaw', 'shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-10',
    goldenLineId: 'GL-10',
    pose: P({ trunkFlex: 0.45, headForward: 0.85, shoulderIn: 0.65, pelvisTilt: 0.3, sit: 1, armsFold: 0.6 }),
    group: '美容師・理容師',
    occupation: '美容師・理容師',
    label: 'ネイル・まつエク等の細かい手元作業',
    lines: ['SBL', 'DBAL', 'DFAL'],
    side: 'both',
    shorten: ['rectus-capitis-posterior-minor', 'levator-scapulae', 'pectoralis-minor', 'flexor-pollicis-brevis', 'sternocleidomastoid'],
    lengthen: ['splenius-capitis', 'rhomboid-major', 'semispinalis', 'trapezius'],
    shortenCore: ['rectus-capitis-posterior-minor', 'levator-scapulae'],
    shortenLinked: ['pectoralis-minor', 'flexor-pollicis-brevis', 'sternocleidomastoid'],
    lengthenAntagonist: ['splenius-capitis', 'rhomboid-major'],
    lengthenLinked: ['semispinalis', 'trapezius'],
    stationBridges: [
      { from: 'rectus-capitis-posterior-minor', to: 'occipitalis', stationJa: '頭の付け根の奥（後頭骨）', crossSide: false },
      { from: 'splenius-capitis', to: 'rhomboid-major', stationJa: '首〜背中の背骨の突起（左右交差）', crossSide: true },
      { from: 'levator-scapulae', to: 'supraspinatus', stationJa: '肩甲骨の上角', crossSide: false },
    ],
    chain: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major', 'trapezius'],
    yore: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major'],
    twist: 0.15,
    feel: '目の奥と頭のうしろ・肩甲骨のあいだがガチガチ',
    symptom: '目の奥の重だるさ・頭のうしろの重さ・肩甲骨まわりの固まり',
    similar: ['phone-neck', 'laptop-low-screen', 'desk-round'],
  },
  {
    id: 'laptop-low-screen',
    category: 'work',
    bodyParts: ['neck-jaw', 'chest-back', 'shoulder-arm'],
    triggerLineId: 'TL-10',
    goldenLineId: 'GL-10',
    pose: P({ trunkFlex: 0.5, headForward: 0.9, shoulderIn: 0.6, pelvisTilt: 0.4, sit: 1, armsFold: 0.45 }),
    group: 'デスクワーク',
    occupation: 'デスクワーク',
    label: 'ノートPCの低い画面をのぞき込む',
    lines: ['SBL', 'DBAL', 'SFL'],
    side: 'both',
    shorten: ['rectus-capitis-posterior-major', 'sternocleidomastoid', 'pectoralis-minor', 'levator-scapulae'],
    lengthen: ['splenius-capitis', 'semispinalis', 'rhomboid-major', 'longissimus'],
    shortenCore: ['rectus-capitis-posterior-major', 'sternocleidomastoid'],
    shortenLinked: ['pectoralis-minor', 'levator-scapulae'],
    lengthenAntagonist: ['splenius-capitis', 'rhomboid-major'],
    lengthenLinked: ['semispinalis', 'longissimus'],
    stationBridges: [
      { from: 'semispinalis', to: 'occipitalis', stationJa: '頭のうしろの骨の段差（上項線）', crossSide: false },
      { from: 'sternocleidomastoid', to: 'splenius-capitis', stationJa: '耳の後ろの出っ張り骨（乳様突起）', crossSide: false },
      { from: 'splenius-capitis', to: 'rhomboid-major', stationJa: '首〜背中の背骨の突起（左右交差）', crossSide: true },
    ],
    chain: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major', 'trapezius'],
    yore: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major'],
    twist: 0.1,
    feel: '頭のうしろから肩甲骨のあいだが板のように硬い',
    symptom: '首が前に出るクセ・頭の重だるさ・背中の板のような張り',
    similar: ['phone-neck', 'desk-round', 'nail-eye-fine'],
  },
  {
    id: 'mouse-wrist-strain',
    category: 'work',
    bodyParts: ['shoulder-arm', 'neck-jaw'],
    triggerLineId: 'TL-11',
    goldenLineId: 'GL-11',
    pose: P({ trunkFlex: 0.25, headForward: 0.5, shoulderIn: 0.55, sit: 1, armsFold: 0.5 }),
    group: 'デスクワーク',
    occupation: 'デスクワーク',
    label: '長時間のマウス・キーボード手首反り',
    lines: ['SBAL', 'DBAL', 'DFAL'],
    side: 'R',
    shorten: ['extensor-carpi-radialis-longus', 'extensor-digitorum', 'brachioradialis', 'pronator-teres'],
    lengthen: ['triceps-brachii', 'infraspinatus', 'rhomboid-major', 'deltoid'],
    shortenCore: ['extensor-carpi-radialis-longus', 'brachioradialis'],
    shortenLinked: ['extensor-digitorum', 'pronator-teres'],
    lengthenAntagonist: ['triceps-brachii', 'infraspinatus'],
    lengthenLinked: ['rhomboid-major', 'deltoid'],
    stationBridges: [
      { from: 'brachioradialis', to: 'extensor-carpi-radialis-longus', stationJa: '肘の外側の出っ張り（外側上顆）', crossSide: false },
      { from: 'extensor-carpi-radialis-longus', to: 'extensor-digitorum', stationJa: '手首の甲側の支帯（伸筋支帯）', crossSide: false },
      { from: 'infraspinatus', to: 'triceps-brachii', stationJa: '肩関節のうしろ〜二の腕の裏', crossSide: false },
    ],
    chain: ['brachioradialis', 'extensor-carpi-radialis-longus', 'triceps-brachii', 'deltoid', 'infraspinatus'],
    yore: ['brachioradialis', 'extensor-carpi-radialis-longus', 'infraspinatus'],
    twist: 0.2,
    feel: '手首から肘の外側・肩のうしろがジンジンする',
    symptom: '手首まわりの負担・肘の外側のズキズキ・右肩のこり',
    similar: ['desk-round', 'cook-pan-hold', 'kitchen-knife-chop'],
  },
  {
    id: 'nurse-ward-walk',
    category: 'work',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-09',
    goldenLineId: 'GL-09',
    pose: P({ trunkFlex: 0.15, headForward: 0.25, pelvisTilt: -0.25 }),
    group: '整体師・介護・看護',
    occupation: '整体師・介護・看護',
    label: '病棟・施設での長時間移動・立ち回り',
    lines: ['SBL', 'DFL', 'LL'],
    side: 'both',
    shorten: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'tibialis-posterior'],
    lengthen: ['tibialis-anterior', 'biceps-femoris', 'gluteus-maximus', 'longissimus'],
    shortenCore: ['flexor-digitorum-brevis', 'soleus'],
    shortenLinked: ['gastrocnemius', 'tibialis-posterior'],
    lengthenAntagonist: ['tibialis-anterior', 'biceps-femoris'],
    lengthenLinked: ['gluteus-maximus', 'longissimus'],
    stationBridges: [
      { from: 'soleus', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜', crossSide: false },
      { from: 'gastrocnemius', to: 'calcaneal-tendon', stationJa: 'アキレス腱の合流部', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    yore: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius'],
    twist: 0.15,
    feel: '夕方になると足裏とふくらはぎがパンパン',
    symptom: '夕方の脚のむくみ感・足裏のだるさ・ふくらはぎのつりやすさ',
    similar: ['register-stand-long', 'heels-commute-walk', 'hiking-mountain-walk'],
  },
  {
    id: 'delivery-carry-box',
    category: 'work',
    bodyParts: ['shoulder-arm', 'waist-pelvis', 'chest-back'],
    triggerLineId: 'TL-11',
    goldenLineId: 'GL-11',
    pose: P({ trunkFlex: 0.3, headForward: 0.3, shoulderIn: 0.5, armsFold: 0.7 }),
    group: '土木・建築・運転',
    occupation: '土木・建築・運転',
    label: '荷物の連続持ち運び・配送・倉庫作業',
    lines: ['SBAL', 'DFAL', 'BFL'],
    side: 'both',
    shorten: ['brachioradialis', 'biceps-brachii', 'extensor-carpi-radialis-longus', 'pectoralis-minor'],
    lengthen: ['triceps-brachii', 'infraspinatus', 'deltoid', 'rhomboid-major'],
    shortenCore: ['brachioradialis', 'biceps-brachii'],
    shortenLinked: ['extensor-carpi-radialis-longus', 'pectoralis-minor'],
    lengthenAntagonist: ['triceps-brachii', 'infraspinatus'],
    lengthenLinked: ['deltoid', 'rhomboid-major'],
    stationBridges: [
      { from: 'brachioradialis', to: 'extensor-carpi-radialis-longus', stationJa: '肘の外側の出っ張り（外側上顆）', crossSide: false },
      { from: 'pectoralis-minor', to: 'biceps-brachii', stationJa: '肩の前の突起（烏口突起）', crossSide: false },
      { from: 'infraspinatus', to: 'triceps-brachii', stationJa: '肩関節のうしろ〜二の腕の裏', crossSide: false },
    ],
    chain: ['brachioradialis', 'extensor-carpi-radialis-longus', 'triceps-brachii', 'deltoid', 'infraspinatus'],
    yore: ['brachioradialis', 'triceps-brachii', 'infraspinatus'],
    twist: 0.25,
    feel: '前腕から肘・肩のうしろが張って腕が重い',
    symptom: '肘の外側の違和感・腕の疲れ・肩のうしろの詰まり',
    similar: ['heavy-lift-dig', 'cook-pan-hold', 'mouse-wrist-strain'],
  },
  {
    id: 'register-stand-long',
    category: 'work',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-09',
    goldenLineId: 'GL-09',
    pose: P({ headForward: 0.2, shoulderIn: 0.25, pelvisTilt: -0.3 }),
    group: '立ち仕事・料理・接客',
    occupation: '立ち仕事・料理・接客',
    label: 'レジ・カウンターでの長時間立ちっぱなし',
    lines: ['SBL', 'DFL'],
    side: 'both',
    shorten: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'tibialis-posterior'],
    lengthen: ['tibialis-anterior', 'biceps-femoris', 'semitendinosus', 'gluteus-maximus'],
    shortenCore: ['flexor-digitorum-brevis', 'soleus'],
    shortenLinked: ['gastrocnemius', 'tibialis-posterior'],
    lengthenAntagonist: ['tibialis-anterior', 'biceps-femoris'],
    lengthenLinked: ['semitendinosus', 'gluteus-maximus'],
    stationBridges: [
      { from: 'soleus', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜', crossSide: false },
      { from: 'tibialis-posterior', to: 'flexor-digitorum-longus', stationJa: '内くるぶしの奥のトンネル', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    yore: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius'],
    twist: 0.1,
    feel: '足裏がジンジンしてふくらはぎがパンパン',
    symptom: '足裏・かかとの重だるさ・夕方の脚のむくみ感・ひざ裏の張り',
    similar: ['sway-back', 'nurse-ward-walk', 'heels-commute-walk'],
  },
  {
    id: 'kitchen-knife-chop',
    category: 'daily',
    bodyParts: ['shoulder-arm', 'neck-jaw'],
    triggerLineId: 'TL-11',
    goldenLineId: 'GL-11',
    pose: P({ trunkFlex: 0.25, headForward: 0.45, shoulderIn: 0.5, armsFold: 0.6 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: '毎日の包丁・フライパン・皿洗い作業',
    lines: ['SBAL', 'DFAL', 'DBAL'],
    side: 'R',
    shorten: ['brachioradialis', 'extensor-carpi-radialis-longus', 'pronator-teres', 'biceps-brachii'],
    lengthen: ['triceps-brachii', 'infraspinatus', 'deltoid', 'rhomboid-major'],
    shortenCore: ['brachioradialis', 'pronator-teres'],
    shortenLinked: ['extensor-carpi-radialis-longus', 'biceps-brachii'],
    lengthenAntagonist: ['triceps-brachii', 'infraspinatus'],
    lengthenLinked: ['deltoid', 'rhomboid-major'],
    stationBridges: [
      { from: 'brachioradialis', to: 'extensor-carpi-radialis-longus', stationJa: '肘の外側の出っ張り（外側上顆）', crossSide: false },
      { from: 'biceps-brachii', to: 'pronator-teres', stationJa: '肘の内側の上腕二頭筋腱膜', crossSide: false },
      { from: 'infraspinatus', to: 'triceps-brachii', stationJa: '肩関節のうしろ〜二の腕の裏', crossSide: false },
    ],
    chain: ['brachioradialis', 'extensor-carpi-radialis-longus', 'triceps-brachii', 'deltoid', 'infraspinatus'],
    yore: ['brachioradialis', 'triceps-brachii', 'infraspinatus'],
    twist: 0.2,
    feel: '包丁や洗い物で肘の外側と手首がつらい',
    symptom: '手首・親指まわりの負担・肘の外側のズキズキ・肩こり',
    similar: ['cook-pan-hold', 'mouse-wrist-strain', 'vacuum-dish-bend'],
  },
  {
    id: 'stroller-cart-push',
    category: 'daily',
    bodyParts: ['hip-leg', 'shoulder-arm', 'waist-pelvis'],
    triggerLineId: 'TL-09',
    goldenLineId: 'GL-09',
    pose: P({ trunkFlex: 0.25, headForward: 0.3, shoulderIn: 0.45, pelvisTilt: -0.2, armsFold: 0.5 }),
    group: '家事・育児',
    occupation: '家事・育児',
    label: 'ベビーカー・買い物カートを長く押して歩く',
    lines: ['SBL', 'SFAL', 'DFL'],
    side: 'both',
    shorten: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'pectoralis-minor'],
    lengthen: ['tibialis-anterior', 'biceps-femoris', 'semitendinosus', 'longissimus'],
    shortenCore: ['soleus', 'gastrocnemius'],
    shortenLinked: ['flexor-digitorum-brevis', 'pectoralis-minor'],
    lengthenAntagonist: ['tibialis-anterior', 'biceps-femoris'],
    lengthenLinked: ['semitendinosus', 'longissimus'],
    stationBridges: [
      { from: 'gastrocnemius', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨（足底腱膜の連結）', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
      { from: 'biceps-femoris', to: 'longissimus', stationJa: '坐骨〜仙骨をつなぐ靱帯', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    yore: ['soleus', 'gastrocnemius', 'flexor-digitorum-brevis'],
    twist: 0.15,
    feel: 'ふくらはぎからひざ裏・すねが重だるい',
    symptom: 'ふくらはぎの張り・足裏の疲れ・腰の重さ',
    similar: ['nurse-ward-walk', 'hiking-mountain-walk', 'childcare-hip-l'],
  },
  {
    id: 'phone-bed-side',
    category: 'daily',
    bodyParts: ['neck-jaw', 'shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-10',
    goldenLineId: 'GL-10',
    pose: P({ trunkFlex: 0.55, headForward: 0.85, shoulderIn: 0.7, sideBend: 0.2, armsFold: 0.65 }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: 'ベッドやソファーで寝転びスマホ操作',
    lines: ['SBL', 'DBAL', 'DFAL'],
    side: 'both',
    shorten: ['rectus-capitis-posterior-minor', 'levator-scapulae', 'sternocleidomastoid', 'pectoralis-minor'],
    lengthen: ['splenius-capitis', 'rhomboid-major', 'trapezius', 'semispinalis'],
    shortenCore: ['rectus-capitis-posterior-minor', 'levator-scapulae'],
    shortenLinked: ['sternocleidomastoid', 'pectoralis-minor'],
    lengthenAntagonist: ['splenius-capitis', 'rhomboid-major'],
    lengthenLinked: ['trapezius', 'semispinalis'],
    stationBridges: [
      { from: 'rectus-capitis-posterior-minor', to: 'occipitalis', stationJa: '頭の付け根の奥（後頭骨）', crossSide: false },
      { from: 'sternocleidomastoid', to: 'splenius-capitis', stationJa: '耳の後ろの出っ張り骨（乳様突起）', crossSide: false },
      { from: 'splenius-capitis', to: 'rhomboid-major', stationJa: '首〜背中の背骨の突起（左右交差）', crossSide: true },
    ],
    chain: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major', 'trapezius'],
    yore: ['splenius-capitis', 'levator-scapulae', 'rhomboid-major'],
    twist: 0.3,
    feel: '目の奥が重く首の付け根がゴリゴリする',
    symptom: '目の奥の疲れ・頭のうしろの重さ・首や肩の強いこり',
    similar: ['phone-neck', 'sleep-side-curl', 'sofa-slouch'],
  },
  {
    id: 'teeth-clench-night',
    category: 'daily',
    bodyParts: ['neck-jaw', 'shoulder-arm', 'chest-back'],
    triggerLineId: 'TL-02',
    goldenLineId: 'GL-02',
    pose: P({ trunkFlex: 0.25, headForward: 0.65, shoulderIn: 0.6, armsFold: 0.4 }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: '無意識の食いしばり・夜間の歯ぎしり',
    lines: ['DFL', 'SFL', 'DFAL'],
    side: 'both',
    shorten: ['masseter', 'temporalis', 'sternocleidomastoid', 'pectoralis-major', 'scalenus-anterior'],
    lengthen: ['semispinalis', 'splenius-capitis', 'digastric', 'rhomboid-major'],
    shortenCore: ['masseter', 'temporalis'],
    shortenLinked: ['sternocleidomastoid', 'pectoralis-major', 'scalenus-anterior'],
    lengthenAntagonist: ['digastric', 'splenius-capitis'],
    lengthenLinked: ['semispinalis', 'rhomboid-major'],
    stationBridges: [
      { from: 'masseter', to: 'temporalis', stationJa: 'ほお骨のアーチと下あごの突起', crossSide: false },
      { from: 'digastric', to: 'sternohyoid', stationJa: 'のどの上の浮いた骨（舌骨）', crossSide: false },
      { from: 'sternocleidomastoid', to: 'pectoralis-major', stationJa: '鎖骨の内側・胸骨の上端', crossSide: false },
    ],
    chain: ['pectoralis-major', 'sternocleidomastoid', 'scalenus-anterior', 'masseter', 'temporalis'],
    yore: ['masseter', 'sternocleidomastoid', 'pectoralis-major'],
    twist: 0.15,
    feel: 'エラやこめかみが張り首の前が詰まる',
    symptom: 'あごまわりの違和感・こめかみの重さ・首や肩のガチガチ感',
    similar: ['sleep-side-curl', 'phone-neck', 'desk-round'],
  },
  {
    id: 'floor-sit-cross',
    category: 'daily',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-12',
    goldenLineId: 'GL-12',
    pose: P({ trunkFlex: 0.35, pelvisTilt: 0.55, trunkRotate: 0.2, sideBend: 0.2, sit: 1 }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: '床での横座り・あぐら・ぺたんこ座り',
    lines: ['DFL', 'LL', 'SPL'],
    side: 'both',
    shorten: ['adductor-longus', 'pectineus', 'psoas-major', 'tensor-fasciae-latae'],
    lengthen: ['piriformis', 'gluteus-medius', 'gluteus-maximus', 'multifidus'],
    shortenCore: ['adductor-longus', 'pectineus'],
    shortenLinked: ['psoas-major', 'tensor-fasciae-latae'],
    lengthenAntagonist: ['piriformis', 'gluteus-medius'],
    lengthenLinked: ['gluteus-maximus', 'multifidus'],
    stationBridges: [
      { from: 'psoas-major', to: 'pectineus', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'piriformis', to: 'gluteus-maximus', stationJa: '仙骨の横の靱帯（仙結節靱帯）', crossSide: false },
      { from: 'gluteus-medius', to: 'tensor-fasciae-latae', stationJa: '骨盤の横の筋膜', crossSide: false },
    ],
    chain: ['adductor-longus', 'pectineus', 'piriformis', 'gluteus-maximus'],
    yore: ['adductor-longus', 'pectineus', 'piriformis'],
    twist: 0.45,
    feel: '股関節の内側が詰まりお尻の奥が重だるい',
    symptom: '股関節の開きにくさ・お尻の奥の重だるさ・骨盤の傾き',
    similar: ['leg-cross-r', 'sofa-slouch', 'yoga-pilates-open'],
  },
  {
    id: 'heels-commute-walk',
    category: 'daily',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-09',
    goldenLineId: 'GL-09',
    pose: P({ headForward: 0.25, pelvisTilt: -0.5 }),
    group: '姿勢・睡眠・カバン',
    occupation: '姿勢・睡眠・カバン',
    label: 'ヒール・革靴での通勤・階段の上り下り',
    lines: ['SBL', 'SFL', 'DFL'],
    side: 'both',
    shorten: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'rectus-femoris'],
    lengthen: ['tibialis-anterior', 'biceps-femoris', 'gluteus-maximus'],
    shortenCore: ['soleus', 'gastrocnemius'],
    shortenLinked: ['flexor-digitorum-brevis', 'rectus-femoris'],
    lengthenAntagonist: ['tibialis-anterior', 'biceps-femoris'],
    lengthenLinked: ['gluteus-maximus', 'semitendinosus'],
    stationBridges: [
      { from: 'soleus', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
      { from: 'rectus-femoris', to: 'tibialis-anterior', stationJa: 'ひざのお皿とすねの上の出っ張り', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    yore: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius'],
    twist: 0.15,
    feel: '足裏とふくらはぎが張って夜つりそうになる',
    symptom: 'ふくらはぎの張り・むくみ感・足裏の疲れ・足のつりやすさ',
    similar: ['sway-back', 'register-stand-long', 'running-strike'],
  },
  {
    id: 'hiking-mountain-walk',
    category: 'sports',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-09',
    goldenLineId: 'GL-09',
    pose: P({ trunkFlex: 0.25, pelvisTilt: -0.2, armsFold: 0.35 }),
    group: 'ランニング・サッカー・自転車',
    occupation: 'ランニング・サッカー・自転車',
    label: '登山・ハイキング・長時間ウォーキング',
    lines: ['SBL', 'DFL', 'LL'],
    side: 'both',
    shorten: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'psoas-major'],
    lengthen: ['tibialis-anterior', 'biceps-femoris', 'semitendinosus', 'gluteus-maximus'],
    shortenCore: ['flexor-digitorum-brevis', 'gastrocnemius'],
    shortenLinked: ['soleus', 'psoas-major'],
    lengthenAntagonist: ['tibialis-anterior', 'biceps-femoris'],
    lengthenLinked: ['semitendinosus', 'gluteus-maximus'],
    stationBridges: [
      { from: 'gastrocnemius', to: 'calcaneal-tendon', stationJa: 'アキレス腱の合流部', crossSide: false },
      { from: 'calcaneal-tendon', to: 'flexor-digitorum-brevis', stationJa: 'かかとの骨の膜〜足裏の腱膜', crossSide: false },
      { from: 'biceps-femoris', to: 'gastrocnemius', stationJa: 'ひざ裏の筋膜の交差点', crossSide: false },
    ],
    chain: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius', 'biceps-femoris'],
    yore: ['flexor-digitorum-brevis', 'soleus', 'gastrocnemius'],
    twist: 0.2,
    feel: '足裏からアキレス腱・ふくらはぎがパンパン',
    symptom: '足裏のピンとした張り・アキレス腱〜ふくらはぎの疲れ・ひざ裏の張り',
    similar: ['running-strike', 'nurse-ward-walk', 'heels-commute-walk'],
  },
  {
    id: 'court-step-jump',
    category: 'sports',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-12',
    goldenLineId: 'GL-12',
    pose: P({ trunkFlex: 0.35, pelvisTilt: -0.35, trunkRotate: 0.3, sideBend: -0.15, hipShift: 0.3, sit: 0.35 }),
    group: 'ゴルフ・球技・ラケット',
    occupation: 'ゴルフ・球技・ラケット',
    label: 'バスケ・テニス・ダンスの切り返し＆ジャンプ',
    lines: ['DFL', 'FFL', 'LL'],
    side: 'both',
    shorten: ['adductor-longus', 'pectineus', 'psoas-major', 'tensor-fasciae-latae'],
    lengthen: ['piriformis', 'gluteus-medius', 'gluteus-maximus', 'biceps-femoris'],
    shortenCore: ['adductor-longus', 'tensor-fasciae-latae'],
    shortenLinked: ['pectineus', 'psoas-major'],
    lengthenAntagonist: ['piriformis', 'gluteus-medius'],
    lengthenLinked: ['gluteus-maximus', 'biceps-femoris'],
    stationBridges: [
      { from: 'rectus-abdominis', to: 'adductor-longus', stationJa: '恥骨の前の腱膜（左右交差）', crossSide: true },
      { from: 'psoas-major', to: 'pectineus', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'piriformis', to: 'gluteus-maximus', stationJa: '仙骨の横の靱帯（仙結節靱帯）', crossSide: false },
    ],
    chain: ['adductor-longus', 'pectineus', 'piriformis', 'gluteus-maximus'],
    yore: ['adductor-longus', 'pectineus', 'piriformis'],
    twist: 0.45,
    feel: '切り返しで内ももと股関節・お尻の奥が張る',
    symptom: '股関節の内側の詰まり・お尻の奥の違和感・内ももの張り',
    similar: ['soccer-kick', 'golf-swing-rot', 'yoga-pilates-open'],
  },
  {
    id: 'yoga-pilates-open',
    category: 'sports',
    bodyParts: ['hip-leg', 'waist-pelvis'],
    triggerLineId: 'TL-12',
    goldenLineId: 'GL-12',
    pose: P({ trunkFlex: 0.2, pelvisTilt: -0.2, sit: 0.7 }),
    group: '筋トレ・ヨガ・水泳',
    occupation: '筋トレ・ヨガ・水泳',
    label: 'ヨガ・ピラティスの開脚や股関節ポーズ',
    lines: ['DFL', 'SBL', 'LL'],
    side: 'both',
    shorten: ['adductor-longus', 'pectineus', 'psoas-major', 'iliacus'],
    lengthen: ['piriformis', 'gluteus-medius', 'gluteus-maximus', 'biceps-femoris'],
    shortenCore: ['adductor-longus', 'pectineus'],
    shortenLinked: ['psoas-major', 'iliacus'],
    lengthenAntagonist: ['piriformis', 'gluteus-medius'],
    lengthenLinked: ['gluteus-maximus', 'biceps-femoris'],
    stationBridges: [
      { from: 'iliacus', to: 'psoas-major', stationJa: '太ももの付け根の内側（小転子）', crossSide: false },
      { from: 'adductor-longus', to: 'gracilis', stationJa: '恥骨の下の縁', crossSide: false },
      { from: 'piriformis', to: 'gluteus-maximus', stationJa: '仙骨の横の靱帯（仙結節靱帯）', crossSide: false },
    ],
    chain: ['adductor-longus', 'pectineus', 'piriformis', 'gluteus-maximus'],
    yore: ['adductor-longus', 'pectineus', 'piriformis'],
    twist: 0.25,
    feel: '開脚やあぐらで内ももと股関節が引っかかる',
    symptom: '開脚時の内ももの突っ張り・股関節の詰まり・お尻の奥の張り',
    similar: ['floor-sit-cross', 'gym-squat-lift', 'swim-crawl-yoga'],
  },
];

// -------------------------------------------------------------
// FEELINGS — 問診型ホームの主役：「いま一番つらい違和感」16個からワンタップ逆引き
// -------------------------------------------------------------
export const FEELINGS = [
  { id: 'heavy-shoulder', partBadge: '肩・背中', tag: '肩がズーンと重い', label: '肩の奥がズーンと重く、揉んでもすぐ戻る', triggerLineId: 'TL-01', goldenLineId: 'GL-01', habits: ['hair-cut-arm', 'desk-round', 'therapist-press', 'arms-fold', 'bag-shoulder-r', 'gym-bench-push'] },
  { id: 'locked-lowback', partBadge: '腰・お尻', tag: '立つと腰が伸びない', label: 'イスから立つ時、腰が引っ張られて伸びない', triggerLineId: 'TL-05', goldenLineId: 'GL-05', habits: ['hair-shampoo-bend', 'care-lift-bend', 'drive-long', 'sofa-slouch', 'cycling-aero', 'gym-squat-lift'] },
  { id: 'stiff-neck', partBadge: '首・あご', tag: '首のうしろが詰まる', label: '首のうしろや付け根が詰まり、上を向きづらい', triggerLineId: 'TL-02', goldenLineId: 'GL-02', habits: ['phone-neck', 'desk-round', 'overhead-tool', 'sleep-side-curl'] },
  { id: 'arm-jam', partBadge: '肩・背中', tag: '腕が上がりづらい', label: '洗濯や着替えで、腕を上げると肩が引っかかる', triggerLineId: 'TL-03', goldenLineId: 'GL-03', habits: ['laundry-reach', 'overhead-tool', 'hair-cut-arm', 'volleyball-smash', 'swim-crawl-yoga'] },
  { id: 'one-side-hip', partBadge: '腰・お尻', tag: '片側だけ張る', label: 'いつも同じ側の腰やお尻の横ばかり張る', triggerLineId: 'TL-07', goldenLineId: 'GL-07', habits: ['childcare-hip-l', 'leg-cross-r', 'stand-hip-r', 'stand-hip-l', 'bag-shoulder-r', 'golf-swing-rot'] },
  { id: 'shallow-breath', partBadge: '胸・背中', tag: '息が浅い・猫背', label: '胸やみぞおちが縮こまり、深い呼吸がしづらい', triggerLineId: 'TL-04', goldenLineId: 'GL-04', habits: ['sofa-slouch', 'arms-fold', 'desk-round', 'sleep-side-curl'] },
  { id: 'back-lead', partBadge: '腰・お尻', tag: '背面が鉛のよう', label: '前かがみで背中〜腰・もも裏が鉛のように重い', triggerLineId: 'TL-06', goldenLineId: 'GL-06', habits: ['vacuum-dish-bend', 'heavy-lift-dig', 'hair-shampoo-bend', 'running-strike'] },
  { id: 'jaw-clench', partBadge: '首・あご', tag: '食いしばり・あご', label: '奥歯の食いしばりで、あごやこめかみがだるい', triggerLineId: 'TL-02', goldenLineId: 'GL-02', habits: ['phone-neck', 'therapist-press', 'desk-round', 'sleep-side-curl', 'teeth-clench-night'] },
  { id: 'arm-numb', partBadge: '腕・手', tag: '腕〜指先がだるい', label: '肘〜手首・親指の付け根のだるさが抜けない', triggerLineId: 'TL-01', goldenLineId: 'GL-01', habits: ['cook-pan-hold', 'hair-cut-arm', 'therapist-press', 'tennis-baseball-arm'] },
  { id: 'arch-back', partBadge: '腰・お尻', tag: '反り腰・前もも張り', label: '仰向けや立ちっぱなしで、腰が反ってつらい', triggerLineId: 'TL-08', goldenLineId: 'GL-08', habits: ['sway-back', 'laundry-reach', 'stand-hip-r', 'soccer-kick'] },
  { id: 'eye-head-heavy', partBadge: '首・あご', tag: '目の奥・頭の重さ', label: '画面を見続けると、目の奥や後頭部が重くなる', triggerLineId: 'TL-10', goldenLineId: 'GL-10', habits: ['phone-neck', 'laptop-low-screen', 'nail-eye-fine', 'phone-bed-side'] },
  { id: 'foot-calf-swell', partBadge: '脚・足裏', tag: '足裏・夕方むくみ', label: '夕方に足裏がジンジンし、ふくらはぎが張る', triggerLineId: 'TL-09', goldenLineId: 'GL-09', habits: ['register-stand-long', 'heels-commute-walk', 'nurse-ward-walk', 'hiking-mountain-walk', 'running-strike'] },
  { id: 'elbow-wrist-pain', partBadge: '腕・手', tag: '手首・肘の外側', label: 'マウスや家事で、肘の外側や手首がつらい', triggerLineId: 'TL-11', goldenLineId: 'GL-11', habits: ['mouse-wrist-strain', 'cook-pan-hold', 'kitchen-knife-chop', 'delivery-carry-box', 'tennis-baseball-arm'] },
  { id: 'hip-groin-jam', partBadge: '股関節・脚', tag: '股関節の詰まり', label: 'あぐらや開脚で、脚の付け根や内ももが詰まる', triggerLineId: 'TL-12', goldenLineId: 'GL-12', habits: ['floor-sit-cross', 'leg-cross-r', 'yoga-pilates-open', 'court-step-jump'] },
  { id: 'scapula-board', partBadge: '肩・背中', tag: '肩甲骨がガチガチ', label: '肩甲骨のあいだが板のように固まって苦しい', triggerLineId: 'TL-10', goldenLineId: 'GL-10', habits: ['desk-round', 'laptop-low-screen', 'arms-fold', 'nail-eye-fine'] },
  { id: 'buttock-sciatic', partBadge: '腰・お尻', tag: 'お尻の奥の重さ', label: '長く座ると、お尻の奥からもも裏が重だるい', triggerLineId: 'TL-12', goldenLineId: 'GL-12', habits: ['leg-cross-r', 'drive-long', 'floor-sit-cross', 'sofa-slouch'] },
];

// -------------------------------------------------------------
// STORIES — 厳選6本 × 各4ステップ完結（0.5秒で認識できる短い言葉）
// -------------------------------------------------------------
export const STORIES = [
  {
    id: 'phone-pc-jaw',
    title: 'スマホ・PC首肩',
    steps: [
      {
        text: '指と腕の使いすぎで前腕・力こぶが縮む',
        focus: ['flexor-digitorum-superficialis', 'flexor-carpi-radialis', 'biceps-brachii'],
        shorten: ['flexor-digitorum-profundus', 'biceps-brachii'],
        lengthen: ['extensor-digitorum', 'triceps-brachii'],
        yore: ['flexor-digitorum-superficialis', 'flexor-carpi-radialis'],
        line: 'SFAL',
        view: 'front',
        pose: P({ trunkFlex: 0.2, headForward: 0.4, shoulderIn: 0.3, armsFold: 0.4 }),
      },
      {
        text: '胸の奥（鎖骨の下）が縮み巻き肩に',
        focus: ['pectoralis-minor', 'subclavius', 'pectoralis-major'],
        shorten: ['pectoralis-minor', 'subclavius'],
        lengthen: ['rhomboid-minor'],
        yore: ['pectoralis-major', 'coracobrachialis'],
        line: 'DFAL',
        view: 'front',
        pose: P({ trunkFlex: 0.3, headForward: 0.6, shoulderIn: 0.7, armsFold: 0.4 }),
      },
      {
        text: '肩甲骨が外へ引っ張られ背中が張る',
        focus: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus', 'teres-minor'],
        shorten: ['pectoralis-minor'],
        lengthen: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus'],
        yore: ['teres-minor', 'levator-scapulae'],
        line: 'DBAL',
        view: 'back',
        pose: P({ trunkFlex: 0.4, headForward: 0.7, shoulderIn: 0.8, armsFold: 0.4 }),
      },
      {
        text: '首の前が縮みあごの食いしばりへ',
        focus: ['scalenus-anterior', 'sternocleidomastoid', 'masseter', 'temporalis'],
        shorten: ['sternocleidomastoid', 'masseter', 'temporalis'],
        lengthen: ['semispinalis', 'digastric'],
        yore: ['scalenus-anterior', 'mylohyoid'],
        line: 'DFL',
        view: 'left',
        pose: P({ trunkFlex: 0.4, headForward: 0.9, shoulderIn: 0.7, armsFold: 0.4 }),
      },
    ],
  },
  {
    id: 'pelvis-tug-lowback',
    title: '座りすぎ腰の重さ',
    steps: [
      {
        text: '座りすぎで脚の付け根の奥が縮む',
        focus: ['psoas-major', 'iliacus'],
        shorten: ['psoas-major', 'iliacus'],
        lengthen: ['gluteus-maximus'],
        yore: ['pectineus'],
        line: 'DFL',
        view: 'front',
        pose: P({ trunkFlex: 0.3, pelvisTilt: 0.6, sit: 1 }),
      },
      {
        text: 'もも裏も縮み骨盤を前後からロック',
        focus: ['biceps-femoris', 'semitendinosus', 'semimembranosus', 'psoas-major'],
        shorten: ['biceps-femoris', 'semitendinosus', 'psoas-major'],
        lengthen: ['rectus-femoris'],
        yore: ['semimembranosus', 'iliacus'],
        line: 'SBL',
        view: 'left',
        pose: P({ trunkFlex: 0.3, pelvisTilt: 0.7, sit: 1 }),
      },
      {
        text: '立つ時に股関節が伸びず腰が反る',
        focus: ['psoas-major', 'iliacus', 'rectus-femoris'],
        shorten: ['psoas-major', 'iliacus'],
        lengthen: ['gluteus-maximus'],
        yore: ['rectus-femoris'],
        line: 'DFL',
        view: 'left',
        pose: P({ trunkFlex: 0.25, pelvisTilt: -0.6 }),
      },
      {
        text: '引っ張られた腰の筋肉が強く張る',
        focus: ['multifidus', 'longissimus', 'iliocostalis', 'gluteus-maximus'],
        shorten: ['psoas-major', 'quadratus-lumborum'],
        lengthen: ['multifidus', 'longissimus', 'iliocostalis'],
        yore: ['multifidus', 'gluteus-maximus'],
        line: 'SBL',
        view: 'back',
        pose: P({ trunkFlex: 0.25, pelvisTilt: -0.6 }),
      },
    ],
  },
  {
    id: 'biceps-face-sag',
    title: '食いしばり・顔たるみ',
    steps: [
      {
        text: 'スマホや荷物で力こぶが縮む',
        focus: ['biceps-brachii', 'coracobrachialis', 'brachioradialis'],
        shorten: ['biceps-brachii', 'coracobrachialis'],
        lengthen: ['triceps-brachii'],
        yore: ['brachioradialis', 'flexor-carpi-radialis'],
        line: 'DFAL',
        view: 'front',
        pose: P({ headForward: 0.3, shoulderIn: 0.4, armsFold: 0.5 }),
      },
      {
        text: '胸から首の前の薄い筋膜を下へ引っ張る',
        focus: ['pectoralis-minor', 'platysma', 'sternocleidomastoid'],
        shorten: ['pectoralis-minor', 'platysma'],
        lengthen: ['rhomboid-minor', 'trapezius'],
        yore: ['sternocleidomastoid', 'subclavius'],
        line: 'SFL',
        view: 'front',
        pose: P({ trunkFlex: 0.2, headForward: 0.5, shoulderIn: 0.6 }),
      },
      {
        text: '頬や口角が下へ引かれたるみ顔に',
        focus: ['platysma', 'depressor-anguli-oris', 'depressor-labii-inferioris', 'zygomaticus-major'],
        shorten: ['depressor-anguli-oris', 'depressor-labii-inferioris'],
        lengthen: ['zygomaticus-major'],
        yore: ['platysma'],
        line: 'SFL',
        view: 'front',
        pose: P({ headForward: 0.6, shoulderIn: 0.5 }),
      },
      {
        text: '体の芯ラインであごが固まり食いしばる',
        focus: ['masseter', 'temporalis', 'scalenus-anterior', 'mylohyoid'],
        shorten: ['masseter', 'temporalis'],
        lengthen: ['digastric'],
        yore: ['scalenus-anterior', 'mylohyoid'],
        line: 'DFL',
        view: 'left',
        pose: P({ trunkFlex: 0.2, headForward: 0.8, shoulderIn: 0.5 }),
      },
    ],
  },
  {
    id: 'sofa',
    title: 'お尻ずらし座り・浅い呼吸',
    steps: [
      {
        text: '骨盤が後ろへ倒れお尻ずらし座りになる',
        focus: ['gluteus-maximus', 'biceps-femoris', 'semitendinosus', 'semimembranosus'],
        shorten: ['biceps-femoris', 'semitendinosus'],
        lengthen: ['multifidus'],
        yore: ['semimembranosus', 'gluteus-maximus'],
        line: 'SBL',
        view: 'left',
        pose: P({ pelvisTilt: 0.9, sit: 1 }),
      },
      {
        text: 'お腹と脚の付け根の奥が縮んで固まる',
        focus: ['rectus-abdominis', 'psoas-major', 'iliacus'],
        shorten: ['rectus-abdominis', 'psoas-major', 'iliacus'],
        lengthen: ['gluteus-maximus'],
        yore: ['external-oblique', 'pectineus'],
        line: 'DFL',
        view: 'front',
        pose: P({ trunkFlex: 0.7, pelvisTilt: 0.9, sit: 1 }),
      },
      {
        text: '背中の筋肉が引き伸ばされ固まる',
        focus: ['longissimus', 'iliocostalis', 'multifidus'],
        shorten: ['rectus-abdominis'],
        lengthen: ['longissimus', 'iliocostalis', 'spinalis'],
        yore: ['multifidus'],
        line: 'SBL',
        view: 'back',
        pose: P({ trunkFlex: 0.8, pelvisTilt: 0.9, sit: 1 }),
      },
      {
        text: 'みぞおちが潰れて息が浅くなり首こりへ',
        focus: ['diaphragm', 'rectus-capitis-posterior-major', 'sternocleidomastoid'],
        shorten: ['diaphragm', 'sternocleidomastoid'],
        lengthen: ['splenius-cervicis', 'trapezius'],
        yore: ['transversus-thoracis', 'rectus-capitis-posterior-minor'],
        line: 'DFL',
        view: 'left',
        pose: P({ trunkFlex: 0.8, headForward: 0.8, shoulderIn: 0.4, pelvisTilt: 0.9, sit: 1 }),
      },
    ],
  },
  {
    id: 'arms-fold',
    title: '腕組み・巻き肩',
    steps: [
      {
        text: '腕を組むと胸と鎖骨の下が縮む',
        focus: ['pectoralis-major', 'pectoralis-minor', 'subclavius'],
        shorten: ['pectoralis-major', 'pectoralis-minor', 'subclavius'],
        lengthen: ['infraspinatus', 'rhomboid-minor'],
        yore: ['coracobrachialis', 'serratus-anterior'],
        line: 'DFAL',
        view: 'front',
        pose: P({ trunkFlex: 0.1, shoulderIn: 0.5, armsFold: 1 }),
      },
      {
        text: '肩甲骨が外へ引っ張られ背中が張る',
        focus: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus', 'teres-minor'],
        shorten: ['pectoralis-minor'],
        lengthen: ['rhomboid-major', 'rhomboid-minor', 'infraspinatus'],
        yore: ['teres-minor', 'trapezius'],
        line: 'DBAL',
        view: 'back',
        pose: P({ trunkFlex: 0.1, shoulderIn: 0.6, armsFold: 1 }),
      },
      {
        text: '力こぶと前腕に筋膜のねじれがたまる',
        focus: ['biceps-brachii', 'brachialis', 'flexor-carpi-radialis'],
        shorten: ['coracobrachialis', 'flexor-carpi-radialis'],
        lengthen: ['triceps-brachii'],
        yore: ['biceps-brachii', 'brachialis'],
        line: 'DFAL',
        view: 'front',
        pose: P({ trunkFlex: 0.1, shoulderIn: 0.6, armsFold: 1 }),
      },
      {
        text: '首の前が固まり浅い呼吸と首こりへ',
        focus: ['scalenus-anterior', 'sternocleidomastoid', 'diaphragm'],
        shorten: ['sternocleidomastoid', 'diaphragm'],
        lengthen: ['semispinalis'],
        yore: ['scalenus-anterior', 'scalenus-medius'],
        line: 'DFL',
        view: 'left',
        pose: P({ trunkFlex: 0.2, headForward: 0.3, shoulderIn: 0.6, armsFold: 1 }),
      },
    ],
  },
  {
    id: 'daily-strain',
    title: '抱っこ・片側負担',
    steps: [
      {
        text: '抱っこや作業で腕と胸の奥がこわばる',
        focus: ['biceps-brachii', 'pectoralis-minor', 'deltoid', 'flexor-digitorum-superficialis'],
        shorten: ['biceps-brachii', 'pectoralis-minor'],
        lengthen: ['triceps-brachii', 'rhomboid-major'],
        yore: ['flexor-digitorum-superficialis', 'deltoid'],
        line: 'DFAL',
        view: 'front',
        pose: P({ trunkFlex: 0.1, shoulderIn: 0.4, armsFold: 0.6 }),
      },
      {
        text: '脇腹の筋膜に強いねじれが生じる',
        focus: ['external-oblique', 'internal-oblique', 'serratus-anterior'],
        shorten: ['rectus-abdominis', 'internal-oblique'],
        lengthen: ['quadratus-lumborum'],
        yore: ['external-oblique', 'serratus-anterior'],
        line: 'SPL',
        view: 'front',
        pose: P({ trunkRotate: 0.25, sideBend: 0.15, hipShift: -0.4, armsFold: 0.5 }),
      },
      {
        text: '片側のお尻横と太もも外側に負担がかかる',
        focus: ['gluteus-medius', 'tensor-fasciae-latae', 'vastus-lateralis'],
        shorten: ['adductor-longus', 'rectus-femoris'],
        lengthen: ['gluteus-medius', 'gluteus-minimus'],
        yore: ['tensor-fasciae-latae', 'vastus-lateralis'],
        line: 'LL',
        view: 'left',
        pose: P({ sideBend: 0.2, hipShift: -0.6, armsFold: 0.4 }),
      },
      {
        text: '骨盤と腰の境目に張りが集まる',
        focus: ['multifidus', 'quadratus-lumborum', 'longissimus', 'gluteus-maximus'],
        shorten: ['quadratus-lumborum'],
        lengthen: ['longissimus', 'iliocostalis'],
        yore: ['multifidus', 'gluteus-maximus'],
        line: 'SBL',
        view: 'back',
        pose: P({ trunkFlex: 0.2, sideBend: 0.2, hipShift: -0.6 }),
      },
    ],
  },
];

// -------------------------------------------------------------
// 動画制作マスターページ（studio.html）連携・カスタムレシピ保存＆オーバーライド読込
// セキュリティ強化：Prototype Pollution 対策＆型・文字列長サニタイズ
// -------------------------------------------------------------
export const STUDIO_STORAGE_KEY = 'fascia_studio_recipes_v1';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeKey(k) {
  return typeof k === 'string' && k.length > 0 && k.length <= 128 && !UNSAFE_KEYS.has(k);
}

function sanitizeStr(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.length > maxLen ? val.slice(0, maxLen) : val;
}

function sanitizeScalar(key, val) {
  const numKeys = new Set(['xrayOpacity', 'speed', 'strokeSpan', 'durationSec', 'twist']);
  if (numKeys.has(key)) {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof val === 'string') {
    return sanitizeStr(val, 500);
  }
  return undefined;
}

function safeParseJson(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 200000) return null;
  const parsed = JSON.parse(raw, (k, v) => (UNSAFE_KEYS.has(k) ? undefined : v));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function safeShallowMerge(target, src) {
  const out = Object.create(null);
  if (target && typeof target === 'object') {
    for (const k of Object.keys(target)) {
      if (isSafeKey(k)) out[k] = target[k];
    }
  }
  if (src && typeof src === 'object') {
    for (const k of Object.keys(src)) {
      if (isSafeKey(k)) out[k] = src[k];
    }
  }
  return { ...out };
}

export function saveStudioRecipe(lineOrHabitId, patch) {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    let current = {};
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (raw) {
      const parsed = safeParseJson(raw);
      if (parsed) current = safeShallowMerge({}, parsed);
    }
    if (lineOrHabitId && typeof lineOrHabitId === 'object' && patch === undefined) {
      current = safeShallowMerge(current, lineOrHabitId);
    } else if (isSafeKey(lineOrHabitId)) {
      if (patch === null) {
        delete current[lineOrHabitId];
      } else if (patch && typeof patch === 'object') {
        const prev = current[lineOrHabitId] && typeof current[lineOrHabitId] === 'object' ? current[lineOrHabitId] : {};
        current[lineOrHabitId] = safeShallowMerge(prev, patch);
      }
    }
    window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.warn('[data] saveStudioRecipe failed:', err);
    return {};
  }
}

function normTool(t) {
  if (t === 'hand') return 'hand';
  return t === 'pole' || t === 'roller' ? 'roller' : 'ball';
}

function normToolLabel(tool) {
  const n = normTool(tool);
  if (n === 'hand') return '🤲 指でやる';
  return n === 'roller' ? '🛞 ローラー' : '🎾 ボール';
}

function normalizeFourStageGradient(item, fallbackTl = null) {
  const used = new Set();
  const takeUnique = (arr) => {
    const out = [];
    if (!Array.isArray(arr)) return out;
    for (const rawId of arr) {
      const id = normalizeMuscleId(rawId);
      if (!id || !MUSCLE_LAYERS[id] || used.has(id)) continue;
      used.add(id);
      out.push(id);
    }
    return out;
  };

  const baseShort = Array.isArray(item.shorten) ? item.shorten : [];
  const baseLong = Array.isArray(item.lengthen) ? item.lengthen : [];

  item.shortenCore = takeUnique(
    Array.isArray(item.shortenCore) && item.shortenCore.length
      ? item.shortenCore
      : baseShort.slice(0, 2)
  );
  item.shortenLinked = takeUnique(
    Array.isArray(item.shortenLinked) && item.shortenLinked.length
      ? item.shortenLinked
      : [...baseShort.slice(2), ...(fallbackTl?.shortenLinked || [])].slice(0, 4)
  );
  item.lengthenAntagonist = takeUnique(
    Array.isArray(item.lengthenAntagonist) && item.lengthenAntagonist.length
      ? item.lengthenAntagonist
      : baseLong.slice(0, 2)
  );
  item.lengthenLinked = takeUnique(
    Array.isArray(item.lengthenLinked) && item.lengthenLinked.length
      ? item.lengthenLinked
      : [...baseLong.slice(2), ...(fallbackTl?.lengthenLinked || [])].slice(0, 4)
  );

  if (!Array.isArray(item.stationBridges) || !item.stationBridges.length) {
    const computed = collectBridgesForChain(
      item.shortenCore,
      item.shortenLinked,
      item.lengthenAntagonist,
      item.lengthenLinked,
      3
    );
    item.stationBridges = computed.length
      ? computed
      : Array.isArray(fallbackTl?.stationBridges)
        ? fallbackTl.stationBridges.map((b) => ({ ...b }))
        : [];
  }
}

function bindTriggerLinesToHabits() {
  for (const tl of TRIGGER_LINES) {
    if (tl.tool !== undefined) {
      tl.tool = normTool(tl.tool);
      tl.toolLabel = normToolLabel(tl.tool);
    }
    for (const p of tl.triggerPoints) {
      p.tool = normTool(p.tool);
      p.toolLabel = normToolLabel(p.tool);
    }
    if (!Array.isArray(tl.fasciaChain) || !tl.fasciaChain.length) {
      tl.fasciaChain = Array.isArray(tl.arrowPath) ? [...tl.arrowPath] : [];
    }
    if (!Array.isArray(tl.arrowPath) || !tl.arrowPath.length) {
      tl.arrowPath = [...tl.fasciaChain];
    }
    normalizeFourStageGradient(tl, null);
    tl.rootMuscles = tl.triggerPoints.map((p) => p.id);
    tl.steps = tl.triggerPoints.map((p) => p.step);
  }

  const triggerLineMap = {};
  for (const tl of TRIGGER_LINES) {
    if (tl.id) triggerLineMap[tl.id] = tl;
    if (tl.code) triggerLineMap[tl.code] = tl;
    if (tl.goldenId) triggerLineMap[tl.goldenId] = tl;
  }

  for (const h of HABITS) {
    const tl = triggerLineMap[h.triggerLineId || h.goldenLineId];
    normalizeFourStageGradient(h, tl || null);
    if (!tl) continue;
    const activeTps = Array.isArray(h.customTriggerPoints) && h.customTriggerPoints.length
      ? h.customTriggerPoints.map((p) => ({
          ...p,
          tool: normTool(p.tool),
          toolLabel: normToolLabel(p.tool),
        }))
      : tl.triggerPoints;
    const activeSteps = activeTps.map((p) => p.step);
    const activeRoots = activeTps.map((p) => p.id);

    h.triggerLineId = tl.code || tl.id;
    h.goldenLineId = tl.goldenId || tl.id;
    h.triggerLine = tl;
    h.goldenLine = tl;
    h.triggerPoints = activeTps;
    if (h.tool !== undefined) {
      h.tool = normTool(h.tool);
      h.toolLabel = normToolLabel(h.tool);
    }
    h.insight = tl.point;
    h.causalSummary = h.causalSummary || tl.causalSummary;
    h.pulledLabel = h.pulledLabel || tl.pulledLabel;
    h.quickCheck = h.quickCheck || tl.quickCheck;
    h.safetyNote = h.safetyNote || tl.safetyNote;
    h.selfCare = {
      triggerLineId: tl.code || tl.id,
      goldenLineId: tl.goldenId || tl.id,
      youtubeUrl: tl.youtubeUrl,
      title: tl.name,
      point: tl.point,
      pulledLabel: h.pulledLabel,
      causalSummary: h.causalSummary,
      quickCheck: h.quickCheck,
      safetyNote: h.safetyNote,
      cameraView: tl.cameraView || 'front',
      xrayOpacity: typeof tl.xrayOpacity === 'number' ? tl.xrayOpacity : 0.28,
      speed: typeof tl.speed === 'number' ? tl.speed : 1.0,
      strokeSpan: typeof tl.strokeSpan === 'number' ? tl.strokeSpan : 0.75,
      triggerPoints: activeTps,
      steps: activeSteps,
      targetMuscles: activeRoots,
      fasciaChain: tl.fasciaChain,
      arrowPath: tl.arrowPath,
      stationBridges: h.stationBridges,
      videoDuration: tl.videoDuration,
    };
  }
}

function applyStudioOverrides() {
  bindTriggerLinesToHabits();
  if (typeof window === 'undefined' || !window.localStorage) return;
  const host = String(window.location?.hostname || '');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!isLocal) return;
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return;
    const recipes = safeParseJson(raw);
    if (!recipes) return;

    const tlTopKeys = [
      'name', 'shortName', 'youtubeUrl', 'youtubeTitle', 'videoDuration',
      'point', 'pulledLabel', 'causalSummary', 'quickCheck', 'safetyNote',
      'cameraView', 'xrayOpacity', 'speed', 'strokeSpan',
      'tool', 'toolLabel', 'motion', 'strokeTarget', 'durationSec',
    ];
    const tpKeys = ['id', 'label', 'easyLabel', 'tool', 'toolLabel', 'motion', 'strokeTarget', 'durationSec', 'step'];

    for (const tl of TRIGGER_LINES) {
      const ov =
        (isSafeKey(tl.code) && recipes[tl.code]) ||
        (isSafeKey(tl.id) && recipes[tl.id]) ||
        (isSafeKey(tl.goldenId) && recipes[tl.goldenId]) ||
        (isSafeKey(tl.code) && recipes.triggerLines?.[tl.code]) ||
        (isSafeKey(tl.id) && recipes.triggerLines?.[tl.id]) ||
        (isSafeKey(tl.goldenId) && recipes.triggerLines?.[tl.goldenId]);
      if (!ov || typeof ov !== 'object') continue;

      for (const k of tlTopKeys) {
        if (!isSafeKey(k) || ov[k] === undefined) continue;
        const clean = sanitizeScalar(k, ov[k]);
        if (clean !== undefined) tl[k] = clean;
      }
      if (tl.tool !== undefined) {
        tl.tool = normTool(tl.tool);
        tl.toolLabel = normToolLabel(tl.tool);
      }
      const nextChain = Array.isArray(ov.fasciaChain) && ov.fasciaChain.length
        ? ov.fasciaChain
        : Array.isArray(ov.arrowPath) && ov.arrowPath.length
          ? ov.arrowPath
          : null;
      if (nextChain) {
        const cleanedChain = nextChain.filter((m) => isSafeKey(m)).map((m) => sanitizeStr(m, 100));
        tl.fasciaChain = cleanedChain;
        tl.arrowPath = [...cleanedChain];
      }
      if (Array.isArray(ov.pulledMuscles) && ov.pulledMuscles.length) {
        tl.pulledMuscles = ov.pulledMuscles.filter((m) => isSafeKey(m)).map((m) => sanitizeStr(m, 100));
      }
      if (Array.isArray(ov.triggerPoints)) {
        ov.triggerPoints.forEach((tpPatch, idx) => {
          if (!tpPatch || typeof tpPatch !== 'object' || !tl.triggerPoints[idx]) return;
          for (const tk of tpKeys) {
            if (!isSafeKey(tk) || tpPatch[tk] === undefined) continue;
            const clean = sanitizeScalar(tk, tpPatch[tk]);
            if (clean !== undefined) tl.triggerPoints[idx][tk] = clean;
          }
          tl.triggerPoints[idx].tool = normTool(tl.triggerPoints[idx].tool);
          tl.triggerPoints[idx].toolLabel = normToolLabel(tl.triggerPoints[idx].tool);
        });
      }
      if (Array.isArray(ov.steps)) {
        ov.steps.forEach((stepStr, idx) => {
          if (typeof stepStr === 'string' && tl.triggerPoints[idx]) {
            tl.triggerPoints[idx].step = sanitizeStr(stepStr, 500);
          }
        });
      }
      for (const h of HABITS) {
        if (h.triggerLineId === tl.code || h.triggerLineId === tl.id) {
          if (ov.causalSummary !== undefined) h.causalSummary = tl.causalSummary;
          if (ov.pulledLabel !== undefined) h.pulledLabel = tl.pulledLabel;
          if (ov.quickCheck !== undefined) h.quickCheck = tl.quickCheck;
          if (ov.safetyNote !== undefined) h.safetyNote = tl.safetyNote;
        }
      }
    }

    // トリガーラインの更新を全 HABITS へ再反映（normTool 正規化込み）
    bindTriggerLinesToHabits();

    // 個別 HABIT 単位のオーバーライドもマージ
    const habitScalarKeys = [
      'label', 'feel', 'symptom', 'point', 'insight', 'youtubeUrl',
      'pulledLabel', 'causalSummary', 'quickCheck', 'safetyNote',
      'cameraView', 'xrayOpacity', 'speed', 'strokeSpan', 'twist',
      'tool', 'toolLabel', 'motion', 'strokeTarget', 'durationSec',
    ];
    for (const h of HABITS) {
      if (!isSafeKey(h.id)) continue;
      const hov = recipes[h.id] || recipes.habits?.[h.id];
      if (!hov || typeof hov !== 'object') continue;
      for (const hk of habitScalarKeys) {
        if (!isSafeKey(hk) || hov[hk] === undefined) continue;
        const clean = sanitizeScalar(hk, hov[hk]);
        if (clean !== undefined) h[hk] = clean;
      }
      if (h.tool !== undefined) {
        h.tool = normTool(h.tool);
        h.toolLabel = normToolLabel(h.tool);
      }
      if (hov.pose && typeof hov.pose === 'object') {
        const cleanPose = {};
        for (const pk of Object.keys(hov.pose)) {
          if (isSafeKey(pk) && Number.isFinite(Number(hov.pose[pk]))) {
            cleanPose[pk] = Number(hov.pose[pk]);
          }
        }
        h.pose = P({ ...h.pose, ...cleanPose });
      }
      if (typeof hov.point === 'string') {
        const cleanPoint = sanitizeStr(hov.point, 500);
        h.insight = cleanPoint;
        if (h.selfCare) h.selfCare.point = cleanPoint;
      }
      if (Array.isArray(hov.triggerPoints) && h.triggerPoints) {
        h.triggerPoints = h.triggerPoints.map((tp, idx) => {
          const patch = hov.triggerPoints[idx];
          const merged = { ...tp };
          if (patch && typeof patch === 'object') {
            for (const tk of tpKeys) {
              if (!isSafeKey(tk) || patch[tk] === undefined) continue;
              const clean = sanitizeScalar(tk, patch[tk]);
              if (clean !== undefined) merged[tk] = clean;
            }
          }
          merged.tool = normTool(merged.tool);
          merged.toolLabel = normToolLabel(merged.tool);
          return merged;
        });
        if (h.selfCare) {
          h.selfCare.triggerPoints = h.triggerPoints;
          h.selfCare.steps = h.triggerPoints.map((p) => p.step);
        }
      }
      if (hov.selfCare && typeof hov.selfCare === 'object') {
        h.selfCare = safeShallowMerge(h.selfCare, hov.selfCare);
        if (Array.isArray(h.selfCare.triggerPoints)) {
          h.selfCare.triggerPoints = h.selfCare.triggerPoints.map((tp) => {
            const copy = safeShallowMerge({}, tp);
            copy.tool = normTool(copy.tool);
            copy.toolLabel = normToolLabel(copy.tool);
            return copy;
          });
        }
      }
    }
  } catch (err) {
    console.warn('[data] applyStudioOverrides failed:', err);
  }
}

applyStudioOverrides();

// -------------------------------------------------------------
// セキュリティ保護：マスターデータの完全凍結（改ざん・意図しない書き換え防止）
// -------------------------------------------------------------
function deepFreeze(obj, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return obj;
  seen.add(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key], seen);
  }
  return Object.freeze(obj);
}

deepFreeze(CATEGORIES);
deepFreeze(BODY_PARTS);
deepFreeze(TRIGGER_LINES);
deepFreeze(LINES);
deepFreeze(FASCIA_STATION_BRIDGES);
deepFreeze(ANTAGONIST_MAP);
deepFreeze(OCCUPATIONS);
deepFreeze(HABITS);
deepFreeze(FEELINGS);
deepFreeze(STORIES);
