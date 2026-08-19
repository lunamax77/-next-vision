'use strict';

// 位置情報デモ用のストレージ層。
// npm 依存ゼロで動かすため、Node 標準の node:sqlite を使う (Node >= 22.5)。

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.error(
    '[db] node:sqlite が使えません。Node.js 22.5 以上で実行してください (現在: ' +
      process.version +
      ')'
  );
  throw err;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  platform    TEXT,
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  purpose     TEXT,
  stop_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions (device_id, started_at DESC);

CREATE TABLE IF NOT EXISTS points (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  session_id  INTEGER,
  recorded_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  lat         REAL NOT NULL,
  lon         REAL NOT NULL,
  accuracy    REAL,
  altitude    REAL,
  speed       REAL,
  heading     REAL,
  battery     REAL,
  source      TEXT
);
CREATE INDEX IF NOT EXISTS idx_points_device_time ON points (device_id, recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_dedup ON points (device_id, recorded_at, lat, lon);
`;

function open(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return new Store(db);
}

class Store {
  constructor(db) {
    this.db = db;
    this.s = {
      upsertDevice: db.prepare(`
        INSERT INTO devices (id, name, platform, first_seen, last_seen)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          platform = COALESCE(excluded.platform, devices.platform),
          last_seen = MAX(devices.last_seen, excluded.last_seen)
      `),
      listDevices: db.prepare(`
        SELECT d.id, d.name, d.platform, d.first_seen, d.last_seen,
               (SELECT COUNT(*) FROM points p WHERE p.device_id = d.id) AS point_count,
               (SELECT s.id FROM sessions s
                 WHERE s.device_id = d.id AND s.ended_at IS NULL
                 ORDER BY s.started_at DESC LIMIT 1) AS active_session_id
        FROM devices d
        ORDER BY d.last_seen DESC
      `),
      insertPoint: db.prepare(`
        INSERT OR IGNORE INTO points
          (device_id, session_id, recorded_at, received_at,
           lat, lon, accuracy, altitude, speed, heading, battery, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      latestPoints: db.prepare(`
        SELECT p.* FROM points p
        JOIN (SELECT device_id, MAX(recorded_at) AS t FROM points GROUP BY device_id) m
          ON m.device_id = p.device_id AND m.t = p.recorded_at
        GROUP BY p.device_id
      `),
      track: db.prepare(`
        SELECT * FROM points
        WHERE device_id = ? AND recorded_at >= ?
        ORDER BY recorded_at ASC
        LIMIT ?
      `),
      openSession: db.prepare(`
        SELECT * FROM sessions
        WHERE device_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1
      `),
      startSession: db.prepare(`
        INSERT INTO sessions (device_id, started_at, purpose) VALUES (?, ?, ?)
      `),
      endSession: db.prepare(`
        UPDATE sessions SET ended_at = ?, stop_reason = ?
        WHERE id = ? AND ended_at IS NULL
      `),
      endAllSessions: db.prepare(`
        UPDATE sessions SET ended_at = ?, stop_reason = ?
        WHERE device_id = ? AND ended_at IS NULL
      `),
      listSessions: db.prepare(`
        SELECT * FROM sessions WHERE device_id = ? ORDER BY started_at DESC LIMIT ?
      `),
      purgePoints: db.prepare('DELETE FROM points WHERE recorded_at < ?'),
      deleteDevicePoints: db.prepare('DELETE FROM points WHERE device_id = ?'),
      deleteDeviceSessions: db.prepare('DELETE FROM sessions WHERE device_id = ?'),
      deleteDevice: db.prepare('DELETE FROM devices WHERE id = ?'),
    };
  }

  upsertDevice(id, name, platform, now) {
    this.s.upsertDevice.run(id, name, platform ?? null, now, now);
  }

  listDevices() {
    return this.s.listDevices.all();
  }

  /** 端末が「共有中」であることを示すセッションを開始する (同意の記録)。 */
  startSession(deviceId, purpose, now) {
    const open = this.s.openSession.get(deviceId);
    if (open) return open;
    const res = this.s.startSession.run(deviceId, now, purpose ?? null);
    return this.s.openSession.get(deviceId) ?? { id: Number(res.lastInsertRowid) };
  }

  stopSession(deviceId, reason, now) {
    const res = this.s.endAllSessions.run(now, reason ?? 'user_stop', deviceId);
    return Number(res.changes) > 0;
  }

  activeSession(deviceId) {
    return this.s.openSession.get(deviceId) ?? null;
  }

  listSessions(deviceId, limit = 50) {
    return this.s.listSessions.all(deviceId, limit);
  }

  insertPoint(p) {
    const res = this.s.insertPoint.run(
      p.deviceId,
      p.sessionId ?? null,
      p.recordedAt,
      p.receivedAt,
      p.lat,
      p.lon,
      p.accuracy ?? null,
      p.altitude ?? null,
      p.speed ?? null,
      p.heading ?? null,
      p.battery ?? null,
      p.source ?? null
    );
    return Number(res.changes) > 0; // false = 重複でスキップ
  }

  latestPoints() {
    return this.s.latestPoints.all();
  }

  track(deviceId, sinceMs, limit = 5000) {
    return this.s.track.all(deviceId, sinceMs, limit);
  }

  purgeOlderThan(cutoffMs) {
    return Number(this.s.purgePoints.run(cutoffMs).changes);
  }

  /** 端末からの削除要求。位置の履歴・セッション・端末登録をすべて消す。 */
  forgetDevice(deviceId) {
    const points = Number(this.s.deleteDevicePoints.run(deviceId).changes);
    const sessions = Number(this.s.deleteDeviceSessions.run(deviceId).changes);
    this.s.deleteDevice.run(deviceId);
    return { points, sessions };
  }

  close() {
    this.db.close();
  }
}

module.exports = { open };
