#!/bin/sh
# CoreServer の CRON から1時間ごとに実行する(登録はこの1件だけでよい)
#   /bin/sh /virtual/dcreation/public_html/attendance/server/cron/hourly.sh
# 内容: GitHubからの自動更新 → セキュリティ監視 → (11時台のみ)出勤状況サマリー送信

cd "$(dirname "$0")" || exit 1
LOG=../cron.log

PHP=""
for c in /usr/local/bin/php84 /usr/local/bin/php83 /usr/local/bin/php82 /usr/bin/php84 /usr/bin/php83 /usr/local/bin/php /usr/bin/php php; do
  if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then PHP="$c"; break; fi
done
if [ -z "$PHP" ]; then echo "$(date '+%Y-%m-%d %H:%M:%S') php not found" >> "$LOG"; exit 1; fi

echo "===== $(date '+%Y-%m-%d %H:%M:%S') ($PHP)" >> "$LOG"
"$PHP" ../deploy.php >> "$LOG" 2>&1
"$PHP" security_check.php >> "$LOG" 2>&1
H=$(TZ=Asia/Tokyo date +%H)
if [ "$H" = "11" ]; then
  "$PHP" daily_summary.php >> "$LOG" 2>&1
fi

# ログが肥大化しないよう直近500行だけ残す
tail -n 500 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
