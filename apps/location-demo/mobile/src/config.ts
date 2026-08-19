// 端末側の設定。バックグラウンドタスクは React の state を見られないので、
// 設定は必ず AsyncStorage 経由で読み書きする。

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'locdemo.settings.v1';
const DEVICE_ID_KEY = 'locdemo.deviceId.v1';

export type Settings = {
  serverUrl: string;
  ingestToken: string;
  deviceName: string;
  /** 位置を取りに行く間隔 (ミリ秒) */
  intervalMs: number;
  /** これだけ動いたら記録する (メートル)。0 なら時間間隔のみ */
  distanceM: number;
  /** 共有を自動停止するまでの時間 (分)。0 で無効 */
  autoStopMin: number;
};

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: '',
  ingestToken: '',
  deviceName: '',
  intervalMs: 15_000,
  distanceM: 10,
  autoStopMin: 120,
};

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

/** この端末を識別する ID。アプリを消すまで変わらない。 */
export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    id = `${Platform.OS}-${rand}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}
