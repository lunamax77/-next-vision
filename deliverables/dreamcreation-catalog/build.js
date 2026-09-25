// DreamCreation 企業カタログ 2026 — 名刺配色(白地 × チャコール × 虹色ライン × 明朝)
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "DreamCreation 企業カタログ 2026";
pres.company = "株式会社DreamCreation";

const IMG = "site/dreamcreation/images/";
const C = { ink: "3C3C3C", sub: "6E6E6E", mute: "9A9A9A", line: "D9D9D9", tint: "F5F5F5", white: "FFFFFF" };
const SERIF = "Yu Mincho";
const SANS = "Yu Gothic";
const W = 13.333, H = 7.5, M = 0.7;

const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: SANS, color: C.ink, valign: "top", ...o });
const stripe = (s, x, y, w, h = 0.05) => s.addImage({ path: "stripe.png", x, y, w, h, sizing: { type: "crop", w, h } });

// 共通: 小見出し(英字) + 明朝タイトル + ページ番号
function header(s, en, ja, page) {
  T(s, en, { x: M, y: 0.55, w: 6, h: 0.3, fontSize: 11, color: C.mute, charSpacing: 4 });
  T(s, ja, { x: M, y: 0.85, w: 11, h: 0.7, fontSize: 28, fontFace: SERIF, bold: true });
  T(s, String(page).padStart(2, "0"), { x: W - M - 1, y: H - 0.55, w: 1, h: 0.25, fontSize: 10, color: C.mute, align: "right" });
  T(s, "DreamCreation", { x: M, y: H - 0.55, w: 3, h: 0.25, fontSize: 10, color: C.mute, bold: true });
}

// 01 表紙 ------------------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  T(s, "『ともに夢をつくる』", { x: 0, y: 1.35, w: W, h: 0.6, fontSize: 24, fontFace: SERIF, color: C.sub, align: "center", italic: true });
  s.addImage({ path: IMG + "logo.png", x: (W - 5.05) / 2, y: 2.2, w: 5.05, h: 2.5 });
  stripe(s, 1.6, 5.15, W - 3.2, 0.07);
  T(s, "COMPANY PROFILE 2026", { x: 0, y: 5.5, w: W, h: 0.4, fontSize: 14, color: C.sub, align: "center", charSpacing: 8 });
  T(s, "株式会社DreamCreation　企業カタログ", { x: 0, y: 5.95, w: W, h: 0.4, fontSize: 14, fontFace: SERIF, align: "center" });
}

// 02 企業理念 --------------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "PHILOSOPHY", "企業理念", 2);
  T(s, "Make customers happy\nand make society happy.", { x: M, y: 2.0, w: 7, h: 1.4, fontSize: 30, fontFace: SERIF, italic: true, color: C.ink });
  T(s, "お客様を幸せに、社会を幸せに。", { x: M, y: 3.45, w: 7, h: 0.5, fontSize: 18, fontFace: SERIF });
  T(s, "「顧客満足・社会貢献・人との出会い」をキーワードに、セールスプロモーション・イベント・人材の力で、あらゆる方向へ創造的な価値をつくります。", { x: M, y: 4.2, w: 6.6, h: 1.1, fontSize: 14, color: C.sub, lineSpacingMultiple: 1.4 });
  // 右: ミッション/スローガン
  s.addShape(pres.shapes.RECTANGLE, { x: 8.2, y: 2.0, w: 4.43, h: 4.4, fill: { color: C.tint }, line: { type: "none" } });
  const items = [["MISSION", "夢の実現力で、\n人々を幸せにする。"], ["VISION", "Create creative value\nall the vectors in."], ["SLOGAN", "grow & Fun!\n働くって、楽しい。勝負は早さ。"]];
  items.forEach(([k, v], i) => {
    T(s, k, { x: 8.55, y: 2.3 + i * 1.35, w: 3.8, h: 0.3, fontSize: 10, color: C.mute, charSpacing: 4, bold: true });
    T(s, v, { x: 8.55, y: 2.6 + i * 1.35, w: 3.8, h: 0.8, fontSize: 15, fontFace: SERIF });
  });
}

