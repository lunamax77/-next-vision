#!/usr/bin/env bash
# scripts/codex-bridge/ask-claude.sh
#
# Codex(代表のMac上・主担当)からClaude Code CLI(補助役)を呼び出すための連携スクリプト。
# 2026年10月、「Codexを主担当、Claude Codeを補助役にする」という方針変更に伴い作成した。
# 技術的な前提・検証済み/未検証の切り分けは scripts/codex-bridge/README.md を必ず参照すること。
#
# 設計方針(厳守 — 変更する場合は代表の確認を取ること):
#   - 権限チェックは無効化しない。--dangerously-skip-permissions 等はこのスクリプトから
#     一切渡さない。--mode で選べるのは manual / acceptEdits のみ。
#   - --add-dir は「作業範囲を制限するもの」として扱わない(ヘルプ上も「追加で許可する
#     ディレクトリ」としか書かれておらず、サンドボックスではない)。このスクリプトは
#     リポジトリのルートに cd してから claude を呼ぶだけで、--add-dir は使わない。
#   - 対外送信・公開・支払い・原本データの更新は、このスクリプト経由であっても
#     竹村代表の事前承認を経由する(CLAUDE.md 第4-1項・第4-2項はエンジンを問わず適用)。
#     このスクリプトはその承認プロセスを代替・省略するものではない。
#   - total_cost_usd はCLIの自己申告値。実際の請求額と同一であると断定しない。
#   - 依頼本文(--task の中身)・認証情報はログに一切書き込まない。
#
# 代表のMac上での実機動作はまだ未検証(作成はクラウド環境で実施した)。
# 使う前に必ず --verify で接続確認すること。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${CODEX_BRIDGE_LOG:-$HOME/.codex-bridge/usage.jsonl}"

MODE="manual"
MODEL=""
TASK=""
LABEL=""
VERIFY=0

usage() {
  cat <<'EOF'
使い方:
  ask-claude.sh --verify
  ask-claude.sh --task "<依頼内容>" [--model <モデルID>] [--mode manual|acceptEdits] [--label "<短い非機密タグ>"]

オプション:
  --verify        読み取り専用の固定プロンプトで接続を検証する(--task より優先。最初は必ずこれを実行する)
  --task <text>   Claude Codeへの依頼内容(必須。--verify 指定時は不要)
  --model <id>    使用モデルを指定(省略時はClaude Code側の既定モデル)
  --mode <mode>   manual(既定・最も保守的) | acceptEdits(ファイル書き込みを許可)
                  ※権限チェックを緩める/無効化するモードはこのスクリプトから選べない
  --label <text>  使用量ログに残す短い非機密タグ(省略可。依頼本文そのものは入れないこと)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --verify) VERIFY=1; shift ;;
    --task) TASK="${2:-}"; shift 2 ;;
    --model) MODEL="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --label) LABEL="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "不明な引数: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [ "$VERIFY" -eq 1 ]; then
  TASK="あなたはこのリポジトリを読み取り専用で確認するテストです。ファイルの作成・編集・削除は一切行わないでください。現在のgitブランチ名とカレントディレクトリのパスだけを、他の説明を加えずに1行で答えてください。"
  MODE="manual"
elif [ -z "$TASK" ]; then
  echo "エラー: --task または --verify のいずれかを指定してください。" >&2
  usage >&2
  exit 1
fi

if [ "$MODE" != "manual" ] && [ "$MODE" != "acceptEdits" ]; then
  echo "エラー: --mode は manual または acceptEdits のみ指定できます(権限チェックを緩めるモードはこのスクリプトから使えません)。" >&2
  exit 1
fi

command -v claude >/dev/null 2>&1 || { echo "エラー: claude コマンドが見つかりません。Claude Code CLIをインストールしてください。" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "エラー: jq が必要です(例: brew install jq)。" >&2; exit 1; }

CLI_VERSION="$(claude --version 2>&1 || echo "取得不可")"
HELP_TEXT="$(claude --help 2>&1 || true)"

# インストール済みCLIのhelpで、このスクリプトが前提にしているオプションが
# 実在するかを毎回確認する(CLIのバージョンが変わってオプションが無くなっていた
# 場合に、誤った前提のまま実行してしまわないようにするため)。
REQUIRED_FLAGS=("-p, --print" "--output-format" "--model" "--permission-mode" "--permission-prompts")
MISSING=()
for flag in "${REQUIRED_FLAGS[@]}"; do
  if ! printf '%s' "$HELP_TEXT" | grep -qF -- "$flag"; then
    MISSING+=("$flag")
  fi
