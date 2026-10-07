/**
 * 内定通知書 自動発行システム（Google Apps Script）
 *
 * Googleフォームの回答 → 内定通知書＋内定承諾書をPDF化（印影入り）
 * → Googleドライブに保存 → 送付先（RECIPIENT）へGmailで送付 → 管理簿に記録
 *
 * セットアップ手順は README.md を参照。最初に setup() を1回だけ実行する。
 */

// ===================== 設定 =====================

const CONFIG = {
  // 内定通知書PDFの送付先（全件ここに届く）
  RECIPIENT: 'info@xpr0615.com',

  // PDFの保存先フォルダ名（マイドライブ直下に自動作成）
  PDF_FOLDER_NAME: '内定通知書_発行済みPDF',

  // 管理簿シート名
  LEDGER_SHEET: '管理簿',
};

// フォームの「会社」選択肢 → 会社情報
const COMPANIES = {
  '株式会社DreamCreation': {
    code: 'DC',
    name: '株式会社DreamCreation',
    representative: '代表取締役　竹村英哲',
    postal: '〒550-0015',
    address: '大阪府大阪市西区南堀江1-10-1 KT堀江801',
    tel: '06-4967-1038',
    mail: 'data@d-creation-o.com',
    contactPerson: '浦田',
    stampFileId: '1xRu-HKneoc7MhQExhx9KDk7zfctBL2I7', // ドリクリ印鑑.png
  },
  '株式会社NextVision': {
    code: 'NV',
    name: '株式会社NextVision',
    representative: '代表取締役　竹本友哉',
    postal: '〒550-0014',
    address: '大阪府大阪市西区北堀江1丁目23番25号 シティタワー堀江2501号室',
    tel: '06-4967-1038',
    mail: 'data@nextvision.fun',
    contactPerson: '浦田',
    stampFileId: '1Y-HXtSm84qQnrzOAmGeMRQvDNK5qn8Ms', // Next丸印鑑_透過.png
  },
};

// フォームの質問タイトル（setup() でこの通りに作成される）
const Q = {
  company: '発行会社',
  name: '氏名',
  joinDate: '入社予定日',
  employment: '雇用形態',
  probation: '試用期間（か月）',
  department: '配属先',
  job: '職種・業務内容',
  location: '勤務地（選択）',
  salary: '給与',
};

// 勤務地の選択肢：先頭を選ぶと発行会社の所在地が自動で入る。「その他」で自由入力
const LOCATION_AUTO = '発行会社の所在地（自動）';
const LOCATION_HELP = '「発行会社の所在地（自動）」を選ぶと、選んだ会社の住所が入ります。別の場所は「その他」に入力';

function addLocationItem(form) {
  const choices = [LOCATION_AUTO].concat(
    Object.values(COMPANIES).map(c => c.address).filter((v, i, a) => a.indexOf(v) === i));
  return form.addMultipleChoiceItem().setTitle(Q.location).setHelpText(LOCATION_HELP)
    .setChoiceValues(choices).showOtherOption(true).setRequired(true);
}

const LEDGER_HEADERS = [
  '発行番号', '発行日時', '発行会社', '氏名', '送付先', '入社予定日',
  '雇用形態', '配属先', '職種', '勤務地', '給与', 'PDF', '送信状況', '備考',
];

// ===================== セットアップ =====================

