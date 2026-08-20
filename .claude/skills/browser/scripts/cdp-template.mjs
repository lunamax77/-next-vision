/**
 * モードB: CDP接続テンプレート(代表PCのログイン済みChromeを操作)
 *
 * 前提: 代表のPCでChromeをデバッグポート付きで起動しておくこと。
 *       手順は ../reference/setup.md を参照。
 * 注意: このスクリプトは【代表のPC上のClaude Code】でのみ動く。
 *       クラウド(リモート)セッションからは代表のブラウザに接続できない。
 *
 * 使い方:
 *   node cdp-template.mjs            # 第1段: 入力まで(送信しない)
 *   SUBMIT=1 node cdp-template.mjs   # 第2段: 代表の承認後のみ
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const CDP_URL    = process.env.CDP_URL || 'http://localhost:9222';
const TARGET_URL = process.env.TARGET_URL || '';
const OUT_DIR    = process.env.OUT_DIR || './work/browser-out';
const SUBMIT     = process.env.SUBMIT === '1';   // ★承認ゲート

fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const shot  = (name) => path.join(OUT_DIR, `${stamp}_${name}.png`);

let browser;
try {
  browser = await chromium.connectOverCDP(CDP_URL);
} catch (e) {
  console.error('Chromeに接続できません(' + CDP_URL + ')。');
  console.error('→ reference/setup.md の手順でChromeをデバッグ起動してください。');
  process.exit(1);
}

// 既存のウィンドウ・タブ(ログイン状態を持っている)をそのまま使う
const context = browser.contexts()[0] ?? await browser.newContext();
const page    = context.pages().at(-1) ?? await context.newPage();

try {
  if (TARGET_URL) {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  }
  await page.bringToFront();
  await page.screenshot({ path: shot('01-open'), fullPage: true });
  console.log('現在のページ:', page.url());

  // ===== ここに入力処理を書く(送信ボタンは押さない) =====
  // await page.fill('#report_count', '12');

  const payload = {
    // report_count: await page.inputValue('#report_count'),
  };

  await page.screenshot({ path: shot('02-filled'), fullPage: true });

  if (!SUBMIT) {
    console.log('=== 第1段: 入力まで完了(送信していません) ===');
    console.log('送信予定の内容:\n' + JSON.stringify(payload, null, 2));
    console.log('スクショ: ' + OUT_DIR);
    console.log('→ 代表の承認を得たあと、SUBMIT=1 を付けて再実行してください。');
  } else {
    // ===== ★代表の承認後のみ実行される最終送信 =====
    // await page.click('button[type=submit]');
    // await page.waitForLoadState('networkidle');
    await page.screenshot({ path: shot('03-submitted'), fullPage: true });
    console.log('=== 第2段: 送信を実行しました ===');
  }
} catch (e) {
  await page.screenshot({ path: shot('99-error'), fullPage: true }).catch(() => {});
  console.error('エラー:', e.message);
  process.exitCode = 1;
}
// ※ browser.close() は呼ばない — 代表のChromeを閉じてしまうため、接続を切るだけにする。
