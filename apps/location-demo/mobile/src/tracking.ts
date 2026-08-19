// バックグラウンド位置追跡の本体。
//
// 重要: TaskManager.defineTask はアプリ起動時に必ず 1 回登録される必要がある
// (OS がアプリを裏で叩き起こしたときも同じ定義が要る)。そのため App.tsx から
// このファイルを import して、モジュール読み込み時に登録する。

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { sendPoints, startSession, stopSession, type Point } from './api';
import { loadSettings } from './config';
import { enqueue, flush } from './queue';

export const LOCATION_TASK = 'locdemo-background-location';
const AUTO_STOP_KEY = 'locdemo.autoStopAt.v1';

async function currentBattery(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? level : null;
  } catch {
    return null;
  }
}

function toPoint(loc: Location.LocationObject, battery: number | null): Point {
  return {
    lat: loc.coords.latitude,
    lon: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    battery,
    recordedAt: Math.round(loc.timestamp),
    source: 'native',
  };
}

// ---- OS から呼ばれるバックグラウンドタスク --------------------------------

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[tracking] タスクエラー:', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) return;

  // 自動停止の時刻を過ぎていたら、ここで自分を止める。
  // (画面が閉じていても止まるように、判定はタスク側に置く)
  const autoStopAt = Number(await AsyncStorage.getItem(AUTO_STOP_KEY)) || 0;
  if (autoStopAt && Date.now() > autoStopAt) {
    await stopTracking('auto_stop');
    return;
  }

  const battery = await currentBattery();
  await enqueue(locations.map((l) => toPoint(l, battery)));
  await flush(sendPoints);
});

// ---- 開始 / 停止 ----------------------------------------------------------

export type PermissionResult =
  | { ok: true }
  | { ok: false; reason: 'foreground_denied' | 'background_denied' | 'services_off'; message: string };

/**
 * 位置情報の許可を順に取る。
 * iOS/Android とも「アプリ使用中」を先に取ってからでないと「常に許可」を求められない。
 */
export async function requestPermissions(): Promise<PermissionResult> {
  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    return {
      ok: false,
      reason: 'services_off',
      message: '端末の位置情報サービスがオフです。設定からオンにしてください。',
    };
  }

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return {
      ok: false,
      reason: 'foreground_denied',
      message: '位置情報の利用が許可されていません。',
    };
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    return {
      ok: false,
      reason: 'background_denied',
      message:
        'バックグラウンドでの位置情報が許可されていません。' +
        '設定 > このアプリ > 位置情報 で「常に許可」を選んでください。',
    };
  }
  return { ok: true };
}

export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function getAutoStopAt(): Promise<number | null> {
  const v = Number(await AsyncStorage.getItem(AUTO_STOP_KEY));
  return v || null;
}

export async function startTracking(purpose = '技術デモ'): Promise<void> {
  const settings = await loadSettings();

  // 先にサーバー側で共有セッションを開く。ここが通らなければ収集は始めない。
  await startSession(purpose);

  const autoStopAt =
    settings.autoStopMin > 0 ? Date.now() + settings.autoStopMin * 60_000 : 0;
  await AsyncStorage.setItem(AUTO_STOP_KEY, String(autoStopAt));

  if (await isTracking()) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: settings.intervalMs,
    distanceInterval: settings.distanceM,
    // 止まっている間に OS が更新を止めてしまうと「共有中なのに来ない」ので切る
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    // iOS: 共有中は画面上部に青いインジケータを出す (利用者に見えている状態を保つ)
    showsBackgroundLocationIndicator: true,
    // Android: 常駐通知。OS の要件であり、同時に「今共有中」の表示でもある
    foregroundService: {
      notificationTitle: '位置情報を共有中',
      notificationBody: 'タップするとアプリが開きます。停止はアプリ内から行えます。',
      notificationColor: '#3ddc84',
      killServiceOnDestroy: false,
    },
    // まとめて配送させてバッテリーを節約する (キューがあるので遅延しても落ちない)
    deferredUpdatesInterval: settings.intervalMs,
    deferredUpdatesDistance: settings.distanceM,
  });
}

export async function stopTracking(reason = 'user_stop'): Promise<void> {
  if (await isTracking()) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await AsyncStorage.removeItem(AUTO_STOP_KEY);
  // 残りを送り切ってから、サーバーに共有終了を伝える
  await flush(sendPoints).catch(() => undefined);
  await stopSession(reason).catch((err) =>
    console.warn('[tracking] 停止通知に失敗:', err?.message)
  );
}

/** 画面が開いている間に手動で送信を試す (圏外復帰後など)。 */
export async function flushNow() {
  return flush(sendPoints);
}

/** 今の 1 点だけ取る (接続テスト用)。 */
export async function getCurrentPoint(): Promise<Point> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return toPoint(loc, await currentBattery());
}