/** 初回に1回だけ実行：フォーム作成・管理簿作成・トリガー登録 */
function setup() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.create('内定通知書 管理簿'); // スプレッドシート外から実行した場合は新規作成
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // 1. フォーム作成＆このスプレッドシートに回答を連携
  const form = FormApp.create('内定通知書 発行フォーム');
  form.setDescription(`入力・送信すると、内定通知書PDFが自動で発行され、${CONFIG.RECIPIENT} に送付されます。送信前に内容をよく確認してください。`);
  form.setConfirmationMessage('送信しました。内定通知書は自動で発行・送付されます。');
  form.addMultipleChoiceItem().setTitle(Q.company).setChoiceValues(Object.keys(COMPANIES)).setRequired(true);
  form.addTextItem().setTitle(Q.name).setRequired(true);
  form.addDateItem().setTitle(Q.joinDate).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.employment)
    .setChoiceValues(['正社員', '契約社員', 'パート・アルバイト']).showOtherOption(true).setRequired(true);
  form.addTextItem().setTitle(Q.probation).setHelpText('例：3（なしの場合は 0）').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireNumber().build());
  form.addTextItem().setTitle(Q.department).setRequired(true);
  form.addTextItem().setTitle(Q.job).setHelpText('例：エアー遊具レンタルの営業・運営業務').setRequired(true);
  addLocationItem(form);
  form.addParagraphTextItem().setTitle(Q.salary)
    .setHelpText('例：月給250,000円（基本給220,000円、諸手当30,000円）').setRequired(true);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // 2. 管理簿シート
  let ledger = ss.getSheetByName(CONFIG.LEDGER_SHEET);
  if (!ledger) ledger = ss.insertSheet(CONFIG.LEDGER_SHEET);
  ledger.getRange(1, 1, 1, LEDGER_HEADERS.length).setValues([LEDGER_HEADERS]).setFontWeight('bold');
  ledger.setFrozenRows(1);
  // 件数集計（右側）
  const c = LEDGER_HEADERS.length + 2;
  ledger.getRange(1, c, 1, 2).setValues([['集計', '件数']]).setFontWeight('bold');
  const rows = [['発行総数', '=COUNTA(A2:A)']];
  Object.keys(COMPANIES).forEach(k => rows.push([k, `=COUNTIF(C2:C,"${k}")`]));
  rows.push(['送信エラー', '=COUNTIF(M2:M,"エラー")']);
  ledger.getRange(2, c, rows.length, 2).setValues(rows);

  // 3. フォーム送信トリガー（重複登録を防ぐ）
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();

  Logger.log('管理簿スプレッドシート: ' + ss.getUrl());
  Logger.log('フォーム（回答用URL）: ' + form.getPublishedUrl());
  Logger.log('フォーム（編集用URL）: ' + form.getEditUrl());
}

/** 既存フォームの「勤務地」を選択式に差し替える（setup済みの場合に1回だけ実行） */
function updateLocationQuestion() {
  const ss = getSpreadsheet();
  const urls = ss.getSheets().map(sh => sh.getFormUrl()).filter(Boolean);
  if (!urls.length) throw new Error('フォームが見つかりません');
  urls.forEach(url => {
    const form = FormApp.openByUrl(url);
    const items = form.getItems();
    if (items.some(i => i.getTitle() === Q.location)) return; // 変更済み
    const old = items.find(i => i.getTitle().indexOf('勤務地') === 0);
    if (!old) return;
    const index = old.getIndex();
    form.deleteItem(old);
    form.moveItem(addLocationItem(form), index);
    Logger.log('勤務地を選択式に変更: ' + form.getEditUrl());
  });
}

// ===================== メイン処理 =====================

/** フォーム送信時に自動実行 */
function onFormSubmit(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    processEntry(normalize(e.namedValues));
  } finally {
    lock.releaseLock();
  }
}

/** 手動テスト用：回答シートの最終行を処理する */
function processLastResponse() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheets().find(s => s.getFormUrl());
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const values = sheet.getRange(sheet.getLastRow(), 1, 1, headers.length).getDisplayValues()[0];
  const named = {};
  headers.forEach((h, i) => (named[h] = [values[i]]));
  processEntry(normalize(named));
}

function normalize(named) {
  const get = key => String((named[key] || [''])[0]).trim();
  return {
    company: get(Q.company),
    name: get(Q.name),
    joinDate: get(Q.joinDate),
    employment: get(Q.employment),
    probation: get(Q.probation),
    department: get(Q.department),
    job: get(Q.job),
    location: get(Q.location),
    salary: get(Q.salary),
  };
}

function processEntry(d) {
  const ledger = getSpreadsheet().getSheetByName(CONFIG.LEDGER_SHEET);
  const company = COMPANIES[d.company];
  const now = new Date();
  const row = lastDataRow(ledger) + 1;
  const issueNo = company ? nextIssueNo(ledger, company.code, now) : '';
  if (company && (!d.location || d.location === LOCATION_AUTO)) d.location = company.address;

  // 先に管理簿へ記録（途中で失敗しても痕跡が残るように）
  ledger.getRange(row, 1, 1, LEDGER_HEADERS.length).setValues([[
    issueNo, now, d.company, d.name, CONFIG.RECIPIENT, d.joinDate,
    d.employment, d.department, d.job, d.location, d.salary, '', '処理中', '',
  ]]);

  try {
    if (!company) throw new Error('発行会社が不明です: ' + d.company);

    const pdf = buildPdf(d, company, issueNo, now);
    const file = getPdfFolder().createFile(pdf);
    ledger.getRange(row, 12).setValue(file.getUrl());

    sendMail(CONFIG.RECIPIENT, d, company, issueNo, pdf, file.getUrl());
    ledger.getRange(row, 13).setValue('送信済み');
  } catch (err) {
    ledger.getRange(row, 13, 1, 2).setValues([['エラー', String(err && err.message || err)]]);
    notifyError(d, err);
  }
}

