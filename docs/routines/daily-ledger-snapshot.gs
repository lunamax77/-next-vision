/**
 * 売掛・買掛の日次スナップショット & 前日対比レポート
 *
 * 目的: 参照スプレッドシートは月タブが上書きで更新されるため「昨日の値」が残らない。
 *       毎日その日の値を別ファイルに記録しておき、翌日から自動で前日対比を出す。
 *
 * ★ 原本不可侵: 参照シートは getValues() で読むだけ。書き込み・編集は一切しない。
 *   出力はすべて AI専用フォルダ内の新規ファイル。
 *
 * 使い方(竹村代表のGoogleアカウントで設定):
 *   1. https://script.google.com/ を開く → 新しいプロジェクト
 *   2. このコードを貼り付けて保存
 *   3. まず関数 inspectLedger を選んで「実行」→ 権限を承認
 *      → 実行ログに、検出したタブと売掛・買掛の項目が出る。
 *        意図どおり拾えているかここで確認する(この関数は何も書き込まない)。
 *   4. 問題なければ 関数 dailyLedgerSnapshot を一度「実行」(初日の基準値が記録される)
 *   5. 左メニュー「トリガー」→「トリガーを追加」
 *        - 関数: dailyLedgerSnapshot
 *        - イベントのソース: 時間主導型 → 日付ベースのタイマー → 午前6時〜7時
 *      → 毎朝、朝8時の定時報告より前にスナップショットと前日対比が用意される。
 *
 * ※ 前日対比が出せるのは【2日目から】。初日は「基準値を記録しました」となる。
 */

// ===== 設定 =====
var SOURCE_SHEET_ID     = '1rdPmp9wKzktUh8QcZ4ydXOrU4nfcjwOEfqz55UFUp98'; // 参照シート(売掛・買掛)
var AI_FOLDER_ID        = '1e3g5RB9DjsAu_83KUbIqgf13VIr5dAC8';            // Googleドライブ「AI専用」
var SNAPSHOT_FOLDER     = '10_売掛買掛スナップショット';                  // 出力先(AI専用の直下に自動作成)
var TZ                  = 'Asia/Tokyo';
var HEADER_SEARCH_ROWS  = 80;   // 「売掛」「買掛」の見出しを探す範囲(先頭から何行)
var BLOCK_MAX_ROWS      = 200;  // 見出しの下、何行まで項目として読むか

// ============================================================
// 診断: 何も書き込まず、検出結果をログに出すだけ
// ============================================================
function inspectLedger() {
  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheets = ss.getSheets();
  Logger.log('スプレッドシート: ' + ss.getName());
  Logger.log('タブ数: ' + sheets.length);

  sheets.forEach(function (sh) {
    var data = readLedgerFromSheet(sh);
    if (!data) {
      Logger.log('--- [' + sh.getName() + '] 売掛/買掛の見出しなし → スキップ');
      return;
    }
    Logger.log('--- [' + sh.getName() + ']');
    ['売掛', '買掛'].forEach(function (kind) {
      var items = data[kind];
      var names = Object.keys(items);
      var total = names.reduce(function (s, n) { return s + items[n]; }, 0);
      Logger.log('  ' + kind + ': ' + names.length + '件 / 合計 ' + fmt(total));
      names.slice(0, 8).forEach(function (n) {
        Logger.log('      ' + n + ' = ' + fmt(items[n]));
      });
      if (names.length > 8) Logger.log('      …ほか ' + (names.length - 8) + '件');
    });
  });
  Logger.log('※ この関数は読み取りのみ。書き込みはしていません。');
}