// 03 5つの価値観 ------------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "OUR VALUES", "5つの「楽しい」", 3);
  T(s, "私たちが大切にしている行動の基準です。", { x: M, y: 1.6, w: 10, h: 0.4, fontSize: 14, color: C.sub });
  const v = [
    ["No.1", "いちばんって楽しい", "やる以上は圧倒的No.1を目指し続けます。"],
    ["挑戦", "挑戦って楽しい", "失敗を恐れず、現状維持を疑い、高い壁に挑み続けます。"],
    ["逆算", "逆算って楽しい", "登る山を決め、今やるべきことを逆算で決めます。"],
    ["スピード", "大至急って楽しい", "1週間後の100%より、3日後の70%。"],
    ["執念", "諦めないって楽しい", "「どうやってできるか」を考え、とことんやり抜きます。"],
  ];
  const cw = (W - 2 * M - 4 * 0.25) / 5;
  v.forEach(([big, lead, body], i) => {
    const x = M + i * (cw + 0.25);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.4, w: cw, h: 3.9, fill: { color: C.white }, line: { color: C.line, width: 0.75 } });
    T(s, String(i + 1).padStart(2, "0"), { x: x + 0.25, y: 2.6, w: 1, h: 0.3, fontSize: 11, color: C.mute });
    T(s, big, { x: x + 0.25, y: 3.0, w: cw - 0.5, h: 0.7, fontSize: 26, fontFace: SERIF, bold: true });
    T(s, lead, { x: x + 0.25, y: 3.85, w: cw - 0.5, h: 0.35, fontSize: 12, color: C.sub, bold: true });
    T(s, body, { x: x + 0.25, y: 4.35, w: cw - 0.5, h: 1.7, fontSize: 12.5, lineSpacingMultiple: 1.35 });
  });
}

// 04 代表メッセージ ----------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  s.addImage({ path: IMG + "takemura.jpg", x: 0, y: 0, w: 5.0, h: H, sizing: { type: "cover", w: 5.0, h: H } });
  const X = 5.7, Wt = W - X - M;
  T(s, "MESSAGE", { x: X, y: 0.55, w: 5, h: 0.3, fontSize: 11, color: C.mute, charSpacing: 4 });
  T(s, "働くって、楽しい。\nその実感を、事業の力に変えていく。", { x: X, y: 0.95, w: Wt, h: 1.2, fontSize: 24, fontFace: SERIF, bold: true });
  T(s, [
    { text: "企業の使命は、どこまでいっても社会への貢献だと考えています。それはまず雇用を生み出すこと。そして、人々が幸せに暮らしていくための活動拠点であり続けることです。", options: { breakLine: true, paraSpaceAfter: 10 } },
    { text: "DreamCreationは2017年、大阪で生まれました。通信商材の販売促進から始まり、イベントの企画・運営、人材派遣へと事業を広げてきましたが、変わらないのは「一人ひとりの夢を、実現する力に変える」という原点です。", options: { breakLine: true, paraSpaceAfter: 10 } },
    { text: "スピードは価値。1週間後の100%より、3日後の70%。現場で結果を出し続けることでクライアントに頼りにされ、社員が夢をもってイキイキと働ける会社であり続けます。" },
  ], { x: X, y: 2.45, w: Wt, h: 3.4, fontSize: 13.5, color: C.sub, lineSpacingMultiple: 1.45 });
  T(s, "代表取締役", { x: X, y: 6.05, w: 3, h: 0.3, fontSize: 11, color: C.sub });
  T(s, "竹村 英哲", { x: X, y: 6.3, w: 3, h: 0.5, fontSize: 22, fontFace: SERIF, charSpacing: 4 });
  T(s, "Hideaki Takemura", { x: X + 2.4, y: 6.47, w: 3, h: 0.3, fontSize: 10, color: C.mute, charSpacing: 3 });
}

