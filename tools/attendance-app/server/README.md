# サーバー側(CoreServer / Value-Domain 想定)デプロイ手順

## 1. 必要なもの

- CoreServer の FTP または SFTP 接続情報
- CoreServer の MySQL データベース(コントロールパネルから作成)
- PHP 8.0 以上(CoreServer の設定で選択)
- (Googleスプレッドシート連携を使う場合)Google Cloud のサービスアカウント

## 2. アップロード

`server/` ディレクトリ一式を、CoreServerの公開ディレクトリ配下(例: `attendance/`)にアップロードする。
フロントエンド(`index.html` / `app.js` / `config.js`)も同じドメイン配下に置く。

```
public_html/
  attendance/
    index.html
    app.js
    config.js
    server/
      api/save.php
      lib/
      db/schema.sql
      config.php        ← config.example.php をコピーして作成
      uploads/
```

## 3. データベース

1. CoreServerのコントロールパネルでMySQLデータベースを作成
2. `server/db/schema.sql` を実行してテーブルを作成
3. `server/config.example.php` を `config.php` としてコピーし、DB接続情報を入力

## 4. アプリ連携トークン

`config.php` の `app_token` に適当な文字列を設定し、フロントエンドの `config.js` の
`APP_TOKEN` に同じ値を設定する(簡易的な不正アクセス防止用。完全な認証ではない)。

`config.js` の `API_URL` に `https://your-domain.example.com/attendance/server/api/save.php` を設定する。

## 5. Googleスプレッドシート自動反映(任意)

1. Google Cloud Console でプロジェクトを作成
2. 「サービスアカウント」を作成し、JSON形式の鍵をダウンロード
3. ダウンロードしたJSONを `server/config.php` と同じ階層に `google-service-account.json` として設置
   (Web公開ディレクトリの外に置けるなら、そちらの方が安全)
4. 対象のGoogleスプレッドシートを開き、共有設定で
   サービスアカウントのメールアドレス(JSON内の `client_email`)を**編集者として共有**
5. `config.php` の `google.enabled` を `true` にし、`spreadsheet_id`(スプレッドシートのURLに含まれるID)と
   `sheet_range`(例: `シート1!A:H`)を設定

この手順(サービスアカウントの作成・外部サービスへの連携)は会社として初めて外部APIと接続する行為のため、
**実施前に代表の承認を得ること。**

## 6. 動作確認

ブラウザで `https://your-domain.example.com/attendance/` を開き、氏名を入力後、
いずれかのボタンで撮影 → 位置情報取得 → 「送信済み」に変わることを確認する。
