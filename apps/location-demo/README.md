# 位置情報リアルタイム収集デモ

スマホの位置情報をリアルタイムに集めて地図に出す、社内技術検証用のデモ一式です。

- **サーバー**: Node.js、npm 依存ゼロ、SQLite (Node 標準) に保存
- **スマホ (ネイティブ)**: Expo / React Native。**アプリを閉じていても収集が続く**
- **スマホ (Web版)**: ブラウザだけで動く簡易クライアント。画面を開いている間のみ
- **ダッシュボード**: 地図上に現在地と軌跡をリアルタイム表示 (SSE)

---

## この作りの前提 — 「本人が開始したときだけ集める」

技術デモですが、位置情報は個人情報の中でも扱いの重い部類です。
このデモは最初から次の形で作ってあり、**こっそり追跡する用途には使えません**。

| | どう担保しているか |
| --- | --- |
| 本人が開始する | 端末側で明示的に「共有を開始」を押さないと 1 点も送られない |
| 動いているのが見える | Android は常駐通知、iOS は画面上部の青いインジケータ (OS の要件) |
| いつでも止められる | アプリ内の停止ボタン。押し忘れても既定 120 分で自動停止 |
| サーバーも同意を要求 | 共有セッションが開いていない端末からの投稿は `409` で拒否 |
| 記録が残る | 共有の開始/停止をすべて `sessions` テーブルに保存 |
| 勝手に貯めない | 保存期間 (既定 72 時間) を過ぎた位置は 10 分おきに自動削除 |
| 本人が消せる | 端末から自分のデータを全削除できる (`DELETE /api/v1/me`) |

他人の端末に本人の同意なく入れて追跡する目的では使いません。
実運用に出す前に、対象者への説明と同意取得を必ず行ってください
(→ `docs/privacy-and-consent.md`)。

---

## 5 分で動かす

### 1. サーバーを起動

```bash
cd apps/location-demo/server
cp .env.example .env

# トークンを 2 本生成して .env に書く
node -e "console.log('INGEST_TOKEN=' + require('crypto').randomBytes(24).toString('base64url'))"
node -e "console.log('ADMIN_TOKEN='  + require('crypto').randomBytes(24).toString('base64url'))"

npm start
```

依存パッケージのインストールは不要です (`npm install` は要りません)。
Node.js 22.5 以上が必要です。

### 2. 動作確認

```bash
npm run smoke     # 認証・同意・投稿・リアルタイム配信・削除まで 23 項目を自動検証
```

### 3. ダッシュボードを開く

```
http://localhost:8787/?token=<ADMIN_TOKEN>
```

### 4. スマホを繋ぐ

スマホから届く必要があるので、外から見える URL を用意します。

```bash
# 手軽な方法: Cloudflare のクイックトンネル (アカウント不要)
cloudflared tunnel --url http://localhost:8787
# → https://xxxx-xxxx.trycloudflare.com が発行される
```

同じ Wi-Fi にいるなら `http://<PCのローカルIP>:8787` でも構いません
(Web版クライアントは HTTPS が必須なので、その場合はトンネルを使ってください)。

**まず手早く試すなら Web版**: スマホのブラウザで `<URL>/web-client.html` を開き、
サーバーURL・トークン・端末名を入れて「位置の共有を開始」。

**バックグラウンド収集を試すならネイティブ版**: `mobile/README.md` を参照。
Android なら費用ゼロで APK を作れます。

---

## 構成

```
                スマホ (ネイティブ / Expo)              ブラウザ (Web版)
                  ├ 位置取得 (バックグラウンド可)         └ 位置取得 (画面表示中のみ)
                  └ 未送信バッファ (圏外でも落とさない)
                              │  HTTPS POST /api/v1/locations
                              ▼
                   ┌──────────────────────┐
                   │  収集サーバー (Node)     │
                   │  ・同意セッション検証     │
                   │  ・SQLite に保存        │
                   │  ・保存期間で自動削除     │
                   └──────────┬───────────┘
                              │  Server-Sent Events
                              ▼
                     管理ダッシュボード (地図)
```

### なぜこの技術構成か

| 選択 | 理由 |
| --- | --- |
| npm 依存ゼロ | 社内デモで `npm install` が通らない・監査が面倒、を避ける |
| SQLite (`node:sqlite`) | Node 22 標準。DB サーバーを別途立てなくていい |
| SSE (WebSocket ではない) | サーバー→ブラウザの一方向で十分。追加ライブラリも不要 |
| Expo / React Native | iOS/Android のバックグラウンド位置を 1 つのコードで扱える |

---

## API

すべて JSON。認証は `Authorization: Bearer <token>`。

### 端末用 (`INGEST_TOKEN`)

| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/v1/sessions/start` | 共有を開始。**これを呼ぶまで位置は受け付けない** |
| POST | `/api/v1/sessions/stop` | 共有を停止 |
| POST | `/api/v1/locations` | 位置を送る (1 回 200 点まで、まとめ送信可) |
| DELETE | `/api/v1/me` | この端末のデータを全削除 |

```bash
# 例: 共有を開始して 1 点送る
curl -X POST http://localhost:8787/api/v1/sessions/start \
  -H "authorization: Bearer $INGEST_TOKEN" -H 'content-type: application/json' \
  -d '{"deviceId":"test-1","deviceName":"テスト端末","purpose":"疎通確認"}'

curl -X POST http://localhost:8787/api/v1/locations \
  -H "authorization: Bearer $INGEST_TOKEN" -H 'content-type: application/json' \
  -d '{"deviceId":"test-1","points":[{"lat":35.681236,"lon":139.767125,"accuracy":10}]}'
```

### 管理用 (`ADMIN_TOKEN`)

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/v1/devices` | 端末一覧と最新位置 |
| GET | `/api/v1/devices/:id/track?minutes=120` | 軌跡 |
| GET | `/api/v1/devices/:id/sessions` | 共有の開始/停止履歴 |
| GET | `/api/v1/stream?token=...` | リアルタイム配信 (SSE) |

**`ADMIN_TOKEN` は全端末の位置が見えます。スマホには絶対に入れないでください。**

## 設定 (`.env`)

| 変数 | 既定 | 説明 |
| --- | --- | --- |
| `PORT` | `8787` | 待ち受けポート |
| `INGEST_TOKEN` | (必須) | 端末に配るトークン |
| `ADMIN_TOKEN` | (必須) | ダッシュボード用トークン |
| `RETENTION_HOURS` | `72` | この時間を過ぎた位置は自動削除 |
| `DB_PATH` | `./data/locations.db` | SQLite ファイル |

---

## デモとして割り切っている点

本番運用にするなら、ここは足りません。

- **端末ごとの認証がない**: 全端末が同じ `INGEST_TOKEN` を共有します。
  他人の `deviceId` を騙る偽装を防げません。本番は端末ごとの発行・失効が必要です。
- **HTTPS はサーバー自身では張っていません**: トンネルやリバースプロキシ前提です。
- **保存データは暗号化していません**: SQLite ファイルをそのまま置いています。
- **監査ログが最小限**: 誰がダッシュボードを見たかは記録していません。
- **地図タイルは OpenStreetMap** を使っています。位置データ自体は外部に出ませんが、
  地図を表示した範囲は OSM 側のアクセスログに残ります。

---

## 関連ドキュメント

- `mobile/README.md` — ネイティブアプリのビルドと配布
- `docs/privacy-and-consent.md` — 同意取得・保管・削除の運用ルール (社内ドラフト)
