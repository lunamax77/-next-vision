// キッズ・ライセンス・パーク動画を MP4 に書き出す
// 使い方: NODE_PATH=$(npm root -g) node render.js [出力ファイル] [--page cinema.html] [--preview 秒,秒,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith('--') && !/^[\d.,]+$/.test(a) && args[i - 1] !== '--page') || 'klp_display.mp4';
const pi = args.indexOf('--preview');
const gi = args.indexOf('--page');
const PAGE = gi >= 0 ? args[gi + 1] : 'index.html';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, PAGE));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const stage = await page.$('#stage');

  if (pi >= 0) { // 指定秒のスチルを書き出す
    for (const s of args[pi + 1].split(',')) {
      await page.evaluate(t => renderAt(t), +s);
      await stage.screenshot({ path: `preview_${s}.jpg`, type: 'jpeg', quality: 80 });
    }
    return browser.close();
  }

  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION, FPS }));
  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', process.env.CRF || '18', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = Math.round(DURATION * FPS);
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => renderAt(t), i / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stderr.write(`frame ${i}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', out);
})();
