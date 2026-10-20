// クリスマスワークショップパッケージ 企画書（PPTX）生成スクリプト
// 使い方: node build_deck.js <出力先.pptx>   ※ pptxgenjs が必要
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = process.argv[2] || path.join(__dirname, "企画書_NTTドコモ_クリスマスWS.pptx");
const IMG = {
  squeeze: path.join(__dirname, "../../../site/images/squeeze.jpg"),
  squeezeEvent: path.join(__dirname, "../../../site/images/squeeze-event.jpg"),
  punilab: path.join(__dirname, "../../../site/images/punilab-animals.jpg"),
  arch: path.join(__dirname, "assets/arch_reference.jpg"),
  snowdome: path.join(__dirname, "assets/snowdome_image.jpg"),
};

const FONT = "メイリオ";
const THEME = {
  name: "NextVision Christmas",
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: "222222", lt1: "FFFFFF", dk2: "1E4D2B", lt2: "EEF3EF",
    accent1: "B3202E", accent2: "1E4D2B", accent3: "C9A227",
    accent4: "6B8F71", accent5: "DCE7DF", accent6: "7A1420",
    hlink: "B3202E", folHlink: "7A1420",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "クリスマスワークショップパッケージ ご提案";
pres.author = "株式会社DreamCreation";
const C = pres.SchemeColor;

// ---------- レイアウト ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.55, w: 8.8, h: 1.3,
      fontSize: 34, bold: true, color: C.background1, valign: "middle" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.9, w: 8.8, h: 0.9,
      fontSize: 16, color: C.accent5, valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 9.0, h: 0.6,
      fontSize: 24, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "株式会社DreamCreation ｜ クリスマスワークショップパッケージ ご提案",
      options: { x: 0.5, y: 5.25, w: 7.5, h: 0.25, fontSize: 9, color: C.accent4, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.25, w: 0.5, h: 0.25, fontSize: 9, color: C.accent4, align: "right" },
});

let n = 0;
const sec = (t) => pres.addSection({ title: t });
function content(section, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
const tx = (o) => Object.assign({ isTextBox: true, fontSize: 14, color: C.text1, margin: 0.05, valign: "top" }, o);
function card(s, x, y, w, h, name, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08,
    fill: { color: fill || C.background2 }, line: { color: fill || C.background2 }, objectName: name });
}
function badge(s, x, y, label, fill, name, d = 0.5) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: name });
  s.addText(label, tx({ x, y, w: d, h: d, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0 }));
}
// スノードームのアイコン(図形のみ)
function snowGlobe(s, x, y, d, name) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: "DDEFF7" }, line: { color: "9CC9DD", width: 1.5 }, objectName: name + "_globe" });
  s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: x + d * 0.33, y: y + d * 0.3, w: d * 0.34, h: d * 0.45, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: name + "_tree" });
  [[0.2, 0.25], [0.7, 0.2], [0.25, 0.6], [0.75, 0.55], [0.5, 0.15], [0.62, 0.7]].forEach(([a, b], i) =>
    s.addShape(pres.shapes.OVAL, { x: x + d * a, y: y + d * b, w: d * 0.06, h: d * 0.06, fill: { color: "FFFFFF" }, line: { color: "9CC9DD", width: 0.5 }, objectName: `${name}_snow${i}` }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + d * 0.1, y: y + d * 0.88, w: d * 0.8, h: d * 0.25, rectRadius: 0.05, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: name + "_base" });
}

// ---------- 1. 表紙 ----------
sec("表紙");
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "表紙" });
  s.addText("ドコモショップ\nクリスマスワークショップパッケージ", { placeholder: "title" });
  s.addText("毎週ちがう“つくる体験”で、12月の来店を4回に。", { placeholder: "body" });
  s.addText("株式会社NTTドコモ　チャネル統括部　イベントマネジメント担当 御中", tx({ x: 0.6, y: 0.55, w: 8.8, h: 0.4, fontSize: 14, color: C.background1 }));
  s.addText("2026年10月　株式会社DreamCreation", tx({ x: 0.6, y: 4.6, w: 6, h: 0.4, fontSize: 14, color: C.background1 }));
  snowGlobe(s, 8.1, 3.75, 1.1, "cover");
}