// 05 事業内容 --------------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "BUSINESS", "事業内容", 5);
  T(s, "現場の力で、売れる仕組みをつくる。4つの事業でクライアントの課題に応えます。", { x: M, y: 1.6, w: 11.5, h: 0.4, fontSize: 14, color: C.sub });
  const b = [
    ["svc-sales.jpg", "Sales Promotion", "セールスプロモーション", "家電量販店・携帯ショップでの推奨販売・販売応援、キャンペーン事務局運営、サンプリング。"],
    ["svc-event.jpg", "Event", "イベントプロモーション", "体験型・参加型の集客イベントからセミナー・式典まで。企画から運営・備品・キャスティングまでワンストップ。"],
    ["svc-agency.jpg", "Agency", "代理店事業", "通信・キャッシュレス決済・省エネ商材などを法人・個人向けに販売。アウトバウンド営業にも対応。"],
    ["svc-staffing.jpg", "Staffing", "人材派遣・育成", "販売・イベント運営に強い人材を派遣。スマホ教室・研修で、現場で成果を出せる人材を育成。"],
  ];
  const cw = (W - 2 * M - 3 * 0.3) / 4;
  b.forEach(([img, en, ja, body], i) => {
    const x = M + i * (cw + 0.3);
    s.addImage({ path: IMG + img, x, y: 2.25, w: cw, h: 1.85, sizing: { type: "cover", w: cw, h: 1.85 } });
    T(s, en, { x, y: 4.3, w: cw, h: 0.3, fontSize: 10, color: C.mute, charSpacing: 3 });
    T(s, ja, { x, y: 4.6, w: cw, h: 0.45, fontSize: 17, fontFace: SERIF, bold: true });
    T(s, body, { x, y: 5.15, w: cw, h: 1.5, fontSize: 12, color: C.sub, lineSpacingMultiple: 1.35 });
  });
}

// 06 キッズイベント商品 ------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "EVENT LINEUP 2026", "ファミリー集客イベント", 6);
  T(s, "週末の集客を「着座時間」に変える体験型コンテンツ。設営から運営まで完全代行で、店舗スタッフ様は商談に専念いただけます。", { x: M, y: 1.6, w: 11.8, h: 0.4, fontSize: 13.5, color: C.sub });
  // 主力: KLP
  s.addImage({ path: "klp-event1.jpg", x: M, y: 2.3, w: 5.4, h: 2.9, sizing: { type: "cover", w: 5.4, h: 2.9 } });
  T(s, "PRODUCT 01", { x: M, y: 5.4, w: 3, h: 0.25, fontSize: 10, color: C.mute, charSpacing: 3 });
  T(s, "キッズライセンスパーク", { x: M, y: 5.65, w: 5.4, h: 0.45, fontSize: 19, fontFace: SERIF, bold: true });
  T(s, "EVカー運転体験＋顔写真入り「こども免許証」即時発行。滞在時間 +30分／対象3〜8歳／1組約8〜12分", { x: M, y: 6.1, w: 5.4, h: 0.6, fontSize: 11.5, color: C.sub });
  // 料金
  const px = 6.5, pw = W - px - M;
  const rows = [
    ["キッズライセンスパーク　スタンダード", "車両1台／1コース", "¥80,000／日"],
    ["キッズライセンスパーク　プレミアム", "車両3台／フルセット", "¥125,000／日"],
    ["スクイーズ ワークショップ", "約20分／組", "¥70,000／日"],
    ["エア遊具（エアリズム ほか）", "月額レンタル可", "¥50,000〜／日"],
    ["ゲーム筐体（カーニバル・電撃チャレンジ）", "月額レンタル可", "¥50,000〜／日"],
  ];
  T(s, "PRICE", { x: px, y: 2.3, w: 3, h: 0.25, fontSize: 10, color: C.mute, charSpacing: 3, bold: true });
  rows.forEach(([n, d, p], i) => {
    const y = 2.7 + i * 0.62;
    s.addShape(pres.shapes.LINE, { x: px, y: y + 0.56, w: pw, h: 0, line: { color: C.line, width: 0.75 } });
    T(s, n, { x: px, y, w: 3.9, h: 0.3, fontSize: 13, bold: true });
    T(s, d, { x: px, y: y + 0.28, w: 3.9, h: 0.25, fontSize: 10.5, color: C.mute });
    T(s, p, { x: px + 3.9, y: y + 0.05, w: pw - 3.9, h: 0.4, fontSize: 16, fontFace: SERIF, bold: true, align: "right" });
  });
  T(s, "※表示価格は税別。送料・配送費は別途。在庫状況により同等スペックの別機種をご用意する場合がございます。", { x: px, y: 6.45, w: pw, h: 0.4, fontSize: 9, color: C.mute });
  // 小写真
  ["squeeze.jpg", "airizm.jpg", "carnival-a.jpg"].forEach((f, i) => {
    const w = (pw - 0.3) / 3;
    s.addImage({ path: f, x: px + i * (w + 0.15), y: 5.85, w, h: 0.5, sizing: { type: "cover", w, h: 0.5 } });
  });
}

