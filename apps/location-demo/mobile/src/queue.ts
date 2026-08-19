// 未送信の位置を端末に貯めておくキュー。
// 圏外・機内モード・サーバー停止のあいだも点を落とさず、復帰したらまとめて送る。

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Point } from './api';

const KEY = 'locdemo.queue.v1';
const STATS_KEY = 'locdemo.stats.v1';
const MAX_QUEUE = 5_000; // 端末に貯める上限。超えたら古い方から捨てる。
const BATCH = 100;       // サーバーの maxPointsPerRequest(200) 以内

export type Stats = {
  sent: number;
  queued: number;
  lastSentAt: number | null;
  lastError: string | null;
  lastPoint: Point | null;
};

export const EMPTY_STATS: Stats = {
  sent: 0, queued: 0, lastSentAt: null, lastError: null, lastPoint: null,
};

async function readQueue(): Promise<Point[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(points: Point[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(points.slice(-MAX_QUEUE)));
}

export async function getStats(): Promise<Stats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  const queued = (await readQueue()).length;
  if (!raw) return { ...EMPTY_STATS, queued };
  try {
    return { ...EMPTY_STATS, ...JSON.parse(raw), queued };
  } catch {
    return { ...EMPTY_STATS, queued };
  }
}

async function patchStats(patch: Partial<Stats>): Promise<void> {
  const current = await getStats();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
}

export async function resetStats(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, STATS_KEY]);
}

export async function enqueue(points: Point[]): Promise<void> {
  if (!points.length) return;
  const queue = await readQueue();
  queue.push(...points);
  await writeQueue(queue);
  await patchStats({ lastPoint: points[points.length - 1] });
}

/**
 * キューをサーバーへ送る。
 * 送信できた分だけキューから消すので、途中で失敗しても点は残る。
 */
export async function flush(
  send: (batch: Point[]) => Promise<{ accepted: number }>
): Promise<{ sent: number; remaining: number; error: string | null }> {
  let queue = await readQueue();
  let sentTotal = 0;

  while (queue.length) {
    const batch = queue.slice(0, BATCH);
    try {
      const res = await send(batch);
      queue = queue.slice(batch.length);
      await writeQueue(queue);
      sentTotal += res.accepted;
    } catch (err: any) {
      const message = err?.message ?? String(err);
      await patchStats({ lastError: message });
      return { sent: sentTotal, remaining: queue.length, error: message };
    }
  }

  if (sentTotal > 0) {
    const stats = await getStats();
    await patchStats({
      sent: stats.sent + sentTotal,
      lastSentAt: Date.now(),
      lastError: null,
    });
  }
  return { sent: sentTotal, remaining: 0, error: null };
}
