'use strict';

// 位置情報リアルタイム収集デモ — 収集サーバー
// npm 依存ゼロ。Node.js 22.5 以上で `node server.js` だけで起動する。
//
// 設計方針
//  - 端末は「本人が開始したときだけ」送る。サーバーは共有セッション(開始/停止)を必ず記録する。
//  - 保存期間を過ぎたデータは自動で消す (RETENTION_HOURS)。
//  - 端末は自分のデータの全削除を自分で要求できる (DELETE /api/v1/me)。

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { open } = require('./db');

// ---------------------------------------------------------------- 設定

const CONFIG = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data', 'locations.db'),
  ingestToken: process.env.INGEST_TOKEN || '',
  adminToken: process.env.ADMIN_TOKEN || '',
  retentionHours: Number(process.env.RETENTION_HOURS || 72),
  maxBodyBytes: Number(process.env.MAX_BODY_BYTES || 256 * 1024),
  maxPointsPerRequest: Number(process.env.MAX_POINTS_PER_REQUEST || 200),
};

for (const key of ['ingestToken', 'adminToken']) {
  if (!CONFIG[key]) {
    console.error(
      `[config] ${key === 'ingestToken' ? 'INGEST_TOKEN' : 'ADMIN_TOKEN'} が未設定です。` +
        ' .env を用意するか環境変数で渡してください (README 参照)。'
    );
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(CONFIG.dbPath), { recursive: true });
const store = open(CONFIG.dbPath);

// ---------------------------------------------------------------- 補助

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function bearer(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > CONFIG.maxBodyBytes) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 1 点分の位置情報を検証して正規化する。壊れた値は理由つきで弾く。 */
function normalizePoint(raw, now) {
  const lat = num(raw.lat ?? raw.latitude);
  const lon = num(raw.lon ?? raw.lng ?? raw.longitude);
  if (lat === null || lon === null) return { error: 'lat/lon がありません' };
  if (lat < -90 || lat > 90) return { error: `lat が範囲外: ${lat}` };
  if (lon < -180 || lon > 180) return { error: `lon が範囲外: ${lon}` };

  let recordedAt = num(raw.recordedAt ?? raw.timestamp) ?? now;
  if (recordedAt < 1e12) recordedAt *= 1000; // 秒で来たらミリ秒へ
  recordedAt = Math.round(recordedAt);
  // 未来の時刻や、保存期間より古い時刻は受け取らない
  if (recordedAt > now + 5 * 60_000) return { error: '記録時刻が未来すぎます' };
  if (recordedAt < now - CONFIG.retentionHours * 3600_000) {
    return { error: '記録時刻が保存期間より古いです' };
  }

  return {
    point: {
      lat,
      lon,
      recordedAt,
      accuracy: num(raw.accuracy),
      altitude: num(raw.altitude),
      speed: num(raw.speed),
      heading: num(raw.heading),
      battery: num(raw.battery),
      source: typeof raw.source === 'string' ? raw.source.slice(0, 32) : null,
    },
  };
}

// ---------------------------------------------------------------- SSE

/** ダッシュボードへリアルタイム配信するための接続プール。 */
const subscribers = new Set();

function broadcast(event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    res.write(frame);
  }
}

setInterval(() => {
  for (const res of subscribers) res.write(': keepalive\n\n');
}, 25_000).unref();

// ---------------------------------------------------------------- ルート

const routes = [];
const route = (method, pattern, handler) =>
  routes.push({ method, pattern, handler });

/** 端末用トークン。位置の投稿と、自分のデータの削除だけができる。 */
function requireIngest(req, res) {
  const token = bearer(req);
  if (!token || !timingSafeEqual(token, CONFIG.ingestToken)) {
    json(res, 401, { error: '端末トークンが違います' });
    return false;
  }
  return true;
}

/** 管理用トークン。閲覧系。EventSource はヘッダを付けられないので ?token= も許す。 */
function requireAdmin(req, res, url) {
  const token = bearer(req) || url.searchParams.get('token');
  if (!token || !timingSafeEqual(token, CONFIG.adminToken)) {
    json(res, 401, { error: '管理トークンが違います' });
    return false;
  }
  return true;
}

function deviceIdOf(body) {
  const id = String(body.deviceId || '').trim();
  if (!id || id.length > 64 || !/^[\w.:@-]+$/.test(id)) return null;
  return id;
}