// 07 取引先・対応エリア ------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "CLIENTS & AREA", "主要取引先・対応エリア", 7);
  const cl = ["NTTドコモ", "ドコモCS", "NTTマーケティングアクトProCX", "ソフトバンク", "電通", "博報堂", "日本テレビ", "WeWork"];
  T(s, "主要取引先", { x: M, y: 1.85, w: 5, h: 0.35, fontSize: 15, fontFace: SERIF, bold: true });
  cl.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 2.95, y = 2.4 + row * 0.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.75, h: 0.68, fill: { color: C.tint }, line: { type: "none" } });
    T(s, c, { x: x + 0.1, y, w: 2.55, h: 0.68, fontSize: c.length > 12 ? 10.5 : 13, bold: true, align: "center", valign: "middle" });
  });
  T(s, "順不同・敬称略", { x: M, y: 5.85, w: 3, h: 0.25, fontSize: 9.5, color: C.mute });
  // エリア
  const ax = 7.3;
  T(s, "対応エリア", { x: ax, y: 1.85, w: 5, h: 0.35, fontSize: 15, fontFace: SERIF, bold: true });
  T(s, [{ text: "45", options: { fontSize: 88, fontFace: SERIF, bold: true } }, { text: " 都府県", options: { fontSize: 22, fontFace: SERIF } }], { x: ax, y: 2.3, w: 5.3, h: 1.5, valign: "middle" });
  T(s, "大阪から、全国へ。", { x: ax, y: 3.9, w: 5.3, h: 0.45, fontSize: 18, fontFace: SERIF });
  T(s, "本社は大阪・南堀江。名古屋・九州・沖縄の営業所とともに、全国の家電量販店・携帯ショップ・商業施設での販売促進やイベント運営に対応しています（北海道・広島県を除く）。", { x: ax, y: 4.45, w: 5.3, h: 1.5, fontSize: 12.5, color: C.sub, lineSpacingMultiple: 1.4 });
}

// 08 沿革 ------------------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "HISTORY", "沿革", 8);
  const h = [
    ["2017.06", "株式会社DreamCreation 設立\n名古屋営業所・九州営業所 開設"],
    ["2019.07", "日本テレビHRと業務提携"],
    ["2019.08", "本社を難波 Namba Sky-O に移転"],
    ["2019.11", "沖縄営業所 開設"],
    ["2021.05", "資本金を1,200万円に増資"],
    ["2022.03", "労働者派遣事業を開始"],
    ["現在", "本社を大阪市西区南堀江に移転"],
  ];
  const y0 = 3.4, x0 = M, span = W - 2 * M;
  stripe(s, x0, y0, span, 0.05);
  const step = span / h.length;
  h.forEach(([d, t], i) => {
    const x = x0 + i * step;
    s.addShape(pres.shapes.OVAL, { x: x + 0.02, y: y0 - 0.075, w: 0.2, h: 0.2, fill: { color: C.ink }, line: { color: C.white, width: 1.5 } });
    T(s, d, { x, y: y0 - 0.85, w: step - 0.1, h: 0.5, fontSize: 18, fontFace: SERIF, bold: true });
    T(s, t, { x, y: y0 + 0.35, w: step - 0.15, h: 1.6, fontSize: 11.5, color: C.sub, lineSpacingMultiple: 1.35 });
  });
}