// ============================================================
// 本体: スナップショット記録 + 前日対比レポート出力
// ============================================================
function dailyLedgerSnapshot() {
  var today  = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var folder = getOrCreateFolder_(DriveApp.getFolderById(AI_FOLDER_ID), SNAPSHOT_FOLDER);

  // --- 現在の値を読む(読み取りのみ) ---
  var ss  = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var cur = { date: today, sheets: {} };
  ss.getSheets().forEach(function (sh) {
    var data = readLedgerFromSheet(sh);
    if (data) cur.sheets[sh.getName()] = data;
  });

  if (Object.keys(cur.sheets).length === 0) {
    Logger.log('売掛/買掛の見出しが見つかりませんでした。inspectLedger で確認してください。');
    return;
  }

  // --- 直近の過去スナップショットを探す(今日より前で最も新しいもの) ---
  var prev = findPreviousSnapshot_(folder, today);

  // --- 今日のスナップショットを保存(同日分は作り直す) ---
  var snapName = today + '.json';
  var old = folder.getFilesByName(snapName);
  while (old.hasNext()) old.next().setTrashed(true);   // 同日の再実行時のみ、自分が作った当日分を置き換え
  folder.createFile(snapName, JSON.stringify(cur, null, 2), MimeType.PLAIN_TEXT);

  // --- 前日対比レポート ---
  var report = prev
    ? buildDiffReport_(prev, cur)
    : '■ 売掛・買掛 前日対比 (' + today + ')\n\n'
      + '本日が記録の初日です。基準値を記録しました。前日対比は明日から出ます。\n\n'
      + buildTotalsOnly_(cur);

  var repName = '_前日対比_' + today + '.txt';
  var oldRep = folder.getFilesByName(repName);
  while (oldRep.hasNext()) oldRep.next().setTrashed(true);
  folder.createFile(repName, report, MimeType.PLAIN_TEXT);

  Logger.log(report);
}

// ============================================================
// 読み取り: 1タブから 売掛/買掛 を抽出
// ============================================================
function readLedgerFromSheet(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return null;

  // 「売掛」と「買掛」が同じ行に並ぶ見出し行を探す
  var head = null;
  var limit = Math.min(values.length, HEADER_SEARCH_ROWS);
  for (var r = 0; r < limit; r++) {
    var uri = -1, kake = -1;
    for (var c = 0; c < values[r].length; c++) {
      var v = String(values[r][c]).trim();
      if (v === '売掛' && uri === -1) uri = c;
      if (v === '買掛' && kake === -1) kake = c;
    }
    if (uri > -1 && kake > -1 && kake > uri) { head = { row: r, uri: uri, kake: kake }; break; }
  }
  if (!head) return null;

  var lastCol = 0;
  values.forEach(function (row) { lastCol = Math.max(lastCol, row.length - 1); });

  var out = { 売掛: {}, 買掛: {} };
  var end = Math.min(values.length, head.row + 1 + BLOCK_MAX_ROWS);

  for (var r2 = head.row + 1; r2 < end; r2++) {
    var row = values[r2];
    // 次の見出し行(売掛/買掛が再登場)に当たったらそのブロックは終了
    var isHeader = row.some(function (v) {
      var s = String(v).trim(); return s === '売掛' || s === '買掛';
    });
    if (isHeader) break;

    var a = pickPair_(row, head.uri, head.kake - 1);
    if (a) out['売掛'][a.name] = a.amount;

    var b = pickPair_(row, head.kake, lastCol);
    if (b) out['買掛'][b.name] = b.amount;
  }
  return out;
}

/** 範囲内から (名前, 金額) を1組拾う。名前は金額より前にある前提。 */
function pickPair_(row, from, to) {
  var name = null, amount = null;
  for (var c = from; c <= to && c < row.length; c++) {
    var v = row[c];
    if (v === '' || v === null || v === undefined) continue;
    if (typeof v === 'number') {
      if (amount === null) amount = v;
    } else {
      var s = String(v).trim();
      if (s && amount === null) name = s;   // 金額が出る前の文字列を名前とみなす
    }
  }
  if (name && amount !== null) return { name: name, amount: amount };
  return null;
}