route('GET', /^\/healthz$/, (req, res) => {
  json(res, 200, { ok: true, uptimeSec: Math.round(process.uptime()) });
});

// --- 共有の開始 / 停止 (= 同意の記録) --------------------------------

route('POST', /^\/api\/v1\/sessions\/start$/, async (req, res) => {
  if (!requireIngest(req, res)) return;
  const body = await readBody(req);
  const deviceId = deviceIdOf(body);
  if (!deviceId) return json(res, 400, { error: 'deviceId が不正です' });

  const now = Date.now();
  const name = String(body.deviceName || deviceId).slice(0, 64);
  store.upsertDevice(deviceId, name, body.platform, now);
  const session = store.startSession(deviceId, body.purpose, now);

  broadcast('session', { deviceId, deviceName: name, sessionId: session.id, state: 'started', at: now });
  console.log(`[session] start device=${deviceId} session=${session.id}`);
  json(res, 200, { sessionId: session.id, startedAt: session.started_at ?? now });
});

route('POST', /^\/api\/v1\/sessions\/stop$/, async (req, res) => {
  if (!requireIngest(req, res)) return;
  const body = await readBody(req);
  const deviceId = deviceIdOf(body);
  if (!deviceId) return json(res, 400, { error: 'deviceId が不正です' });

  const now = Date.now();
  const stopped = store.stopSession(deviceId, body.reason, now);
  broadcast('session', { deviceId, state: 'stopped', at: now });
  console.log(`[session] stop  device=${deviceId} changed=${stopped}`);
  json(res, 200, { stopped });
});

// --- 位置の投稿 ------------------------------------------------------

route('POST', /^\/api\/v1\/locations$/, async (req, res) => {
  if (!requireIngest(req, res)) return;
  const body = await readBody(req);
  const deviceId = deviceIdOf(body);
  if (!deviceId) return json(res, 400, { error: 'deviceId が不正です' });

  const rawPoints = Array.isArray(body.points)
    ? body.points
    : body.lat !== undefined
      ? [body]
      : [];
  if (!rawPoints.length) return json(res, 400, { error: 'points が空です' });
  if (rawPoints.length > CONFIG.maxPointsPerRequest) {
    return json(res, 413, {
      error: `1 回に送れるのは ${CONFIG.maxPointsPerRequest} 点までです`,
    });
  }

  const now = Date.now();
  const name = String(body.deviceName || deviceId).slice(0, 64);
  store.upsertDevice(deviceId, name, body.platform, now);

  // 共有セッションが開いていない端末からの投稿は受け取らない。
  // 「本人が開始したときだけ集まる」という前提をサーバー側でも守る。
  const session = store.activeSession(deviceId);
  if (!session) {
    return json(res, 409, {
      error: '共有セッションが開始されていません。先に /sessions/start を呼んでください',
      code: 'no_active_session',
    });
  }

  let accepted = 0;
  let duplicated = 0;
  const rejected = [];
  const stored = [];

  for (const raw of rawPoints) {
    const { point, error } = normalizePoint(raw, now);
    if (error) {
      rejected.push(error);
      continue;
    }
    const isNew = store.insertPoint({
      ...point,
      deviceId,
      sessionId: session.id,
      receivedAt: now,
    });
    if (isNew) {
      accepted++;
      stored.push(point);
    } else {
      duplicated++;
    }
  }

  if (stored.length) {
    // 最新の 1 点だけをリアルタイム配信する (まとめ送信でも地図は最新位置を見たい)
    const latest = stored.reduce((a, b) => (b.recordedAt > a.recordedAt ? b : a));
    broadcast('point', {
      deviceId,
      deviceName: name,
      sessionId: session.id,
      ...latest,
      batchSize: stored.length,
    });
  }

  console.log(
    `[ingest] device=${deviceId} accepted=${accepted} dup=${duplicated} rejected=${rejected.length}`
  );
  json(res, 200, { accepted, duplicated, rejected, sessionId: session.id });
});

// --- 端末による自分のデータの削除 ------------------------------------

route('DELETE', /^\/api\/v1\/me$/, async (req, res) => {
  if (!requireIngest(req, res)) return;
  const body = await readBody(req);
  const deviceId = deviceIdOf(body);
  if (!deviceId) return json(res, 400, { error: 'deviceId が不正です' });
  const result = store.forgetDevice(deviceId);
  broadcast('forget', { deviceId, at: Date.now() });
  console.log(`[forget] device=${deviceId} points=${result.points}`);
  json(res, 200, { deleted: result });
});