// ---------- 2. ご依頼内容 ----------
sec("ご提案の概要");
{
  const s = content("ご提案の概要", "ご依頼内容の整理");
  const rows = [
    ["ご依頼", "クリスマス仕様のスノードームワークショップパッケージ"],
    ["コスプレ", "サンタ・雪だるま・トナカイ ほか（全週で展開）"],
    ["WSキット", "4週実施分（1地区 300個／週）"],
    ["開催中ツール", "クリスマスアーチ ほか、開催中が伝わる装飾"],
    ["ポスター", "B0サイズ 10枚"],
    ["数量・配送", "上記10セット ／ 全国10地区へ配送"],
  ];
  s.addTable(rows.map(([a, b]) => [
    { text: a, options: { bold: true, color: C.background1, fill: { color: C.accent2 } } },
    { text: b, options: { color: C.text1, fill: { color: C.background2 } } },
  ]), { x: 0.5, y: 1.15, w: 5.6, colW: [1.5, 4.1], fontSize: 13, rowH: 0.52, valign: "middle",
    border: { type: "solid", pt: 2, color: "FFFFFF" }, objectName: "request_table" });
  card(s, 6.4, 1.15, 3.1, 3.82, "area_card");
  s.addText("配送先 10地区", tx({ x: 6.6, y: 1.3, w: 2.7, h: 0.4, fontSize: 15, bold: true, color: C.text2 }));
  const areas = ["北海道", "東北", "関信越", "首都圏", "東海", "北陸", "関西", "中国", "四国", "九州"];
  areas.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 6.6 + col * 1.4, y = 1.85 + row * 0.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.25, h: 0.45, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent4, width: 1 }, objectName: "area_" + i });
    s.addText(a, tx({ x, y, w: 1.25, h: 0.45, fontSize: 13, align: "center", valign: "middle", margin: 0 }));
  });
}

// ---------- 3. コンセプト ----------
{
  const s = content("ご提案の概要", "企画コンセプト");
  s.addText("毎週ちがう“つくる体験”で、\n12月の来店を4回に。", tx({ x: 0.5, y: 1.15, w: 9, h: 1.1, fontSize: 24, bold: true, color: C.accent1 }));
  const items = [
    ["1", "飽きさせない", "スノードームとスクイーズを週替わりで実施。型・モチーフも毎週変えて「来週は何がつくれる？」をつくる。"],
    ["2", "足を止める", "クリスマスアーチ＋スタッフのコスプレ（全週・週替わり）で、通行客に開催中がひと目で伝わる。"],
    ["3", "着座につなげる", "制作時間（約15〜20分）が保護者様との会話・商談時間になる。"],
  ];
  items.forEach(([no, h, b], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 2.55, 2.85, 2.4, "concept_" + no);
    badge(s, x + 0.2, 2.72, no, C.accent1, "concept_badge_" + no);
    s.addText(h, tx({ x: x + 0.8, y: 2.75, w: 1.95, h: 0.45, fontSize: 16, bold: true, color: C.text2, valign: "middle" }));
    s.addText(b, tx({ x: x + 0.2, y: 3.35, w: 2.5, h: 1.5, fontSize: 13 }));
  });
}

// ---------- 4. パッケージ全体像 ----------
{
  const s = content("ご提案の概要", "1セットの中身（×10セット）");
  const parts = [
    ["WS", "WSキット", "スノードーム／スクイーズ\n300個／週 × 4週＝1,200個", C.accent1],
    ["装", "クリスマスアーチ", "エアーディスプレイ（期間中レンタル）", C.accent2],
    ["衣", "コスプレ衣装", "サンタ・トナカイ・雪だるま・エルフ ほか", C.accent3],
    ["掲", "B0ポスター 10枚", "4週の内容がひと目でわかるデザイン", C.accent6],
    ["飾", "開催中ツール", "スタンド看板・のぼり・テーブル装飾 ほか", C.accent4],
    ["手", "運用マニュアル", "店舗スタッフ様だけで運営できる手順書", C.text2],
  ];
  parts.forEach(([ic, h, b, col], i) => {
    const colI = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + colI * 3.05, y = 1.15 + row * 1.95;
    card(s, x, y, 2.85, 1.75, "part_" + i);
    badge(s, x + 0.2, y + 0.2, ic, col, "part_badge_" + i, 0.55);
    s.addText(h, tx({ x: x + 0.9, y: y + 0.2, w: 1.85, h: 0.55, fontSize: 15, bold: true, color: C.text2, valign: "middle" }));
    s.addText(b, tx({ x: x + 0.2, y: y + 0.9, w: 2.5, h: 0.8, fontSize: 12 }));
  });
}

