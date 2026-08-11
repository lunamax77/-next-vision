/**
 * 下請け請求書メールの添付PDFを Google Drive「AI専用/受信請求書」フォルダに自動保存する。
 *
 * 目的: Gmail添付のままだとAIが中身(請求金額)を読めないため、PDFをDriveに退避させ、
 *       チェック用ルーティンが読めるようにする。
 *
 * 使い方(竹村代表のGoogleアカウントで設定):
 *   1. https://script.google.com/ を開く → 新しいプロジェクト
 *   2. このコードを貼り付けて保存
 *   3. 上部の関数選択で saveInvoiceAttachmentsToDrive を選び、一度「実行」→ 権限を承認
 *   4. 左メニュー「トリガー」→「トリガーを追加」
 *        - 関数: saveInvoiceAttachmentsToDrive
 *        - イベントのソース: 時間主導型 → 時間ベースのタイマー → 1時間おき
 *   これで1時間ごとに、新着の請求書PDFがDriveに自動保存される。
 *
 * ※ 原本不可侵: 元メールは削除・改変しない(処理済みラベルを付けるだけ)。
 *   請求書の判定・支払い可否は行わない(それはチェック用ルーティンと代表の役割)。
 */

// ===== 設定 =====
var AI_FOLDER_ID = '1e3g5RB9DjsAu_83KUbIqgf13VIr5dAC8'; // Googleドライブ「AI専用」フォルダ
var TARGET_FOLDER_NAME = '受信請求書';                  // 保存先(AI専用の直下に自動作成)
var PROCESSED_LABEL = 'invoice-saved';                  // 処理済みメールに付けるラベル
// 下請け請求書とみなす検索条件。DreamCreation自身が送った請求書は除外(-from:)。
var SEARCH_QUERY =
  'in:inbox has:attachment newer_than:30d ' +
  '(subject:(請求書 OR 御請求書 OR ご請求書 OR ご請求)) ' +
  '-from:d-creation-o.com -from:nextvision.fun -label:' + PROCESSED_LABEL;

function saveInvoiceAttachmentsToDrive() {
  var parent = DriveApp.getFolderById(AI_FOLDER_ID);
  var it = parent.getFoldersByName(TARGET_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : parent.createFolder(TARGET_FOLDER_NAME);

  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);

  var threads = GmailApp.search(SEARCH_QUERY, 0, 50);
  var savedCount = 0;

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var messages = thread.getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      var atts = msg.getAttachments();
      for (var a = 0; a < atts.length; a++) {
        var att = atts[a];
        var name = att.getName() || '';
        var isPdf = (att.getContentType() || '').toLowerCase().indexOf('pdf') > -1 || /\.pdf$/i.test(name);
        if (!isPdf) continue;

        // ファイル名: 受信日_差出人_元ファイル名 で重複を避けつつ由来が分かるように
        var from = (msg.getFrom() || '').replace(/[<>"]/g, '').substring(0, 40);
        var dateStr = Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyyMMdd');
        var fname = dateStr + '_' + from + '_' + name;

        if (folder.getFilesByName(fname).hasNext()) continue; // 既に保存済み
        folder.createFile(att.copyBlob()).setName(fname);
        savedCount++;
      }
    }
    thread.addLabel(label); // 処理済みにして次回スキップ
  }

  Logger.log('保存したPDF: ' + savedCount + '件');
}