/** 記録の最終行（発行番号か氏名がある行）。右側の集計欄に影響されないようにする */
function lastDataRow(sheet) {
  const values = sheet.getRange(1, 1, sheet.getMaxRows(), 4).getValues();
  for (let i = values.length - 1; i >= 0; i--) if (values[i][0] !== '' || values[i][3] !== '') return i + 1;
  return 1;
}

function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** 発行番号：DC-2026-0001 形式（会社・年ごとに連番） */
function nextIssueNo(ledger, code, now) {
  const prefix = `${code}-${now.getFullYear()}-`;
  const last = lastDataRow(ledger);
  let max = 0;
  if (last >= 2) {
    ledger.getRange(2, 1, last - 1, 1).getValues().forEach(([v]) => {
      if (String(v).startsWith(prefix)) max = Math.max(max, Number(String(v).slice(prefix.length)) || 0);
    });
  }
  return prefix + String(max + 1).padStart(4, '0');
}

function getPdfFolder() {
  const it = DriveApp.getFoldersByName(CONFIG.PDF_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.PDF_FOLDER_NAME);
}

// ===================== PDF生成 =====================

function buildPdf(d, company, issueNo, now) {
  const stamp = DriveApp.getFileById(company.stampFileId).getBlob();
  const stampSrc = `data:${stamp.getContentType()};base64,${Utilities.base64Encode(stamp.getBytes())}`;
  const html = renderHtml(d, company, issueNo, formatJpDate(now), stampSrc);
  const fileName = `内定通知書_${company.code}_${d.name}_${issueNo}.pdf`;
  return Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(fileName);
}

