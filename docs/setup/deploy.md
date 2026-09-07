# HP 自動デプロイ（GitHub Actions → CORESERVER）設定手順

**対象**: 竹村代表　**所要時間**: 約15分　**必要なもの**: CORESERVER の FTP 情報（サーバー名・アカウント名・パスワード）

## 仕組み（ざっくり）

- GitHub のブランチ `claude/hp-zip-import-a2ibct` に `site/` 配下の変更が push されると、
  GitHub Actions が自動で `site/` の中身をサーバーの `domains/nextvision.fun/public_html/` に **FTPS で同期**します。
- 設定ファイル: `.github/workflows/deploy.yml`
- **サーバー上の `.htaccess` / `.htpasswd` / `config.php` には一切触れません**（除外設定済み。消えたり上書きされたりしません）。
- サーバーにあってリポジトリに無いファイルも、**消しません**（「全消しモード」は無効にしています）。
- 差分だけをアップロードするため、サーバーに `.ftp-deploy-sync-state.json` という小さな管理ファイルが置かれます。消さないでください（消しても壊れませんが、次回は全ファイル再アップロードになります）。

---

## 手順1: CORESERVER の FTP 情報を確認する（5分）

1. CORESERVER のコントロールパネルにログイン → 左メニュー「**サイト設定**」または「**FTP設定**」を開く
2. 次の3つを控える（メモ帳などに一時的に貼る。他人に見せない）
   - **FTPサーバー名**（例: `v2011.coreserver.jp`）
   - **FTPアカウント（ユーザー名）**（例: `nextvision`）
   - **FTPパスワード**（コントロールパネルのパスワードと同じ場合が多い）
3. 公開ディレクトリが `/home/nextvision/domains/nextvision.fun/public_html/` であることを念のため確認
   （違う場合は `deploy.yml` の `server-dir:` を直す必要があります → 要連絡）

> **要確認**: CORESERVER は FTPS（FTP over TLS）を受け付ける設定になっています（多くのプランで標準対応）。
> もし手順3のテストで「TLS」「530」「connection refused」系のエラーが出た場合は、`deploy.yml` の `protocol: ftps` を
> `protocol: ftp` に変えると通ることがありますが、通信が暗号化されないため、まずはプロダクト担当に相談してください。

## 手順2: GitHub に Secrets（秘密の値）を登録する（5分）

パスワード等はリポジトリに書かず、GitHub の「Secrets」に入れます。

1. ブラウザで GitHub のこのリポジトリを開く
2. 上部タブ「**Settings**」をクリック
3. 左メニューの「**Secrets and variables**」→「**Actions**」をクリック
4. 緑の「**New repository secret**」ボタンを押し、以下を **1つずつ** 登録する（Name は大文字で正確に）

| Name（そのまま入力） | Secret（値） |
| --- | --- |
| `FTP_SERVER` | FTPサーバー名（例: `v2011.coreserver.jp`） |
| `FTP_USERNAME` | FTPアカウント名 |
| `FTP_PASSWORD` | FTPパスワード |

5. 3つ並んだことを確認する（値は登録後は見えません。間違えたら「Update」で入れ直し）

## 手順3: 初回は手動で実行して動作確認する（5分）

1. リポジトリ上部タブ「**Actions**」をクリック
2. 左の一覧から「**Deploy site to nextvision.fun**」をクリック
3. 右側の「**Run workflow**」ボタン → ブランチが `claude/hp-zip-import-a2ibct` になっていることを確認 → 緑の「**Run workflow**」
4. 数十秒後に一覧に実行が現れる。**緑のチェック** になれば成功
5. ブラウザで https://nextvision.fun/ を開き、右下に **緑のLINEボタン** が出ていれば反映されています
   （表示が古い場合は Ctrl+Shift+R（Mac: Cmd+Shift+R）で強制再読み込み）

初回は全ファイル（画像込み・約1.5MB）をアップロードするので 1〜2分かかります。2回目以降は変更分だけなので数十秒です。

## 手順4（初回のみ）: config.php をサーバー上に作る

問い合わせフォームの設定ファイル `config.php` は、秘密の値を含むため **自動デプロイの対象外** です。
サーバー上に1回だけ手で置きます。→ 手順は [form.md](form.md) の「手順3」を参照。

---

## 失敗したときの見方

1. Actions タブ → 赤い ✕ の実行をクリック → 左の「**deploy**」ジョブをクリック
2. 赤くなっているステップ（通常は「Sync to CORESERVER (FTPS)」）を展開してログを読む

| ログに出る言葉 | 原因と対処 |
| --- | --- |
| `530 Login incorrect` / `Authentication failed` | ユーザー名かパスワードが違う → Secrets を入れ直す |
| `ENOTFOUND` / `getaddrinfo` | `FTP_SERVER` のサーバー名が違う（`https://` や `/` は付けない） |
| `ETIMEDOUT` / `ECONNREFUSED` | サーバーが FTPS を受け付けていない、またはメンテ中 → 時間をおいて再実行。続く場合は要相談 |
| `550` / `No such file or directory` | `server-dir` のパスが違う → 公開ディレクトリのパスを確認 |
| 緑なのにサイトが変わらない | ブラウザキャッシュ。強制再読み込み。それでも変わらなければ `server-dir` が別の場所を指している可能性 |

## 日常の運用

- 通常は **何もしなくてOK**。ジョブズ／担当AIが `site/` を編集して push すると自動で反映されます。
- 手動で今すぐ反映したいときは手順3の「Run workflow」。
- **サーバー上で直接ファイルを編集しないでください**（次回デプロイで上書きされます）。例外は `.htaccess` `.htpasswd` `config.php` の3つだけです。
- FTP パスワードを変えたら Secrets の `FTP_PASSWORD` も更新してください。
