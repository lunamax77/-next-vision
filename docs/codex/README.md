# Codex でジョブズ組織を動かす

Claude 版(`CLAUDE.md` + `.claude/skills/jobs/` + Claude Routines)と同じ組織を
OpenAI Codex(CLI / IDE / アプリ)で動かすためのセットアップ。

## 対応表

| 役割 | Claude 版 | Codex 版 |
| --- | --- | --- |
| 憲章(最上位ルール) | `CLAUDE.md` | `AGENTS.md`(Codex が自動で読む) |
| ジョブズ(CEO) | `.claude/skills/jobs/SKILL.md`(`/jobs`) | `.agents/skills/jobs/SKILL.md`(`$jobs`) |
| 担当AI 5部署 | Agent ツールでその場で生成 | `.codex/agents/*.toml` のカスタムエージェント |
| 定期ルーティン | claude.ai Routines | Codex アプリの Automations |
| Gmail / Calendar / Drive | claude.ai コネクタ | Codex の MCP サーバー設定 |

## 1. リポジトリを開くだけで有効になるもの

このリポジトリ直下で `codex` を起動すると、以下が自動で読み込まれる。

- `AGENTS.md` — 憲章
- `.agents/skills/jobs/SKILL.md` — ジョブズ。`$jobs` と打つか、「ジョブズ、〜」と話しかける
- `.codex/config.toml` と `.codex/agents/*.toml` — 担当AI(`sales` `marketing` `product` `operations` `finance`)

初回はプロジェクトを「信頼(trust)」する必要がある。Codex が確認を出したら承認する。

## 2. 使い方

```
$jobs 新規サービスのローンチ告知を準備したい
```

ジョブズが方針を提案 → 代表が承認 → 関係部署のサブエージェントを spawn → 統合報告、の流れで動く。
対外行為(送信・公開・支払い・提出)は最後の一歩で必ず止まり、代表の許可を待つ。

## 3. ルーティン(定時報告など)

Codex の Automations は Codex アプリの画面で作る(ファイルでは管理できない)。
内容とスケジュールは `docs/org/02-routines.md` にあるので、それをそのまま登録する。

Gmail / Google Calendar / Google Drive を読むには、Codex に MCP サーバーを接続する。
`~/.codex/config.toml` に例えば以下を追加する(サーバー名や URL は各サービスの提供する MCP に合わせる)。

```toml
[mcp_servers.gmail]
url = "https://gmailmcp.googleapis.com/mcp/v1"

[mcp_servers.google_calendar]
url = "https://calendarmcp.googleapis.com/mcp/v1"

[mcp_servers.google_drive]
url = "https://drivemcp.googleapis.com/mcp/v1"
```

追加後に `codex mcp login <名前>` などで OAuth 認証を済ませる。

## 4. Claude 版と同期を保つルール

- ルールを変えるときは `CLAUDE.md` と `AGENTS.md` を同時に直す。
- ジョブズの動きを変えるときは `.claude/skills/jobs/SKILL.md` と `.agents/skills/jobs/SKILL.md` を同時に直す。
- 部署の定義は `docs/org/departments/*.md` が正。変えたら `.codex/agents/*.toml` の
  developer_instructions も同じ内容に更新する。
- ルーティンを変えたら `docs/org/02-routines.md` を更新し、Claude / Codex 両方の登録を直す。