// ---------- 5. スノードーム ----------
sec("ワークショップ");
{
  const s = content("ワークショップ", "目玉①　スノードーム作り");
  s.addImage({ path: IMG.snowdome, x: 0.5, y: 1.1, w: 3.2, h: 3.2, altText: "スノードームの完成イメージ", objectName: "img_snowdome" });
  s.addText("完成イメージ", tx({ x: 0.2, y: 4.4, w: 3.8, h: 0.4, fontSize: 13, color: C.accent4, align: "center" }));
  const rows = [
    ["内容", "ミニフィギュア（サンタ・ツリー・雪だるま等）とラメ雪を選んで、自分だけのスノードームを制作"],
    ["所要時間", "約15〜20分／人"],
    ["対象", "3歳〜小学生（未就学児は保護者様と一緒に）"],
    ["持ち帰り", "冬のインテリアとして飾れる。記念性が高く、家族の会話が続く"],
  ];
  rows.forEach(([h, b], i) => {
    const y = 1.2 + i * 0.95;
    s.addText(h, tx({ x: 4.1, y, w: 1.4, h: 0.8, fontSize: 14, bold: true, color: C.accent1 }));
    s.addText(b, tx({ x: 5.5, y, w: 4.0, h: 0.8, fontSize: 14 }));
  });
}

// ---------- 6. スクイーズ ----------
{
  const s = content("ワークショップ", "目玉②　スクイーズ作り");
  s.addImage({ path: IMG.squeeze, x: 0.5, y: 1.15, w: 2.0, h: 2.0, rounding: true, altText: "スクイーズ作品", objectName: "img_squeeze" });
  s.addImage({ path: IMG.punilab, x: 1.6, y: 2.75, w: 2.0, h: 2.0, rounding: true, altText: "ぷにラボの動物型スクイーズ", objectName: "img_punilab" });
  const rows = [
    ["内容", "型とカラーを選び、型から剥がしてマジックパウダーで仕上げる人気コンテンツ「ぷにラボ」をクリスマス仕様に"],
    ["クリスマス仕様", "ツリー・ブーツ・雪だるま・プレゼント型／赤・緑・白カラー"],
    ["所要時間", "約20分／人"],
    ["実績", "ドコモショップ店頭で実施実績あり"],
  ];
  rows.forEach(([h, b], i) => {
    const y = 1.2 + i * 0.95;
    s.addText(h, tx({ x: 4.1, y, w: 1.6, h: 0.8, fontSize: 14, bold: true, color: C.accent1 }));
    s.addText(b, tx({ x: 5.7, y, w: 3.8, h: 0.8, fontSize: 14 }));
  });
}

