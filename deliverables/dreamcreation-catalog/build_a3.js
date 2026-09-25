// DreamCreation 企業カタログ 2026 — A3 横・裏表 2面
// 名刺の配色(白地 × チャコール × 虹色ライン × 明朝)を踏襲
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.defineLayout({ name: "A3L", width: 16.54, height: 11.69 });
pres.layout = "A3L";
pres.title = "DreamCreation 企業カタログ 2026 (A3)";
pres.company = "株式会社DreamCreation";

const IMG = "site/dreamcreation/images/";
const C = { ink: "3C3C3C", sub: "666666", mute: "999999", line: "DADADA", tint: "F4F4F4", white: "FFFFFF" };
const SERIF = "Yu Mincho", SANS = "Yu Gothic";
const W = 16.54, H = 11.69, M = 0.55;

const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: SANS, color: C.ink, valign: "top", ...o });
const stripe = (s, x, y, w, h = 0.05) => s.addImage({ path: "stripe.png", x, y, w, h, sizing: { type: "crop", w, h } });
const photo = (s, path, x, y, w, h) => s.addImage({ path, x, y, w, h, sizing: { type: "cover", w, h } });
const box = (s, x, y, w, h, fill = C.tint) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" } });
const rule = (s, x, y, w) => s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: C.line, width: 0.75 } });
// セクション見出し: 英字ラベル + 明朝見出し
function sec(s, x, y, en, ja, w = 6) {
  T(s, en, { x, y, w, h: 0.22, fontSize: 9, color: C.mute, charSpacing: 4, bold: true });
  T(s, ja, { x, y: y + 0.24, w, h: 0.42, fontSize: 18, fontFace: SERIF, bold: true });
}
function footer(s, side) {
  stripe(s, M, H - 0.62, W - 2 * M, 0.04);
  T(s, "株式会社DreamCreation　『ともに夢をつくる』", { x: M, y: H - 0.48, w: 8, h: 0.25, fontSize: 9, fontFace: SERIF, color: C.sub });
  T(s, side, { x: W - M - 4, y: H - 0.48, w: 4, h: 0.25, fontSize: 9, color: C.mute, align: "right", charSpacing: 3 });
}