done
if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "エラー: インストール済みのclaude CLI(${CLI_VERSION})のhelpに、必要なオプションが見つかりませんでした: ${MISSING[*]}" >&2
  echo "このスクリプトが前提にしているオプション名と、実際のCLIのオプションが変わっている可能性があります。claude --help で確認し、スクリプトを更新してください。" >&2
  exit 1
fi

cd "$REPO_DIR"
HOSTNAME_VAL="$(hostname 2>/dev/null || echo "取得不可")"
EXEC_LOCATION="host=${HOSTNAME_VAL} cwd=${REPO_DIR}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

CMD=(claude -p "$TASK" --output-format json --permission-mode "$MODE" --permission-prompts none)
if [ -n "$MODEL" ]; then
  CMD+=(--model "$MODEL")
fi

STDERR_FILE="$(mktemp)"
set +e
RAW_OUTPUT="$("${CMD[@]}" 2>"$STDERR_FILE")"
EXIT_CODE=$?
set -e
STDERR_OUTPUT="$(cat "$STDERR_FILE" 2>/dev/null || true)"
rm -f "$STDERR_FILE"

mkdir -p "$(dirname "$LOG_FILE")"

if [ "$EXIT_CODE" -ne 0 ] || ! printf '%s' "$RAW_OUTPUT" | jq -e . >/dev/null 2>&1; then
  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg specified_model "${MODEL:-既定(未指定)}" \
    --arg mode "$MODE" \
    --arg loc "$EXEC_LOCATION" \
    --argjson verify "$([ "$VERIFY" -eq 1 ] && echo true || echo false)" \
    --arg label "${LABEL:-}" \
    --arg exit_code "$EXIT_CODE" \
    '{timestamp:$ts, specified_model:$specified_model, actual_models:"取得不可", mode:$mode, execution_location:$loc, verify:$verify, label:$label, success:false, exit_code:$exit_code, usage:"取得不可", total_cost_usd:"取得不可", total_cost_note:"CLI自己申告値。実際の請求額と同一とは限らない"}' \
    >> "$LOG_FILE"
  echo "エラー: claude の実行に失敗しました(exit=${EXIT_CODE})。" >&2
  if [ -n "$STDERR_OUTPUT" ]; then
    echo "--- stderr(先頭500文字) ---" >&2
    printf '%s' "$STDERR_OUTPUT" | head -c 500 >&2
    echo >&2
  fi
  exit "$EXIT_CODE"
fi

RESULT_TEXT="$(printf '%s' "$RAW_OUTPUT" | jq -r '.result // "取得不可"')"
SUCCESS="$(printf '%s' "$RAW_OUTPUT" | jq -r 'if .is_error == true then "false" else "true" end')"
ACTUAL_MODELS="$(printf '%s' "$RAW_OUTPUT" | jq -r 'if .modelUsage then (.modelUsage | keys | join(",")) else "取得不可" end')"
TOTAL_COST="$(printf '%s' "$RAW_OUTPUT" | jq -r 'if .total_cost_usd != null then (.total_cost_usd | tostring) else "取得不可" end')"
USAGE_JSON="$(printf '%s' "$RAW_OUTPUT" | jq -c 'if .usage then {input_tokens:(.usage.input_tokens // "取得不可"), output_tokens:(.usage.output_tokens // "取得不可"), cache_creation_input_tokens:(.usage.cache_creation_input_tokens // "取得不可"), cache_read_input_tokens:(.usage.cache_read_input_tokens // "取得不可")} else "取得不可" end')"
SESSION_ID="$(printf '%s' "$RAW_OUTPUT" | jq -r '.session_id // "取得不可"')"

jq -nc \
  --arg ts "$TIMESTAMP" \
  --arg specified_model "${MODEL:-既定(未指定)}" \
  --arg actual_models "$ACTUAL_MODELS" \
  --arg mode "$MODE" \
  --arg loc "$EXEC_LOCATION" \
  --argjson verify "$([ "$VERIFY" -eq 1 ] && echo true || echo false)" \
  --arg label "${LABEL:-}" \
  --argjson success "$SUCCESS" \
  --argjson usage "$USAGE_JSON" \
  --arg total_cost_usd "$TOTAL_COST" \
  --arg session_id "$SESSION_ID" \
  '{timestamp:$ts, specified_model:$specified_model, actual_models:$actual_models, mode:$mode, execution_location:$loc, verify:$verify, label:$label, success:$success, usage:$usage, total_cost_usd:$total_cost_usd, total_cost_note:"CLI自己申告値。実際の請求額と同一とは限らない", session_id:$session_id}' \
  >> "$LOG_FILE"

printf '%s\n' "$RESULT_TEXT"
