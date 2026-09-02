# サーバー側(CoreServer / Value-Domain 想定)デプロイ手順

## 1. 必要なもの

- CoreServer の FTP または SFTP 接続情報
- CoreServer の MySQL データベース(コントロールパネルから作成)
- PHP 8.0 以上(CoreServer の設定で選択)
- (Googleスプレッドシート連携を使う場合)Google Cloud のサービスアカウント

## 2. アップロード

`server/` と `admin/` を、CoreServerの公開ディレクトリ配下(例: `attendance/`)にアップロードする。
フロントエンド(`index.html` / `app.js` / `config.js`)も同じドメイン配下に置く。

```
public_html/
  attendance/
    index.html
    app.js
    config.js
    admin/
      index.html       (本日の状況)
      accounts.html    (アカウント管理)
      style.css
      .htaccess
      .htpasswd         ← git管理外。代表に別途共有された値を設置
    server/
      api/save.php
      api/login.php
      admin_api/
        today.php
        accounts.php
        .htaccess
        .htpasswd       ← admin/.htpasswd と同じ内容
      lib/
      db/schema.sql
      db/migration_*.sql  ← 既存環境には差分だけ適用
      config.php        ← config.example.php をコピーして作成
      uploads/
```

## 3. データベース

1. CoreServerのコントロールパネルでMySQLデータベースを作成
2. 新規構築なら `server/db/schema.sql` を実行してテーブルを作成。
   既存環境をアップデートする場合は `server/db/migration_*.sql` を日付順に実行する
3. `server/config.example.php` を `config.php` としてコピーし、DB接続情報を入力

## 4. アプリ連携トークン

`config.php` の `app_token` に適当な文字列を設定し、フロントエンドの `config.js` の
`APP_TOKEN` に同じ値を設定する(簡易的な不正アクセス防止用。完全な認証ではない)。

`config.js` の `API_URL` に `https://your-domain.example.com/attendance/server/api/save.php` を設定する。

## 5. 管理画面(Basic認証)

`admin/.htaccess` と `server/admin_api/.htaccess` の `AuthUserFile` には、現行の本番サーバー
(`/virtual/dcreation/public_html/...`)向けの絶対パスを設定済み。別サーバーに移す場合はパスを
書き換えること。
`.htpasswd` はそれぞれのディレクトリに同じ内容を設置する(git管理外のため、代表から個別に共有された
ファイルを使う)。

管理画面(`admin/index.html`)からスタッフアカウントを発行すると、ID・パスワードがその場でのみ
表示される。控えてスタッフ本人に伝えること(再表示はできないため、必要なら「PW再発行」で再発行する)。

## 6. Googleスプレッドシート自動反映(任意)

1. Google Cloud Console でプロジェクトを作成
2. 「サービスアカウント」を作成し、JSON形式の鍵をダウンロード
3. ダウンロードしたJSONを `server/config.php` と同じ階層に `google-service-account.json` として設置
   (Web公開ディレクトリの外に置けるなら、そちらの方が安全)
4. 対象のGoogleスプレッドシートを開き、共有設定で
   サービスアカウントのメールアドレス(JSON内の `client_email`)を**編集者として共有**
5. `config.php` の `google.enabled` を `true` にし、`spreadsheet_id`(スプレッドシートのURLに含まれるID)と
   `sheet_range`(例: `シート1!A:J`)を設定

この手順(サービスアカウントの作成・外部サービスへの連携)は会社として初めて外部APIと接続する行為のため、
**実施前に代表の承認を得ること。**

反映される列は左から: 記録日時 / 氏名 / 種別 / 移動手段 / 経路 / 金額 / 住所 / 地図URL / 精度(m) / 写真URL

住所はOpenStreetMap(Nominatim、APIキー不要の無料サービス)への逆ジオコーディングで取得しています。
座標のみが外部に送信され、取得できなかった場合は空欄のまま記録は継続します。

## 7. 動作確認

1. `admin/accounts.html` を開き(Basic認証)、テスト用アカウントを1件発行する
2. `https://your-domain.example.com/attendance/` を開き、発行したID/PWでログイン
3. いずれかのボタンで位置情報取得 → 撮影 → 記録されることを確認
4. `admin/index.html` にその記録(写真・住所)が反映されているか確認
