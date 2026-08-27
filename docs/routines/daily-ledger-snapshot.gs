/**
 * 売掛・買掛のチェックポイント記録 & 変化レポート(1日4回: 朝/昼/夕/夜)
 *
 * 目的: 参照スプレッドシートは月タブが上書きで更新されるため「前の値」が残らない。
 *       定時報告(朝8時・昼12時・夕方18時・夜21時)のたびに値を記録しておき、
 *       「前回チェックからの変化」と「本日の累計変化」を自動で出す。
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
 *   4. 問題なければ 関数 ledgerCheckpoint を一度「実行」(1回目の基準値が記録される)
 *   5. 左メニュー「トリガー」→「トリガーを追加」を【4つ】作る。関数はすべて ledgerCheckpoint、
 *      イベントのソースは「時間主導型 → 日付ベースのタイマー」で、それぞれ次の時間帯に設定する
 *      (各定時報告より少し前に用意されるよう、報告時刻の1時間前の枠にする):
 *        - 午前7時〜8時   (→ 朝8時の報告用)
 *        - 午前11時〜12時 (→ 昼12時の報告用)
 *        - 午後5時〜6時   (→ 夕方18時の報告用)
 *        - 午後8時〜9時   (→ 夜21時の報告用)
 *
 * ※ その日の1回目のチェックは「前日比」、2回目以降は「前回からの変化」＋「本日の累計変化」になる。
 * ※ 旧バージョンで dailyLedgerSnapshot 関数のトリガーを設定済みの場合も、そのまま動く
 *   (下の互換用エイリアスが ledgerCheckpoint を呼ぶ)。ただし1日1回のままなので、
 *   全時間帯で変化を見たい場合はトリガーを上記の4つに差し替えること。
 */

// ===== 設定 =====
var SOURCE_SHEET_ID     = '1rdPmp9wKzktUh8QcZ4ydXOrU4nfcjwOEfqz55UFUp98'; // 参照シート(売掛・買掛)
var AI_FOLDER_ID        = '1e3g5RB9DjsAu_83KUbIqgf13VIr5dAC8';            // Googleドライブ「AI専用」
var SNAPSHOT_FOLDER     = '10_売掛買掛スナップショット';                  // 出力先(AI専用の直下に自動作成)
var REPORT_PREFIX       = '_売掛買掛レポート_';                           // 変化レポートのファイル名接頭辞
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
// 本体: 1回分のチェックポイントを記録し、変化レポートを出力する
// (1日4回、定時報告のたびに呼ばれる想定)
// ============================================================
function ledgerCheckpoint() {
  var now   = new Date();
  var today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var stamp = Utilities.formatDate(now, TZ, 'yyyy-MM-dd_HHmm');   // 例: 2026-08-21_1152
  var folder = getOrCreateFolder_(DriveApp.getFolderById(AI_FOLDER_ID), SNAPSHOT_FOLDER);

  // --- 現在の値を読む(読み取りのみ) ---
  var ss  = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var cur = { date: today, stamp: stamp, sheets: {} };
  ss.getSheets().forEach(function (sh) {
    var data = readLedgerFromSheet(sh);
    if (data) cur.sheets[sh.getName()] = data;
  });
  if (Object.keys(cur.sheets).length === 0) {
    Logger.log('売掛/買掛の見出しが見つかりませんでした。inspectLedger で確認してください。');
    return;
  }

  // --- これまでのスナップショット一覧(今回のぶんは含まない) ---
  var snapshots  = listSnapshots_(folder);
  var prev       = snapshots.length ? snapshots[snapshots.length - 1] : null;              // 直前(日をまたいでもよい)
  var todaysFirst = snapshots.filter(function (s) { return s.date === today; })[0] || null; // 本日いちばん最初

  // --- 今回の値を保存(同一タイムスタンプの再実行時のみ置き換え) ---
  saveJson_(folder, stamp + '.json', cur);

  // --- レポート組み立て ---
  var report;
  if (!prev) {
    report = '■ 売掛・買掛 チェック (' + stamp.replace('_', ' ') + ')\n\n'
      + '記録はこれが初回です。基準値を記録しました。次回のチェックから変化が出ます。\n\n'
      + buildTotalsOnly_(cur);
  } else if (prev.date !== today) {
    // 本日いちばん最初のチェック → 前日比
    var prevData = readSnapshotFile_(prev.file);
    report = '■ 売掛・買掛 前日比 (' + today + ' ← ' + prev.date + ')\n\n'
      + buildDiffSection_(prevData, cur, '前日(' + prev.date + ')比')
      + footerNote_(today);
  } else if (todaysFirst && todaysFirst.stamp === prev.stamp) {
    // 本日2回目のチェック → 前回=今朝なので1セクションのみ(前回比=本日累計)
    var prevData2 = readSnapshotFile_(prev.file);
    report = '■ 売掛・買掛 変化 (' + stamp.replace('_', ' ') + ')\n\n'
      + buildDiffSection_(prevData2, cur, '前回(' + hhmm_(prev.stamp) + ')からの変化 ＝ 本日の累計')
      + footerNote_(today);
  } else {
    // 本日3回目以降 → 前回からの変化 + 本日の累計(今朝比)
    var prevData3 = readSnapshotFile_(prev.file);
    var baseData  = readSnapshotFile_(todaysFirst.file);
    report = '■ 売掛・買掛 変化 (' + stamp.replace('_', ' ') + ')\n\n'
      + buildDiffSection_(prevData3, cur, '前回(' + hhmm_(prev.stamp) + ')からの変化')
      + '\n'
      + buildDiffSection_(baseData, cur, '本日の累計変化(今朝 ' + hhmm_(todaysFirst.stamp) + ' 比)')
      + footerNote_(today);
  }

  var repName = REPORT_PREFIX + stamp + '.txt';
  var oldRep = folder.getFilesByName(repName);
  while (oldRep.hasNext()) oldRep.next().setTrashed(true);
  folder.createFile(repName, report, MimeType.PLAIN_TEXT);

  Logger.log(report);
}