// --- 閲覧系 (管理トークン) -------------------------------------------

route('GET', /^\/api\/v1\/devices$/, (req, res, _m, url) => {
  if (!requireAdmin(req, res, url)) return;
  const devices = store.listDevices();
  const latest = new Map(store.latestPoints().map((p) => [p.device_id, p]));
  json(res, 200, {
    devices: devices.map((d) => ({
      deviceId: d.id,
      deviceName: d.name,
      platform: d.platform,
      firstSeen: d.first_seen,
      lastSeen: d.last_seen,
      pointCount: d.point_count,
      sharing: d.active_session_id != null,
      latest: latest.get(d.id)
        ? {
            lat: latest.get(d.id).lat,
            lon: latest.get(d.id).lon,
            accuracy: latest.get(d.id).accuracy,
            battery: latest.get(d.id).battery,
            recordedAt: latest.get(d.id).recorded_at,
          }
        : null,
    })),
  });
});

route('GET', /^\/api\/v1\/devices\/([\w.:@-]+)\/track$/, (req, res, m, url) => {
  if (!requireAdmin(req, res, url)) return;
  const deviceId = decodeURIComponent(m[1]);
  const minutes = Math.min(Number(url.searchParams.get('minutes') || 120), 24 * 60);
  const since = Date.now() - minutes * 60_000;
  const points = store.track(deviceId, since).map((p) => ({
    lat: p.lat,
    lon: p.lon,
    accuracy: p.accuracy,
    speed: p.speed,
    battery: p.battery,
    recordedAt: p.recorded_at,
  }));
  json(res, 200, { deviceId, minutes, points });
});

route('GET', /^\/api\/v1\/devices\/([\w.:@-]+)\/sessions$/, (req, res, m, url) => {
  if (!requireAdmin(req, res, url)) return;
  const deviceId = decodeURIComponent(m[1]);
  json(res, 200, {
    deviceId,
    sessions: store.listSessions(deviceId).map((s) => ({
      id: s.id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      purpose: s.purpose,
      stopReason: s.stop_reason,
    })),
  });
});

route('GET', /^\/api\/v1\/stream$/, (req, res, _m, url) => {
  if (!requireAdmin(req, res, url)) return;
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
  subscribers.add(res);
  req.on('close', () => subscribers.delete(res));
});

// ---------------------------------------------------------------- 静的配信

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/dashboard.html' : pathname;
  const target = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });

  fs.readFile(target, (err, buf) => {
    if (err) return json(res, 404, { error: 'not found' });
    res.writeHead(200, {
      'content-type': MIME[path.extname(target)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(buf);
  });
}

// ---------------------------------------------------------------- 起動

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
      'access-control-max-age': '600',
    });
    return res.end();
  }
  res.setHeader('access-control-allow-origin', '*');

  try {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.pattern.exec(url.pathname);
      if (m) return await r.handler(req, res, m, url);
    }
    if (req.method === 'GET') return serveStatic(req, res, url.pathname);
    json(res, 404, { error: 'not found' });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    if (!res.headersSent) json(res, status, { error: err.message || 'internal error' });
  }
});

// 保存期間を過ぎた点を定期的に消す
const purge = () => {
  const cutoff = Date.now() - CONFIG.retentionHours * 3600_000;
  const removed = store.purgeOlderThan(cutoff);
  if (removed) console.log(`[purge] ${removed} 点を削除 (${CONFIG.retentionHours}時間より前)`);
};
setInterval(purge, 10 * 60_000).unref();
purge();

server.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`位置情報デモサーバー起動: http://${CONFIG.host}:${CONFIG.port}`);
  console.log(`  ダッシュボード : http://localhost:${CONFIG.port}/?token=<ADMIN_TOKEN>`);
  console.log(`  Web版クライアント: http://localhost:${CONFIG.port}/web-client.html`);
  console.log(`  DB             : ${CONFIG.dbPath}`);
  console.log(`  保存期間       : ${CONFIG.retentionHours} 時間`);
});

const shutdown = () => {
  console.log('\n停止します...');
  for (const res of subscribers) res.end();
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