// =====================================================================
// 表面 — 会社・理念・事業・強み
// =====================================================================
{
  const s = pres.addSlide(); s.background = { color: C.white };
  // ---- 左カラム: 名刺トーンの表紙ブロック ----
  const LX = M, LW = 5.0;
  T(s, "『ともに夢をつくる』", { x: LX, y: 0.6, w: LW, h: 0.45, fontSize: 18, fontFace: SERIF, color: C.sub, italic: true, align: "center" });
  s.addImage({ path: IMG + "logo.png", x: LX + (LW - 3.9) / 2, y: 1.15, w: 3.9, h: 1.93 });
  stripe(s, LX, 3.25, LW, 0.06);
  T(s, "COMPANY PROFILE 2026", { x: LX, y: 3.45, w: LW, h: 0.3, fontSize: 11, color: C.sub, align: "center", charSpacing: 6 });

  sec(s, LX, 4.1, "PHILOSOPHY", "企業理念", LW);
  T(s, "Make customers happy\nand make society happy.", { x: LX, y: 4.85, w: LW, h: 0.9, fontSize: 19, fontFace: SERIF, italic: true });
  T(s, "お客様を幸せに、社会を幸せに。", { x: LX, y: 5.8, w: LW, h: 0.35, fontSize: 13, fontFace: SERIF, bold: true });
  T(s, "「顧客満足・社会貢献・人との出会い」をキーワードに、セールスプロモーション・イベント・人材の力で、あらゆる方向へ創造的な価値をつくります。社内スローガンは「grow & Fun!」。", { x: LX, y: 6.25, w: LW, h: 1.0, fontSize: 10, color: C.sub, lineSpacingMultiple: 1.4 });

  sec(s, LX, 7.45, "MESSAGE", "代表メッセージ", LW);
  photo(s, IMG + "takemura.jpg", LX, 8.2, 1.75, 2.35);
  T(s, "企業の使命は、どこまでいっても社会への貢献。まずは雇用を生み出し、人々が幸せに暮らすための活動拠点であり続けること。通信商材の販売促進から始まり、イベント・人材へと広げてきた今も、「一人ひとりの夢を、実現する力に変える」原点は変わりません。1週間後の100%より、3日後の70%。現場で結果を出し続けます。",
    { x: LX + 1.95, y: 8.2, w: LW - 1.95, h: 1.85, fontSize: 9.5, color: C.sub, lineSpacingMultiple: 1.35 });
  T(s, [{ text: "代表取締役　", options: { fontSize: 9, color: C.sub } }, { text: "竹村 英哲", options: { fontSize: 15, fontFace: SERIF } }], { x: LX + 1.95, y: 10.15, w: LW - 1.95, h: 0.4, valign: "bottom" });

  // ---- 右エリア ----
  const RX = 6.05, RW = W - RX - M;
  // 事業内容
  sec(s, RX, 0.6, "BUSINESS", "4つの事業で、売れる仕組みをつくる。", RW);
  const biz = [
    ["svc-sales.jpg", "Sales Promotion", "セールスプロモーション", "家電量販店・携帯ショップ・商業施設での推奨販売、特販部隊、キャンペーン事務局運営、サンプリング。"],
    ["svc-event.jpg", "Event", "イベントプロモーション", "エアー遊具・ワークショップ・縁日などのファミリー集客イベントを、企画から当日運営までワンストップで。"],
    ["svc-agency.jpg", "Agency", "代理店・営業代行", "通信・光回線・キャッシュレス決済・省エネ商材の販売、加盟店開拓、KPI設計から改善までの営業代行。"],
    ["svc-staffing.jpg", "Staffing & Training", "人材派遣・研修", "販売・イベントに強い人材の派遣(派27-304911)。臨店研修・講師派遣・日テレHR研修で現場力を育成。"],
  ];
  const bw = (RW - 3 * 0.25) / 4;
  biz.forEach(([img, en, ja, body], i) => {
    const x = RX + i * (bw + 0.25);
    photo(s, IMG + img, x, 1.4, bw, 1.4);
    T(s, en, { x, y: 2.92, w: bw, h: 0.2, fontSize: 8, color: C.mute, charSpacing: 2 });
    T(s, ja, { x, y: 3.12, w: bw, h: 0.34, fontSize: 13, fontFace: SERIF, bold: true });
    T(s, body, { x, y: 3.5, w: bw, h: 0.95, fontSize: 9, color: C.sub, lineSpacingMultiple: 1.3 });
  });

  // 数字で見る
  sec(s, RX, 4.65, "BY THE NUMBERS", "数字で見るDreamCreation", RW);
  const stats = [
    ["2017", "年", "大阪で創業。\n通信販促の現場から出発"],
    ["45", "都府県", "北海道・広島を除く\n全国で対応"],
    ["192", "名", "派遣スタッフ稼働\n(2022年10月 最大時)"],
    ["6", "キャリア", "ドコモ・SB・KDDI・楽天\n・光コラボ・イオンモバイル"],
    ["37", "社", "パートナー企業との\n連携ネットワーク"],
  ];
  const sw = (RW - 4 * 0.2) / 5;
  stats.forEach(([n, u, d], i) => {
    const x = RX + i * (sw + 0.2);
    box(s, x, 5.4, sw, 1.55);
    T(s, [{ text: n, options: { fontSize: 32, fontFace: SERIF, bold: true } }, { text: " " + u, options: { fontSize: 11, fontFace: SERIF } }], { x: x + 0.2, y: 5.5, w: sw - 0.3, h: 0.65, valign: "bottom" });
    T(s, d, { x: x + 0.2, y: 6.25, w: sw - 0.3, h: 0.6, fontSize: 8.5, color: C.sub, lineSpacingMultiple: 1.25 });
  });

  // 強み + 5つの楽しい (2カラム)
  const hw = (RW - 0.4) / 2;
  sec(s, RX, 7.2, "STRENGTHS", "選ばれる理由", hw);
  const st = [
    ["現場力", "キャッチに頼らず「視認→立寄→参加→会話→商談」をKPI管理。2時間単位で打ち手を切り替える運営。"],
    ["事前入店", "開催前に店舗へ入り関係構築と見込み獲得。実施週の平均PI達成率115%(未実施週70%)。"],
    ["研修・品質", "日テレHR研修を四半期ごと、社内テストを毎月。全体インシデント防止会議を月次で実施。"],
    ["見える化", "LINE WORKSでGPS勤怠・既読・KPIを一元管理。スタッフとは月1回の面談。"],
  ];
  st.forEach(([k, v], i) => {
    const y = 7.95 + i * 0.66;
    T(s, k, { x: RX, y, w: 1.25, h: 0.5, fontSize: 11, fontFace: SERIF, bold: true });
    T(s, v, { x: RX + 1.3, y, w: hw - 1.3, h: 0.6, fontSize: 9, color: C.sub, lineSpacingMultiple: 1.25 });
    if (i < st.length - 1) rule(s, RX, y + 0.6, hw);
  });

  const VX = RX + hw + 0.4;
  sec(s, VX, 7.2, "OUR VALUES", "5つの「楽しい」", hw);
  const vals = [["No.1", "いちばんって楽しい", "やる以上は圧倒的No.1を目指す"], ["挑戦", "挑戦って楽しい", "現状維持を疑い、高い壁に挑む"], ["逆算", "逆算って楽しい", "登る山を決め、今やることを決める"], ["スピード", "大至急って楽しい", "1週間後の100%より3日後の70%"], ["執念", "諦めないって楽しい", "「どうやってできるか」を考え抜く"]];
  vals.forEach(([big, lead, body], i) => {
    const y = 7.95 + i * 0.53;
    T(s, big, { x: VX, y, w: 1.25, h: 0.45, fontSize: 14, fontFace: SERIF, bold: true, valign: "middle" });
    T(s, lead, { x: VX + 1.3, y, w: 1.8, h: 0.45, fontSize: 9, color: C.mute, bold: true, valign: "middle" });
    T(s, body, { x: VX + 3.1, y, w: hw - 3.1, h: 0.45, fontSize: 9.5, valign: "middle" });
    if (i < vals.length - 1) rule(s, VX, y + 0.49, hw);
  });

  footer(s, "FRONT  01 / 02");
}