function renderHtml(d, c, issueNo, issueDate, stampSrc) {
  const e = escapeHtml;
  const probation = Number(d.probation) > 0 ? `（試用期間${e(d.probation)}か月）` : '';
  const contact = c.contactPerson ? `<div>担当：${e(c.contactPerson)}</div>` : '';
  const style = `
    body { font-family: 'Noto Sans JP', sans-serif; font-size: 10pt; line-height: 1.5; }
    .right { text-align: right; } .center { text-align: center; }
    h1 { text-align: center; font-size: 17pt; letter-spacing: 0.5em; margin: 10px 0; }
    p { margin: 6px 0; }
    table.terms { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table.terms th, table.terms td { border: 1px solid #333; padding: 3px 8px; vertical-align: top; }
    table.terms th { width: 26%; background: #f2f2f2; font-weight: normal; }
    .stamp { height: 56px; vertical-align: middle; margin-left: 4px; }
    .sec { font-weight: bold; margin-top: 6px; }
    .sign td { padding: 6px 4px; }
    .line { border-bottom: 1px solid #333; display: inline-block; min-width: 260px; }
    .pb { page-break-before: always; }
  `;
  const companyBlock = `
    <div class="right">
      <div>${e(c.name)}</div>
      <div>${e(c.representative)}<img class="stamp" src="${stampSrc}"></div>
      <div>${e(c.postal)} ${e(c.address)}</div>
      <div>TEL：${e(c.tel)}　MAIL：${e(c.mail)}</div>
    </div>`;

  const letter = `
    <div class="right">発行番号：${e(issueNo)}<br>${e(issueDate)}</div>
    <div style="font-size:12pt;margin-top:8px;">${e(d.name)}　様</div>
    ${companyBlock}
    <h1>内定通知書</h1>
    <p>拝啓　時下ますますご清祥のこととお慶び申し上げます。</p>
    <p>このたびは当社の採用選考にご応募いただき、誠にありがとうございました。慎重に選考を重ねました結果、貴殿を下記の条件にて採用することを内定いたしましたので、ここにご通知申し上げます。</p>
    <p>つきましては、添付の「内定承諾書」に必要事項をご記入・ご捺印のうえ、ご返送くださいますようお願い申し上げます。</p>
    <p class="right">敬具</p>
    <p class="center">記</p>
    <table class="terms">
      <tr><th>入社予定日</th><td>${e(formatJpDateStr(d.joinDate))}</td></tr>
      <tr><th>雇用形態</th><td>${e(d.employment)}${probation}</td></tr>
      <tr><th>配属先</th><td>${e(d.department)}</td></tr>
      <tr><th>職種・業務内容</th><td>${e(d.job)}</td></tr>
      <tr><th>勤務地</th><td>${e(d.location)}</td></tr>
      <tr><th>給与</th><td>${e(d.salary).replace(/\n/g, '<br>')}</td></tr>
      <tr><th>勤務時間・休日</th><td>別途「労働条件通知書」のとおり</td></tr>
    </table>
    <div class="sec">■ 提出書類</div>
    <div>・内定承諾書（添付）</div>
    <div class="sec">■ 内定取消事由</div>
    <div>次のいずれかに該当した場合は、内定を取り消すことがあります。</div>
    <div>1. 提出書類または選考時の申告内容に重大な虚偽があったとき</div>
    <div>2. 新卒の場合、入社日までに卒業できなかったとき</div>
    <div>3. 健康上の理由により、業務に就くことが困難となったとき</div>
    <div>4. 犯罪行為その他、社会的信用を著しく損なう行為があったとき</div>
    <div>5. その他、前各号に準ずるやむを得ない事由があったとき</div>
    <div class="sec">■ お問い合わせ先</div>
    <div>${e(c.name)}</div>${contact}
    <div>TEL：${e(c.tel)}　MAIL：${e(c.mail)}</div>
    <p class="right">以上</p>`;

  const acceptance = `
    <div class="pb"></div>
    <div class="right">　　　　年　　月　　日</div>
    <div style="margin-top:8px;">${e(c.name)}<br>${e(c.representative)}　殿</div>
    <h1>内定承諾書</h1>
    <p>このたびは採用内定のご通知をいただき、誠にありがとうございます。</p>
    <p>私は貴社への入社を承諾し、${e(formatJpDateStr(d.joinDate))}より入社いたします。入社にあたっては、貴社の就業規則その他の諸規程を遵守し、誠実に勤務することを誓約いたします。</p>
    <p>なお、内定通知書記載の内定取消事由に該当した場合は、内定を取り消されても異議ありません。</p>
    <table class="sign" style="margin-top:30px;">
      <tr><td>住所</td><td><span class="line">&nbsp;</span></td></tr>
      <tr><td>氏名</td><td><span class="line">${e(d.name)}</span>　印</td></tr>
      <tr><td>電話番号</td><td><span class="line">&nbsp;</span></td></tr>
    </table>
    <p class="right" style="margin-top:20px;">（発行番号：${e(issueNo)}）</p>`;

  return `<html><head><meta charset="utf-8"><style>${style}</style></head><body>${letter}${acceptance}</body></html>`;
}

// ===================== メール =====================

function sendMail(to, d, c, issueNo, pdf, pdfUrl) {
  const subject = `【内定通知書発行】${c.name}／${d.name} 様（${issueNo}）`;
  const body = [
    '内定通知書を発行しました。PDFを添付します。',
    '',
    `発行番号：${issueNo}`,
    `発行会社：${c.name}`,
    `氏名：${d.name} 様`,
    `入社予定日：${formatJpDateStr(d.joinDate)}`,
    `雇用形態：${d.employment}`,
    `配属先：${d.department}`,
    `職種・業務内容：${d.job}`,
    `勤務地：${d.location}`,
    `給与：${d.salary}`,
    '',
    `PDF（ドライブ）：${pdfUrl}`,
  ].join('\n');
  GmailApp.sendEmail(to, subject, body, { attachments: [pdf], name: '内定通知書 自動発行' });
}

function notifyError(d, err) {
  const admin = Session.getEffectiveUser().getEmail();
  if (!admin) return;
  MailApp.sendEmail(admin, '【要確認】内定通知書の自動発行でエラー',
    `氏名：${d.name}\n会社：${d.company}\nエラー：${err && err.message || err}\n\n管理簿シートを確認してください。`);
}

// ===================== ユーティリティ =====================

function formatJpDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy年M月d日');
}

/** フォームの日付文字列（2026/11/01 や 2026-11-01）を「2026年11月1日」に */
function formatJpDateStr(s) {
  const m = String(s).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : s;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
