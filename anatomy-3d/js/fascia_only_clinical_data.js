// =============================================================================
// fascia_only_clinical_data.js — 12大症状 × 16日常動作 × 新候補10動作 × 一覧チェック表SSOT
//
// 方針:
// - 比喩表現を使わず、「原因（赤：縮む筋膜）」「ピン留め部（筋膜の癒着部）」「症状（青：張る筋膜）」
//   の統一用語と、1秒で頭に入る短い自然な日本語だけで記述する。
// - 「疲れをためない日常の工夫」と「つながるホームページ（Rooton）コラム」を全アイテムに完備する。
// - カメラは関わるエリア全体が見渡せる引き画角に統一する。
// =============================================================================

export const BODY_REGIONS = [
  {
    id: 'head-neck',
    num: '1',
    label: '首・頭・あご・目の奥',
    sub: '首うしろの張り・目の疲れ・食いしばり',
    previewCamera: 'neck-shoulder',
  },
  {
    id: 'shoulder-back',
    num: '2',
    label: '肩・肩甲骨・背中・胸',
    sub: '背中の重さ・巻き肩・腕上げの引っかかり',
    previewCamera: 'neck-shoulder',
  },
  {
    id: 'arm-hand',
    num: '3',
    label: '腕・肘・手首・親指',
    sub: 'パソコン・スマホ・手作業での肘や手首の痛み',
    previewCamera: 'arm-hand',
  },
  {
    id: 'waist-hip',
    num: '4',
    label: '腰・骨盤・お尻',
    sub: '立ち上がりの腰痛・反り腰・お尻の重さ',
    previewCamera: 'pelvis-zoom',
  },
  {
    id: 'leg-foot',
    num: '5',
    label: '股関節・太もも・膝・足裏',
    sub: '外もも張り・階段の膝痛・足裏とふくらはぎ',
    previewCamera: 'leg-foot-zoom',
  },
];

export const MOTION_CATEGORIES = [
  { id: 'stand-balance', num: '1', label: '立ち方・姿勢（4種）' },
  { id: 'desk-phone', num: '2', label: 'デスク・スマホ（4種）' },
  { id: 'sit-handwork', num: '3', label: '座り方・家事・手作業（4種）' },
  { id: 'sport-reach', num: '4', label: 'カバン・腕上げ・スポーツ（4種）' },
];

// ケア箇所の『▶ 3Dでほぐし方を見る』最適カメラアングル定義（器具・支持マット/壁・対象筋膜が立体的に見える角度）
export const CARE_ZOOM_TARGETS = {
  'flank-r': {
    label: '右の脇腹',
    target: [-0.36, 0.88, 0.02],
    viewTarget: [-0.18, 0.78, 0.02],
    dir: [-0.78, 0.08, 0.62],
    halfH: 1.38,
    halfW: 1.12,
  },
  'inner-thigh-r': {
    label: '右の内もも付け根',
    target: [-0.14, -0.52, 0.08],
    viewTarget: [-0.10, -0.46, 0.04],
    dir: [-0.38, 0.06, 0.92],
    halfH: 1.38,
    halfW: 1.10,
  },
  'outer-hip-r': {
    label: '右の骨盤横〜太もも外側',
    target: [-0.38, -0.48, 0.0],
    viewTarget: [-0.22, -0.42, 0.0],
    dir: [-0.82, 0.07, 0.57],
    halfH: 1.38,
    halfW: 1.10,
  },
  'thumb-wrist-r': {
    label: '親指の付け根〜手首内側',
    target: [-0.76, 0.90, 0.36],
    viewTarget: [-0.56, 0.96, 0.22],
    dir: [-0.46, 0.16, 0.87],
    halfH: 0.98,
    halfW: 0.88,
  },
  'pec-minor-r': {
    label: '鎖骨の下のくぼみ',
    target: [-0.28, 1.82, 0.14],
    viewTarget: [-0.14, 1.70, 0.08],
    dir: [-0.36, 0.09, 0.93],
    halfH: 1.16,
    halfW: 1.02,
  },
  'between-scapula': {
    label: '肩甲骨のあいだ',
    target: [-0.12, 1.74, -0.18],
    viewTarget: [-0.06, 1.66, -0.12],
    dir: [-0.42, 0.08, -0.90],
    halfH: 1.18,
    halfW: 1.04,
  },
  'sternum-clavicle': {
    label: '胸の真ん中〜鎖骨まわり',
    target: [0.0, 1.86, 0.16],
    viewTarget: [0.0, 1.70, 0.08],
    dir: [-0.24, 0.08, 0.97],
    halfH: 1.18,
    halfW: 1.04,
  },
  'scm-neck-front': {
    label: '耳の下〜鎖骨の首前ライン',
    target: [-0.11, 2.34, 0.08],
    viewTarget: [-0.06, 2.12, 0.05],
    dir: [-0.52, 0.06, 0.85],
    halfH: 1.08,
    halfW: 0.96,
  },
  'diaphragm-rib': {
    label: 'みぞおち・ろっ骨の下縁',
    target: [-0.12, 1.24, 0.14],
    viewTarget: [-0.06, 1.30, 0.08],
    dir: [-0.26, 0.08, 0.96],
    halfH: 1.22,
    halfW: 1.06,
  },
  'jaw-hyoid': {
    label: 'あごの下〜こめかみ',
    target: [-0.10, 2.66, 0.08],
    viewTarget: [-0.06, 2.42, 0.05],
    dir: [-0.52, 0.05, 0.85],
    halfH: 0.98,
    halfW: 0.90,
  },
  'groin-psoas': {
    label: '脚の付け根の奥',
    target: [-0.16, 0.14, 0.12],
    viewTarget: [-0.10, 0.14, 0.06],
    dir: [-0.42, 0.10, 0.90],
    halfH: 1.26,
    halfW: 1.06,
  },
  'ischium-ham': {
    label: '坐骨の下〜もも裏',
    target: [-0.22, -0.46, -0.16],
    viewTarget: [-0.14, -0.52, -0.10],
    dir: [-0.52, 0.06, -0.85],
    halfH: 1.34,
    halfW: 1.08,
  },
  'front-thigh-shin': {
    label: '太もも前〜骨盤の前かど下',
    target: [-0.28, -0.92, 0.12],
    viewTarget: [-0.18, -0.96, 0.06],
    dir: [-0.62, 0.08, 0.78],
    halfH: 1.36,
    halfW: 1.08,
  },
  'armpit-lat-r': {
    label: 'わきの下の後ろ側',
    target: [-0.42, 1.56, -0.10],
    viewTarget: [-0.24, 1.44, -0.06],
    dir: [-0.74, 0.06, -0.67],
    halfH: 1.28,
    halfW: 1.06,
  },
  'forearm-inner-r': {
    label: '肘の内側〜前腕内側',
    target: [-0.74, 0.96, 0.24],
    viewTarget: [-0.54, 1.02, 0.16],
    dir: [-0.48, 0.16, 0.86],
    halfH: 1.04,
    halfW: 0.92,
  },
  'fibula-outer-r': {
    label: 'すね外側〜外くるぶし上',
    target: [-0.38, -2.32, -0.04],
    viewTarget: [-0.22, -2.18, -0.04],
    dir: [-0.80, 0.06, 0.60],
    halfH: 1.26,
    halfW: 1.02,
  },
  'plantar-sole-r': {
    label: '土踏まず〜内くるぶし後ろ',
    target: [-0.33, -3.18, -0.01],
    viewTarget: [-0.26, -2.92, -0.01],
    dir: [-0.76, -0.10, 0.64],
    halfH: 0.98,
    halfW: 0.88,
  },
  'chest-oblique-sling': {
    label: '胸の外側〜お腹の斜めライン',
    target: [0.0, 1.15, 0.12],
    viewTarget: [0.0, 0.96, 0.06],
    dir: [-0.30, 0.07, 0.95],
    halfH: 1.72,
    halfW: 1.28,
  },
};