// =====================================================================
// 裏面 — 実績・コンテンツ・会社概要
// =====================================================================
{
  const s = pres.addSlide(); s.background = { color: C.white };
  sec(s, M, 0.5, "TRACK RECORD", "これまでの取り組みと実績", 10);

  // ハイライト 4枚
  const hl = [
    ["113.6%", "PI目標達成率", "ドコモ関西支社様・上新電機様販路\nモール型大型店に10名常勤(2022)"],
    ["184組", "イベント参加", "滋賀県 商業施設のファミリーイベント\nPI 34件・前回比 約3倍(2025)"],
    ["3位", "全82部隊中", "量販店特販イベントの取替件数\n(2026年7月 ドコモCS関西様)"],
    ["51台", "端末総販", "沖縄・与那国島 出張イベント2日間\n前年他社実施の約1.8倍(2020)"],
  ];
  const hw4 = (W - 2 * M - 3 * 0.25) / 4;
  hl.forEach(([n, l, d], i) => {
    const x = M + i * (hw4 + 0.25);
    box(s, x, 1.3, hw4, 1.45);
    T(s, n, { x: x + 0.25, y: 1.4, w: 2.3, h: 0.7, fontSize: 30, fontFace: SERIF, bold: true, valign: "bottom" });
    T(s, l, { x: x + 2.4, y: 1.72, w: hw4 - 2.55, h: 0.35, fontSize: 10, color: C.sub, bold: true, valign: "bottom" });
    T(s, d, { x: x + 0.25, y: 2.17, w: hw4 - 0.4, h: 0.5, fontSize: 8.5, color: C.sub, lineSpacingMultiple: 1.2 });
  });

  // 実績年表
  const TX = M, TW = 10.0;
  const rows = [
    ["2015–17", "ドコモショップ 光販売支援", "複数代理店様のショップでドコモ光の販売を支援(2015.4〜2017.8)"],
    ["2016", "ドコモ光 臨店研修", "NTTラーニング様と共同制作。中国支社管内の対象店舗で研修前後 8.1%→25.0%に向上"],
    ["2016–17", "イオンモール ドコモ光イベント", "関西支社様向けにNTTマーケティングアクト様と共同で企画・運営"],
    ["2019–", "家電量販店 光販売支援", "ドコモ(エディオン・上新)、ソフトバンク(ヤマダ・上新)で継続支援"],
    ["2020", "九州 キッチンカーイベント", "27開催・54日間で着座925組(着座率50.1%)、来店予約50組"],
    ["2020", "キャッシュレス加盟店開拓", "d払い・PayPay等。関西で月平均200件、九州は1名あたり30件"],
    ["2020–", "ドコモCS九州 PI出張イベント", "10名体制で九州・沖縄のショップ出張イベントを運営"],
    ["2022", "モール型大型店 常勤支援", "上新電機様販路でPI 477件(目標420件・達成率113.6%)"],
    ["2025", "滋賀 商業施設イベント", "エアー遊具＋ワークショップで参加184組、PI 34件、コンテンツ起点成約7倍"],
    ["2025", "上新電機 イオンモール店", "イベント部隊でPI 33件(目標30件・110%)"],
    ["2026", "特販「Dreamチーム」", "量販店7週でPI累計152件、最高達成率135%。取替は関西79社中23位"],
  ];
  const ry = 3.0, rh = 0.34;
  T(s, "年", { x: TX, y: ry, w: 0.9, h: 0.25, fontSize: 8.5, color: C.mute, bold: true });
  T(s, "取り組み", { x: TX + 0.95, y: ry, w: 3, h: 0.25, fontSize: 8.5, color: C.mute, bold: true });
  T(s, "内容・成果", { x: TX + 3.75, y: ry, w: 5, h: 0.25, fontSize: 8.5, color: C.mute, bold: true });
  rows.forEach(([y0, t, d], i) => {
    const y = ry + 0.3 + i * rh;
    rule(s, TX, y, TW);
    T(s, y0, { x: TX, y: y + 0.05, w: 0.9, h: 0.26, fontSize: 9.5, fontFace: SERIF, bold: true });
    T(s, t, { x: TX + 0.95, y: y + 0.05, w: 2.75, h: 0.26, fontSize: 9.5, bold: true });
    T(s, d, { x: TX + 3.75, y: y + 0.05, w: TW - 3.75, h: 0.26, fontSize: 9, color: C.sub });
  });
  rule(s, TX, ry + 0.3 + rows.length * rh, TW);

  // 右: 主要取引先 + 対応領域
  const PX = TX + TW + 0.45, PW = W - PX - M;
  T(s, "主要取引先", { x: PX, y: ry, w: PW, h: 0.3, fontSize: 13, fontFace: SERIF, bold: true });
  const cl = ["NTTドコモ", "ドコモCS", "NTT西日本", "NTTラーニング", "NTTマーケティングアクトProCX", "ソフトバンク", "電通", "博報堂", "日本テレビ", "上新電機", "大日本印刷", "大阪ガス"];
  const cw2 = (PW - 0.15) / 2;
  cl.forEach((c, i) => {
    const x = PX + (i % 2) * (cw2 + 0.15), y = ry + 0.42 + Math.floor(i / 2) * 0.42;
    box(s, x, y, cw2, 0.34);
    T(s, c, { x: x + 0.05, y, w: cw2 - 0.1, h: 0.34, fontSize: c.length > 12 ? 7.5 : 9, bold: true, align: "center", valign: "middle" });
  });
  T(s, "順不同・敬称略", { x: PX, y: ry + 0.42 + 6 * 0.42, w: 3, h: 0.2, fontSize: 7.5, color: C.mute });
  T(s, "日本テレビ公式研修代理店(西日本)として、ドラマ映像を使った体験型研修「日テレHR研修」をご提供しています。", { x: PX, y: ry + 3.1, w: PW, h: 0.6, fontSize: 9, color: C.sub, lineSpacingMultiple: 1.3 });

  // 下段: イベントコンテンツ
  const BY = 8.0;
  sec(s, M, 7.3, "EVENT CONTENTS", "ファミリー集客コンテンツ", TW);
  const prods = [
    ["klp-event2.jpg", "キッズライセンスパーク", "EV運転体験＋こども免許証", "¥80,000〜/日"],
    ["squeeze-event.jpg", "スクイーズWS", "親子で作る動物スクイーズ", "¥70,000/日"],
    ["airizm.jpg", "エアリズム", "風船が舞う屋内ドーム", "¥50,000〜/日"],
    ["carnival-a.jpg", "カーニバルA/B", "輪投げ等のエアーゲーム", "¥50,000〜/日"],
    ["unicorn.jpg", "ユニコーンT", "アイキャッチ用エアー遊具", "¥20,000/日"],
  ];
  const pw5 = (TW - 4 * 0.2) / 5;
  prods.forEach(([img, n, d, p], i) => {
    const x = M + i * (pw5 + 0.2);
    photo(s, img, x, BY + 0.05, pw5, 1.2);
    T(s, n, { x, y: BY + 1.4, w: pw5, h: 0.3, fontSize: 10.5, bold: true });
    T(s, d, { x, y: BY + 1.7, w: pw5, h: 0.25, fontSize: 8, color: C.sub });
    T(s, p, { x, y: BY + 1.97, w: pw5, h: 0.3, fontSize: 11, fontFace: SERIF, bold: true });
  });
  T(s, "※税別・送料別途。縁日セット・ふにふにシール・抽選会・POP制作なども対応。最短3営業日で納品、開催2〜3週間前までにご相談ください。", { x: M, y: BY + 2.35, w: TW, h: 0.3, fontSize: 8, color: C.mute });

  // 下段右: 会社概要・連絡先
  sec(s, PX, 7.3, "CORPORATE DATA", "会社概要", PW);
  const d = [
    ["社名", "株式会社DreamCreation"],
    ["所在地", "〒550-0015 大阪府大阪市西区南堀江1-10-1\nKT堀江801号室"],
    ["設立", "2017年6月27日　　資本金 1,200万円"],
    ["代表", "代表取締役　竹村 英哲"],
    ["許認可", "労働者派遣事業 派27-304911\nプライバシーマーク 17004884"],
    ["連絡先", "TEL 06-4967-1038\ndata@d-creation-o.com"],
  ];
  let y = BY + 0.05;
  d.forEach(([k, v]) => {
    const lines = v.split("\n").length, h = 0.06 + lines * 0.19;
    T(s, k, { x: PX, y, w: 0.9, h, fontSize: 8.5, color: C.mute, bold: true });
    T(s, v, { x: PX + 0.95, y, w: PW - 0.95, h, fontSize: 9 });
    y += h + 0.12;
  });

  footer(s, "BACK  02 / 02");
}

pres.writeFile({ fileName: "DreamCreation_企業カタログ_2026_A3.pptx" }).then(f => console.log("wrote", f));
