# 定期ルーティン

竹村代表のアカウントで動いている定期実行タスク(ルーティン)の定義。
本体は Claude(claude.ai の Routines)側に登録されており、リポジトリを複製しても自動では移らない。
Codex / Claude どちらでも同じものを再登録できるよう、ここに内容を記録する。
時刻は日本時間(JST)。cron は UTC 表記。

## 一覧

| # | 名前 | JST | cron (UTC) | 使うコネクタ | 通知 |
| --- | --- | --- | --- | --- | --- |
| 1 | 10:00時報告 | 毎日 10:00 | `0 1 * * *` | Gmail, Google Calendar, Google Drive | プッシュ |
| 2 | 17時報告 | 毎日 17:00 | `0 8 * * *` | Gmail, Google Calendar, Google Drive | プッシュ |
| 3 | 22:00報告 | 毎日 22:00 | `0 13 * * *` | Gmail, Google Calendar, Google Drive | プッシュ |
| 4 | Email deadline to calendar | 毎日 09:00 | `0 0 * * *` | Gmail, Google Calendar | プッシュ |

1〜3 は同じプロンプト(定時報告)。4 はメール内の期限をカレンダーへ登録する。

## プロンプト A: 定時報告(#1〜#3 共通)

```
Review and summarize inbox, calendar, and Google Drive updates. Post a notification report.

1. Email: Sort and summarize new messages by category (work, personal, etc.). Flag important or urgent items.
2. Calendar: List upcoming events for the next 7 days with key details.
3. Google Drive inbox: Read meeting notes and documents; provide concise summaries of new or updated items.
4. Report format: Show only new or updated items since the last report. Stack updates chronologically at the bottom. At the first report of the day (10:00), clear previous day's items and start fresh.

レポートは全て日本語で出力すること。また、項目ごと（メール/カレンダー/Google Driveなど）にセクションを分け、見出しと箇条書きを使って整理し、一目で見やすい形式で表示すること。

Keep summaries brief and scannable. If a section has no updates, omit it.
```

## プロンプト B: メール期限のカレンダー登録(#4)

```
Review incoming Gmail messages for deadlines and add them to Google Calendar.

1. Scan recent emails for explicit due dates, deadlines, or time-sensitive requests.
2. For each email with a deadline, create a Google Calendar event:
   - Title: brief description of the task or topic
   - Date/time: the deadline mentioned in the email
   - Guest: add dream.creation1203@gmail.com
   - Description: link or reference to the original email
3. Do not create events for noise (newsletters, notifications, marketing emails, or non-actionable messages).
4. If no emails with deadlines are found, confirm briefly.
```

> #4 はカレンダー登録という「外部サービスへの書き込み」を伴う。代表が自分のアカウントで
> 自分のカレンダーに登録するものなので、代表自身が設定した範囲内で動かす。ゲスト追加先や
> 動作範囲を変えるときは代表の判断で行う。

## 再登録の手順

### Claude(claude.ai Routines)
1. claude.ai → Code → Routines で「新規作成」。
2. 名前・cron・プロンプトを上の表とプロンプトのとおり入力。
3. コネクタに Gmail / Google Calendar / Google Drive を付与し、通知を「プッシュ」にする。

### Codex(Codex アプリの Automations)
1. Codex アプリ → Automations → 新規作成。
2. スケジュールを上の JST 時刻で設定(アプリ側はローカル時刻指定)。
3. プロンプトに上の内容を貼る。
4. Gmail / Google Calendar / Google Drive の MCP サーバーを Codex に接続しておく
   (`~/.codex/config.toml` の `[mcp_servers.*]`)。接続手順は `docs/codex/README.md`。
5. 完了通知を有効にする。

## 変更のルール

- ルーティンの追加・変更・削除は代表の判断で行い、このファイルも同時に更新する。
- ここに書いたものと実際の登録内容がずれた場合は、実際の登録内容を正としてこのファイルを直す。
