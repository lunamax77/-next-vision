# REA(Reverse Engineer Anything)導入メモ

- 公式: npm `rea-agents`(v6.8.0 確認)/ GitHub `morluto/rea`
- 偽物の配布サイトに注意。上記以外から入手しない。
- ジョブズでの使い方: `.claude/skills/jobs/SKILL.md` の「REAの活用」

## 導入(Claude Code)

前提: Node.js / npm。Ghidra 等の解析ツールは任意(REA は自動インストールしない)。

```bash
npm install --global rea-agents
```

```bash
rea setup --client claude_code --dry-run
```

```bash
rea setup --client claude_code --yes
```

```bash
rea doctor
```

- setup で MCP サーバー登録 + `~/.claude/skills/reverse-engineer-anything` が入る。
- 導入後は Claude Code を再起動。
- クラウドセッションはコンテナが毎回作り直されるため、都度導入が必要(またはセッション環境のセットアップスクリプトに入れる)。

## 削除

```bash
rea uninstall
```
