// ドコモイベント支援向けコンテンツ提案（クリスマスWS）PPTX 生成スクリプト
// ドコモ様向け資料は薄い赤を基調にする
// 使い方: node build_deck.js <出力先.pptx>   ※ pptxgenjs が必要
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = process.argv[2] || path.join(__dirname, "企画書_NTTドコモ_クリスマスWS.pptx");
const IMG = {
  squeezeEvent: path.join(__dirname, "../../../site/images/squeeze-event.jpg"),
  punilabPaw: path.join(__dirname, "../../../site/images/punilab-paw.jpg"),
  arch: path.join(__dirname, "assets/arch_reference.jpg"),
  snowdome: path.join(__dirname, "assets/snowdome_image.jpg"),
};

const G = (name) => path.join(__dirname, "assets/gen_" + name + ".jpg"); // OpenAI生成イメージ(assets/gen_images.py)
const FONT = "メイリオ";
const THEME = {
  name: "Docomo Light Red",
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: "333333", lt1: "FFFFFF", dk2: "B8283A", lt2: "FDEFF1",
    accent1: "E0485A", accent2: "2E7D4F", accent3: "D9A21B",
    accent4: "8A6A6E", accent5: "FBE3E6", accent6: "8E1F2C",
    hlink: "B8283A", folHlink: "8E1F2C",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "ドコモイベント支援向けコンテンツ提案";
pres.author = "株式会社DreamCreation";
const C = pres.SchemeColor;

// ---------- レイアウト ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.accent5 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.5, w: 5.6, h: 1.4,
      fontSize: 30, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.0, w: 5.6, h: 0.9,
      fontSize: 15, color: C.text1, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 9.0, h: 0.6,
      fontSize: 24, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "株式会社DreamCreation ｜ ドコモイベント支援向けコンテンツ提案",
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
// ---------- 1. 表紙 ----------
sec("表紙");
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "表紙" });
  s.addText("ドコモ様向け 提案書", tx({ x: 0.6, y: 0.6, w: 3.2, h: 0.4, fontSize: 13, bold: true, color: C.background1, fill: { color: C.text2 }, align: "center", valign: "middle" }));
  s.addText("ドコモイベント支援向け\nコンテンツ提案", { placeholder: "title" });
  s.addText("クリスマス限定ワークショップで、\n家族の来店と商談のきっかけを毎週つくる", { placeholder: "body" });
  s.addText("株式会社NTTドコモ　チャネル統括部　イベントマネジメント担当 御中\n2026年10月　株式会社DreamCreation", tx({ x: 0.6, y: 4.35, w: 5.8, h: 0.7, fontSize: 12, color: C.text1 }));
  s.addImage({ path: IMG.snowdome, x: 6.5, y: 1.0, w: 3.0, h: 3.0, rounding: true, altText: "スノードームの完成イメージ", objectName: "cover_img" });
  s.addText("2026.11.28 ─ 12.25", tx({ x: 6.5, y: 4.15, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: C.text2, align: "center" }));
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
    { text: a, options: { bold: true, color: C.background1, fill: { color: C.accent1 } } },
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

// ---------- 3. 本企画の3つの目的 ----------
{
  const s = content("ご提案の概要", "本企画の3つの目的");
  s.addText("無料のクリスマス体験で家族連れを惹きつけ、毎週の来店と商談機会を創出します。", tx({ x: 0.5, y: 1.1, w: 9, h: 0.45, fontSize: 15, bold: true, color: C.accent1 }));
  const items = [
    ["1", "家族連れが\n自然に集まる", "クリスマスアーチ＋コスプレ＋B0ボードPOPで、通行中のファミリー層をブースへ誘導。"],
    ["2", "毎週ちがう\n作品で再来店", "スノードームとスクイーズを週替わりで。型・モチーフも変え、4週連続の来店動機に。"],
    ["3", "親子分離で\n商談機会を創出", "お子様は約20分の制作に集中。その間に保護者様をカウンターへご案内できます。"],
  ];
  items.forEach(([no, h, b], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.75, 2.85, 3.2, "goal_" + no);
    badge(s, x + 0.2, 1.95, no, C.accent1, "goal_badge_" + no, 0.6);
    s.addText(h, tx({ x: x + 0.95, y: 1.9, w: 1.8, h: 0.75, fontSize: 15, bold: true, color: C.text2, valign: "middle" }));
    s.addText(b, tx({ x: x + 0.2, y: 2.85, w: 2.5, h: 1.9, fontSize: 13 }));
  });
}

