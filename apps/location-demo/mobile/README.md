# スマホ側アプリ (ネイティブ / Expo)

バックグラウンドでも位置を送り続ける本命のクライアント。
アプリを閉じても、画面を消しても、収集は続きます。

## なぜネイティブが要るのか

ブラウザ (PWA) は、タブが裏に回ると OS が JavaScript を止めます。
特に iOS Safari はバックグラウンドでの位置取得を一切許していません。
**「バックグラウンドで継続的に収集」は、ネイティブアプリでしか実現できません。**

このアプリは OS 公式の仕組みを使います。

| | 仕組み | 利用者から見た表示 |
| --- | --- | --- |
| Android | フォアグラウンドサービス (位置種別) | 常駐通知が出る (消せない) |
| iOS | Background Modes: location | 画面上部に青いインジケータが出る |

どちらも「動いていることが本人に見える」のが OS の要件です。
このデモはその表示を消しません。隠して動かす作りにはしていません。

## Expo Go では動きません

バックグラウンド位置情報は Expo Go アプリでは使えません (SDK の制約)。
**開発ビルド (development build) を作る必要があります。**

### Android (推奨・費用ゼロ)

```bash
cd apps/location-demo/mobile
npm install
npx expo install --fix          # SDK に合うバージョンへ揃える

# EAS クラウドビルド (Expo の無料枠でも可。要 Expo アカウント)
npx eas login
npx eas build --profile development --platform android
# → 出てきた APK の URL を Android 端末で開いてインストール

npx expo start --dev-client     # 開発サーバー。端末のアプリから読み込む
```

Android Studio がある PC なら、クラウドを使わずローカルでも作れます。

```bash
npx expo run:android            # USB 接続した端末に直接インストール
```

ストア審査は不要です。APK を配るだけで社内テストできます。

### iOS

iOS は実機に入れるだけで Apple の署名が要ります。

- **Apple Developer Program (年 99 USD)** があれば
  `npx eas build --profile development --platform ios` で内部配布できます。
- 無料の Apple ID + Xcode なら 7 日間だけ有効な署名で実機に入れられます
  (`npx expo run:ios` を Mac で実行)。7 日ごとに入れ直しが必要です。
- **費用と Apple アカウントの用意は対外的な契約・支払いになるため、代表の承認が要ります。**

まず Android だけでテストして、必要になってから iOS を判断するのが安全です。

## 使い方

1. サーバーを起動して、`INGEST_TOKEN` を手元に用意する
2. アプリを開き、サーバーURL・端末トークン・端末名を入れる
3. 「位置の共有を開始」→ 位置情報の許可を **「常に許可」** で与える
4. ダッシュボード (`/?token=<ADMIN_TOKEN>`) に現在地が出る
5. 終わったら「共有を停止」。押し忘れても自動停止 (既定 120 分) で止まります

### 設定項目

| 項目 | 既定値 | 意味 |
| --- | --- | --- |
| 送信間隔 | 15 秒 | 短いほど電池を食う。実用は 15〜60 秒 |
| 最小移動距離 | 10 m | これだけ動いたら記録。0 で時間間隔のみ |
| 自動停止 | 120 分 | 止め忘れ防止。0 で無効 |

## 圏外に入ったら

未送信の点は端末内に最大 5,000 点まで貯まり、通信が戻ると自動でまとめて送られます
(`src/queue.ts`)。地下鉄・山間部でも軌跡は途切れません。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `App.tsx` | 画面 (設定・開始/停止・状態表示・データ削除) |
| `src/tracking.ts` | バックグラウンドタスクの登録と開始/停止 |
| `src/queue.ts` | 未送信バッファ (圏外対策) |
| `src/api.ts` | サーバーとの通信 |
| `src/config.ts` | 設定と端末IDの保存 |
| `app.json` | 権限・バックグラウンドモードの宣言 |

## 注意

- `ACCESS_BACKGROUND_LOCATION` / `UIBackgroundModes: location` は、ストアに出す場合
  審査で用途説明を強く求められます。社内配布 (APK 直配り・内部テスト) なら不要です。
- Android 14 以降はフォアグラウンドサービスの種別宣言が必須です。`app.json` で
  `FOREGROUND_SERVICE_LOCATION` を宣言済みです。
