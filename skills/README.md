# skills/ — Agent と Codex の共有ナレッジベース

ここは、竹村代表グループのAI組織で**Claude Code(Agent)とCodexの両方**が読み書きする
共有の知見置き場。どちらかが初めての種類の作業をこなして学んだことは、ここに書き出して、
もう片方も次回すぐ使えるようにする(`.claude/skills/jobs/SKILL.md` の「スキル習得(永続化・
Codex/Agent双方向)」参照)。

`.claude/skills/`(Claude Codeの起動可能なスキル定義。jobs・browserなど)とは別物。
あちらは「振る舞い方の定義」、こちらは「作業の実務ノウハウの蓄積」。

## 新しい作業に取りかかる前に

1. この README で、関連する知見がすでにあるか確認する。
2. 無ければ、下記の**すでに積み上がっている知見**(このリポジトリの他の場所)も見る。
3. 作業が終わったら、繰り返しそうな種類の仕事だったなら、ここにファイルを1つ足す。

## このディレクトリのファイル

| ファイル | 内容 |
| --- | --- |
| `google-sheets-ledger-parsing.md` | 売掛・買掛スプレッドシートの読み取りロジック(見出し検出・名前と金額の拾い方・ハマりどころ) |

## すでに積み上がっている知見(リポジトリの他の場所)

作業の性質によっては、`skills/` 以外にすでに答えがある。

| 知りたいこと | 参照先 |
| --- | --- |
| 会社の構成・どの案件がどちらの会社(担当AI)か | `docs/org/02-group-and-routing.md` |
| 既存データの扱い方(原本不可侵の具体的なルール) | `docs/org/03-data-protection.md` |
| 定時報告(朝/昼/夕/夜)の設計・文面 | `docs/routines/daily-report-routines.md` |
| 売掛・買掛の変化トラッキングの仕組み全体 | `docs/routines/ledger-daily-diff.md` |
| 下請け請求書チェックの仕組み | `docs/routines/invoice-check-automation.md` |
| ブラウザ自動化(Playwrightのバージョン固定、承認ゲートの作り方など) | `.claude/skills/browser/SKILL.md`, `.claude/skills/browser/reference/setup.md` |
| ジョブズの役割・Agent/Codexの使い分け・Codexの利用上限ルール | `.claude/skills/jobs/SKILL.md` |

## 書き方の目安

- コードそのものの丸写しではなく、**「何をどう考えて進めたか」**を書く。
- 手順・判断基準・気をつける点(ハマりどころ)を中心に、次回同じ種類の依頼が来たときに
  **読めばすぐ再現できる粒度**にする。
- 状況が変わって内容が古くなったら、その場で更新する(会社の原本データではないので
  自由に書き換えてよい)。