// ---------- 4. パッケージ全体像 ----------
{
  const s = content("ご提案の概要", "1セットの中身（×10セット）");
  const parts = [
    ["WS", "WSキット", "1週に1種類だけ実施\nスノードーム週／スクイーズ週", C.accent1],
    ["装", "クリスマスアーチ", "エアーディスプレイ（期間中レンタル）", C.accent2],
    ["衣", "コスプレ衣装", "サンタ・トナカイ・雪だるま・エルフ ほか", C.accent3],
    ["掲", "B0ボードPOP", "10枚。4週の内容がひと目でわかるデザイン", C.accent6],
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

// ---------- 5. 4週ローテーション ----------
sec("ワークショップ");
{
  const s = content("ワークショップ", "4週ローテーション（1週1コンテンツ）");
  const weeks = [
    ["第1週", "11/28(土)〜12/4(金)", "スノードーム", "サンタモチーフ", "サンタ／トナカイ", C.accent1],
    ["第2週", "12/5(土)〜12/11(金)", "スクイーズ", "ツリー・ブーツ型", "雪だるま／エルフ", C.text2],
    ["第3週", "12/12(土)〜12/18(金)", "スクイーズ", "雪だるま・プレゼント型", "トナカイ／ジンジャーブレッド", C.text2],
    ["第4週", "12/19(土)〜12/25(金)", "スノードーム", "雪だるま・トナカイモチーフ", "サンタ（男女）／ツリー", C.accent1],
  ];
  weeks.forEach(([w, d, ws, motif, cos, col], i) => {
    const x = 0.5 + i * 2.3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.1, w: 2.1, h: 0.75, rectRadius: 0.08, fill: { color: col }, line: { color: col }, objectName: "wk_head_" + i });
    s.addText([{ text: w, options: { fontSize: 16, bold: true, breakLine: true } }, { text: d, options: { fontSize: 11 } }],
      tx({ x, y: 1.1, w: 2.1, h: 0.75, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    card(s, x, 1.95, 2.1, 2.2, "wk_body_" + i);
    s.addText([
      { text: "ワークショップ", options: { fontSize: 11, color: C.accent4, breakLine: true } },
      { text: ws, options: { fontSize: 16, bold: true, color: col, breakLine: true } },
      { text: motif, options: { fontSize: 12, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: "コスプレ", options: { fontSize: 11, color: C.accent4, breakLine: true } },
      { text: cos, options: { fontSize: 12 } },
    ], tx({ x: x + 0.12, y: 2.05, w: 1.86, h: 2.0 }));
  });
  card(s, 0.5, 4.3, 9, 0.75, "rot_note", C.accent5);
  s.addText("1週間に実施するのは1種類だけ。スノードーム週（第1・4週）とスクイーズ週（第2・3週）で、キットを入れ替えます。モチーフ・衣装も毎週変えて“新作”として訴求します。",
    tx({ x: 0.65, y: 4.33, w: 8.7, h: 0.7, fontSize: 12, valign: "middle" }));
}

// 週バッジ（どの週に実施するか）
function weekTag(s, label, col) {
  s.addText(label, tx({ x: 0.5, y: 0.98, w: 2.2, h: 0.32, fontSize: 11, bold: true, color: C.background1, fill: { color: col }, align: "center", valign: "middle", margin: 0 }));
}
// キット紹介ページ
function kitSlide(title, label, col, img, items, note) {
  const s = content("ワークショップ", title);
  weekTag(s, label, col);
  s.addImage({ path: G(img), x: 0.5, y: 1.45, w: 3.5, h: 3.5, altText: title + "のイメージ", objectName: "img_" + img });
  s.addText("※AI生成のイメージ", tx({ x: 0.5, y: 4.95, w: 3.5, h: 0.22, fontSize: 9, color: C.accent4 }));
  s.addText("キット内容（1人分）", tx({ x: 4.3, y: 1.45, w: 5.2, h: 0.35, fontSize: 14, bold: true, color: col }));
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })), tx({ x: 4.3, y: 1.85, w: 5.2, h: 1.6, fontSize: 13, paraSpaceAfter: 3 }));
  card(s, 4.3, 3.6, 5.2, 0.9, "kit_qty_" + img);
  s.addText([
    { text: "1地区 300個／週 × 2週 ＝ 600個", options: { bold: true, color: C.text2, fontSize: 15, breakLine: true } },
    { text: note, options: { fontSize: 11 } },
  ], tx({ x: 4.45, y: 3.66, w: 4.9, h: 0.78 }));
}

