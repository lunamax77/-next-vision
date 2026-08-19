// 収集サーバーとの通信。フォアグラウンドからもバックグラウンドタスクからも同じ関数を使う。

import { Platform } from 'react-native';
import { getDeviceId, loadSettings, normalizeServerUrl } from './config';

export type Point = {
  lat: number;
  lon: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  recordedAt: number;
  source?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path: string, method: string, body?: unknown) {
  const s = await loadSettings();
  const base = normalizeServerUrl(s.serverUrl);
  if (!base) throw new ApiError('サーバーURLが未設定です', 0);
  if (!s.ingestToken) throw new ApiError('端末トークンが未設定です', 0);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${s.ingestToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data.code);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function identity() {
  const [id, s] = await Promise.all([getDeviceId(), loadSettings()]);
  return {
    deviceId: id,
    deviceName: s.deviceName.trim() || id,
    platform: `${Platform.OS} ${Platform.Version}`,
  };
}

/** 共有の開始をサーバーに記録する。これを呼ぶまでサーバーは位置を受け取らない。 */
export async function startSession(purpose: string): Promise<{ sessionId: number }> {
  return request('/api/v1/sessions/start', 'POST', { ...(await identity()), purpose });
}

export async function stopSession(reason: string): Promise<{ stopped: boolean }> {
  const { deviceId } = await identity();
  return request('/api/v1/sessions/stop', 'POST', { deviceId, reason });
}

export async function sendPoints(
  points: Point[]
): Promise<{ accepted: number; duplicated: number; rejected: string[] }> {
  return request('/api/v1/locations', 'POST', { ...(await identity()), points });
}

/** この端末がサーバーに送ったデータを全部消す。 */
export async function forgetMe(): Promise<{ deleted: { points: number; sessions: number } }> {
  const { deviceId } = await identity();
  return request('/api/v1/me', 'DELETE', { deviceId });
}

export async function ping(): Promise<boolean> {
  const s = await loadSettings();
  const base = normalizeServerUrl(s.serverUrl);
  if (!base) return false;
  try {
    const res = await fetch(base + '/healthz');
    return res.ok;
  } catch {
    return false;
  }
}