// ---------- 7. 4週ローテーション ----------
{
  const s = content("ワークショップ", "4週ローテーション計画（11月最終週〜12月）");
  const weeks = [
    ["第1週", "11/28(土)〜12/4(金)", "スノードーム", "サンタモチーフ", "サンタ／トナカイ", C.accent1],
    ["第2週", "12/5(土)〜12/11(金)", "スクイーズ", "ツリー・ブーツ型", "雪だるま／エルフ", C.accent2],
    ["第3週", "12/12(土)〜12/18(金)", "スクイーズ", "雪だるま・プレゼント型", "トナカイ／ジンジャーブレッド", C.accent2],
    ["第4週", "12/19(土)〜12/25(金)", "スノードーム", "雪だるま・トナカイモチーフ", "サンタ（男女）／ツリー", C.accent1],
  ];
  weeks.forEach(([w, d, ws, motif, cos, col], i) => {
    const x = 0.5 + i * 2.3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.15, w: 2.1, h: 0.75, rectRadius: 0.08, fill: { color: col }, line: { color: col }, objectName: "wk_head_" + i });
    s.addText([{ text: w, options: { fontSize: 16, bold: true, breakLine: true } }, { text: d, options: { fontSize: 11 } }],
      tx({ x, y: 1.15, w: 2.1, h: 0.75, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    card(s, x, 2.0, 2.1, 2.3, "wk_body_" + i);
    s.addText([
      { text: "ワークショップ", options: { fontSize: 11, color: C.accent4, breakLine: true } },
      { text: ws, options: { fontSize: 16, bold: true, color: C.text2, breakLine: true } },
      { text: motif, options: { fontSize: 12, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: "コスプレ", options: { fontSize: 11, color: C.accent4, breakLine: true } },
      { text: cos, options: { fontSize: 12 } },
    ], tx({ x: x + 0.12, y: 2.1, w: 1.86, h: 2.1 }));
  });
  s.addText("同じワークショップが続く週も、型・モチーフ・衣装を変えて“新作”として訴求。毎週来ても新しい体験になります。",
    tx({ x: 0.5, y: 4.45, w: 9, h: 0.6, fontSize: 13, color: C.text1 }));
}

// ---------- 8. クリスマスアーチ ----------
sec("店頭演出");
{
  const s = content("店頭演出", "クリスマスアーチ（開催中ツールの主役）");
  s.addImage({ path: IMG.arch, x: 0.5, y: 1.15, w: 3.6, h: 3.58, altText: "サンタとスノーマン付きのエアーアーチ参考写真", objectName: "img_arch" });
  s.addText("参考イメージ", tx({ x: 0.5, y: 4.78, w: 3.6, h: 0.3, fontSize: 10, color: C.accent4 }));
  const pts = [
    ["遠くからでも目立つ", "サンタ＆スノーマン付きのエアーアーチを入口に設置。ワークショップ開催中がひと目で伝わる。"],
    ["フォトスポットに", "アーチ前での記念撮影がSNS投稿のきっかけに。"],
    ["期間中レンタル", "4週の期間中は返却不要。期間終了後に回収。"],
  ];
  pts.forEach(([h, b], i) => {
    const y = 1.2 + i * 1.2;
    badge(s, 4.5, y, String(i + 1), C.accent1, "arch_badge_" + i, 0.45);
    s.addText(h, tx({ x: 5.1, y: y - 0.02, w: 4.4, h: 0.4, fontSize: 15, bold: true, color: C.text2 }));
    s.addText(b, tx({ x: 5.1, y: y + 0.4, w: 4.4, h: 0.7, fontSize: 13 }));
  });
}

// ---------- 9. 開催中ツール ----------
{
  const s = content("店頭演出", "ワークショップ開催中ツール（案）");
  const tools = [
    ["A", "スタンド看板", "ツリー型A型看板「ただいまワークショップ開催中」"],
    ["B", "のぼり・タペストリー", "クリスマス柄。遠目でも開催がわかる"],
    ["C", "テーブル装飾", "赤緑のテーブルクロス、ミニツリー、LEDライト"],
    ["D", "吊り下げPOP", "雪の結晶・オーナメント型で天井から演出"],
    ["E", "作品ディスプレイ", "完成見本を展示し、通行客に“つくれるもの”を見せる"],
    ["F", "週替わり告知カード", "「来週はこれがつくれる！」で再来店を促す"],
  ];
  tools.forEach(([ic, h, b], i) => {
    const colI = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + colI * 4.6, y = 1.15 + row * 1.3;
    card(s, x, y, 4.4, 1.15, "tool_" + i);
    badge(s, x + 0.2, y + 0.3, ic, i % 2 ? C.accent2 : C.accent1, "tool_badge_" + i);
    s.addText(h, tx({ x: x + 0.85, y: y + 0.12, w: 3.4, h: 0.4, fontSize: 15, bold: true, color: C.text2 }));
    s.addText(b, tx({ x: x + 0.85, y: y + 0.52, w: 3.4, h: 0.55, fontSize: 12 }));
  });
}

// ---------- 10. コスプレ ----------
{
  const s = content("店頭演出", "コスプレ（全週で週替わり展開）");
  const items = [
    ["サンタ（男女）", "帽子・ひげ・ベルト付セット", C.accent1],
    ["トナカイ", "フリース着ぐるみ＋角カチューシャ", "8B5A2B"],
    ["雪だるま", "着ぐるみ／ポンチョ", "9CC9DD"],
    ["エルフ", "緑の衣装＋とんがり帽子", C.accent2],
    ["ジンジャーブレッド", "着ぐるみタイプ", "B7792E"],
    ["クリスマスツリー", "かぶり物・ポンチョ", C.accent4],
  ];
  items.forEach(([h, b, col], i) => {
    const colI = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + colI * 3.05, y = 1.15 + row * 1.45;
    card(s, x, y, 2.85, 1.3, "cos_" + i);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.35, w: 0.6, h: 0.6, fill: { color: col }, line: { color: col }, objectName: "cos_dot_" + i });
    s.addText(h, tx({ x: x + 0.95, y: y + 0.2, w: 1.8, h: 0.45, fontSize: 14, bold: true, color: C.text2 }));
    s.addText(b, tx({ x: x + 0.95, y: y + 0.65, w: 1.8, h: 0.55, fontSize: 11 }));
  });
  s.addText("Amazonで調達可能な市販衣装から選定（大人サイズ・スタッフ着用）。週ごとに衣装を入れ替え、毎週ちがう店頭の雰囲気をつくります。",
    tx({ x: 0.5, y: 4.15, w: 9, h: 0.7, fontSize: 13 }));
}