// 09 会社概要・許認可 --------------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  header(s, "CORPORATE DATA", "会社概要", 9);
  const d = [
    ["社名", "株式会社DreamCreation"],
    ["所在地", "〒550-0015 大阪府大阪市西区南堀江1-10-1 KT堀江801号室"],
    ["代表者", "代表取締役　竹村 英哲"],
    ["設立", "2017年6月27日"],
    ["資本金", "1,200万円"],
    ["事業内容", "セールスプロモーション／イベントの企画・運営／代理店事業／労働者派遣事業"],
    ["TEL", "06-4967-1038"],
    ["MAIL", "data@d-creation-o.com"],
  ];
  d.forEach(([k, v], i) => {
    const y = 1.9 + i * 0.58;
    T(s, k, { x: M, y, w: 1.4, h: 0.4, fontSize: 12, color: C.mute, bold: true, valign: "middle" });
    T(s, v, { x: M + 1.5, y, w: 5.6, h: 0.44, fontSize: v.length > 30 ? 11.5 : 12.5, valign: "middle" });
    s.addShape(pres.shapes.LINE, { x: M, y: y + 0.48, w: 7.1, h: 0, line: { color: C.line, width: 0.75 } });
  });
  const lx = 8.5, lw = W - lx - M;
  T(s, "許認可・認証", { x: lx, y: 1.9, w: lw, h: 0.35, fontSize: 15, fontFace: SERIF, bold: true });
  const L = [["プライバシーマーク", "登録番号　17004884"], ["労働者派遣事業許可", "許可番号　派27-304911"], ["適格請求書発行事業者", "登録番号　T5120001206752"], ["パートナーシップ構築宣言", "サプライチェーン全体の共存共栄を宣言"]];
  L.forEach(([k, v], i) => {
    const y = 2.4 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: lx, y, w: lw, h: 0.8, fill: { color: C.tint }, line: { type: "none" } });
    T(s, k, { x: lx + 0.2, y: y + 0.12, w: lw - 0.4, h: 0.3, fontSize: 12.5, bold: true });
    T(s, v, { x: lx + 0.2, y: y + 0.44, w: lw - 0.4, h: 0.28, fontSize: 10.5, color: C.sub });
  });
}

// 10 裏表紙(名刺の裏面イメージ) ------------------------------------------------
{
  const s = pres.addSlide(); s.background = { color: C.white };
  s.addImage({ path: IMG + "logo.png", x: M + 0.2, y: 1.9, w: 3.6, h: 1.78 });
  ["◎ セールスプロモーション", "◎ イベントプロモーション", "◎ 代理店事業", "◎ 人材派遣・育成"].forEach((t, i) =>
    T(s, t, { x: M + 0.35, y: 4.15 + i * 0.45, w: 4, h: 0.4, fontSize: 14, color: C.sub, italic: true }));
  const cx = 6.4;
  T(s, "CONTACT", { x: cx, y: 1.9, w: 5, h: 0.3, fontSize: 11, color: C.mute, charSpacing: 4 });
  T(s, "お気軽にご相談ください。", { x: cx, y: 2.25, w: 6, h: 0.6, fontSize: 24, fontFace: SERIF, bold: true });
  const c = [["TEL", "06-4967-1038（10:00〜18:00／土日祝除く）"], ["MAIL", "data@d-creation-o.com"], ["WEB", "https://d-creation-o.com"], ["ADDRESS", "〒550-0015 大阪府大阪市西区南堀江1-10-1\nKT堀江801号室"]];
  c.forEach(([k, v], i) => {
    const y = 3.2 + i * 0.62;
    T(s, k, { x: cx, y, w: 1.3, h: 0.3, fontSize: 10.5, color: C.mute, bold: true, charSpacing: 2 });
    T(s, v, { x: cx + 1.3, y: y - 0.03, w: 5.2, h: 0.6, fontSize: 13.5 });
  });
  stripe(s, M, 6.25, W - 2 * M, 0.07);
  T(s, "株式会社DreamCreation　『ともに夢をつくる』", { x: M, y: 6.5, w: 8, h: 0.35, fontSize: 12, fontFace: SERIF });
  T(s, "© 2026 DreamCreation Inc.", { x: W - M - 4, y: 6.5, w: 4, h: 0.35, fontSize: 10, color: C.mute, align: "right" });
}

pres.writeFile({ fileName: "DreamCreation_企業カタログ_2026.pptx" }).then(f => console.log("wrote", f));
