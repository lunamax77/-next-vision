/**
 * モードA: ヘッドレスブラウザ テンプレート
 *
 * 使い方:
 *   node headless-template.mjs            # 第1段: 入力まで(送信しない)
 *   SUBMIT=1 node headless-template.mjs   # 第2段: 代表の承認後のみ
 *
 * ★ SUBMIT による承認ゲートは外さないこと(会社憲章 第4-2項)。
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// ===== 設定 =====
const TARGET_URL = process.env.TARGET_URL || 'https://example.com';
const OUT_DIR    = process.env.OUT_DIR || './work/browser-out';
const SUBMIT     = process.env.SUBMIT === '1';   // ★承認ゲート
const HEADLESS   = process.env.HEADED !== '1';   // HEADED=1 で画面を出す

fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const shot  = (name) => path.join(OUT_DIR, `${stamp}_${name}.png`);

// 外向き通信がプロキシ経由の環境では、Chromiumが環境変数のプロキシを自動で使う。
// ただしローカル(127.0.0.1)へのアクセスまでプロキシに回らないよう除外しておく。
const browser = await chromium.launch({
  headless: HEADLESS,
  args: ['--proxy-bypass-list=<-loopback>;localhost;127.0.0.1'],
});
const context = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
const page    = await context.newPage();

try {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: shot('01-open'), fullPage: true });

  // ===== ログインが必要な場合(認証情報は必ず環境変数から) =====
  // await page.fill('#username', process.env.PORTAL_USER);
  // await page.fill('#password', process.env.PORTAL_PASS);
  // await page.click('button[type=submit]');
  // await page.waitForLoadState('networkidle');

  // ===== ここに入力処理を書く(送信ボタンは押さない) =====
  // await page.fill('#company', '株式会社DreamCreation');
  // await page.selectOption('#month', '7');
  // await page.check('#agree');

  // 代表に提示する「送信予定の内容」
  const payload = {
    // company: await page.inputValue('#company'),
    // month:   await page.inputValue('#month'),
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
} finally {
  await browser.close();
}
