/**
 * 九州支社 人員情報シート: 10月・11月・12月のシフト表「骨組み」を
 * 既存データの下に追加する(氏名・シフトはまだ入れない、枠だけ作る)。
 *
 * 対象スプレッドシート:
 * https://docs.google.com/spreadsheets/d/1kie3k4Ky80Mw3ZqcgwmgPjz0fz4HKnnB7Qb7XFo-ShE/edit
 * (「（九州支社）人員情報」— 原本。このスクリプトは既存の行には一切触れず、
 *  シートの最終行を自動検出して、その下に新しいブロックを追加するだけ)
 *
 * 使い方(代表の作業、1回だけ):
 * 1. 上記スプレッドシートを開く → メニュー「拡張機能」→「Apps Script」
 * 2. 開いたエディタの中身を全て削除し、このファイルの内容を貼り付けて保存
 * 3. 上部の関数選択プルダウンで buildMonthlySkeletons を選び、実行(▶)ボタン
 * 4. 初回は権限承認の画面が出るので、自分のアカウントで許可する
 * 5. 実行が終わると、シートの一番下に「10月」「11月」「12月」の骨組み表が
 *    順番に追加される(役職名の行だけで、氏名・シフトの列は空欄のまま)
 *
 * 注意:
 * - 骨組みだけを作るスクリプトなので、既存の10月分の表(上のほうにある、
 *   氏名入りの表)には触れない。今回追加するのは新しい空の表。
 * - もう一度実行すると、その時点の最終行のさらに下にもう1セット追加されて
 *   しまう(重複防止の判定はしていない)。作り直したい場合は、追加した範囲を
 *   手動で削除してから再実行すること。
 * - 氏名やシフトの中身は、追加情報をもらってから別途この骨組みに書き込む。
 */
function buildMonthlySkeletons() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; // 対象シート(先頭シート)

  const startRow = sheet.getLastRow() + 2; // 既存データの下に1行空けて開始
  const roles = ['ディレクター', 'ディレクター', 'クローザー', 'クローザー', '週末クローザー', '週末クローザー'];
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  const months = [
    { year: 2026, month: 10, label: '10月' },
    { year: 2026, month: 11, label: '11月' },
    { year: 2026, month: 12, label: '12月' },
  ];

  let row = startRow;
  months.forEach(({ year, month, label }) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dateHeaders = [];
    const weekdayRow = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      dateHeaders.push(month + '/' + d);
      weekdayRow.push(weekdayLabels[dt.getDay()]);
    }

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

    row++; // 次の月との間に1行空ける
  });

  SpreadsheetApp.flush();
  Logger.log('完了: ' + startRow + '行目から' + (row - 1) + '行目まで骨組みを作成しました');
}