// ---------- 6. スノードーム週 ----------
{
  const s = content("ワークショップ", "スノードーム作り");
  weekTag(s, "第1週・第4週に実施", C.accent1);
  s.addImage({ path: IMG.snowdome, x: 0.5, y: 1.45, w: 3.5, h: 3.5, altText: "スノードームの完成イメージ", objectName: "img_snowdome" });
  s.addText("完成イメージ", tx({ x: 0.5, y: 4.95, w: 3.5, h: 0.22, fontSize: 9, color: C.accent4 }));
  const rows = [
    ["内容", "ミニフィギュアとラメ雪を選んで、自分だけのスノードームを制作"],
    ["モチーフ", "第1週：サンタ／第4週：雪だるま・トナカイ"],
    ["所要時間", "約15〜20分／人"],
    ["対象", "3歳〜小学生（未就学児は保護者様と一緒に）"],
    ["持ち帰り", "冬のインテリアとして飾れる記念品"],
  ];
  rows.forEach(([h, b], i) => {
    const y = 1.45 + i * 0.7;
    s.addText(h, tx({ x: 4.3, y, w: 1.3, h: 0.6, fontSize: 13, bold: true, color: C.accent1 }));
    s.addText(b, tx({ x: 5.6, y, w: 3.9, h: 0.6, fontSize: 13 }));
  });
}
kitSlide("スノードームキット", "第1週・第4週に実施", C.accent1, "kit_snowdome",
  ["ドーム・台座", "ミニフィギュア（サンタ／ツリー／雪だるま等）", "ラメ雪・シルバーフレーク", "のり・手順カード"],
  "第1週分・第4週分に分けて納品（10地区で計6,000個）");

// ---------- 7. スクイーズ週 ----------
{
  const s = content("ワークショップ", "スクイーズ作り（ぷにラボ）");
  weekTag(s, "第2週・第3週に実施", C.text2);
  s.addImage({ path: IMG.squeezeEvent, x: 0.5, y: 1.45, w: 2.4, h: 3.2, altText: "ドコモ店頭でのスクイーズ作成体験ブース", objectName: "img_squeeze_event" });
  s.addImage({ path: IMG.punilabPaw, x: 3.0, y: 1.45, w: 2.4, h: 2.4, altText: "肉球スクイーズの完成品", objectName: "img_punilab_paw" });
  s.addText("ドコモ店頭での実施風景（ヨドバシ梅田）", tx({ x: 0.5, y: 4.7, w: 2.4, h: 0.45, fontSize: 9, color: C.accent4 }));
  s.addText("完成品（肉球スクイーズ）", tx({ x: 3.0, y: 3.9, w: 2.4, h: 0.25, fontSize: 9, color: C.accent4 }));
  const rows = [
    ["内容", "型とカラーを選び、液を流し込む。型のまま持ち帰り、おうちで完成"],
    ["モチーフ", "第2週：ツリー・ブーツ型／第3週：雪だるま・プレゼント型"],
    ["所要時間", "会場作業 約20分（＋自宅仕上げ）"],
    ["実績", "ドコモショップ・量販店のドコモブースで実施済み"],
  ];
  rows.forEach(([h, b], i) => {
    const y = 1.45 + i * 0.88;
    s.addText(h, tx({ x: 5.6, y, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: C.text2 }));
    s.addText(b, tx({ x: 5.6, y: y + 0.3, w: 3.9, h: 0.55, fontSize: 12 }));
  });
}
kitSlide("スクイーズキット", "第2週・第3週に実施", C.text2, "kit_squeeze",
  ["クリスマス型シリコンモールド（ツリー／ブーツ／雪だるま／プレゼント）", "計量カップ・カラー液（赤／緑／白）", "マジックパウダー", "お持ち帰り袋・手順カード"],
  "第2週分・第3週分に分けて納品（10地区で計6,000個）");