// ---------- 11. B0ポスター ----------
{
  const s = content("店頭演出", "B0ポスター　デザイン案");
  const ideas = [
    ["A", "スノードーム主役", "大きなスノードームの中に雪景色とお店。「あなただけのスノードームをつくろう」", false],
    ["B", "4週カレンダー型", "4週の内容をアドベントカレンダー風に配置。「毎週かわる！クリスマスワークショップ」", true],
    ["C", "キャラクター型", "サンタ・雪だるま・トナカイが手招き。完成作品の写真を大きく配置", false],
  ];
  ideas.forEach(([no, h, b, rec], i) => {
    const x = 0.5 + i * 3.05;
    // B0の縦横比(1:1.41)を模したポスター枠
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.75, y: 1.15, w: 1.35, h: 1.9, fill: { color: rec ? C.accent1 : C.accent2 }, line: { color: rec ? C.accent1 : C.accent2 }, objectName: "poster_" + no });
    s.addText(no, tx({ x: x + 0.75, y: 1.15, w: 1.35, h: 1.9, fontSize: 40, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    s.addText(h + (rec ? "（推奨）" : ""), tx({ x, y: 3.15, w: 2.85, h: 0.4, fontSize: 15, bold: true, color: rec ? C.accent1 : C.text2, align: "center" }));
    s.addText(b, tx({ x: x + 0.1, y: 3.6, w: 2.65, h: 1.0, fontSize: 12 }));
  });
  s.addText("共通：開催日時・対象年齢・参加条件・店舗名記入欄（手書き可）", tx({ x: 0.5, y: 4.7, w: 9, h: 0.4, fontSize: 12, color: C.accent4 }));
}

// ---------- 12. 運用フロー ----------
sec("運用・お見積");
{
  const s = content("運用・お見積", "運用フロー・スケジュール");
  const steps = [
    ["ご発注", "10月下旬〜\n11月上旬"],
    ["制作・調達", "キット・ポスター\n衣装・ツール"],
    ["配送", "10地区へ\n11月下旬着"],
    ["店舗で実施", "11/28〜12/25\n4週間"],
    ["回収", "期間終了後\nアーチを回収"],
  ];
  steps.forEach(([h, b], i) => {
    const x = 0.5 + i * 1.84;
    s.addShape(pres.shapes.CHEVRON, { x, y: 1.3, w: 1.75, h: 0.8, fill: { color: i === 3 ? C.accent1 : C.accent2 }, line: { color: C.background1 }, objectName: "step_" + i });
    s.addText(h, tx({ x: x + 0.2, y: 1.3, w: 1.4, h: 0.8, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    s.addText(b, tx({ x, y: 2.2, w: 1.75, h: 0.75, fontSize: 12, align: "center" }));
  });
  card(s, 0.5, 3.2, 9, 1.75, "ops_note");
  s.addText([
    { text: "店舗スタッフ様だけで運営できる体制", options: { bold: true, color: C.text2, fontSize: 15, breakLine: true } },
    { text: "運営スタッフの派遣はなし。キット・物品と運用マニュアル（準備・受付・制作手順・片付け）をお届けします。", options: { bullet: true, breakLine: true } },
    { text: "週替わりの内容に合わせ、キットは週ごとに仕分けして納品します。", options: { bullet: true } },
  ], tx({ x: 0.7, y: 3.3, w: 8.6, h: 1.55, fontSize: 13, paraSpaceAfter: 4 }));
}

// ---------- 13. 御見積書 ----------
{
  const s = content("運用・お見積", "御見積書");
  s.addText("株式会社NTTドコモ 御中", tx({ x: 0.5, y: 1.0, w: 5, h: 0.35, fontSize: 15, bold: true }));
  s.addText("件名：クリスマスワークショップパッケージについて（10セット）\n実施期間：2026年11月28日〜12月25日（4週間）",
    tx({ x: 0.5, y: 1.35, w: 5.8, h: 0.55, fontSize: 11 }));
  s.addText("株式会社DreamCreation\n〒550-0015 大阪府大阪市西区南堀江1-10-1 KT堀江801\nTEL 06-4967-1038　担当：竹村",
    tx({ x: 6.3, y: 1.0, w: 3.2, h: 0.85, fontSize: 9, color: C.text1 }));
  const H = (t, al) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.accent2 }, align: al || "center" } });
  const R = (cells) => cells.map((t, i) => ({ text: t, options: { align: [1, 6].includes(i) ? "left" : (i === 0 ? "center" : "right") } }));
  const rows = [
    [H("No"), H("御見積内容", "left"), H("数量"), H("日数"), H("単価"), H("金額"), H("摘要", "left")],
    R(["1", "ワークショップキット（スノードーム／スクイーズ）", "10", "1", "400,000", "4,000,000", "1地区300個/週×4週"]),
    R(["2", "販促物一式（クリスマスアーチ・B0ポスター10枚・開催中ツール・コスプレ）", "10", "1", "80,000", "800,000", "アーチは期間中レンタル"]),
    R(["3", "企画・ディレクション・運用マニュアル", "10", "1", "20,000", "200,000", ""]),
    R(["4", "配送料（10地区 往復）", "10", "1", "別途", "別途請求", "実費"]),
  ];
  s.addTable(rows, { x: 0.5, y: 2.0, w: 9.0, colW: [0.4, 3.5, 0.5, 0.5, 0.85, 1.05, 2.2], fontSize: 10, rowH: 0.36,
    valign: "middle", color: C.text1, border: { type: "solid", pt: 0.75, color: "B9C6BC" }, objectName: "quote_table" });
  const tot = [["小計", "5,000,000"], ["消費税（10%）", "500,000"], ["合計金額", "5,500,000"]];
  tot.forEach(([k, v], i) => {
    const y = 4.05 + i * 0.36, last = i === 2;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.1, y, w: 3.4, h: 0.34, fill: { color: last ? C.accent1 : C.background2 }, line: { color: last ? C.accent1 : C.background2 }, objectName: "tot_" + i });
    s.addText(k, tx({ x: 6.2, y, w: 1.5, h: 0.34, fontSize: 11, bold: last, color: last ? C.background1 : C.text1, valign: "middle", margin: 0 }));
    s.addText("￥" + v, tx({ x: 7.7, y, w: 1.7, h: 0.34, fontSize: 12, bold: true, color: last ? C.background1 : C.text1, align: "right", valign: "middle", margin: 0 }));
  });
  s.addText("※金額は税別表示。配送料は別途、実費にてご請求いたします。\n※運営スタッフの派遣は含みません。", tx({ x: 0.5, y: 4.1, w: 5.4, h: 0.9, fontSize: 10, color: C.text1 }));
}

// ---------- 14. 会社概要 ----------
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "運用・お見積" });
  s.addText("株式会社DreamCreation", { placeholder: "title" });
  s.addText("こどもが夢中になる体験を、企画から当日の準備物まで一社でお届けします。", { placeholder: "body" });
  s.addText("主な実績：大手家電量販店・大型商業施設・携帯キャリア店頭イベント（全国対応）\nTEL 070-1319-2126　／　MAIL data@d-creation-o.com",
    tx({ x: 0.6, y: 4.0, w: 8.8, h: 0.8, fontSize: 13, color: C.background1 }));
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL_DIR + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("written:", OUT);
})();