// -----------------------------------------------------------------------------
// 既存12症状カード（実装済み・本番稼働中）
// -----------------------------------------------------------------------------
export const SYMPTOM_CARDS = [
  {
    id: 'hip-outer-tight',
    code: '既存 01',
    region: 'leg-foot',
    title: '片側のお尻横・外ももが張る',
    habitSub: '片足に体重を乗せて立つクセ',
    pose0Label: '両足に均等に乗ったまっすぐな立ち方',
    pose100Label: '右足に体重を預け、骨盤が右へズレた休め立ち',
    presetId: 'right-stance',
    lines: ['LL', 'DFL'],
    cameraView: 'pelvis-zoom',
    pitfall:
      '張っている外ももは、横にズレた骨盤を支えるために引っぱられている場所です。強く押し伸ばすより、骨盤を引き寄せている脇腹と内ももを先にゆるめます。',
    chain: {
      culprit: '右の脇腹〜腰の奥・右の内もも',
      station: '骨盤の上の縁・太もも外側の骨（大転子）',
      victim: '右のお尻横〜太もも外側（腸脛靱帯）',
    },
    dailyTip:
      '信号待ちや立ち話では足幅をこぶし1つ分あけ、左右の足裏の真ん中に均等に体重を乗せます。片腰にカバンを当てる側も日によって入れ替えます。',
    hpColumns: [
      {
        status: 'published',
        title: 'ランニング・ゴルフ・筋トレで「股関節の前が詰まる・膝の外側が張る」理由',
        file: 'article-running-golf-hip-pinch-outer-knee.html',
      },
      {
        status: 'published',
        title: '抱っこや前かがみ育児で「腰と骨盤まわりがつらい・朝起き上がりにくい」理由',
        file: 'article-childcare-carrying-pelvis-lower-back.html',
      },
    ],
    careSteps: [
      {
        title: '右の脇腹（ろっ骨と骨盤のあいだ）',
        detail: '詰まって縮んでいる脇腹の筋膜をゆるめ、骨盤が真ん中へ戻れるゆとりを作ります。',
        zoomKey: 'flank-r',
      },
      {
        title: '右の内ももの付け根',
        detail: '股関節を内側へ引き込んでいる内ももをほぐしてから、最後に外ももを軽くさすります。',
        zoomKey: 'inner-thigh-r',
      },
    ],
  },
  {
    id: 'scapula-back-heavy',
    code: '既存 02',
    region: 'shoulder-back',
    alsoRegions: ['arm-hand'],
    title: '肩甲骨のあいだ・背中が重だるい',
    habitSub: 'パソコン・マウス作業で肩が内側に入るクセ',
    pose0Label: '胸が自然に開き、肩甲骨が落ち着いた姿勢',
    pose100Label: 'マウス・キーボードへ手を伸ばし巻き肩になる姿勢',
    presetId: 'desk-pc-mouse',
    lines: ['DFAL', 'DBAL', 'SPL'],
    cameraView: 'neck-shoulder',
    pitfall:
      '背中は前から肩甲骨を引っぱられて張っています。親指から鎖骨の下まで続く前側の縮みを残したまま背中だけ揉んでも、すぐ元に戻ります。',
    chain: {
      culprit: '親指の付け根〜腕の内側〜鎖骨の下',
      station: '肩の前の突起（烏口突起）・肩甲骨の内側',
      victim: '肩甲骨のあいだ・背中の筋膜',
    },
    dailyTip:
      'キーボードとマウスを体の近くへ引き寄せてひじを90度に保ち、腕を前へ伸ばし続けない配置にします。縦型マウスやパームレストで手のひらの内ひねりを減らすのも有効です。',
    hpColumns: [
      {
        status: 'published',
        title: '巻き肩は「胸の緊張」から。セルフチェックと、仕事の合間にできるケア',
        file: 'article-rounded-shoulders.html',
      },
      {
        status: 'published',
        title: '肩こりの原因は「肩」だけじゃない。もんでも戻る理由と、デスクワークの合間にできるケア',
        file: 'article-katakori.html',
      },
    ],
    careSteps: [
      {
        title: '親指の付け根〜手首の内側',
        detail: 'マウスやスマホで真っ先に縮む親指のふくらみから手首の緊張を抜きます。',
        zoomKey: 'thumb-wrist-r',
      },
      {
        title: '鎖骨のすぐ下のくぼみ',
        detail: '肩を前へ引き込む胸の筋膜をゆるめると、自然に肩甲骨が元の位置へ戻ります。',
        zoomKey: 'pec-minor-r',
      },
      {
        title: '仕上げ：肩甲骨のあいだ',
        detail: '前側の縮みがほどけてから、壁にボールを挟んで肩甲骨の内側をやさしく転がし整えます。',
        zoomKey: 'between-scapula',
      },
    ],
  },
  {
    id: 'neck-base-eye',
    code: '既存 03',
    region: 'head-neck',
    title: '首うしろの詰まり・頭重・目の疲れ',
    habitSub: 'スマホや手元をうつむいて見るクセ',
    pose0Label: '頭が背骨の真上に乗ったラクな姿勢',
    pose100Label: '手元のスマホを覗き込み、頭が前下へ落ちた姿勢',
    presetId: 'phone-neck',
    lines: ['SFL', 'SBL', 'DFAL'],
    cameraView: 'neck-shoulder',
    pitfall:
      '首のうしろは、前に出た重い頭を支えるために引っぱられて張っています。頭を下へ強く押し伸ばさず、首を前へ引いている胸と首前をゆるめます。',
    chain: {
      culprit: '胸の真ん中〜鎖骨〜首前・腕の前側',
      station: '鎖骨の内側・耳のうしろの骨・後頭部',
      victim: '首のうしろ〜背中上部・頭のてっぺん',
    },
    dailyTip:
      'スマホを持つ方のわきの下に反対の手や丸めたバッグを挟み、画面を目の高さに近づけて首の角度を浅くします。30分に一度は遠くの景色を見て目の奥の緊張を抜きます。',
    hpColumns: [
      {
        status: 'published',
        title: 'デスクワークのストレートネック。首肩こり・腕のしびれを「首だけ」で考えない理由と、仕事の合間にできるケア',
        file: 'article-straight-neck.html',
      },
      {
        status: 'published',
        title: '首こりからくる頭痛（緊張型頭痛）とは？締めつけられる頭の重さと、首・肩・呼吸の関係',
        file: 'article-zutsu.html',
      },
    ],
    careSteps: [
      {
        title: '胸の真ん中（胸骨）〜鎖骨まわり',
        detail: '首を前下へ引き下げている胸の縦ラインを上下左右にやさしく滑らせます。',
        zoomKey: 'sternum-clavicle',
      },
      {
        title: '耳の下〜鎖骨をつなぐ首前の筋膜',
        detail: '強く押さずに皮膚を軽くずらすと、頭が背骨の上に戻り目の奥まで軽くなります。',
        zoomKey: 'scm-neck-front',
      },
    ],
  },
  {
    id: 'jaw-clench-breath',
    code: '既存 04',
    region: 'head-neck',
    title: '食いしばり・あごの疲れ・浅い呼吸',
    habitSub: '背中を丸めて息が浅くなるクセ',
    pose0Label: 'みぞおちにゆとりがあり、上下の歯が離れた状態',
    pose100Label: 'みぞおちが潰れて息が浅くなり、奥歯を噛みしめる姿勢',
    presetId: 'clench-slouch',
    lines: ['DFL', 'SFL'],
    cameraView: 'neck-shoulder',
    pitfall:
      'みぞおちの奥から首・あごへ続く体の芯の筋膜が縮むと、下あごが奥へ引かれて無意識に噛みしめます。あごだけでなく呼吸に関わるみぞおちからゆるめます。',
    chain: {
      culprit: 'みぞおち奥（横隔膜）〜首の奥・あご横',
      station: 'ろっ骨の下縁・下あごの角・こめかみ',
      victim: '首のうしろ〜背中上部の筋膜',
    },
    dailyTip:
      '集中している時ほど、唇を閉じたまま「上下の奥歯を2ミリ離し、舌先を上あごに軽く添える」のを目印にします。1時間に一度、6秒かけて細く長く息を吐き切ります。',
    hpColumns: [
      {
        status: 'published',
        title: 'デスクワークで「目の奥が重い・食いしばり・呼吸が浅い」が重なる理由',
        file: 'article-eye-strain-jaw-clenching-shallow-breathing.html',
      },
    ],
    careSteps: [
      {
        title: 'みぞおち・ろっ骨の下の縁',
        detail: 'ゆっくり息を吐きながらろっ骨の下をゆるめ、体の芯の引き下げをほどきます。',
        zoomKey: 'diaphragm-rib',
      },
      {
        title: 'あごの下〜こめかみ',
        detail: '呼吸が深くなってからあご周りに触れると、軽い力で噛みしめが抜けます。',
        zoomKey: 'jaw-hyoid',
      },
    ],
  },
  {
    id: 'morning-lowback-lock',
    code: '既存 05',
    region: 'waist-hip',
    title: '立ち上がりに腰が伸びない・朝の腰の重さ',
    habitSub: '椅子に浅く座って骨盤が後ろに倒れるクセ',
    pose0Label: '股関節と背骨がまっすぐ伸びた姿勢',
    pose100Label: '椅子に浅く座り、骨盤が後ろへ倒れて腰が丸まる姿勢',
    presetId: 'chair-slouch-sit',
    lines: ['DFL', 'SBL'],
    cameraView: 'pelvis-zoom',
    pitfall:
      '座りっぱなしで縮んだ股関節の奥ともも裏が骨盤を止め、立つ瞬間に腰の筋膜を引っぱっています。痛い腰を強く揉まず、前後の股関節まわりを先にゆるめます。',
    chain: {
      culprit: 'お腹の奥〜脚の付け根・もも裏',
      station: '股関節の内側・坐骨・腰の仙骨',
      victim: '腰の真ん中〜背骨わきの筋膜',
    },
    dailyTip:
      '座る時はお尻を背もたれの一番奥まで入れ、丸めたタオルをお尻の後ろ半分に敷いて骨盤を起こします。立ち上がる時はいきなり腰を伸ばさず、片足を半歩引いて太ももに手をついて立ちます。',
    hpColumns: [
      {
        status: 'published',
        title: '慢性腰痛の原因は？「異常なし」と言われた腰の重さを、腰だけで考えない理由',
        file: 'article-youtsu.html',
      },
      {
        status: 'published',
        title: 'マッサージに行っても「翌日には戻る」のはなぜ？凝っている場所と、引っぱっている筋膜の話',
        file: 'article-massage-returns-fascia.html',
      },
    ],
    careSteps: [
      {
        title: '脚の付け根（そけい部）の少し奥',
        detail: '腰の骨を前から引いている股関節前の筋膜をゆるめ、骨盤が起きやすくします。',
        zoomKey: 'groin-psoas',
      },
      {
        title: 'お尻の坐骨の下〜もも裏',
        detail: '骨盤を後ろへ引いているもも裏をほぐすと、腰に負担をかけず背すじが伸びます。',
        zoomKey: 'ischium-ham',
      },
    ],
  },
  {
    id: 'swayback-arch-pain',
    code: '既存 06',
    region: 'waist-hip',
    title: '反り腰がつらい・前ももが張る',
    habitSub: '骨盤が前へ傾きお腹を突き出して立つクセ',
    pose0Label: '骨盤が真っすぐ立ち、お腹と腰が釣り合った姿勢',
    pose100Label: '太もも前が突っ張って骨盤が前傾し、腰が強く反る立ち方',
    presetId: 'sway-back-stand',
    lines: ['SFL', 'DFL', 'SBL'],
    cameraView: 'pelvis-zoom',
    pitfall:
      '前ももからすね前の筋膜が縮んで骨盤を前下へ引き下げ、腰を反らせています。腹筋運動を頑張る前に、骨盤を前へ引いている前ももと股関節前をゆるめます。',
    chain: {
      culprit: '太もも前〜すね前・腰の反り部分',
      station: 'ひざのお皿・骨盤の前の出っ張り',
      victim: '引き伸ばされたお腹前・もも裏上部',
    },
    dailyTip:
      '立つ時はひざをピンと後ろへ押し切ってロックせず、ほんの少しひざの力を抜いてかかと寄りに体重を乗せます。高すぎるヒールや靴紐のゆるい靴を避けるだけでも前ももの張りが減ります。',
    hpColumns: [
      {
        status: 'published',
        title: '反り腰は「股関節の前」から。腰がつらくなる理由と、セルフチェック・ケア',
        file: 'article-hyperlordosis.html',
      },
      {
        status: 'published',
        title: '仰向けで寝ると「腰が浮いてつらい・呼吸が浅い」理由',
        file: 'article-supine-back-gap.html',
      },
    ],
    careSteps: [
      {
        title: '太ももの前〜骨盤の前かど下',
        detail: '骨盤を前へ傾けている前ももの張りを抜くと、仰向けでの腰の浮きが減ります。',
        zoomKey: 'front-thigh-shin',
      },
      {
        title: '脚の付け根の奥（股関節前）',
        detail: '腰の骨を前へ引いている深部の筋膜をゆるめると、お腹の力が自然に入ります。',
        zoomKey: 'groin-psoas',
      },
    ],
  },
  {
    id: 'overhead-shoulder-jam',
    code: '既存 07',
    region: 'shoulder-back',
    title: '腕を上げると肩がつまる・引っかかる',
    habitSub: '洗濯干し・洗髪・高い所へ手を伸ばす動作',
    pose0Label: '腕を下ろし、肩まわりに力みのない姿勢',
    pose100Label: 'わきの下が突っ張ったまま高く腕を上げ、肩上が詰まる姿勢',
    presetId: 'overhead-reach',
    lines: ['DFAL', 'BFL', 'SBAL'],
    cameraView: 'neck-shoulder',
    pitfall:
      'わきの下と鎖骨下の筋膜が縮んで腕の骨を下へ引き止め、肩の上で筋膜が挟まっています。痛みを我慢して肩を回す前に、わきの下と胸前のブレーキを外します。',
    chain: {
      culprit: 'わきの下〜背中・鎖骨の下の筋膜',
      station: '腕の付け根・肩の屋根の骨（肩峰）',
      victim: '肩の上〜二の腕外側の筋膜',
    },
    dailyTip:
      '洗濯干しや高い棚の作業は、遠くから腕だけを伸ばさず踏み台を使って胸〜目の高さで行います。腕を上げる時は手のひらを少し内側・上向きにすると肩の引っかかりが減ります。',
    hpColumns: [
      {
        status: 'published',
        title: '巻き肩は「胸の緊張」から。セルフチェックと、仕事の合間にできるケア',
        file: 'article-rounded-shoulders.html',
      },
    ],
    careSteps: [
      {
        title: 'わきの下の後ろ側（広背筋膜）',
        detail: 'わきの後ろをつまんでゆるめると、腕が耳の横まで軽く上がるようになります。',
        zoomKey: 'armpit-lat-r',
      },
      {
        title: '鎖骨のすぐ下の胸前',
        detail: '肩甲骨の動きを止めている前側の縮みをほどき、肩の上の詰まりを防ぎます。',
        zoomKey: 'pec-minor-r',
      },
    ],
  },
  {
    id: 'wrist-elbow-thumb',
    code: '既存 08',
    region: 'arm-hand',
    title: '肘の外側・手首・親指が痛む',
    habitSub: '手のひらを下に向けたパソコン・家事・手作業',
    pose0Label: '前腕にねじれがない自然な手首の向き',
    pose100Label: '手のひらを下へ向けて手首を反らし続ける作業姿勢',
    presetId: 'forearm-pronation-work',
    lines: ['DFAL', 'SFAL', 'SBAL'],
    cameraView: 'arm-hand',
    pitfall:
      '手のひらを下に向けるクセで親指〜前腕内側の筋膜が縮み、肘の外側〜手首の甲側がねじり伸ばされています。痛む外側ではなく、縮んだ内側からゆるめます。',
    chain: {
      culprit: '親指のふくらみ〜前腕の内側',
      station: '交差する前腕の骨・肘の外側の骨',
      victim: '肘の外側〜前腕の甲側〜手首',
    },
    dailyTip:
      'フライパンや荷物を持つ時は「手のひらを下」ではなく「手のひらを上・横向き」にしてわきを締めます。これだけで肘の外側にかかるねじれ負担が大きく減ります。',
    hpColumns: [
      {
        status: 'published',
        title: 'デスクワークのストレートネック。首肩こり・腕のしびれを「首だけ」で考えない理由と、仕事の合間にできるケア',
        file: 'article-straight-neck.html',
      },
    ],
    careSteps: [
      {
        title: '手のひらの親指のふくらみ',
        detail: '指先作業で固まった親指の付け根をほぐし、前腕の内ひねりをゆるめます。',
        zoomKey: 'thumb-wrist-r',
      },
      {
        title: '肘の内側〜前腕の内側',
        detail: '内側の縮みをほどくことで、引っぱられていた肘外側と手首の負担が抜けます。',
        zoomKey: 'forearm-inner-r',
      },
    ],
  },
  {
    id: 'buttock-deep-sit',
    code: '既存 09',
    region: 'waist-hip',
    title: '長く座るとお尻の奥〜もも裏が重い',
    habitSub: '足を組んで座り骨盤がねじれるクセ',
    pose0Label: '左右の坐骨に均等に乗った安定姿勢',
    pose100Label: '右脚を上にして足を組み、骨盤が傾いてねじれる座り方',
    presetId: 'leg-cross-sit',
    lines: ['LL', 'SPL', 'DFL'],
    cameraView: 'pelvis-zoom',
    pitfall:
      '足を組むクセで内ももと股関節前の筋膜が縮み、お尻の奥が後ろから強く引っぱられています。お尻を硬いボールで強く潰さず、内ももと前ポケット横からゆるめます。',
    chain: {
      culprit: '内ももの付け根・ズボン前ポケット横',
      station: '恥骨・骨盤の前かど・仙骨〜大転子',
      victim: 'お尻の奥〜横・反対側の腰',
    },
    dailyTip:
      '椅子が高すぎて足裏が浮くと無意識に足を組みたくなります。足元に低い足置きを置いて両足裏をしっかり着け、ズボンの後ろポケットの財布も抜いて座ります。',
    hpColumns: [
      {
        status: 'published',
        title: 'つい足を組んでしまい「お尻の奥や足腰が重だるい」人へ',
        file: 'article-cross-legs-adductor-glute.html',
      },
    ],
    careSteps: [
      {
        title: '太もも内側の付け根',
        detail: '脚を内側へ引き寄せる内ももの筋膜をほぐし、骨盤のねじれを整えます。',
        zoomKey: 'inner-thigh-r',
      },
      {
        title: 'ズボンの前ポケット横（骨盤の前外側）',
        detail: '股関節の前外側の縮みを抜くと、お尻の奥の重だるさがスッと軽くなります。',
        zoomKey: 'outer-hip-r',
      },
    ],
  },
  {
    id: 'knee-outer-runner',
    code: '既存 10',
    region: 'leg-foot',
    title: '歩く・階段・走ると膝の外側が痛む',
    habitSub: '片足着地で骨盤と足首が横にブレるクセ',
    pose0Label: '骨盤が水平に保たれた両足立ち',
    pose100Label: '片足着地で骨盤が右へ逃げ、膝外側が強く張る瞬間',
    presetId: 'run-single-strike',
    lines: ['LL', 'SPL', 'SFL'],
    cameraView: 'leg-foot-zoom',
    pitfall:
      '膝は股関節と足首のあいだで上下から引っぱられています。膝まわりだけ揉むのではなく、すね外側と骨盤横の両端から張りを抜きます。',
    chain: {
      culprit: 'すね外側〜外くるぶし後ろ・脇腹',
      station: '外くるぶし・膝外側の骨・大転子',
      victim: '太もも外側〜膝外側（腸脛靱帯）',
    },
    dailyTip:
      'かかと外側ばかりすり減った靴は早めに見直し、歩幅を大きく出しすぎず体の真下に足を着地させます。道路の端の傾斜ばかり同じ向きで走らない工夫も大切です。',
    hpColumns: [
      {
        status: 'published',
        title: 'ランニング・ゴルフ・筋トレで「股関節の前が詰まる・膝の外側が張る」理由',
        file: 'article-running-golf-hip-pinch-outer-knee.html',
      },
    ],
    careSteps: [
      {
        title: 'すねの外側〜外くるぶしの上',
        detail: '足首の傾きで固まったすね外側をゆるめ、足裏がまっすぐ着けるようにします。',
        zoomKey: 'fibula-outer-r',
      },
      {
        title: '骨盤の横〜お尻の上側',
        detail: '上から腸脛靱帯を引っぱっている骨盤横をほぐし、膝外側のこすれを減らします。',
        zoomKey: 'outer-hip-r',
      },
    ],
  },
  {
    id: 'foot-arch-calf',
    code: '既存 11',
    region: 'leg-foot',
    title: '夕方に足裏が痛み、ふくらはぎが張る',
    habitSub: '前かがみ作業や前のめり重心のクセ',
    pose0Label: 'くるぶしの真上に重心が乗った立ち方',
    pose100Label: '前のめり前かがみで足裏〜ふくらはぎが張り詰める姿勢',
    presetId: 'forward-bend-work',
    lines: ['SBL', 'DFL', 'LL'],
    cameraView: 'leg-back-zoom',
    pitfall:
      '体が前へ倒れないよう、足裏からふくらはぎ・もも裏まで背面の筋膜が1枚で張り詰めています。ふくらはぎだけでなく、土台である足裏と内くるぶし奥からゆるめます。',
    chain: {
      culprit: '足の裏（土踏まず）・すね内側の奥',
      station: 'かかとの骨・内くるぶしの後ろ',
      victim: 'ふくらはぎ・アキレス腱・もも裏',
    },
    dailyTip:
      '低い位置の作業は腰から折らず、ひざと股関節を曲げて対象に近づきます。足指が浮くスリッパでの長時間の家事を控え、かかとが安定する室内履きを選びます。',
    hpColumns: [
      {
        status: 'published',
        title: '「ふくらはぎがいつもパンパン」な人の腰痛が抜けない理由',
        file: 'article-morning-calf-back-line.html',
      },
    ],
    careSteps: [
      {
        title: '土踏まず〜かかとの少し前',
        detail: '足裏の筋膜をゆるめると、かかと経由でふくらはぎの張りまで一気に抜けます。',
        zoomKey: 'plantar-sole-r',
      },
      {
        title: '内くるぶしの後ろ〜すね内側のきわ',
        detail: '土踏まずを支える深部の筋膜をほぐし、足首のしなやかさを取り戻します。',
        zoomKey: 'plantar-sole-r',
      },
    ],
  },
  {
    id: 'twist-golf-waist',
    code: '既存 12',
    region: 'waist-hip',
    title: '体をひねると片側の腰や肩が痛む',
    habitSub: '胸と股関節が固まり腰だけでひねるクセ',
    pose0Label: '正面を向いたねじれのない姿勢',
    pose100Label: '胸と股関節が連動して対角ラインが伸び縮みするひねり動作',
    presetId: 'spiral-functional-twist',
    lines: ['SPL', 'BFL', 'FFL'],
    cameraView: 'upper-torso-zoom',
    pitfall:
      '胸まわりと股関節の斜めラインが固まると、本来あまり回らない腰の骨にねじれが集中します。腰を無理にひねらず、胸の外側と内ももをゆるめます。',
    chain: {
      culprit: '胸の外側〜わきの下・反対側の内もも',
      station: 'お腹の中央・恥骨・腰の仙骨まわり',
      victim: '反対側の背中〜お尻・腰の境目',
    },
    dailyTip:
      '後ろの物を取る時や車庫入れで振り返る時は、腰だけをひねらずお尻ごと向きを変えるか、胸と目線を一緒に回します。サブモニターも真正面寄りに配置します。',
    hpColumns: [
      {
        status: 'published',
        title: '夜、布団に入ると逆に背中や腰が張ってくる「脱力迷子」のほどき方',
        file: 'article-bedtime-fascia-twist.html',
      },
      {
        status: 'published',
        title: 'ランニング・ゴルフ・筋トレで「股関節の前が詰まる・膝の外側が張る」理由',
        file: 'article-running-golf-hip-pinch-outer-knee.html',
      },
    ],
    careSteps: [
      {
        title: '胸の外側〜わきの下・ろっ骨横',
        detail: '胸まわりがなめらかに回るようにし、腰へのねじれ集中を防ぎます。',
        zoomKey: 'chest-oblique-sling',
      },
      {
        title: '反対側の内もも付け根',
        detail: '股関節の回りを良くして、胸と脚が連動して楽に回れる状態を作ります。',
        zoomKey: 'inner-thigh-r',
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// 日常のクセ・仕事・スポーツ『16の日常動作』定義（本番稼働中）
// -----------------------------------------------------------------------------
export const MOTION_PRESETS = [
  {
    id: 'right-stance',
    motionGroup: 'stand-balance',
    label: '右足に体重を乗せて立つ',
    category: '立ち方のクセ',
    recommendedLines: ['LL', 'DFL'],
    defaultCamera: 'pelvis-zoom',
    bidirectional: true,
    cycleSec: 5.4,
    description:
      '骨盤が右へずれ、右の脇腹と内ももが縮む一方で、右の太もも外側と左の脇腹が強く引っぱられます。',
  },
  {
    id: 'left-stance',
    motionGroup: 'stand-balance',
    label: '左足に体重を乗せて立つ',
    category: '立ち方のクセ',
    recommendedLines: ['LL', 'DFL'],
    defaultCamera: 'pelvis-zoom',
    bidirectional: true,
    cycleSec: 5.4,
    description:
      '骨盤が左へずれ、左の脇腹と内ももが縮む一方で、左の太もも外側と右の脇腹が強く引っぱられます。',
  },
  {
    id: 'alt-sway',
    motionGroup: 'stand-balance',
    label: '左右交互の体重移動',
    category: '立ち方のクセ',
    recommendedLines: ['LL', 'DFL'],
    defaultCamera: 'front',
    bidirectional: true,
    cycleSec: 7.2,
    description:
      '骨盤の上の縁を境目にして、脇腹と太もも外側で「縮む赤」と「張る青」が左右交互に入れ替わります。',
  },
  {
    id: 'sway-back-stand',
    motionGroup: 'stand-balance',
    label: '反り腰・前もも張り立ち',
    category: '立ち方のクセ',
    recommendedLines: ['SFL', 'DFL', 'SBL'],
    defaultCamera: 'pelvis-zoom',
    bidirectional: false,
    cycleSec: 5.8,
    description:
      '太もも前と腰の筋膜が縮んで骨盤を前へ傾け、お腹の前側が縦に引き伸ばされて力が抜けやすくなります。',
  },
  {
    id: 'desk-pc-mouse',
    motionGroup: 'desk-phone',
    label: 'パソコン・マウス作業（巻き肩）',
    category: 'デスク・スマホ',
    recommendedLines: ['DFAL', 'DBAL', 'SPL'],
    defaultCamera: 'neck-shoulder',
    bidirectional: false,
    cycleSec: 6.0,
    description:
      '親指から鎖骨の下まで続く腕前の筋膜が縮んで肩を前へ引き、背中側の肩甲骨のあいだが張り詰めます。',
  },
  {
    id: 'phone-neck',
    motionGroup: 'desk-phone',
    label: 'スマホうつむき姿勢',
    category: 'デスク・スマホ',
    recommendedLines: ['SFL', 'SBL', 'DFAL'],
    defaultCamera: 'neck-shoulder',
    bidirectional: false,
    cycleSec: 5.8,
    description:
      '手元の画面を見ることで胸・首前・腕前の筋膜が縮み、重い頭を支える首うしろから頭頂までが強く張ります。',
  },
  {
    id: 'clench-slouch',
    motionGroup: 'desk-phone',
    label: '猫背・浅い呼吸・食いしばり',
    category: 'デスク・スマホ',
    recommendedLines: ['DFL', 'SFL'],
    defaultCamera: 'neck-shoulder',
    bidirectional: false,
    cycleSec: 6.2,
    description:
      'みぞおち奥の筋膜が丸まって縮むと、体の芯を通って首の奥・下あごまで下へ引かれ、噛みしめやすくなります。',
  },
  {
    id: 'arms-fold-stand',
    motionGroup: 'desk-phone',
    label: '腕を組んで立つクセ',
    category: 'デスク・スマホ',
    recommendedLines: ['SFAL', 'DFAL', 'DBAL'],
    defaultCamera: 'neck-shoulder',
    bidirectional: false,
    cycleSec: 5.8,
    description:
      '胸と前腕内側の筋膜が縮んだ形で固まり、左右の肩甲骨が外へ引かれて背中の筋膜が張り続けます。',
  },
  {
    id: 'chair-slouch-sit',
    motionGroup: 'sit-handwork',
    label: '椅子の浅座り・骨盤後傾',
    category: '座り方・家事',
    recommendedLines: ['DFL', 'SBL'],
    defaultCamera: 'pelvis-zoom',
    bidirectional: false,
    cycleSec: 6.0,
    description:
      '股関節の奥ともも裏が曲がったまま縮んで固まり、丸まった腰の筋膜が引き伸ばされて立ち上がり痛を招きます。',
  },
  {
    id: 'leg-cross-sit',
    motionGroup: 'sit-handwork',
    label: '足を組んで座る（右脚上）',
    category: '座り方・家事',
    recommendedLines: ['LL', 'SPL', 'DFL'],
    defaultCamera: 'pelvis-zoom',
    bidirectional: false,
    cycleSec: 6.2,
    description:
      '組んだ脚の内ももと股関節前が縮んで骨盤がねじれ、お尻の奥と反対側の腰が斜めに引っぱられます。',
  },
  {
    id: 'forward-bend-work',
    motionGroup: 'sit-handwork',
    label: '前かがみ・中腰作業',
    category: '座り方・家事',
    recommendedLines: ['SBL', 'DFL', 'SFL'],
    defaultCamera: 'leg-back-zoom',
    bidirectional: false,
    cycleSec: 6.0,
    description:
      '上体が倒れないよう、足裏からふくらはぎ・もも裏・腰まで背面の筋膜シート全体がピンと張って支えます。',
  },
  {
    id: 'forearm-pronation-work',
    motionGroup: 'sit-handwork',
    label: '手元作業・包丁・施術（手のひら下向き）',
    category: '座り方・家事',
    recommendedLines: ['DFAL', 'SFAL', 'SBAL'],
    defaultCamera: 'arm-hand',
    bidirectional: false,
    cycleSec: 5.4,
    description:
      '手のひらを下に向けると親指〜前腕内側が縮み、前腕の骨が交差して肘の外側〜手首の甲側がねじり伸ばされます。',
  },
  {
    id: 'bag-child-hip',
    motionGroup: 'sport-reach',
    label: '片腰抱っこ・片掛けカバン',
    category: 'カバン・スポーツ',
    recommendedLines: ['LL', 'DFL', 'SBAL'],
    defaultCamera: 'front',
    bidirectional: false,
    cycleSec: 5.8,
    description:
      '片側の骨盤を突き出して外ももが張ると同時に、カバンを落とさないよう引き上げる反対の首・肩上も強く張ります。',
  },
  {
    id: 'overhead-reach',
    motionGroup: 'sport-reach',
    label: '高い所へ手を伸ばす',
    category: 'カバン・スポーツ',
    recommendedLines: ['DFAL', 'BFL', 'LL'],
    defaultCamera: 'neck-shoulder',
    bidirectional: false,
    cycleSec: 6.0,
    description:
      '鎖骨下〜腕前のラインと、わきの下から反対のお尻へ斜めに渡る背面のラインが大きく引き伸ばされます。',
  },
  {
    id: 'run-single-strike',
    motionGroup: 'sport-reach',
    label: 'ランニング・階段の片足着地',
    category: 'カバン・スポーツ',
    recommendedLines: ['LL', 'SPL', 'SFL'],
    defaultCamera: 'leg-foot-zoom',
    bidirectional: false,
    cycleSec: 5.2,
    description:
      '片足で着地する瞬間、足裏〜すね外側〜太もも外側〜骨盤横の体側ラインが衝撃を受け止めて強く張ります。',
  },
  {
    id: 'spiral-functional-twist',
    motionGroup: 'sport-reach',
    label: '体をひねる・スイング動作',
    category: 'カバン・スポーツ',
    recommendedLines: ['SPL', 'BFL', 'FFL'],
    defaultCamera: 'upper-torso-zoom',
    bidirectional: true,
    cycleSec: 6.4,
    description:
      '胸から反対側の股関節へ斜めに走る前面・背面の対角ラインが交互に伸び縮みして全身の回転を作ります。',
  },
];

// -----------------------------------------------------------------------------
// 新追加候補 10アニメーション（「最初 0%：負担の少ない姿勢」⇄「最後 100%：負担がかかるクセ」）
// -----------------------------------------------------------------------------
export const NEW_CANDIDATE_PRESETS = [
  {
    id: 'drive-1010-wheel',
    code: '新 01',
    label: '長距離運転で「10時10分」の位置を握り続ける',
    habitSub: 'ひじを宙に浮かせてハンドル上部を握り続ける運転クセ',
    symptomSummary: '運転後の重い肩こり・首うしろの張り・肩甲骨のあいだのだるさ',
    pose0Label: '腕を下げてひじを置き、ハンドル下側（8時20分／4時40分）に添える運転',
    pose100Label: '両腕を前高く浮かせて「10時10分」を握り、肩とあごが前に出る運転',
    category: '移動・運転のクセ',
    recommendedLines: ['DFAL', 'SFAL', 'SBAL', 'DBAL'],
    defaultCamera: 'seated-upper',
    bidirectional: false,
    cycleSec: 5.8,
    pitfall:
      '両腕を宙に浮かせ続けると、胸前と腕の内側の筋膜が縮んで肩甲骨を前へ引き込みます。重たい両腕を吊り支える首から肩の上・背中の筋膜がずっと引っぱられて固まります。',
    chain: {
      culprit: '鎖骨の下〜力こぶ〜親指・前腕の内側',
      station: '肩の前の突起（烏口突起）・鎖骨・肩甲骨の内側',
      victim: '首うしろ〜肩の上・肩甲骨のあいだ',
    },
    dailyTip:
      'ハンドルは下側（8時20分や4時40分）を持って腕を下げ、ひじ置きに重さを預けます。高速道路では自動運転支援（追従機能など）も活用し、腕を浮かせ続けない工夫が有効です。',
    hpColumns: [
      {
        status: 'proposal',
        title: '長距離運転の肩こりは「10時10分」のハンドル位置から？腕を下げて疲れを防ぐ工夫',
        file: '',
      },
      {
        status: 'published',
        title: '巻き肩は「胸の緊張」から。セルフチェックと、仕事の合間にできるケア',
        file: 'article-rounded-shoulders.html',
      },
    ],
    careSteps: [
      {
        title: '親指の付け根〜手首の内側',
        detail: 'ハンドルを握って縮んだ親指のふくらみと手首内側の緊張を先にゆるめます。',
        zoomKey: 'thumb-wrist-r',
      },
      {
        title: '鎖骨のすぐ下のくぼみ',
        detail: '浮かせた腕を支えて縮んだ鎖骨下の筋膜をほぐし、肩の引き込みを抜きます。',
        zoomKey: 'pec-minor-r',
      },
    ],
  },
  {
    id: 'bus-car-sway-neck',
    code: '新 02',
    label: 'バス・車・電車の揺れに首と肩で踏ん張る',
    habitSub: '背もたれから頭を浮かせ、乗り物の揺れに首と体幹を固めて耐えるクセ',
    symptomSummary: '移動後にどっと出る首・肩のこり、頭の重さ、腰の固まり',
    pose0Label: '骨盤を立て、ヘッドレストとひじ掛けに頭・腕を預けた座り方',
    pose100Label: '頭を浮かせて揺れに耐え、首の奥・脇腹・両肩をすくめて固める座り方',
    category: '移動・運転のクセ',
    recommendedLines: ['DFL', 'LL', 'SBL', 'SBAL'],
    defaultCamera: 'seated-upper',
    bidirectional: false,
    cycleSec: 5.8,
    pitfall:
      '細かい揺れで頭が振られないよう、無意識に首の奥やあご・脇腹の筋膜を縮めてブレーキをかけ続けます。その結果、頭を支える首うしろから肩の上・腰までが強く張ってしまいます。',
    chain: {
      culprit: '首の奥〜あご下・みぞおち奥・片側の脇腹',
      station: '耳のうしろの骨・下あご・ろっ骨下縁・骨盤の上の縁',
      victim: '首のうしろ〜肩の上・反対側の脇腹〜腰',
    },
    dailyTip:
      'ヘッドレストやネックピローに後頭部を預け、丸めた上着やカバンをひじ下に置いて腕の重さを逃がします。揺れる車内では手元のスマホを見続けず、時々遠くを見て首の踏ん張りを抜きます。',
    hpColumns: [
      {
        status: 'published',
        title: '飛行機・新幹線の長時間移動や旅行の歩き疲れで「腰と首が同時に固まる」理由',
        file: 'article-long-flight-airplane-back-neck-reset.html',
      },
      {
        status: 'proposal',
        title: '座っているだけなのになぜ疲れる？バス・車の「揺れ」に耐える首と体幹の筋膜ロック',
        file: '',
      },
    ],
    careSteps: [
      {
        title: 'みぞおち・ろっ骨の下の縁',
        detail: '揺れに耐えて固まったみぞおちを深い吐く息でゆるめ、首奥への引っ張りを抜きます。',
        zoomKey: 'diaphragm-rib',
      },
      {
        title: '耳の下〜鎖骨の首前ライン',
        detail: '頭を支えて縮んだ首前を軽くさすり、後頭部から肩上の張りをほどきます。',
        zoomKey: 'scm-neck-front',
      },
    ],
  },
  {
    id: 'sofa-deep-slouch',
    code: '新 03',
    label: 'ソファーに深く沈み込んでテレビ・スマホを見る',
    habitSub: 'お尻が前へ滑って骨盤が倒れ、あごだけ上げて画面を見るクセ',
    symptomSummary: 'ソファーから立つときの腰の重さ・首うしろの詰まり・浅い呼吸',
    pose0Label: 'お尻を奥まで入れて骨盤が起きたラクな座り方',
    pose100Label: 'お尻が前へ滑ってお腹が潰れ、首の付け根が折れる座り方',
    category: '家でのくつろぎクセ',
    recommendedLines: ['SFL', 'DFL', 'SBL'],
    defaultCamera: 'seated-side',
    bidirectional: false,
    cycleSec: 6.0,
    pitfall:
      '柔らかい座面でお尻が前へ滑ると、お腹と股関節の奥の筋膜が潰れたまま縮んで固まります。反対側の腰と首うしろの筋膜はずっと引き伸ばされ、立ち上がる瞬間に痛みが出ます。',
    chain: {
      culprit: 'みぞおち〜お腹の前側・股関節の奥',
      station: 'ろっ骨の下縁・恥骨・腰の仙骨・後頭部',
      victim: '丸まって引っぱられる腰〜背中・首のうしろ',
    },
    dailyTip:
      'お尻を一番奥まで入れて背もたれとの隙間にクッションを挟み、骨盤が後ろへ滑るのを防ぎます。スマホを見る時はひじの下にクッションを置いて目線を上げます。',
    hpColumns: [
      {
        status: 'published',
        title: '骨盤のゆがみは、ソファーから始まる？筋膜のつながりで見る、股関節・お腹・首の関係',
        file: 'article-sofa-front-line.html',
      },
    ],
    careSteps: [
      {
        title: 'みぞおち・ろっ骨の下の縁',
        detail: '潰れて縮んだみぞおちとお腹前の筋膜を呼吸と一緒にゆっくり伸ばします。',
        zoomKey: 'diaphragm-rib',
      },
      {
        title: '脚の付け根（そけい部）の少し奥',
        detail: '座りっぱなしで縮んだ股関節前をゆるめ、立つときの腰の引っ張りを防ぎます。',
        zoomKey: 'groin-psoas',
      },
    ],
  },
  {
    id: 'sleep-banzai-arms',
    code: '新 04',
    label: '腕を頭の上に上げる「バンザイ寝」・腰浮き',
    habitSub: '寝ている間に両腕を上げ、ろっ骨が開いて腰が反り浮くクセ',
    symptomSummary: '起床時の背中の張り・腰の浮き痛・腕のだるさや手のしびれ感',
    pose0Label: '腕が体の横に自然に下り、腰の浮きもないリラックス姿勢',
    pose100Label: '両腕をバンザイに上げてろっ骨が開き、腰が反り浮く姿勢',
    category: '睡眠・仰向けのクセ',
    recommendedLines: ['DFAL', 'SFAL', 'BFL', 'SBL'],
    defaultCamera: 'banzai-wide',
    bidirectional: false,
    cycleSec: 6.0,
    pitfall:
      '日中に胸やわきの下が縮んでいると、寝た時に腕を上げた方がラクに感じてバンザイ寝になります。しかし一晩中わきから腕の筋膜が引っぱられ、ろっ骨が開いて腰まで反り固まります。',
    chain: {
      culprit: '反り上がる腰の筋膜・すくんで詰まる肩口',
      station: '鎖骨・肩の屋根の骨・ろっ骨・腰の仙骨',
      victim: '引き伸ばされる鎖骨下〜胸・わきの下〜腕の筋膜',
    },
    dailyTip:
      'ひざの下に丸めたバスタオルやクッションを入れて腰の反り浮きを減らします。寝る前に鎖骨の下とわきの下を30秒さすってゆるめると、腕を下ろしたまま眠りやすくなります。',
    hpColumns: [
      {
        status: 'published',
        title: '子どもの「猫背・バンザイ寝・すぐ頬杖をつく」は筋力不足じゃない？成長期の骨と筋膜のアンバランスを解く',
        file: 'article-kids-posture-banzai-sleep-fascia.html',
      },
      {
        status: 'published',
        title: '仰向けで寝ると「腰が浮いてつらい・呼吸が浅い」理由',
        file: 'article-supine-back-gap.html',
      },
    ],
    careSteps: [
      {
        title: '鎖骨のすぐ下のくぼみ',
        detail: '日中に縮んだ胸前の筋膜をゆるめ、腕を下げても肩が浮かない状態を作ります。',
        zoomKey: 'pec-minor-r',
      },
      {
        title: 'わきの下の後ろ側（広背筋膜）',
        detail: 'ろっ骨と腰を引っぱるわきの下の筋膜をほぐし、寝たときの腰浮きを減らします。',
        zoomKey: 'armpit-lat-r',
      },
    ],
  },
  {
    id: 'chin-rest-desk',
    code: '新 05',
    label: '机で片手に「頬杖（ほおづえ）」をつくクセ',
    habitSub: '片ひじを机に突いてあごを乗せ、首と体を斜めに傾けるクセ',
    symptomSummary: '片側だけの首こり・頭痛、あごの違和感、左右差のある背中の張り',
    pose0Label: '左右のお尻に均等に乗り、頭が背骨の上に乗った座り方',
    pose100Label: '右ひじで頬杖をつき、あご・首・胸・骨盤が斜めに傾く座り方',
    category: 'デスク・スマホ',
    recommendedLines: ['DFAL', 'DFL', 'LL', 'SPL'],
    defaultCamera: 'seated-upper',
    bidirectional: false,
    cycleSec: 5.8,
    pitfall:
      '重い頭を片腕とあごで支えると、頬杖側のあごから鎖骨下・脇腹の筋膜が縮んで固まります。傾いたバランスを取るため、反対側の首から背中・腰までが斜めに強く引っぱられます。',
    chain: {
      culprit: '頬杖側のあご横〜首前・鎖骨の下〜腕の内側',
      station: '下あごの骨・鎖骨・ろっ骨・骨盤の上の縁',
      victim: '反対側の首横〜肩・斜めに引っぱられる背中と腰',
    },
    dailyTip:
      '椅子の高さを合わせて足の裏全体を床に着け、両ひじを机やひじ掛けに均等に置ける環境にします。頭が重く感じたら頬杖をつく前に一度立ち上がって肩をストンと落とします。',
    hpColumns: [
      {
        status: 'published',
        title: '子どもの「猫背・バンザイ寝・すぐ頬杖をつく」は筋力不足じゃない？成長期の骨と筋膜のアンバランスを解く',
        file: 'article-kids-posture-banzai-sleep-fascia.html',
      },
      {
        status: 'published',
        title: 'デスクワークで「目の奥が重い・食いしばり・呼吸が浅い」が重なる理由',
        file: 'article-eye-strain-jaw-clenching-shallow-breathing.html',
      },
    ],
    careSteps: [
      {
        title: 'あごの下〜こめかみ',
        detail: '手の重みを受け止めて固まったあご横から首の筋膜をやさしくゆるめます。',
        zoomKey: 'jaw-hyoid',
      },
      {
        title: '鎖骨のすぐ下のくぼみ',
        detail: '机に突いた腕から縮んだ鎖骨下をほぐし、左右の肩の高さを揃えます。',
        zoomKey: 'pec-minor-r',
      },
    ],
  },
  {
    id: 'shampoo-dentist-arch',
    code: '新 06',
    label: '美容院のシャンプー台・歯医者で仰向けがつらい',
    habitSub: '両脚を伸ばしてリクライニングで倒れ、腰と首が反り上がる状態',
    symptomSummary: 'シャンプー台や歯科チェアーでの首うしろの苦しさ・腰の浮き痛',
    pose0Label: 'ひざが軽く曲がり、首と腰にゆとりがあるリクライニング姿勢',
    pose100Label: '両脚が伸びきって前側が突っ張り、腰が浮いて首が反る姿勢',
    category: '睡眠・仰向けのクセ',
    recommendedLines: ['DFL', 'SFL', 'SBL'],
    defaultCamera: 'recline-side',
    bidirectional: false,
    cycleSec: 6.0,
    pitfall:
      '普段から股関節の奥や前もも・みぞおちの筋膜が縮んでいると、脚を伸ばして倒れた瞬間に骨盤と胸が引っぱられます。そのしわ寄せで腰が反り浮き、首のうしろが強く詰まります。',
    chain: {
      culprit: '縮んで伸びない股関節の奥・太もも前・みぞおち',
      station: '骨盤の前の出っ張り・ろっ骨下縁・後頭部',
      victim: '反り上げられて苦しい腰・詰まる首のうしろ',
    },
    dailyTip:
      '美容院や歯科では遠慮せず「少しひざを曲げてもいいですか」と伝えてひざを立てるか、ひざ下にクッションを入れてもらいます。首の下にもタオルを1枚足してもらうだけで驚くほどラクになります。',
    hpColumns: [
      {
        status: 'published',
        title: '美容院のシャンプー台や歯医者で「仰向けになると首や腰がつらい」理由',
        file: 'article-salon-dentist-chair-neck-back.html',
      },
      {
        status: 'published',
        title: '仰向けで寝ると「腰が浮いてつらい・呼吸が浅い」理由',
        file: 'article-supine-back-gap.html',
      },
    ],
    careSteps: [
      {
        title: '脚の付け根（そけい部）の少し奥',
        detail: '脚を伸ばした時に骨盤を引っぱる股関節前の筋膜を先にゆるめます。',
        zoomKey: 'groin-psoas',
      },
      {
        title: '胸の真ん中〜みぞおち',
        detail: '首を後ろ下へ引く胸とみぞおちの硬さをほどき、仰向けをラクにします。',
        zoomKey: 'sternum-clavicle',
      },
    ],
  },
  {
    id: 'floor-agura-asymmetry',
    code: '新 07',
    label: '床の「あぐら」で片ひざが浮き、背中が丸まる',
    habitSub: '股関節の硬さに左右差があるまま低い床に直接あぐらをかくクセ',
    symptomSummary: '床に座るとすぐ出る腰・股関節の詰まり、片ひざだけ浮く違和感',
    pose0Label: 'お尻の下を高くして骨盤が起き、両ひざがラクに開いたあぐら',
    pose100Label: '低い床座りで右ひざが高く浮き、骨盤が倒れてねじれるあぐら',
    category: '家でのくつろぎクセ',
    recommendedLines: ['DFL', 'LL', 'SBL', 'SPL'],
    defaultCamera: 'seated-lower',
    bidirectional: false,
    cycleSec: 6.0,
    pitfall:
      '内ももや股関節の奥が縮んでいると片ひざが開かず浮き上がり、骨盤が後ろへ倒れてねじれます。そのまま座り続けると、腰とお尻外側の筋膜が強く引っぱられて痛みます。',
    chain: {
      culprit: 'ひざが浮く側の内もも〜股関節の奥・片側の脇腹',
      station: '恥骨・股関節の内側・坐骨・骨盤の上の縁',
      victim: '丸まって張る腰〜背中・お尻の外側',
    },
    dailyTip:
      '床に直接座らず、厚めのクッションや折りたたんだ座布団をお尻の後ろ半分に敷いて骨盤を高く保ちます。同じ脚ばかり手前にせず、時々前後を入れ替えるか椅子に移ります。',
    hpColumns: [
      {
        status: 'published',
        title: '「あぐら」をかくと片方のひざだけ浮いて股関節がつまる理由と骨盤ねじれ',
        file: 'article-agura-floating-knee-hip-stiffness.html',
      },
    ],
    careSteps: [
      {
        title: '太もも内側の付け根',
        detail: 'ひざを内側へ引き上げている内ももの筋膜をほぐし、股関節を開きやすくします。',
        zoomKey: 'inner-thigh-r',
      },
      {
        title: '右の脇腹（ろっ骨と骨盤のあいだ）',
        detail: '骨盤の傾きを固定している脇腹の縮みをゆるめ、左右の坐骨に均等に乗れるようにします。',
        zoomKey: 'flank-r',
      },
    ],
  },
  {
    id: 'kitchen-sink-lean',
    code: '新 08',
    label: 'キッチン洗い物・洗面での「ちょい前かがみ＋ひじ浮かせ」',
    habitSub: 'シンクから少し離れて立ち、上体をわずかに倒して両ひじを浮かせるクセ',
    symptomSummary: '洗い物や歯みがきで数分立つだけで出る腰の重だるさ・背中の張り',
    pose0Label: 'シンクに近づき、背骨をまっすぐ保ってひじを下げた立ち方',
    pose100Label: '浅い前かがみで両ひじを浮かせ、背面全体で上体を吊り支える立ち方',
    category: '家事・立ち作業のクセ',
    recommendedLines: ['SBL', 'DFAL', 'SFAL', 'DFL'],
    defaultCamera: 'right-tfl',
    bidirectional: false,
    cycleSec: 5.8,
    pitfall:
      'たった15度の浅い前かがみでも、浮かせた両腕と上体の重みが前にかかり、胸と腕前の筋膜が縮みます。前に倒れないよう、足裏からふくらはぎ・腰・背中までの背面筋膜がずっと張り詰めます。',
    chain: {
      culprit: '鎖骨の下〜胸前〜前腕の内側・お腹の奥',
      station: '鎖骨・肩の前の突起・坐骨・かかとの骨',
      victim: '腰〜もも裏〜ふくらはぎ・首うしろ〜背中',
    },
    dailyTip:
      'シンクの手前に下腹部を軽く預けて距離を詰め、足元に10cmほどの低い台（または扉を開けた下の段）を置いて片足を交互に乗せます。これだけで腰とふくらはぎの引っ張りが激減します。',
    hpColumns: [
      {
        status: 'proposal',
        title: '洗い物や歯みがきの「ちょい前かがみ」が深いお辞儀より腰にくる理由と足置き台の工夫',
        file: '',
      },
      {
        status: 'published',
        title: '「ふくらはぎがいつもパンパン」な人の腰痛が抜けない理由',
        file: 'article-morning-calf-back-line.html',
      },
    ],
    careSteps: [
      {
        title: '鎖骨のすぐ下のくぼみ',
        detail: 'ひじを浮かせて手元作業をして縮んだ胸前・腕前の筋膜をゆるめます。',
        zoomKey: 'pec-minor-r',
      },
      {
        title: '土踏まず〜かかとの少し前',
        detail: '上体を支えて張り詰めた背面ラインを足裏の土台からほどきます。',
        zoomKey: 'plantar-sole-r',
      },
    ],
  },
  {
    id: 'morning-sock-reach',
    code: '新 09',
    label: '朝、立ったまま丸まって「靴下を履く」ときの腰ロック',
    habitSub: '寝起きで体が硬いまま、片足立ちで腰を丸めて足先へ手を伸ばすクセ',
    symptomSummary: '朝の靴下履きやズボン履きで腰がピキッと詰まる・曲がらない',
    pose0Label: '両足で安定して真っすぐ立った負担のない姿勢',
    pose100Label: '片足でひざを抱え上げ、腰と背中を丸めて足先へ手を伸ばす姿勢',
    category: '朝・日常動作のクセ',
    recommendedLines: ['LL', 'SBL', 'DFL'],
    defaultCamera: 'sock-reach-wide',
    bidirectional: false,
    cycleSec: 5.8,
    pitfall:
      '寝起きはお尻の横と股関節の奥の筋膜が硬く、股関節がスムーズに曲がりません。足りない動きを腰の丸まりだけで補おうとするため、腰の筋膜が強く引っぱられてロックします。',
    chain: {
      culprit: '脚の付け根の奥・内もも・軸足側の脇腹',
      station: '太もも外側の骨（大転子）・骨盤の上の縁・坐骨',
      victim: 'お尻の横〜太もも外側・丸まって張る腰の筋膜',
    },
    dailyTip:
      '朝一番は立ったまま靴下やズボンを履かず、椅子やベッドの端に座って片足首を反対のひざに乗せて履きます。股関節が外へ開くことで、腰を丸めずに安全に履けます。',
    hpColumns: [
      {
        status: 'published',
        title: '朝、靴下を履くときに「腰が詰まって曲がらない」原因はお尻の横の筋膜ロック',
        file: 'article-morning-socks-hip-lower-back.html',
      },
      {
        status: 'published',
        title: 'ぎっくり腰になったら、まず何をする？痛む腰を揉まない理由と、繰り返さないための考え方',
        file: 'article-acute-lumbago.html',
      },
    ],
    careSteps: [
      {
        title: '右の骨盤横〜お尻の外側',
        detail: '股関節の曲げ伸ばしを止めているお尻横の筋膜をやさしくさすってゆるめます。',
        zoomKey: 'outer-hip-r',
      },
      {
        title: '脚の付け根（そけい部）の少し奥',
        detail: '寝ている間に縮んだ股関節前の筋膜をほどき、朝の動き出しをスムーズにします。',
        zoomKey: 'groin-psoas',
      },
    ],
  },
  {
    id: 'stairs-down-knee',
    code: '新 10',
    label: '階段を「下りる」ときに足首が硬く膝前に負担が集中する',
    habitSub: '足首が曲がりきらず、ひざが前内側へ入って太もも前でブレーキをかける動き',
    symptomSummary: '上りより「階段の下り」や坂道でひざのお皿の上や外側が張る・痛む',
    pose0Label: '両足でまっすぐ床を踏み、ひざとつま先が揃った立ち方',
    pose100Label: '段上の足首が硬く、右ひざが前内側へ出て太もも前と外側が張る局面',
    category: '歩行・階段のクセ',
    recommendedLines: ['SFL', 'SBL', 'LL', 'DFL'],
    defaultCamera: 'leg-foot-zoom',
    bidirectional: false,
    cycleSec: 5.4,
    pitfall:
      'ふくらはぎと足首の奥が縮んで硬いと、段を下りる時に足首が曲がらずひざだけが前内側へ突き出ます。その瞬間、全体重のブレーキが太もも前と膝外側の筋膜に集中します。',
    chain: {
      culprit: 'ふくらはぎ〜すね内側の奥・股関節の前側',
      station: 'かかとの骨・外くるぶし・ひざのお皿・骨盤の前かど',
      victim: '太ももの前〜ひざ皿の上・太もも外側',
    },
    dailyTip:
      '段を下りる時はつま先とひざのお皿を同じ正面に向け、手すりに軽く手を添えて衝撃を逃がします。外出前にアキレス腱とすねの内側を20秒ゆるめるだけでも膝の負担が減ります。',
    hpColumns: [
      {
        status: 'published',
        title: '階段を下りるときに「膝のお皿の上」が張る原因は、軟骨ではなく足首と股関節の硬さ',
        file: 'article-stairs-descent-knee-ankle.html',
      },
    ],
    careSteps: [
      {
        title: '内くるぶしの後ろ〜アキレス腱まわり',
        detail: '足首の曲がりを止めているふくらはぎ深部の筋膜をゆるめ、足首のクッションを取り戻します。',
        zoomKey: 'plantar-sole-r',
      },
      {
        title: '太ももの前〜骨盤の前かど下',
        detail: 'ブレーキをかけ続けて張った前ももの筋膜をやさしく滑らせて整えます。',
        zoomKey: 'front-thigh-shin',
      },
    ],
  },
];

// 全26モーション統合配列（バイオメカニクス計算＆URLディープリンク用）
export const ALL_MOTION_PRESETS = [...MOTION_PRESETS, ...NEW_CANDIDATE_PRESETS];

// 一覧チェックページ用 22アイテム統合リスト（新追加候補10件 ＋ 実装済み12件）
export const CHECKLIST_ITEMS = [
  ...NEW_CANDIDATE_PRESETS.map((p) => ({
    uid: `new:${p.id}`,
    kind: 'new',
    code: p.code,
    title: p.label,
    habit: p.habitSub,
    symptom: p.symptomSummary,
    pose0Label: p.pose0Label,
    pose100Label: p.pose100Label,
    presetId: p.id,
    deepLinkQuery: `?motion=${encodeURIComponent(p.id)}`,
    lines: p.recommendedLines,
    cameraView: p.defaultCamera,
    pitfall: p.pitfall,
    chain: p.chain,
    dailyTip: p.dailyTip,
    hpColumns: p.hpColumns,
  })),
  ...SYMPTOM_CARDS.map((c) => ({
    uid: `existing:${c.id}`,
    kind: 'existing',
    code: c.code,
    title: c.title,
    habit: c.habitSub,
    symptom: c.title,
    pose0Label: c.pose0Label,
    pose100Label: c.pose100Label,
    presetId: c.presetId,
    deepLinkQuery: `?symptom=${encodeURIComponent(c.id)}`,
    lines: c.lines,
    cameraView: c.cameraView,
    pitfall: c.pitfall,
    chain: c.chain,
    dailyTip: c.dailyTip,
    hpColumns: c.hpColumns,
  })),
];
