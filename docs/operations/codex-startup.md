# Codex主窓口・開始手順

代表指示を受けたCodexが主担当となる。Codexだけで処理することを基本とする。作成日：2026-10-04（日本時間）。社内の運用資料。

1. 既存チェックアウトで `git status --short` とブランチ・HEADを確認する。各クラウドタスクは隔離済みであり、代表が求めない限りworktreeを作らない。未保存変更を保護する。最新化が必要なら現在のブランチを確認し、fetchして差分を確認する。勝手に別ブランチへ切り替えたりresetしない。
2. `AGENTS.md`、`CLAUDE.md`、`docs/org/00-charter.md`、`02-group-and-routing.md`、`03-data-protection.md`を読む。組織図・関連部署も読む。代表の最新指示を旧資料より優先する。
3. `skills/README.md` と `.claude/skills/jobs/SKILL.md` を知識資料として参照する。Claude固有のモデル・Agent・Artifact・Routinesの仕組みはCodexで使える証拠とは扱わない。必要な業務のスキルと `docs/knowledge/proposal-style-guide.md` を読む。
4. ブラウザ作業は `.claude/skills/browser/SKILL.md` と `reference/setup.md`を読む。ただし記載された導入済みパス・バージョンは環境固有。現在の実機で検証する。Macのログイン済みChromeとクラウドのブラウザを混同しない。
5. 利用可能なツールを確認する。クラウドではruntimeスキルとenvironment_statusで接続・認証の状態を確認する。変数は名前と存在だけを調べ、値や認証ファイルを表示しない。GitHubは既存HTTPSプロキシで必要な読取を試す。変数の存在だけで外部サービスの利用成功を断定しない。
6. 定期処理は `docs/routines/` を読むが、設計文書・代表からの報告・実際の登録内容を分ける。ルーティン一覧ツールが無い場合は「未確認」。変更や移行の指示なしに既存処理を変更しない。
7. 開始時：担当、予定モデル（不明なら取得不可）、実行場所、選択理由を報告する。Codexで扱える資料整理・実装は直接進める。新たな委任・外部実行をしたときは実際の手段を記録する。
8. 原本は読むだけ。資料は下書きとして作成し、日付・参照元を添える。AIが作成した既存成果物は同じ案件なら更新する。送信・公開・契約・支払い・原本更新は具体的な結果を準備して代表承認を確認する。カレンダー例外・記事包括承認は資料の出典と最新の承認範囲を確認し、自動で拡張しない。
9. 完了時：成果・確認方法・未解決点・実モデル・使用量・参考コストを報告する。取得不可を推測で埋めない。秘密情報は知識ファイル・使用量記録に含めない。

## 業務から資料を探す

| 業務 | 読む資料 |
| --- | --- |
| 営業・提案資料 | docs/org/departments/sales.md、docs/knowledge/proposal-style-guide.md |
| 記事・SNS・企画 | docs/org/departments/marketing.md、docs/marketing/ |
| 実装・サイト | docs/org/departments/product.md、site/、tools/のREADME |
| 人事・予定・社内文書 | docs/org/departments/operations.md |
| 請求・売掛買掛 | docs/org/departments/finance.md、skills/google-sheets-ledger-parsing.md、docs/routines/ |
| 前回比の報告 | skills/stateless-periodic-reporting-pattern.md |
| 添付の確認 | skills/gmail-to-drive-staging-pattern.md |
| Web操作・送信前停止 | skills/browser-automation-environment-notes.md、skills/external-action-approval-gate-pattern.md |

この手順を別タスクで使うには、更新したAGENTS.mdと本資料がそのタスクのチェックアウトに存在する必要がある。ローカル保存だけではGitHubやMacへ同期されない。
