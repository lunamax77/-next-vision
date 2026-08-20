# ブラウザ自動化 セットアップ手順

## モードA: ヘッドレス(準備不要)

Playwright(v1.56)とChromiumは導入済み。そのまま実行できる。

```bash
node scripts/headless-template.mjs
```

`Cannot find module 'playwright'` が出た場合のみ、作業ディレクトリで:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.56.1
```

> **バージョン固定は必須。** 導入済みブラウザは chromium-1194 (= Playwright 1.56系)。
> `npm i playwright` で最新版(1.62等)を入れると噛み合わず、
> `Please run the following command to download new browsers` で起動に失敗する。
>
> **`npx playwright install` は実行しない。** ブラウザは `/opt/pw-browsers` に導入済み。
> 実体: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`

### クラウド環境のネットワーク制限

クラウド実行時は外向き通信がプロキシ＋ネットワークポリシー配下にある。
許可されていない外部サイトは `ERR_TUNNEL_CONNECTION_FAILED` になる。

- これは**スクリプトの不具合ではない**。`curl -sS -o /dev/null -w '%{http_code}' <URL>` で
  同様に弾かれるなら、ポリシー側の制限。代表に報告し、ローカル実行を検討する。
- ローカル(127.0.0.1)への接続はテンプレートで除外済み
  (`--proxy-bypass-list=<-loopback>;localhost;127.0.0.1`)。これが無いと
  ローカルのテストサーバまでプロキシに回されて 405 になる。

---

## モードB: CDP接続(ログイン済みChromeを操作)

### これができる条件

- **代表のPC上で動くClaude Code(ローカル版)**であること。
  claude.ai/code などのクラウドセッションからは、代表PCのブラウザに接続できない。
- Chromeを**デバッグポート付きで起動**していること。

### 手順1: Chromeをデバッグ起動する

**Mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/chrome-automation"
```

**Windows (PowerShell):**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\chrome-automation"
```

### 手順2: 使う画面にログインしておく

上のコマンドで開いたChromeは**専用プロファイル**(`chrome-automation`)で動く。
普段のChromeとは別なので、**最初の1回だけ、操作したい管理画面・ポータルに手でログインする。**
以降はそのプロファイルにログイン状態が残るので、毎回のログインは不要。

> 普段使いのプロファイルをそのまま使う方法もあるが、Chromeを完全終了させる必要があり、
> 自動操作が普段のブラウジングに干渉する。**専用プロファイルを推奨。**

### 手順3: 接続して実行

```bash
node scripts/cdp-template.mjs
```

接続先を変えたい場合は `CDP_URL=http://localhost:9222` を指定。

### うまくいかないとき

| 症状 | 対処 |
| --- | --- |
| `Chromeに接続できません` | 手順1のコマンドでChromeが起動しているか確認。ポート9222が使われているか `curl http://localhost:9222/json/version` で確認 |
| ログインが切れている | 手順2をやり直す(専用プロファイルで手動ログイン) |
| 別のタブが操作された | スクリプトは最後のタブを使う。操作したいタブを最前面・最後に開いておく |

---

## 認証情報の扱い

- **スクリプトに直書きしない。** 環境変数で渡す。
  ```bash
  PORTAL_USER='xxx' PORTAL_PASS='yyy' node scripts/headless-template.mjs
  ```
- 認証情報を**リポジトリにコミットしない**(`.env` を使う場合は `.gitignore` に入れる)。
- **スクリーンショットにID/パスワードが写り込んでいないか**確認してから共有する。
- ログイン済みブラウザ(モードB)が使えるなら、パスワードを扱わずに済むぶん安全。

---

## 出力ファイルの置き場

スクショ・取得データは `OUT_DIR`(既定 `./work/browser-out`)に**新規ファイル**として保存する。
既存の会社データ・原本は書き換えない(会社憲章 第4-1項 原本不可侵)。
