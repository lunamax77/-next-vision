// 位置情報リアルタイム収集デモ — スマホ側アプリ (Expo / React Native)
//
// 画面は 1 枚。設定を入れて「共有を開始」を押すと、バックグラウンドでも
// 位置がサーバーへ送られる。共有中は Android では常駐通知、iOS では
// 画面上部の青いインジケータが出るので、本人から見て隠れない。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { forgetMe, ping } from './src/api';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, getDeviceId, type Settings } from './src/config';
import { getStats, resetStats, type Stats, EMPTY_STATS } from './src/queue';
import {
  flushNow, getAutoStopAt, getCurrentPoint, isTracking,
  requestPermissions, startTracking, stopTracking,
} from './src/tracking';

const C = {
  bg: '#0f1115', panel: '#171a21', line: '#262b36',
  text: '#e6e9ef', muted: '#8b93a7', live: '#3ddc84', stop: '#ff6b6b', accent: '#4c9aff',
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deviceId, setDeviceId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [autoStopAt, setAutoStopAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 初期化と状態のポーリング
  const refresh = useCallback(async () => {
    setTracking(await isTracking());
    setStats(await getStats());
    setAutoStopAt(await getAutoStopAt());
  }, []);

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setDeviceId(await getDeviceId());
      await refresh();
      setLoaded(true);
    })();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  // 入力のたびに保存すると重いので少し待ってから書く
  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveSettings(next), 400);
      return next;
    });
  };

  // ---- 操作
  const onStart = async () => {
    if (!settings.serverUrl.trim() || !settings.ingestToken.trim()) {
      Alert.alert('設定が足りません', 'サーバーURLと端末トークンを入力してください。');
      return;
    }
    setBusy(true);
    try {
      await saveSettings(settings);

      if (!(await ping())) {
        Alert.alert('サーバーに繋がりません', 'URL と、同じネットワークにいるかを確認してください。');
        return;
      }
      const perm = await requestPermissions();
      if (!perm.ok) {
        Alert.alert('位置情報の許可が必要です', perm.message);
        return;
      }
      await startTracking('技術デモ (ネイティブ版)');
      await refresh();
    } catch (err: any) {
      Alert.alert('開始できませんでした', err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    setBusy(true);
    try {
      await stopTracking('user_stop');
      await refresh();
    } catch (err: any) {
      Alert.alert('停止時にエラー', err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const onTestPoint = async () => {
    setBusy(true);
    try {
      const p = await getCurrentPoint();
      Alert.alert(
        '現在地',
        `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}\n精度 ±${Math.round(p.accuracy ?? 0)}m`
      );
    } catch (err: any) {
      Alert.alert('取得できません', err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const onFlush = async () => {
    setBusy(true);
    try {
      const r = await flushNow();
      Alert.alert('送信', r.error ? `失敗: ${r.error}` : `${r.sent} 点を送信しました`);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onForget = () => {
    Alert.alert(
      'データを全削除しますか？',
      'この端末がサーバーに送った位置情報と共有履歴をすべて消します。元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              if (await isTracking()) await stopTracking('forget');
              const r = await forgetMe();
              await resetStats();
              await refresh();
              Alert.alert('削除しました', `位置 ${r.deleted.points} 点を削除しました。`);
            } catch (err: any) {
              Alert.alert('削除に失敗', err?.message ?? String(err));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (!loaded) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator color={C.live} />
      </SafeAreaView>
    );
  }

  const remainMin = autoStopAt ? Math.max(0, Math.round((autoStopAt - Date.now()) / 60000)) : null;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.h1}>位置共有 (デモ)</Text>
          <Text style={s.sub}>端末ID: {deviceId}</Text>

          {tracking && (
            <View style={s.liveBanner}>
              <Text style={s.liveText}>📍 位置を共有中です</Text>
              <Text style={s.liveSub}>
                {remainMin !== null
                  ? `あと約 ${remainMin} 分で自動停止します。`
                  : '自動停止は無効です。'}
                {'\n'}アプリを閉じても共有は続きます。停止はこの画面から。
              </Text>
            </View>
          )}

          <View style={s.notice}>
            <Text style={s.noticeText}>
              <Text style={s.noticeStrong}>送る内容</Text>: 緯度・経度・精度・速度・時刻・電池残量{'\n'}
              <Text style={s.noticeStrong}>送り先</Text>: 下に設定したサーバーのみ{'\n'}
              <Text style={s.noticeStrong}>止め方</Text>: この画面の「共有を停止」。いつでも止められます{'\n'}
              <Text style={s.noticeStrong}>削除</Text>: 一番下のボタンでサーバー側も全部消せます
            </Text>
          </View>

          <Section title="接続設定">
            <Field label="サーバーURL">
              <TextInput
                style={s.input} value={settings.serverUrl}
                onChangeText={(v) => update({ serverUrl: v })}
                placeholder="https://xxxx.trycloudflare.com" placeholderTextColor={C.muted}
                autoCapitalize="none" autoCorrect={false} keyboardType="url"
                editable={!tracking}
              />
            </Field>
            <Field label="端末トークン (INGEST_TOKEN)">
              <TextInput
                style={s.input} value={settings.ingestToken}
                onChangeText={(v) => update({ ingestToken: v })}
                secureTextEntry autoCapitalize="none" autoCorrect={false}
                editable={!tracking}
              />
            </Field>
            <Field label="端末名 (ダッシュボードでの表示名)">
              <TextInput
                style={s.input} value={settings.deviceName}
                onChangeText={(v) => update({ deviceName: v })}
                placeholder="例: 竹村スマホ" placeholderTextColor={C.muted}
                editable={!tracking}
              />
            </Field>
          </Section>

          <Section title="収集の設定">
            <NumberField
              label="送信間隔 (秒)" value={Math.round(settings.intervalMs / 1000)}
              onChange={(v) => update({ intervalMs: Math.max(5, v) * 1000 })}
              disabled={tracking} hint="短いほど電池を使います。実用は 15〜60 秒。"
            />
            <NumberField
              label="最小移動距離 (m)" value={settings.distanceM}
              onChange={(v) => update({ distanceM: Math.max(0, v) })}
              disabled={tracking} hint="これだけ動いたら記録。0 で時間間隔のみ。"
            />
            <NumberField
              label="自動停止 (分)" value={settings.autoStopMin}
              onChange={(v) => update({ autoStopMin: Math.max(0, v) })}
              disabled={tracking} hint="止め忘れ防止。0 で無効。"
            />
          </Section>

          <Pressable
            style={[s.mainBtn, tracking ? s.mainBtnStop : s.mainBtnStart, busy && s.btnBusy]}
            onPress={tracking ? onStop : onStart}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#06240f" />
              : <Text style={[s.mainBtnText, tracking && s.mainBtnTextStop]}>
                  {tracking ? '共有を停止' : '位置の共有を開始'}
                </Text>}
          </Pressable>

          <Section title="状態">
            <Row label="状態" value={tracking ? '共有中' : '停止中'} />
            <Row label="送信済み" value={`${stats.sent} 点`} />
            <Row label="未送信 (端末に保持)" value={`${stats.queued} 点`} />
            <Row
              label="最終送信"
              value={stats.lastSentAt ? new Date(stats.lastSentAt).toLocaleTimeString('ja-JP') : '—'}
            />
            <Row
              label="最終取得位置"
              value={stats.lastPoint
                ? `${stats.lastPoint.lat.toFixed(5)}, ${stats.lastPoint.lon.toFixed(5)}`
                : '—'}
            />
            {!!stats.lastError && <Row label="直近のエラー" value={stats.lastError} danger />}
          </Section>

          <View style={s.btnRow}>
            <Pressable style={[s.subBtn, s.flex]} onPress={onTestPoint} disabled={busy}>
              <Text style={s.subBtnText}>現在地を1回取得</Text>
            </Pressable>
            <Pressable style={[s.subBtn, s.flex]} onPress={onFlush} disabled={busy}>
              <Text style={s.subBtnText}>未送信を今すぐ送る</Text>
            </Pressable>
          </View>

          <Pressable style={s.dangerBtn} onPress={onForget} disabled={busy}>
            <Text style={s.dangerBtnText}>サーバー上のこの端末のデータを全削除</Text>
          </Pressable>

          <Text style={s.footer}>
            社内デモ用。第三者の位置を本人の同意なく収集する用途には使いません。
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- 小さな表示部品 --------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function NumberField({
  label, value, onChange, disabled, hint,
}: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; hint?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input} value={text} editable={!disabled} keyboardType="number-pad"
        onChangeText={setText}
        onBlur={() => {
          const n = parseInt(text, 10);
          if (Number.isFinite(n)) onChange(n);
          else setText(String(value));
        }}
      />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, danger && s.rowValueDanger]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  h1: { color: C.text, fontSize: 22, fontWeight: '700' },
  sub: { color: C.muted, fontSize: 11, marginTop: 2, marginBottom: 16 },

  liveBanner: {
    backgroundColor: '#16301c', borderColor: '#2c6b3c', borderWidth: 1,
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  liveText: { color: C.live, fontSize: 15, fontWeight: '700' },
  liveSub: { color: '#a8d8b6', fontSize: 12, marginTop: 6, lineHeight: 18 },

  notice: {
    backgroundColor: C.panel, borderColor: C.line, borderWidth: 1,
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  noticeText: { color: C.muted, fontSize: 12, lineHeight: 20 },
  noticeStrong: { color: C.text, fontWeight: '700' },

  section: {
    backgroundColor: C.panel, borderColor: C.line, borderWidth: 1,
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },

  field: { marginTop: 10 },
  label: { color: C.muted, fontSize: 12, marginBottom: 5 },
  hint: { color: C.muted, fontSize: 11, marginTop: 4 },
  input: {
    backgroundColor: '#10131a', color: C.text, borderColor: C.line, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },

  mainBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  mainBtnStart: { backgroundColor: C.live },
  mainBtnStop: { backgroundColor: C.stop },
  mainBtnText: { color: '#06240f', fontSize: 17, fontWeight: '800' },
  mainBtnTextStop: { color: '#fff' },
  btnBusy: { opacity: 0.6 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  rowLabel: { color: C.muted, fontSize: 13 },
  rowValue: { color: C.text, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  rowValueDanger: { color: C.stop },

  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  subBtn: {
    backgroundColor: 'transparent', borderColor: C.line, borderWidth: 1,
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  subBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },

  dangerBtn: {
    borderColor: C.stop, borderWidth: 1, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  dangerBtnText: { color: C.stop, fontSize: 13, fontWeight: '600' },

  footer: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
