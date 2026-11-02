/**
 * Flipbook Infinite Master Studio Engine (studio_engine.js)
 * 🤖 フランキー ＆ 🌸 ロビン ＆ 🎯 ウソップ ＆ ⚔️ ゾロ
 *
 * Infinitely generates hand-drawn 365-page anatomical flipbook videos with:
 *  - 12+ Body/Posture Themes + Custom Free-Input Theme
 *  - 4 Psychological Hook Copy Variations per theme (末路訴求 / 数字衝撃 / 真犯人暴露 / セルフチェック)
 *  - 6 Art & Paper Styles (王道アニメ原画 / ダ・ヴィンチ手稿 / 構造ブループリント / 木炭深紅 / ダークX-Ray / 水彩ノート)
 *  - 5 Camera & Biomechanical Overlay Modes (標準俯瞰 / 真犯人ズーム / 3秒衝撃開幕 / 角度ベクトルHUD / ストップ解説)
 *  - Real-time WebAudio Paper-Flip ASMR + 5 BGM Styles
 *  - One-Tap "🎲 表現をガチャ変更" & Direct Smartphone Video Export
 */

const FLIPBOOK_THEMES = {
  straight_neck: {
    id: "straight_neck",
    vol: "Vol.1",
    shortName: "📱 スマホ首・ストレートネック",
    rigPrefix: "straight_neck",
    mp4File: "flipbook_straight_neck.mp4",
    posterFile: "flipbook_preview_grid.jpg",
    pivot: [0.38, 0.62],
    focusTarget: [0.46, 0.36], // Neck/Cervical spine
    dirSign: 1.0,
    metric1Label: "首の傾き",
    metric1Start: 5,
    metric1End: 60,
    metric1Unit: "°",
    metric2Label: "首の負荷",
    metric2Start: 5,
    metric2End: 27,
    metric2Unit: "kg",
    culpritName: "頸椎C4-C6前弯消失・胸鎖乳突筋ロック",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.1",
        title: "スマホを見る女性の「首と背骨」の末路",
        subNormal: "● 正常なS字カーブ（負荷5kg）",
        subDeform: "▲ 猫背＋頭が前へスライド",
        subLocked: "【！】ストレートネック（負荷27kg）",
        subRecover: "★ 視線を上げ美しいS字へ回復",
        desc: "首の傾き5°→60°で背骨が丸まり、頸椎の前弯カーブが消失して負荷5kg→27kgへ跳ね上がる連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 角度60°の衝撃｜手描き解剖パラパラ漫画",
        title: "首に「27kgの米袋」が乗るスマホ姿勢の正体",
        subNormal: "● 傾き5°：首の負荷はたった5kg",
        subDeform: "▲ 傾き30°：負荷18kgへ急増中",
        subLocked: "【！】傾き60°：27kg（小3の体重！）",
        subRecover: "★ スマホを目の高さへ＝5kgに激減",
        desc: "頭が数センチ前に出るだけで、首の骨と筋肉が支える重さは5kgから最大27kg（約5.4倍）に膨れ上がります。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 首をもんでも治らない理由｜解剖パラパラ",
        title: "ストレートネックの真犯人は「胸椎の丸まり」",
        subNormal: "● 骨盤と胸椎が立ち首も自然なS字",
        subDeform: "▲ 背中（胸椎）が丸まりアゴが突出",
        subLocked: "【！】首の後ろが引っ張られ限界ロック",
        subRecover: "★ 胸を開けば首は勝手にS字へ戻る",
        desc: "首だけをグイグイ揉んでも戻らないのは、土台である背中（胸椎）と巻き肩がロックしているからです。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 10秒でわかる姿勢診断｜手描きパラパラ",
        title: "壁に立ったとき「後頭部」がスッとつきますか？",
        subNormal: "● かかと・お尻・肩・後頭部が一直線",
        subDeform: "▲ 無意識にアゴが2cm前へ出るクセ",
        subLocked: "【！】後頭部が壁から浮くスマホ首状態",
        subRecover: "★ アゴ先を軽く引き後頭部を真上へ",
        desc: "自分の首がどこまで前に出ているか、365枚のパラパラ軌道で視覚的にチェック＆1秒リセット。"
      }
    ]
  },

  cross_legs: {
    id: "cross_legs",
    vol: "Vol.2",
    shortName: "🪑 足を組む・骨盤ねじれと側弯",
    rigPrefix: "cross_legs",
    mp4File: "flipbook_cross_legs.mp4",
    posterFile: "flipbook_grid_cross_legs.jpg",
    pivot: [0.48, 0.68],
    focusTarget: [0.50, 0.64], // Pelvis & lumbar spine
    dirSign: -0.7,
    metric1Label: "骨盤の傾き",
    metric1Start: 0,
    metric1End: 25,
    metric1Unit: "°",
    metric2Label: "腰椎ねじれ",
    metric2Start: 1.0,
    metric2End: 3.8,
    metric2Unit: "倍",
    culpritName: "骨盤25°傾斜・梨状筋ロック＆坐骨神経圧迫",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.2",
        title: "足を組む女性の「骨盤と背骨」の末路",
        subNormal: "● 骨盤水平・左右均等な美しい軸",
        subDeform: "▲ 片側のお尻が浮き背骨が曲がる",
        subLocked: "【！】坐骨神経圧迫・S字側弯ロック",
        subRecover: "★ 両足裏を床につけ骨盤リセット",
        desc: "何気なく足を組むことで骨盤が25°傾き、腰椎〜胸椎がS字に側弯して坐骨神経と腰を圧迫する連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 腰椎ねじれ3.8倍｜手描き解剖パラパラ",
        title: "足を組んで5分、骨盤が「25°」傾く内部映像",
        subNormal: "● 左右の坐骨に50:50で均等荷重",
        subDeform: "▲ 骨盤傾斜15°：腰椎が斜めに歪む",
        subLocked: "【！】傾斜25°：腰椎ねじれ負荷3.8倍",
        subRecover: "★ 坐骨2点で座り直し負荷1.0倍へ",
        desc: "片足を乗せた瞬間、骨盤の傾きは最大25°に達し、腰の椎間板には通常の3.8倍ものねじれストレスが集中します。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ お尻のしびれの正体｜解剖パラパラ漫画",
        title: "「足を組むとラク」は骨盤が歪みきった危険サイン",
        subNormal: "● 梨状筋が柔らかく坐骨神経もスムーズ",
        subDeform: "▲ お尻の奥（梨状筋）が引き伸ばされる",
        subLocked: "【！】硬化した筋肉が坐骨神経を直撃圧迫",
        subRecover: "★ 股関節を緩めて神経の通り道を解放",
        desc: "足を組んだ方がラクに感じるのは、すでに骨盤周りの筋肉が左右非対称に固まっている証拠です。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ スカートの回る人必見｜手描きパラパラ",
        title: "いつも「同じ側の足」ばかり上に組んでいませんか？",
        subNormal: "● 左右の骨盤の高さ・くびれが対称",
        subDeform: "▲ 片側の腰だけ詰まり肩の高さがズレる",
        subLocked: "【！】骨盤ロックで下半身太り＆慢性腰痛",
        subRecover: "★ 膝を揃えて坐骨を立てる10秒習慣",
        desc: "スカートが回る・左右の肩の高さが違う原因を、背面からの解剖スケッチでリアルに可視化。"
      }
    ]
  },

  shallow_breath: {
    id: "shallow_breath",
    vol: "Vol.3",
    shortName: "💻 PC猫背・肋骨ロックと隠れ酸欠",
    rigPrefix: "shallow_breath",
    mp4File: "flipbook_shallow_breath.mp4",
    posterFile: "flipbook_grid_shallow_breath.jpg",
    pivot: [0.40, 0.64],
    focusTarget: [0.45, 0.48], // Ribcage & diaphragm
    dirSign: 0.9,
    metric1Label: "肋骨の開き",
    metric1Start: 100,
    metric1End: 35,
    metric1Unit: "%",
    metric2Label: "酸素吸入量",
    metric2Start: 100,
    metric2End: 45,
    metric2Unit: "%",
    culpritName: "胸郭圧迫ロック・横隔膜ドーム機能不全",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.3",
        title: "PC猫背で「肋骨が潰れ隠れ酸欠」の末路",
        subNormal: "● 胸郭がふわっと開き深い呼吸100%",
        subDeform: "▲ 巻き肩で肋骨カゴが上から潰れる",
        subLocked: "【！】酸素45%の隠れ酸欠・背中鉄板化",
        subRecover: "★ 胸を開き横隔膜が動く深い呼吸へ",
        desc: "デスクワークの巻き肩で肋骨カゴと横隔膜が上から押し潰され、酸素吸入量が45%まで低下する過程。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 酸素が半分しか入らない｜解剖パラパラ",
        title: "寝ても疲れが取れない原因は「呼吸45%ロック」",
        subNormal: "● 肋骨可動100%：脳まで酸素が巡る",
        subDeform: "▲ 肋骨可動60%：横隔膜が下に降りない",
        subLocked: "【！】酸素吸入45%：首の筋肉で無理やり呼吸",
        subRecover: "★ 肋骨を広げて深呼吸＝酸素100%回復",
        desc: "猫背になると肺を入れるカゴ（胸郭）が35%まで潰れ、1回の呼吸で入る酸素が半分以下に落ち込みます。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 頑固な肩こりの盲点｜手描き解剖パラパラ",
        title: "肩こりの真犯人は「息が浅くて首で呼吸している」から",
        subNormal: "● 横隔膜メインのゆったり腹式＆胸式呼吸",
        subDeform: "▲ 横隔膜がロックし浅い口呼吸へ変化",
        subLocked: "【！】1日2万回、首と肩の筋肉で肋骨を吊り上げ",
        subRecover: "★ 脇の下と肋骨を緩めれば肩は一気に軽くなる",
        desc: "横隔膜が動かない分、首の斜角筋や肩の筋肉が1日2万回も代わりに肋骨を引き上げ続けて悲鳴を上げています。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 3秒深呼吸テスト｜手描き解剖パラパラ",
        title: "息を吸ったとき「肋骨が横に広がる感覚」ありますか？",
        subNormal: "● 吸うと肋骨が360度しなやかに広がる",
        subDeform: "▲ 息を吸うと肩だけが上にすくんでしまう",
        subLocked: "【！】肋骨がガチガチに固まり深く吸えない",
        subRecover: "★ 手のひらを外に向け胸を開く10秒リセット",
        desc: "浅い呼吸から深い呼吸へ、肋骨と横隔膜の動きがどう変わるかを色鉛筆スケッチで完全再現。"
      }
    ]
  },

  anterior_pelvis: {
    id: "anterior_pelvis",
    vol: "Vol.4",
    shortName: "👠 反り腰立ち・骨盤前傾と腰椎圧迫",
    rigPrefix: "anterior_pelvis",
    mp4File: "flipbook_anterior_pelvis.mp4",
    posterFile: "flipbook_grid_anterior_pelvis.jpg",
    pivot: [0.46, 0.60],
    focusTarget: [0.48, 0.60], // Lumbar L4-L5 & anterior pelvis
    dirSign: -0.8,
    metric1Label: "骨盤前傾角",
    metric1Start: 8,
    metric1End: 30,
    metric1Unit: "°",
    metric2Label: "腰椎圧迫力",
    metric2Start: 1.0,
    metric2End: 4.2,
    metric2Unit: "倍",
    culpritName: "腸腰筋・大腿直筋の短縮＆腰椎L4-L5椎間関節ロック",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.4",
        title: "反り腰立ちで「骨盤前傾・腰が潰れる」末路",
        subNormal: "● 骨盤ニュートラル・美しい重心軸",
        subDeform: "▲ お腹が前に抜け骨盤が前へ倒れる",
        subLocked: "【！】反り腰・腰椎L4/L5ギシッと圧迫",
        subRecover: "★ 下腹を軽く支え腰椎の隙間を解放",
        desc: "お腹が前に抜けた反り腰で骨盤が30°前傾し、腰椎L4/L5の椎間関節がギシッと挟み込まれる連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 腰椎圧迫4.2倍｜手描き解剖パラパラ漫画",
        title: "「良い姿勢」のつもりが腰の骨を4.2倍潰している？",
        subNormal: "● 骨盤前傾8°：腰椎に負担ゼロの自然軸",
        subDeform: "▲ 骨盤前傾20°：太もも前がパンパンに張る",
        subLocked: "【！】前傾30°：腰椎の後方に4.2倍の挟み込み",
        subRecover: "★ 尾骨をスッと下へ向け圧迫1.0倍へ解放",
        desc: "胸を張って良い姿勢を作ろうとするほど骨盤が30°まで前傾し、腰の骨の後ろ側が4.2倍の力でぶつかり合います。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ ぽっこりお腹と腰痛の正体｜解剖パラパラ",
        title: "反り腰の真犯人は腰ではなく「太もも前の縮み」",
        subNormal: "● 股関節の前側が伸びてお尻で立てている",
        subDeform: "▲ 腸腰筋と太もも前が縮み骨盤を前へ牽引",
        subLocked: "【！】骨盤が前にロックし腰が反り返って悲鳴",
        subRecover: "★ 股関節前を伸ばせば反り腰は自然に消える",
        desc: "腰をいくら揉んでも反り腰が治らないのは、骨盤を前から引っ張り続けている「腸腰筋・太もも前」が固まっているからです。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 仰向け隙間チェック｜手描き解剖パラパラ",
        title: "仰向けで寝たとき「腰の下に手のひら2枚」入りますか？",
        subNormal: "● 腰の下に手のひら1枚分の自然なカーブ",
        subDeform: "▲ 立ちっぱなしで腰の反りが強くなる",
        subLocked: "【！】腰が浮きすぎて仰向けで寝ると腰が痛い",
        subRecover: "★ 恥骨を軽く引き上げ骨盤をニュートラルへ",
        desc: "反り腰で腰椎が詰まる瞬間から、骨盤を起こしてスッと腰が軽くなる瞬間までを365枚で解剖。"
      }
    ]
  },

  jaw_clench: {
    id: "jaw_clench",
    vol: "Vol.5",
    shortName: "🦷 食いしばり・側頭筋と首ロック",
    rigPrefix: "jaw_clench",
    mp4File: "flipbook_jaw_clench.mp4",
    posterFile: "flipbook_grid_jaw_clench.jpg",
    pivot: [0.42, 0.56],
    focusTarget: [0.46, 0.34], // Jaw TMJ & Temple & C1-C2
    dirSign: 0.75,
    metric1Label: "咬筋・顎の負荷",
    metric1Start: 3,
    metric1End: 70,
    metric1Unit: "kg",
    metric2Label: "側頭筋〜首緊張",
    metric2Start: 1.0,
    metric2End: 3.9,
    metric2Unit: "倍",
    culpritName: "咬筋・側頭筋の過緊張＆上部頸椎C1-C2連動ロック",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.5",
        title: "無意識に「食いしばる女性」のこめかみと首の末路",
        subNormal: "● 上下の歯に2mmの隙間・顎も首もリラックス",
        subDeform: "▲ 集中・ストレスで奥歯をグッと噛みしめる",
        subLocked: "【！】咬筋70kg負荷・こめかみ頭痛＆首ロック",
        subRecover: "★ 歯を離しこめかみを緩めて首まで解放",
        desc: "無意識の食いしばりで顎（咬筋）とこめかみ（側頭筋）が赤く固まり、首の付け根まで一気にロックする連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 奥歯に70kgの衝撃｜手描き解剖パラパラ",
        title: "寝ている間の食いしばり、顎と首に「70kg」の重圧",
        subNormal: "● 安静時：上下の歯は触れず負荷3kg以下",
        subDeform: "▲ 日中の噛みしめ：咬筋に30kgの持続緊張",
        subLocked: "【！】睡眠中の歯ぎしり：最大70kgで頭蓋骨歪み",
        subRecover: "★ 「唇は閉じ、歯は離す」で負荷ゼロへ",
        desc: "本来、上下の歯が触れ合うのは1日合計20分だけ。無意識の食いしばりは自分の体重以上の力で顎と首を潰しています。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 朝起きると首が痛い理由｜解剖パラパラ",
        title: "取れない首こりと頭痛の真犯人は「奥歯の接触」でした",
        subNormal: "● 顎関節が緩み後頭下筋群も柔らかい状態",
        subDeform: "▲ 咬筋が縮み、連動して胸鎖乳突筋が緊張",
        subLocked: "【！】側頭筋〜首の付け根（C1/C2）が同時ロック",
        subRecover: "★ 耳の上（側頭筋）をほぐせば首がスッと回る",
        desc: "顎の筋肉と首の筋肉は筋膜で直結しています。食いしばりを放置したまま首だけ揉んでもすぐ戻ってしまいます。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 今この瞬間チェック｜手描き解剖パラパラ",
        title: "スマホを見ている今、上下の奥歯がくっついていませんか？",
        subNormal: "● 舌先が上あごに触れ、奥歯はふわっと浮く",
        subDeform: "▲ 画面に集中すると奥歯がカチッと当たる",
        subLocked: "【！】エラ張り・こめかみ頭痛・首の詰まり発生",
        subRecover: "★ 深呼吸して奥歯を2mm離すだけで全身脱力",
        desc: "今この瞬間に奥歯を離すだけで、こめかみから首すじの赤い緊張がスーッと消えていく様子をパラパラ再現。"
      }
    ]
  },

  bag_scoliosis: {
    id: "bag_scoliosis",
    vol: "Vol.6",
    shortName: "👜 カバン片掛け・片足重心と側弯",
    rigPrefix: "bag_scoliosis",
    mp4File: "flipbook_bag_scoliosis.mp4",
    posterFile: "flipbook_grid_bag_scoliosis.jpg",
    pivot: [0.48, 0.65],
    focusTarget: [0.48, 0.50], // Spine C-S curve & uneven shoulders
    dirSign: -0.75,
    metric1Label: "肩の高低差",
    metric1Start: 0,
    metric1End: 24,
    metric1Unit: "mm",
    metric2Label: "背骨側弯ねじれ",
    metric2Start: 1.0,
    metric2End: 3.5,
    metric2Unit: "倍",
    culpritName: "片側肩甲挙筋の慢性収縮＆胸腰椎S字機能性側弯",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.6",
        title: "カバンを同じ肩に掛ける女性の「背骨と骨盤」の末路",
        subNormal: "● 左右の肩と骨盤が水平で美しい背骨ライン",
        subDeform: "▲ 紐が落ちないよう片肩を無意識にすくめる",
        subLocked: "【！】肩高低差24mm・背骨がS字に歪み腰痛へ",
        subRecover: "★ 両肩をストンと落とし真ん中軸へリセット",
        desc: "いつも同じ肩にカバンを掛け、片足に体重を乗せるクセで、背骨全体がS字に波打って固まるまでの連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 左右差2.4cmの衝撃｜手描き解剖パラパラ",
        title: "写真をとると首が傾く人、肩の高さが「24mm」ズレてます",
        subNormal: "● 肩の高低差0mm：左右対称の美しい後ろ姿",
        subDeform: "▲ 高低差12mm：片側の首すじだけが常に張る",
        subLocked: "【！】高低差24mm：背骨ねじれ3.5倍＆片側くびれ消失",
        subRecover: "★ 反対側へ持ち替え＋肩甲骨リセットで0mmへ",
        desc: "わずか2〜3kgのカバンでも、毎日同じ肩に掛け続けると肩甲骨が上にロックし、骨盤まで斜めに傾きます。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 右肩だけこる理由｜手描き解剖パラパラ",
        title: "カバンを持っていない休日も「片肩が上がっている」恐怖",
        subNormal: "● 肩甲挙筋と僧帽筋が左右均等にリラックス",
        subDeform: "▲ カバンを支えるため右肩を365日引き上げ",
        subLocked: "【！】脳が「上がった肩」を正常と誤認して固定化",
        subRecover: "★ すくめた肩を5秒キープ→一気に脱力で記憶解除",
        desc: "カバンを置いた後も、脳と筋膜が「肩をすくめた位置」を形状記憶してしまい、24時間片側の首を引き上げ続けています。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 鏡で3秒チェック｜手描き解剖パラパラ",
        title: "鏡を見たとき、左右の「鎖骨と肩の高さ」揃っていますか？",
        subNormal: "● 鎖骨が緩やかなV字で左右対称のシルエット",
        subDeform: "▲ 片足重心とカバン片掛けで軸が斜めに傾く",
        subLocked: "【！】片側の首こり・片側の腰の詰まりが慢性化",
        subRecover: "★ 両足裏に50:50で乗り肩甲骨を後ろへ回す",
        desc: "後ろ姿の骨格がどう歪み、どうすればスッと左右対称に戻るかを365枚のデッサンで可視化。"
      }
    ]
  },

  pillow_neck: {
    id: "pillow_neck",
    vol: "Vol.7",
    shortName: "🛌 高すぎる枕・睡眠中の首折れと寝違え",
    rigPrefix: "pillow_neck",
    mp4File: "flipbook_pillow_neck.mp4",
    posterFile: "flipbook_grid_pillow_neck.jpg",
    pivot: [0.40, 0.58],
    focusTarget: [0.42, 0.44], // Sleeping neck C3-C7
    dirSign: 0.85,
    metric1Label: "睡眠中の首屈曲",
    metric1Start: 0,
    metric1End: 35,
    metric1Unit: "°",
    metric2Label: "頸椎椎間板圧迫",
    metric2Start: 1.0,
    metric2End: 3.4,
    metric2Unit: "倍",
    culpritName: "睡眠6時間の頸椎過屈曲＆C5-C7椎間板・神経根圧迫",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.7",
        title: "「高すぎる枕」で毎日6時間寝続けた首の骨の末路",
        subNormal: "● 首のS字カーブが支えられ気道も広く快適",
        subDeform: "▲ 高い枕でアゴが引け首の骨が前に折れ曲がる",
        subLocked: "【！】6時間固定で椎間板3.4倍圧迫・朝の激痛へ",
        subRecover: "★ 首のカーブにタオルを添え自然な高さへ回復",
        desc: "ふかふかの高い枕で寝ることで、一晩中「下を向きっぱなし」と同じ状態になり、朝起きた瞬間に首が固まる連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 睡眠6時間の罠｜手描き解剖パラパラ漫画",
        title: "高い枕＝毎晩6時間「スマホ首35°」を強制されている！？",
        subNormal: "● 首の屈曲0°：寝ている間に椎間板が水分回復",
        subDeform: "▲ 屈曲20°：首の後ろの筋肉が引き伸ばされ緊張",
        subLocked: "【！】屈曲35°×6時間：頸椎圧迫3.4倍＆手のしびれ",
        subRecover: "★ 目線が真上より少し足側へ向く低め枕で快眠",
        desc: "昼間スマホで痛めた首を、夜の高すぎる枕でさらに6時間折り曲げ続けている人が急増しています。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 枕を何個変えても合わない理由｜解剖パラパラ",
        title: "枕は「頭」に乗せるのではなく「首の隙間」を埋めるもの",
        subNormal: "● 首のS字アーチの下がふんわり支えられている",
        subDeform: "▲ 後頭部だけを高く持ち上げてしまい首が浮く",
        subLocked: "【！】首の付け根（C5-C7）が折れ曲がり呼吸も浅化",
        subRecover: "★ バスタオル1枚で首のアーチを支えれば朝スッキリ",
        desc: "高級枕を買っても朝首が痛いのは、後頭部ばかり高くして肝心の「首のアーチ（頸椎前弯）」が宙に浮いているからです。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 今夜3秒でできる枕診断｜手描きパラパラ",
        title: "寝たとき「アゴが引けて首にシワ」が寄っていませんか？",
        subNormal: "● 立ったときの自然な姿勢がそのまま横になった状態",
        subDeform: "▲ 枕が高すぎて首の前に横ジワがくっきり入る",
        subLocked: "【！】いびき・食いしばり・朝の寝違えを誘発",
        subRecover: "★ タオル枕で首の角度0°へ整え最高の睡眠へ",
        desc: "睡眠中の首の骨がどう折れ曲がり、どう支えれば理想のアーチになるのかを横顔デッサンで徹底比較。"
      }
    ]
  },

  eye_headache: {
    id: "eye_headache",
    vol: "Vol.8",
    shortName: "👀 眼精疲労・後頭下筋群ロックと頭痛",
    rigPrefix: "eye_headache",
    mp4File: "flipbook_eye_headache.mp4",
    posterFile: "flipbook_grid_eye_headache.jpg",
    pivot: [0.40, 0.58],
    focusTarget: [0.44, 0.32], // Eyes -> Suboccipital skull base
    dirSign: 0.8,
    metric1Label: "後頭下筋群の緊張",
    metric1Start: 100,
    metric1End: 380,
    metric1Unit: "%",
    metric2Label: "頭部への血流",
    metric2Start: 100,
    metric2End: 52,
    metric2Unit: "%",
    culpritName: "視神経連動・後頭下筋群（C0-C2）ロック＆大後頭神経圧迫",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.8",
        title: "画面を凝視し続ける女性の「目の奥と首の付け根」の末路",
        subNormal: "● 視線が柔らかく首の付け根（後頭下筋群）も柔軟",
        subDeform: "▲ 画面凝視で目の奥から後頭部へ緊張が直撃",
        subLocked: "【！】後頭下筋群380%ロック・大後頭神経痛＆頭痛",
        subRecover: "★ 目を閉じ首の付け根をじんわり緩め血流回復",
        desc: "目を使うほど首の付け根の奥にある「後頭下筋群」がガチガチに固まり、神経を圧迫して頭痛を引き起こす連鎖。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 頭部血流52%低下｜手描き解剖パラパラ",
        title: "目の疲れを放置すると、首の奥が「3.8倍」固まり頭痛へ",
        subNormal: "● 後頭下筋群100%：脳と目へスッキリ血流100%",
        subDeform: "▲ 緊張240%：首の付け根のくぼみが硬く詰まる",
        subLocked: "【！】緊張380%・血流52%：目の奥がえぐられる頭痛",
        subRecover: "★ 後頭骨の下を10秒リリースで視界までパッと明るく",
        desc: "眼球の動きと首の付け根の筋肉（後頭下筋群）は1ミリ単位で連動しています。目の酷使は首の奥を直撃します。"
      },
      {
        hookType: "💡 常識否定・真犯人フック",
        badge: "◆ 目薬で治らない眼精疲労｜解剖パラパラ",
        title: "「目の奥が痛い」の真犯人は目ではなく首の1番上の骨",
        subNormal: "● 頭蓋骨と頸椎1番・2番の隙間がゆったり開く",
        subDeform: "▲ 画面を覗き込みアゴが上がり後頭部が詰まる",
        subLocked: "【！】4つの深層筋（後頭下筋群）が神経を挟み込み",
        subRecover: "★ 髪の生え際のくぼみを緩めれば目の奥がスッと軽い",
        desc: "いくら目薬を差しても取れない目の奥の重だるさは、頭蓋骨のすぐ下で神経を圧迫している後頭下筋群が原因です。"
      },
      {
        hookType: "✅ セルフチェック＆回復フック",
        badge: "◆ 3秒連動テスト｜手描き解剖パラパラ漫画",
        title: "後頭部に指を当てて「目を左右」に動かしてみてください",
        subNormal: "● 目の動きに合わせて首の奥がしなやかに動く",
        subDeform: "▲ 首の付け根が石のように硬く指が入らない",
        subLocked: "【！】夕方になると頭痛・めまい・かすみ目が発症",
        subRecover: "★ 親指で頭蓋骨のフチを優しく支え深呼吸リセット",
        desc: "目と首の付け根の不思議な連動メカニズムを、透視解剖デッサンでわかりやすく解説。"
      }
    ]
  },

  cold_autonomic: {
    id: "cold_autonomic",
    vol: "Vol.9",
    shortName: "❄️ 自律神経緊張・背中鉄板化と不眠",
    rigPrefix: "shallow_breath",
    mp4File: "flipbook_shallow_breath.mp4",
    posterFile: "flipbook_grid_shallow_breath.jpg",
    pivot: [0.40, 0.64],
    focusTarget: [0.42, 0.45],
    dirSign: 0.9,
    metric1Label: "交感神経緊張度",
    metric1Start: 20,
    metric1End: 94,
    metric1Unit: "%",
    metric2Label: "胸椎可動域",
    metric2Start: 100,
    metric2End: 28,
    metric2Unit: "%",
    culpritName: "胸椎T1-T12交感神経幹の過緊張＆脊柱起立筋ロック",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.9",
        title: "ストレスで背中が丸まる女性の「自律神経」の末路",
        subNormal: "● 背骨がしなやかで副交感神経が働くリラックス状態",
        subDeform: "▲ 緊張と猫背で背骨の両脇（交感神経幹）が興奮",
        subLocked: "【！】交感神経94%暴走・背中鉄板化＆夜も眠れない",
        subRecover: "★ 胸椎をゆっくり伸ばし自律神経スイッチをON",
        desc: "背骨（胸椎）のすぐ脇には自律神経の束が通っています。背中が丸まって固まると24時間戦闘モードが抜けなくなります。"
      },
      {
        hookType: "🔢 数字・衝撃フック",
        badge: "◆ 胸椎可動28%へ激減｜手描き解剖パラパラ",
        title: "「布団に入っても眠れない人」の背中は72%固まっている",
        subNormal: "● 胸椎可動100%：深い呼吸で睡眠スイッチON",
        subDeform: "▲ 可動55%：肩甲骨の間が常に重だるく張る",
        subLocked: "【！】可動28%・交感神経94%：動悸・浅い眠り・冷え",
        subRecover: "★ 肩甲骨を寄せて胸を開き副交感神経を回復",
        desc: "自律神経を整える一番の近道は、神経の通り道である「背骨（胸椎）のしなり」を取り戻すことです。"
      }
    ]
  },

  hip_walk: {
    id: "hip_walk",
    vol: "Vol.10",
    shortName: "🏃 股関節ロック・すり足歩きと膝腰連鎖",
    rigPrefix: "anterior_pelvis",
    mp4File: "flipbook_anterior_pelvis.mp4",
    posterFile: "flipbook_grid_anterior_pelvis.jpg",
    pivot: [0.46, 0.60],
    focusTarget: [0.48, 0.65],
    dirSign: -0.8,
    metric1Label: "股関節の伸び角",
    metric1Start: 20,
    metric1End: 2,
    metric1Unit: "°",
    metric2Label: "腰・膝への代償負荷",
    metric2Start: 1.0,
    metric2End: 3.6,
    metric2Unit: "倍",
    culpritName: "股関節伸展制限（腸腰筋ロック）＆腰椎過伸展代償",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.10",
        title: "座りっぱなしで「股関節が固まった人」が歩くときの末路",
        subNormal: "● 股関節が後ろへ20°伸びてお尻の筋肉で颯爽と歩く",
        subDeform: "▲ 座りすぎで股関節の前が縮み、足が後ろへ伸びない",
        subLocked: "【！】股関節の代わりに腰を反らせて歩き腰痛3.6倍",
        subRecover: "★ そけい部を伸ばし股関節から歩く美しいフォームへ",
        desc: "歩くとき本来なら股関節が後ろに伸びるはずが、ロックしていると1歩ごとに「腰を反らせて」代償してしまいます。"
      }
    ]
  },

  forward_bend: {
    id: "forward_bend",
    vol: "Vol.11",
    shortName: "🤱 前かがみ家事・抱っこと仙腸関節ロック",
    rigPrefix: "cross_legs",
    mp4File: "flipbook_cross_legs.mp4",
    posterFile: "flipbook_grid_cross_legs.jpg",
    pivot: [0.48, 0.68],
    focusTarget: [0.50, 0.66],
    dirSign: -0.75,
    metric1Label: "仙腸関節の剪断負荷",
    metric1Start: 350,
    metric1End: 1650,
    metric1Unit: "N",
    metric2Label: "ぎっくり腰リスク",
    metric2Start: 1.0,
    metric2End: 4.5,
    metric2Unit: "倍",
    culpritName: "片側荷重＆中腰による仙腸関節ロック・多裂筋スパズム",
    hooks: [
      {
        hookType: "😱 末路・恐怖フック",
        badge: "◆ 365枚の手描き解剖パラパラ漫画 Vol.11",
        title: "片腰抱っこ・前かがみ家事を続けた「骨盤の継ぎ目」の末路",
        subNormal: "● 仙骨と腸骨（仙腸関節）がしなやかに衝撃吸収",
        subDeform: "▲ 片側の骨盤に体重を乗せねじれ負荷が蓄積",
        subLocked: "【！】仙腸関節1650Nロック・ピキッと走る急性腰痛",
        subRecover: "★ 股関節から折り曲げ骨盤を左右均等にリセット",
        desc: "骨盤の後ろにある数ミリの継ぎ目（仙腸関節）にねじれ負荷が溜まり、ある日突然ロックするメカニズム。"
      }
    ]
  },

  custom_theme: {
    id: "custom_theme",
    vol: "Custom",
    shortName: "✨ 自由入力・カスタム無限生成モード",
    rigPrefix: "straight_neck",
    mp4File: "flipbook_straight_neck.mp4",
    posterFile: "flipbook_preview_grid.jpg",
    pivot: [0.42, 0.62],
    focusTarget: [0.46, 0.45],
    dirSign: 1.0,
    metric1Label: "歪み角度",
    metric1Start: 5,
    metric1End: 55,
    metric1Unit: "°",
    metric2Label: "関節・神経負荷",
    metric2Start: 1.0,
    metric2End: 4.5,
    metric2Unit: "倍",
    culpritName: "深層筋膜ロック＆関節アライメント崩れ",
    hooks: [
      {
        hookType: "✨ カスタム自由編集",
        badge: "◆ 365枚の手描き解剖パラパラ漫画｜Rooton",
        title: "あなたの身体で起きている「姿勢と骨格」の連鎖",
        subNormal: "● 本来の美しい骨格バランス",
        subDeform: "▲ 日常のクセで少しずつ歪みが進行",
        subLocked: "【！】深層ロック・痛みやしびれの発症",
        subRecover: "★ 根本原因を解放し本来の美しい軸へ",
        desc: "下のカスタム入力欄でタイトル・数値・骨格ベースを自由に変更して、オリジナルの手描きパラパラ動画を作成できます。"
      }
    ]
  }
};

