'use strict';

// サーバーの疎通確認。`node smoke-test.js` で起動〜投稿〜リアルタイム受信〜削除まで一通り試す。
// 実行中のサーバーがなければ自分で子プロセスとして起動する。

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORT = Number(process.env.SMOKE_PORT || 8899);
const BASE = `http://127.0.0.1:${PORT}`;
const INGEST = 'smoke-ingest-token';
const ADMIN = 'smoke-admin-token';
const DEVICE = 'smoke-device-1';

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name} ${detail}`); }
}

const call = (pathname, { method = 'GET', token = INGEST, body } = {}) =>
  fetch(BASE + pathname, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });

async function waitForServer(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/healthz');
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

async function main() {
  const dbPath = path.join(os.tmpdir(), `locdemo-smoke-${process.pid}.db`);
  const child = spawn(process.execPath, ['--no-warnings', path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT), HOST: '127.0.0.1',
      INGEST_TOKEN: INGEST, ADMIN_TOKEN: ADMIN,
      DB_PATH: dbPath, RETENTION_HOURS: '72',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  child.stdout.on('data', (d) => process.env.SMOKE_VERBOSE && process.stdout.write(`    [srv] ${d}`));

  const cleanup = () => {
    child.kill('SIGTERM');
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch {}
    }
  };

  try {
    console.log('サーバー起動を待機...');
    if (!(await waitForServer())) throw new Error('サーバーが起動しませんでした');

    console.log('\n認証');
    check('トークンなしの投稿は 401', (await call('/api/v1/locations', { method: 'POST', token: 'wrong', body: { deviceId: DEVICE } })).status === 401);
    check('端末トークンでは管理APIを見られない', (await call('/api/v1/devices', { token: INGEST })).status === 401);

    console.log('\nリアルタイム配信 (SSE)');
    const received = [];
    const ac = new AbortController();
    const sseReady = (async () => {
      const res = await fetch(`${BASE}/api/v1/stream?token=${ADMIN}`, { signal: ac.signal });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = /^event: (.+)$/m.exec(frame);
          const data = /^data: (.+)$/m.exec(frame);
          if (ev && data) received.push({ event: ev[1], data: JSON.parse(data[1]) });
        }
      }
    })();
    sseReady.catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    check('SSE が接続できる', received.some((r) => r.event === 'hello'));

    console.log('\n同意 (共有セッション)');
    check(
      'セッション未開始の投稿は 409',
      (await call('/api/v1/locations', { method: 'POST', body: { deviceId: DEVICE, lat: 35.68, lon: 139.76 } })).status === 409
    );
    const started = await (await call('/api/v1/sessions/start', {
      method: 'POST',
      body: { deviceId: DEVICE, deviceName: 'スモークテスト端末', platform: 'test', purpose: 'smoke' },
    })).json();
    check('共有セッションを開始できる', Number.isInteger(started.sessionId), JSON.stringify(started));

    console.log('\n位置の投稿');
    const now = Date.now();
    const ingest = await (await call('/api/v1/locations', {
      method: 'POST',
      body: {
        deviceId: DEVICE, deviceName: 'スモークテスト端末', platform: 'test',
        points: [
          { lat: 35.681236, lon: 139.767125, accuracy: 12, recordedAt: now - 20_000, battery: 0.82 },
          { lat: 35.682000, lon: 139.768000, accuracy: 9, recordedAt: now - 10_000, battery: 0.81 },
          { lat: 35.683000, lon: 139.769000, accuracy: 8, recordedAt: now, battery: 0.80 },
        ],
      },
    })).json();
    check('3 点が保存される', ingest.accepted === 3, JSON.stringify(ingest));

    const dup = await (await call('/api/v1/locations', {
      method: 'POST',
      body: { deviceId: DEVICE, points: [{ lat: 35.683, lon: 139.769, recordedAt: now }] },
    })).json();
    check('同じ点は重複として弾かれる', dup.accepted === 0 && dup.duplicated === 1, JSON.stringify(dup));

    const bad = await (await call('/api/v1/locations', {
      method: 'POST',
      body: { deviceId: DEVICE, points: [{ lat: 999, lon: 139.7, recordedAt: now }, { lon: 139.7 }] },
    })).json();
    check('壊れた座標は理由つきで弾かれる', bad.accepted === 0 && bad.rejected.length === 2, JSON.stringify(bad));

    await new Promise((r) => setTimeout(r, 300));
    check('SSE に位置が流れてくる', received.some((r) => r.event === 'point' && r.data.deviceId === DEVICE));
    check('SSE にセッション開始が流れてくる', received.some((r) => r.event === 'session' && r.data.state === 'started'));

    console.log('\n閲覧 (管理トークン)');
    const devices = await (await call('/api/v1/devices', { token: ADMIN })).json();
    const dev = devices.devices.find((d) => d.deviceId === DEVICE);
    check('端末一覧に出てくる', !!dev, JSON.stringify(devices));
    check('共有中フラグが立っている', dev?.sharing === true);
    check('最新位置が取れる', dev?.latest?.lat === 35.683, JSON.stringify(dev?.latest));
    check('累計点数が 3', dev?.pointCount === 3, String(dev?.pointCount));

    const track = await (await call(`/api/v1/devices/${DEVICE}/track?minutes=60`, { token: ADMIN })).json();
    check('軌跡が時刻順で取れる', track.points.length === 3 && track.points[0].recordedAt < track.points[2].recordedAt);

    console.log('\n停止と削除');
    const stopped = await (await call('/api/v1/sessions/stop', { method: 'POST', body: { deviceId: DEVICE, reason: 'smoke' } })).json();
    check('共有を停止できる', stopped.stopped === true);
    check(
      '停止後の投稿は 409 で拒否される',
      (await call('/api/v1/locations', { method: 'POST', body: { deviceId: DEVICE, lat: 35.7, lon: 139.7 } })).status === 409
    );

    const sessions = await (await call(`/api/v1/devices/${DEVICE}/sessions`, { token: ADMIN })).json();
    check('共有の開始/停止が記録されている', sessions.sessions.length === 1 && sessions.sessions[0].endedAt != null);

    const forgotten = await (await call('/api/v1/me', { method: 'DELETE', body: { deviceId: DEVICE } })).json();
    check('端末が自分のデータを全削除できる', forgotten.deleted.points === 3, JSON.stringify(forgotten));
    const after = await (await call('/api/v1/devices', { token: ADMIN })).json();
    check('削除後は端末一覧から消える', !after.devices.some((d) => d.deviceId === DEVICE));

    console.log('\n静的ファイル');
    check('ダッシュボードが配信される', (await fetch(BASE + '/')).status === 200);
    check('Web版クライアントが配信される', (await fetch(BASE + '/web-client.html')).status === 200);
    check('ディレクトリ外は読めない', (await fetch(BASE + '/../server.js')).status !== 200);

    ac.abort();
  } finally {
    cleanup();
  }

  console.log(`\n結果: ${passed} 件成功 / ${failed} 件失敗`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('スモークテストが異常終了:', err);
  process.exit(1);
});