/** 旧バージョン(1日1回・毎朝)からの互換用エイリアス。既存トリガーがあっても動く。 */
function dailyLedgerSnapshot() {
  return ledgerCheckpoint();
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
// 差分セクションの組み立て(1回の比較 = 1セクション分)
// ============================================================
function buildDiffSection_(prev, cur, label) {
  var lines = [];
  lines.push('【' + label + '】');

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
        lines.push('  [' + tab + ' / ' + kind + '] 合計 ' + fmt(cTotal) + '  (前回の記録なし)');
        return;
      }
      var pTotal = sum_(p);
      var d = cTotal - pTotal;
      lines.push('  [' + tab + ' / ' + kind + '] 合計 ' + fmt(cTotal) + '  (' + sign_(d) + ')');

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
        lines.push('      変化なし');
      } else {
        anyChange = true;
        rows.sort(function (x, y) { return y.abs - x.abs; });   // 金額の大きい変化から
        rows.forEach(function (r) {
          lines.push('      ' + r.mark + ' ' + r.name + '  ' + r.text);
        });
      }
    });
  });

  if (!anyChange) lines.push('  ※ このセクションでは変化はありませんでした。');
  return lines.join('\n') + '\n';
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

function footerNote_(today) {
  return '\n(参照シートを ' + today + ' 時点で読み取り。原本は変更していません)';
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
function hhmm_(stamp) {
  var t = stamp.split('_')[1] || '0000';
  return t.slice(0, 2) + ':' + t.slice(2);
}
function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function saveJson_(folder, name, obj) {
  var old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  folder.createFile(name, JSON.stringify(obj, null, 2), MimeType.PLAIN_TEXT);
}
function listSnapshots_(folder) {
  var files = folder.getFiles(), out = [];
  while (files.hasNext()) {
    var f = files.next(), n = f.getName();
    var m = n.match(/^(\d{4}-\d{2}-\d{2})_(\d{4})\.json$/);
    if (!m) continue;
    out.push({ stamp: m[1] + '_' + m[2], date: m[1], file: f });
  }
  out.sort(function (a, b) { return a.stamp < b.stamp ? -1 : (a.stamp > b.stamp ? 1 : 0); });
  return out;
}
function readSnapshotFile_(file) {
  try { return JSON.parse(file.getBlob().getDataAsString()); } catch (e) { return { sheets: {} }; }
}
