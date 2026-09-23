/**
 * 九州支社 人員情報シート: 10月・11月・12月のシフト表「骨組み」を
 * 月ごとに新しいタブ(シート)として追加する(氏名・シフトはまだ入れない、枠だけ作る)。
 *
 * 対象スプレッドシート:
 * https://docs.google.com/spreadsheets/d/1kie3k4Ky80Mw3ZqcgwmgPjz0fz4HKnnB7Qb7XFo-ShE/edit
 * (「（九州支社）人員情報」— 原本。既存のタブ・行には一切触れず、
 *  「10月」「11月」「12月」という名前の新しいタブを追加するだけ)
 *
 * 使い方(代表の作業、1回だけ):
 * 1. 上記スプレッドシートを開く → メニュー「拡張機能」→「Apps Script」
 * 2. 開いたエディタの中身を全て削除し、このファイルの内容を貼り付けて保存
 * 3. 上部の関数選択プルダウンで buildMonthlySkeletonTabs を選び、実行(▶)ボタン
 * 4. 初回は権限承認の画面が出るので、自分のアカウントで許可する
 * 5. 実行が終わると、シート下部のタブに「10月」「11月」「12月」が追加され、
 *    それぞれに役職名の行だけの空の表ができる(氏名・シフトの列は空欄のまま)
 *
 * 注意:
 * - 既存のタブ(現在のシフト表があるタブ)には一切触れない。
 * - 同じ名前のタブが既にある場合は、中身を上書きせずスキップする
 *   (実行ログに「スキップ」と出る)。何度実行しても安全。
 * - 氏名やシフトの中身は、追加情報をもらってから別途この骨組みに書き込む。
 */
function buildMonthlySkeletonTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const roles = ['ディレクター', 'ディレクター', 'クローザー', 'クローザー', '週末クローザー', '週末クローザー'];
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  const months = [
    { year: 2026, month: 10, label: '10月' },
    { year: 2026, month: 11, label: '11月' },
    { year: 2026, month: 12, label: '12月' },
  ];

  months.forEach(function ({ year, month, label }) {
    const existing = ss.getSheetByName(label);
    if (existing) {
      if (existing.getLastRow() > 0) {
        Logger.log('スキップ: 「' + label + '」タブは既に中身があるため何もしません');
        return;
      }
    }
    const sheet = existing || ss.insertSheet(label);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dateHeaders = [];
    const weekdayRow = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      dateHeaders.push(month + '/' + d);
      weekdayRow.push(weekdayLabels[dt.getDay()]);
    }

    let row = 1;

    // 見出し行1: 月ラベル, 氏名, 日付..., 日数
    sheet.getRange(row, 1, 1, 2 + dateHeaders.length + 1)
      .setValues([[label, '氏名'].concat(dateHeaders, ['日数'])]);
    row++;

    // 見出し行2: 曜日
    sheet.getRange(row, 1, 1, 2 + weekdayRow.length)
      .setValues([['', '曜日'].concat(weekdayRow)]);
    row++;

    // 役職の空行(氏名・シフトは未入力、骨組みのみ)
    roles.forEach(function (role) {
      sheet.getRange(row, 1).setValue(role);
      row++;
    });

    sheet.setFrozenRows(2);
    Logger.log('完了: 「' + label + '」タブに骨組みを作成しました');
  });

  SpreadsheetApp.flush();
}