// ---------- 親子分離の運用 ----------
{
  const s = content("ワークショップ", "親子分離の運用設計");
  const cols = [
    ["お子様", "約20分", ["その週の作品の型・モチーフを選ぶ", "見本と手順カードを見ながら制作に集中", "完成した作品を袋に入れて受け取る", "作品を持って保護者様と合流"], C.accent1],
    ["保護者様", "約20分", ["隣接の商談カウンターへご案内", "料金プラン・機種変更のご相談", "見積ご依頼でクリスマス特典をご案内", "お子様の完成作品を一緒に確認"], C.text2],
  ];
  cols.forEach(([who, t, steps, col], ci) => {
    const x = 0.5 + ci * 4.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.1, w: 4.4, h: 0.6, rectRadius: 0.08, fill: { color: col }, line: { color: col }, objectName: "pc_head_" + ci });
    s.addText(who + "　" + t, tx({ x, y: 1.1, w: 4.4, h: 0.6, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    steps.forEach((st, i) => {
      const y = 1.85 + i * 0.68;
      card(s, x, y, 4.4, 0.58, `pc_${ci}_${i}`);
      badge(s, x + 0.12, y + 0.09, String(i + 1), col, `pc_b_${ci}_${i}`, 0.4);
      s.addText(st, tx({ x: x + 0.65, y, w: 3.65, h: 0.58, fontSize: 13, valign: "middle" }));
    });
  });
  s.addText("運営スタッフの派遣はなし。店舗スタッフ様1名でも回せるよう、手順カードと運用マニュアルを同梱します。", tx({ x: 0.5, y: 4.62, w: 9, h: 0.4, fontSize: 12, color: C.accent4 }));
}

// ---------- 8. クリスマスアーチ ----------
sec("店頭演出");
{
  const s = content("店頭演出", "クリスマスアーチ（開催中ツールの主役）");
  s.addImage({ path: G("arch"), x: 0.5, y: 1.1, w: 3.75, h: 3.75, altText: "店頭に設置したクリスマスアーチのイメージ", objectName: "img_arch" });
  s.addText("設置イメージ（AI生成）", tx({ x: 0.5, y: 4.88, w: 3.75, h: 0.25, fontSize: 10, color: C.accent4 }));
  s.addImage({ path: IMG.arch, x: 8.25, y: 3.75, w: 1.25, h: 1.24, altText: "アーチ参考商品", objectName: "img_arch_ref" });
  s.addText("参考商品", tx({ x: 7.3, y: 4.7, w: 0.9, h: 0.3, fontSize: 10, color: C.accent4, align: "right" }));
  const pts = [
    ["遠くからでも目立つ", "サンタ＆スノーマン付きのエアーアーチを入口に設置。開催中がひと目で伝わる。"],
    ["フォトスポットに", "アーチ前での記念撮影がSNS投稿のきっかけに。"],
    ["期間中レンタル", "4週の期間中は返却不要。終了後に着払いで返送。"],
  ];
  pts.forEach(([h, b], i) => {
    const y = 1.15 + i * 0.85;
    badge(s, 4.6, y, String(i + 1), C.accent1, "arch_badge_" + i, 0.42);
    s.addText(h, tx({ x: 5.15, y: y - 0.03, w: 4.35, h: 0.35, fontSize: 14, bold: true, color: C.text2 }));
    s.addText(b, tx({ x: 5.15, y: y + 0.32, w: 4.35, h: 0.5, fontSize: 12 }));
  });
}

// ---------- 9. 開催中ツール ----------
{
  const s = content("店頭演出", "ワークショップ開催中ツール（デザイン案）");
  const items = [
    ["tablecloth", "テーブルクロス", "赤地に雪の結晶とヒイラギ柄。ミニツリー・LEDライトと一緒に"],
    ["nobori", "のぼり", "薄い赤×雪の結晶。遠目でも開催がわかる縦型"],
    ["stand_sign", "スタンド看板", "ツリー型A型看板「ただいまワークショップ開催中」"],
  ];
  const X = [0.5, 3.6, 6.7], W = 2.8, H = 2.55;
  items.forEach(([img, h, b], i) => {
    const x = X[i];
    if (img === "nobori") {
      s.addImage({ path: G(img), x: x + 0.55, y: 1.05, w: 1.7, h: H, altText: "のぼりデザイン案", objectName: "img_" + img });
      // のぼり中央の白い余白に縦書き文字を重ねる
      [["クリスマス", 1.45], ["WS開催中", 1.22]].forEach(([t, dx]) =>
        s.addText(t.split("").join("\n"), tx({ x: x + dx, y: 1.45, w: 0.24, h: 1.1, fontSize: 10, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 0.85 })));
    } else {
      s.addImage({ path: G(img), x, y: 1.05, w: W, h: H, sizing: { type: "cover", w: W, h: H }, altText: h + "デザイン案", objectName: "img_" + img });
    }
    if (img === "stand_sign") {
      s.addText("ただいま\nWS\n開催中", tx({ x: x + 1.0, y: 1.8, w: 1.0, h: 0.85, fontSize: 11, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0 }));
    }
    s.addText(h, tx({ x, y: 3.7, w: W, h: 0.35, fontSize: 14, bold: true, color: C.text2 }));
    s.addText(b, tx({ x, y: 4.05, w: W, h: 0.55, fontSize: 11 }));
  });
  s.addText("その他：吊り下げPOP（雪の結晶）／作品ディスプレイ台／週替わり告知カード「来週はこれがつくれる！」　※画像はAI生成のイメージ",
    tx({ x: 0.5, y: 4.72, w: 9, h: 0.4, fontSize: 10, color: C.accent4 }));
}

// ---------- 10. コスプレ ----------
{
  const s = content("店頭演出", "コスプレ（全週で週替わり展開・Amazon調達）");
  const items = [
    ["cos_santa", "サンタ（男女）", "サンタ コスプレ 大人 セット", "2,000〜5,000円"],
    ["cos_reindeer", "トナカイ", "トナカイ 着ぐるみ 大人", "3,000〜6,000円"],
    ["cos_snowman", "雪だるま", "雪だるま 着ぐるみ 大人", "3,000〜6,000円"],
    ["cos_elf", "エルフ", "エルフ コスプレ 大人 クリスマス", "2,500〜5,000円"],
    ["cos_gingerbread", "ジンジャー\nブレッド", "ジンジャーブレッドマン 着ぐるみ", "4,000〜8,000円"],
    ["cos_tree", "ツリー", "クリスマスツリー ポンチョ 仮装", "2,000〜4,000円"],
  ];
  items.forEach(([img, h, kw, price], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05, y = 1.05 + row * 1.9;
    card(s, x, y, 2.85, 1.75, "cos_" + i);
    s.addImage({ path: G(img), x: x + 0.1, y: y + 0.1, w: 1.25, h: 1.55, sizing: { type: "cover", w: 1.25, h: 1.55 }, altText: h + "の衣装イメージ", objectName: "img_" + img });
    s.addText(h, tx({ x: x + 1.45, y: y + 0.12, w: 1.35, h: 0.5, fontSize: 13, bold: true, color: C.text2 }));
    s.addText([{ text: "検索語", options: { color: C.accent4, fontSize: 9, breakLine: true } }, { text: kw, options: { fontSize: 10, breakLine: true } },
      { text: price, options: { fontSize: 11, bold: true, color: C.accent1 } }], tx({ x: x + 1.45, y: y + 0.62, w: 1.35, h: 1.05 }));
  });
  s.addText("画像はAI生成のイメージ。価格は想定（税込・1着）で、Amazonの実商品・在庫は発注前に確認します。", tx({ x: 0.5, y: 4.85, w: 9, h: 0.3, fontSize: 10, color: C.accent4 }));
}

// ---------- 11. B0ボードPOP ----------
{
  const s = content("店頭演出", "B0ボードPOP　デザイン案");
  const ideas = [
    ["poster_a", "A", "スノードーム主役", false, [["あなただけの\nスノードームを\nつくろう", 0.1, 0.5, 13]]],
    ["poster_b", "B", "4週カレンダー型", true, [["毎週かわる！", 0.035, 0.17, 11]]],
    ["poster_c", "C", "キャラクター型", false, [["クリスマス\nワークショップ開催中", 0.1, 0.42, 13]]],
  ];
  ideas.forEach(([img, no, h, rec, texts], i) => {
    const x = 0.5 + i * 3.05, w = 2.15, ph = 3.2, px = x + 0.35;
    s.addImage({ path: G(img), x: px, y: 1.0, w, h: ph, altText: "B0ボードPOP " + no + "案", objectName: "img_" + img });
    texts.forEach(([t, ry, rh, fs]) =>
      s.addText(t, tx({ x: px + 0.1, y: 1.0 + ph * ry, w: w - 0.2, h: ph * rh * 0.6, fontSize: fs, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0 })));
    s.addText("11/28〜12/25　参加無料", tx({ x: px + 0.1, y: 1.0 + ph - 0.42, w: w - 0.2, h: 0.3, fontSize: 9, bold: true, color: C.background1, fill: { color: C.text2 }, align: "center", valign: "middle", margin: 0 }));
    s.addText(no + "案　" + h + (rec ? "（推奨）" : ""), tx({ x, y: 4.3, w: 2.85, h: 0.35, fontSize: 13, bold: true, color: rec ? C.accent1 : C.text2, align: "center" }));
  });
  s.addText("共通：開催日時・対象年齢・参加条件・店舗名記入欄（手書き可）　※背景はAI生成のイメージ", tx({ x: 0.5, y: 4.75, w: 9, h: 0.35, fontSize: 10, color: C.accent4 }));
}

// ---------- 12. 運用フロー ----------
sec("運用・お見積");
{
  const s = content("運用・お見積", "運用フロー・スケジュール");
  const steps = [
    ["ご発注", "10月下旬〜\n11月上旬"],
    ["制作・調達", "キット・ポスター\n衣装・ツール"],
    ["配送・検品", "11月下旬着\n検品確認書を返送"],
    ["店舗で実施", "11/28〜12/25\n4週間"],
    ["返却", "アーチを梱包\n着払い伝票で返送"],
  ];
  steps.forEach(([h, b], i) => {
    const x = 0.5 + i * 1.84;
    s.addShape(pres.shapes.CHEVRON, { x, y: 1.3, w: 1.75, h: 0.8, fill: { color: i === 3 ? C.text2 : C.accent1 }, line: { color: C.background1 }, objectName: "step_" + i });
    s.addText(h, tx({ x: x + 0.2, y: 1.3, w: 1.4, h: 0.8, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0 }));
    s.addText(b, tx({ x, y: 2.2, w: 1.75, h: 0.75, fontSize: 12, align: "center" }));
  });
  card(s, 0.5, 3.2, 9, 1.75, "ops_note");
  s.addText([
    { text: "店舗スタッフ様だけで運営できる体制", options: { bold: true, color: C.text2, fontSize: 15, breakLine: true } },
    { text: "運営スタッフの派遣はなし。キット・物品と運用マニュアル（準備・受付・制作手順・片付け）をお届けします。", options: { bullet: true, breakLine: true } },
    { text: "週替わりの内容に合わせ、キットは週ごとに仕分けして納品します。", options: { bullet: true, breakLine: true } },
    { text: "アーチの返却は箱・緩衝材を再利用し、同梱の着払い伝票で発送いただくだけです。", options: { bullet: true } },
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
  const H = (t, al) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, align: al || "center" } });
  const R = (cells) => cells.map((t, i) => ({ text: t, options: { align: [1, 6].includes(i) ? "left" : (i === 0 ? "center" : "right") } }));
  const rows = [
    [H("No"), H("御見積内容", "left"), H("数量"), H("日数"), H("単価"), H("金額"), H("摘要", "left")],
    R(["1", "スノードームキット（第1・4週）", "10", "1", "200,000", "2,000,000", "1地区300個/週×2週"]),
    R(["2", "スクイーズキット（第2・3週）", "10", "1", "200,000", "2,000,000", "1地区300個/週×2週"]),
    R(["3", "販促物一式（クリスマスアーチ・B0ボードPOP10枚・開催中ツール・コスプレ）", "10", "1", "80,000", "800,000", "アーチは期間中レンタル"]),
    R(["4", "管理運営費", "10", "1", "20,000", "200,000", ""]),
    R(["5", "配送料（10地区 往復）", "10", "1", "別途", "別途請求", "実費"]),
  ];
  s.addTable(rows, { x: 0.5, y: 2.0, w: 9.0, colW: [0.4, 3.5, 0.5, 0.5, 0.85, 1.05, 2.2], fontSize: 10, rowH: 0.32,
    valign: "middle", color: C.text1, border: { type: "solid", pt: 0.75, color: "E9B9C0" }, objectName: "quote_table" });
  const tot = [["小計", "5,000,000"], ["消費税（10%）", "500,000"], ["合計金額", "5,500,000"]];
  tot.forEach(([k, v], i) => {
    const y = 4.12 + i * 0.33, last = i === 2;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.1, y, w: 3.4, h: 0.31, fill: { color: last ? C.accent1 : C.background2 }, line: { color: last ? C.accent1 : C.background2 }, objectName: "tot_" + i });
    s.addText(k, tx({ x: 6.2, y, w: 1.5, h: 0.31, fontSize: 11, bold: last, color: last ? C.background1 : C.text1, valign: "middle", margin: 0 }));
    s.addText("￥" + v, tx({ x: 7.7, y, w: 1.7, h: 0.31, fontSize: 12, bold: true, color: last ? C.background1 : C.text1, align: "right", valign: "middle", margin: 0 }));
  });
  s.addText("※金額は税別表示。配送料は別途、実費にてご請求いたします。\n※運営スタッフの派遣は含みません。", tx({ x: 0.5, y: 4.15, w: 5.4, h: 0.9, fontSize: 10, color: C.text1 }));
}

// ---------- 14. 会社概要 ----------
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "運用・お見積" });
  s.addText("株式会社DreamCreation", { placeholder: "title" });
  s.addText("こどもが夢中になる体験を、企画から当日の準備物まで一社でお届けします。", { placeholder: "body" });
  s.addImage({ path: IMG.punilabPaw, x: 6.5, y: 1.0, w: 3.0, h: 3.0, rounding: true, altText: "肉球スクイーズ", objectName: "end_img" });
  s.addText("主な実績：ドコモショップ・量販店ドコモブース・大型商業施設でのイベント（全国対応）\nTEL 070-1319-2126　／　MAIL data@d-creation-o.com",
    tx({ x: 0.6, y: 4.1, w: 8.8, h: 0.8, fontSize: 13, color: C.text1 }));
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL_DIR + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("written:", OUT);
})();