const ART_STYLES = {
  classic_genga: {
    name: "✏️ リアル鉛筆デッサン × 色鉛筆スケッチ（上質クリーム紙）",
    paperTint: [1.0, 1.0, 1.0],
    inkContrast: 1.04,
    sepia: 0.0,
    invert: false,
    blueprint: false,
    gridLines: false,
    badgeColor: "#ffd46c",
    headerBg: "rgba(18, 14, 11, 0.88)"
  },
  davinci_sepia: {
    name: "🖋️ ダ・ヴィンチ解剖手稿風（古紙セピア × 万年筆インク）",
    paperTint: [0.96, 0.89, 0.76],
    inkContrast: 1.38,
    sepia: 0.55,
    invert: false,
    blueprint: false,
    gridLines: true,
    badgeColor: "#f5c26b",
    headerBg: "rgba(32, 22, 14, 0.90)"
  },
  blueprint_mech: {
    name: "📐 構造力学ブループリント（設計方眼紙 × 青写真＆赤ベクトル）",
    paperTint: [0.86, 0.93, 1.0],
    inkContrast: 1.35,
    sepia: 0.0,
    invert: false,
    blueprint: true,
    gridLines: true,
    badgeColor: "#7dd3fc",
    headerBg: "rgba(12, 24, 44, 0.90)"
  },
  charcoal_crimson: {
    name: "🖍️ 木炭デッサン × 深紅ペイン強調（高コントラスト画用紙）",
    paperTint: [0.98, 0.97, 0.95],
    inkContrast: 1.55,
    sepia: 0.0,
    invert: false,
    blueprint: false,
    gridLines: false,
    crimsonBoost: true,
    badgeColor: "#fca5a5",
    headerBg: "rgba(28, 10, 12, 0.90)"
  },
  dark_xray: {
    name: "🌙 ダークX-Rayネオン原画（黒スケッチパッド × 発光骨格）",
    paperTint: [0.14, 0.16, 0.22],
    inkContrast: 1.30,
    sepia: 0.0,
    invert: true,
    blueprint: false,
    gridLines: true,
    badgeColor: "#38bdf8",
    headerBg: "rgba(8, 15, 28, 0.92)"
  },
  watercolor_note: {
    name: "🌿 水彩パステル × 患者説明ノート（ナチュラル生成り紙）",
    paperTint: [1.0, 0.98, 0.92],
    inkContrast: 1.12,
    sepia: 0.12,
    invert: false,
    blueprint: false,
    gridLines: false,
    badgeColor: "#86efac",
    headerBg: "rgba(16, 30, 24, 0.88)"
  }
};

