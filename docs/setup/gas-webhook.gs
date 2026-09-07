/**
 * nextvision.fun 問い合わせフォーム → Google スプレッドシート記録
 *
 * 使い方（詳細は form.md）:
 *  1. 記録用スプレッドシートを新規作成 → 拡張機能 → Apps Script → このコードを貼り付け
 *  2. SHARED_TOKEN を、サーバー上の config.php の GAS_TOKEN と同じランダム文字列にする
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」→ 実行ユーザー「自分」／アクセス「全員」→ デプロイ
 *  4. 表示された「ウェブアプリのURL」を config.php の GAS_WEBHOOK_URL に貼る
 *
 * HP の contact.php から、以下の JSON が POST されます:
 *  { token, datetime, purpose, plan, company, name, email, content, message, ip, ua, referer, notify_sent, autoreply_sent }
 */

// ★ config.php の GAS_TOKEN と同じ文字列にする（20文字以上のランダム英数字を推奨）
var SHARED_TOKEN = 'CHANGE_ME_RANDOM_TOKEN';

// 記録先シート名（なければ自動作成）
var SHEET_NAME = '問い合わせ';

var HEADERS = [
  '受信日時', 'ご用件', 'ご希望のプラン', '会社名・施設名', 'ご担当者名', 'メールアドレス',
  'ご希望の体験', 'ご相談内容', '対応状況', '担当', 'メモ',
  '通知メール', '自動返信', '参照元', 'IP', 'UA'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var data = {};
    try {
      data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      return respond_(400, 'invalid json');
    }

    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return respond_(403, 'forbidden');
    }

    var sheet = getSheet_();
    var row = [
      data.datetime || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'),
      s_(data.purpose), s_(data.plan), s_(data.company), s_(data.name), s_(data.email),
      s_(data.content), s_(data.message, 5000),
      '未対応', '', '',
      data.notify_sent ? '送信済' : '失敗', data.autoreply_sent ? '送信済' : '失敗',
      s_(data.referer), s_(data.ip), s_(data.ua, 300)
    ];
    sheet.appendRow(row);

    return respond_(200, 'ok');
  } catch (err) {
    return respond_(500, String(err));
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** ブラウザで URL を開いたときの疎通確認用 */
function doGet() {
  return ContentService.createTextOutput('nextvision contact webhook: alive').setMimeType(ContentService.MimeType.TEXT);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFF3E0');
    sheet.setFrozenRows(1);
    // 「対応状況」列にプルダウン
    var statusCol = HEADERS.indexOf('対応状況') + 1;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['未対応', '対応中', '見積提出', '受注', '失注', '対象外'], true)
      .setAllowInvalid(true).build();
    sheet.getRange(2, statusCol, 1000, 1).setDataValidation(rule);
  }
  return sheet;
}

/** 文字列化＋数式インジェクション対策（先頭の = + - @ を無害化）＋長さ制限 */
function s_(v, max) {
  var str = (v === undefined || v === null) ? '' : String(v);
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  return str.slice(0, max || 500);
}

function respond_(code, msg) {
  // Apps Script の Web アプリは HTTP ステータスを変えられないため、本文に status を含める
  return ContentService
    .createTextOutput(JSON.stringify({ status: code, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** エディタから実行して動作確認するためのテスト関数（シートに1行テスト追加されます） */
function testAppend() {
  var fake = { postData: { contents: JSON.stringify({
    token: SHARED_TOKEN, datetime: '2026-01-01 12:00:00', purpose: '開催の相談', plan: '運営代行込み',
    company: 'テスト株式会社', name: 'テスト太郎', email: 'test@example.com',
    content: 'キッズライセンスパーク', message: 'テスト送信です', ip: '127.0.0.1', ua: 'test',
    referer: 'https://nextvision.fun/', notify_sent: true, autoreply_sent: true
  }) } };
  Logger.log(doPost(fake).getContent());
}