// ============================================================
// 差分レポートの組み立て
// ============================================================
function buildDiffReport_(prev, cur) {
  var lines = [];
  lines.push('■ 売掛・買掛 前日対比 (' + cur.date + ' ← ' + prev.date + ')');
  lines.push('');

  var tabs = Object.keys(cur.sheets);
  var anyChange = false;

  tabs.forEach(function (tab) {
    var curT  = cur.sheets[tab];
    var prevT = (prev.sheets || {})[tab];

    ['売掛', '買掛'].forEach(function (kind) {
      var c = curT[kind] || {};
      var p = (prevT && prevT[kind]) ? prevT[kind] : null;

      var cTotal = sum_(c);
      if (!p) {
        lines.push('【' + tab + '】' + kind + ' 合計 ' + fmt(cTotal) + '  (前日の記録なし)');
        lines.push('');
        return;
      }
      var pTotal = sum_(p);
      var d = cTotal - pTotal;
      lines.push('【' + tab + '】' + kind + ' 合計 ' + fmt(cTotal) + '  (前日比 ' + sign_(d) + ')');

      var names = {};
      Object.keys(p).forEach(function (n) { names[n] = 1; });
      Object.keys(c).forEach(function (n) { names[n] = 1; });

      var rows = [];
      Object.keys(names).forEach(function (n) {
        var pv = p[n], cv = c[n];
        if (pv === undefined && cv !== undefined) {
          if (cv !== 0) rows.push({ mark: '[新規]', name: n, text: fmt(cv), abs: Math.abs(cv) });
        } else if (cv === undefined && pv !== undefined) {
          if (pv !== 0) rows.push({ mark: '[消滅]', name: n, text: fmt(pv) + ' → なし', abs: Math.abs(pv) });
        } else if (pv !== cv) {
          var diff = cv - pv;
          rows.push({
            mark: diff > 0 ? '[増]' : '[減]',
            name: n,
            text: fmt(pv) + ' → ' + fmt(cv) + '  (' + sign_(diff) + ')',
            abs: Math.abs(diff)
          });
        }
      });

      if (rows.length === 0) {
        lines.push('    変化なし');
      } else {
        anyChange = true;
        rows.sort(function (x, y) { return y.abs - x.abs; });   // 金額の大きい変化から
        rows.forEach(function (r) {
          lines.push('    ' + r.mark + ' ' + r.name + '  ' + r.text);
        });
      }
      lines.push('');
    });
  });

  if (!anyChange) lines.push('※ 全体を通して、前日から金額の変化はありませんでした。');
  lines.push('');
  lines.push('(参照シートを ' + cur.date + ' 時点で読み取り。原本は変更していません)');
  return lines.join('\n');
}

function buildTotalsOnly_(cur) {
  var lines = [];
  Object.keys(cur.sheets).forEach(function (tab) {
    ['売掛', '買掛'].forEach(function (kind) {
      var items = cur.sheets[tab][kind] || {};
      lines.push('【' + tab + '】' + kind + ' 合計 ' + fmt(sum_(items)) + '  (' + Object.keys(items).length + '件)');
    });
  });
  return lines.join('\n');
}

// ============================================================
// ユーティリティ
// ============================================================
function sum_(obj) {
  return Object.keys(obj).reduce(function (s, k) { return s + (obj[k] || 0); }, 0);
}
function fmt(n) {
  var neg = n < 0, s = String(Math.round(Math.abs(n)));
  s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + s;
}
function sign_(n) {
  if (n === 0) return '±0';
  return (n > 0 ? '+' : '-') + fmt(Math.abs(n));
}
function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function findPreviousSnapshot_(folder, today) {
  var files = folder.getFiles(), best = null, bestDate = '';
  while (files.hasNext()) {
    var f = files.next(), n = f.getName();
    var m = n.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    if (m[1] >= today) continue;                 // 今日以降は対象外
    if (m[1] > bestDate) { bestDate = m[1]; best = f; }
  }
  if (!best) return null;
  try { return JSON.parse(best.getBlob().getDataAsString()); } catch (e) { return null; }
}