const CAMERA_MODES = {
  standard_desk: {
    name: "📖 標準フルデスク俯瞰（机＋鉛筆＋親指めくり全体）",
    desc: "ウォールナット机とメモ帳・鉛筆・親指めくり全体を映す王道パラパラ漫画アングル"
  },
  zoom_culprit: {
    name: "🔍 真犯人部位へ動的ズームイン（悪化局面でグッと寄る！）",
    desc: "悪化ピーク時に首・骨盤・肋骨の真犯人ポイントへカメラが1.35倍ズームインして強調"
  },
  shock_opener: {
    name: "⚡ 3秒衝撃フック開幕（最初に限界ロックを見せてから巻き戻し解説）",
    desc: "最初の2秒で一番悪い赤ロック状態を見せてスクロールを止め、「なぜ？」と変化を見せる構成"
  },
  vector_hud: {
    name: "📐 解剖ベクトル＆角度アーク強調（力学矢印・発痛パルス描画）",
    desc: "手描きスケッチの上に角度アーク・重力ベクトル矢印・真犯人コールアウト枠をリアルタイム描画"
  },
  stop_motion_focus: {
    name: "⏸️ コマ送りストップ解説（Step1→2→3でピタッと止まり赤丸強調）",
    desc: "各段階の重要フレームで一瞬ピタッと止まり、真犯人部位に手描き赤丸と解説ラベルを表示"
  }
};

window.FLIPBOOK_THEMES = FLIPBOOK_THEMES;
window.ART_STYLES = ART_STYLES;
window.CAMERA_MODES = CAMERA_MODES;
