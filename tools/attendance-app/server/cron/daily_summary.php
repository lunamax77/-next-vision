<?php
/**
 * 本日の出勤状況サマリーをエリアごとの宛先へメール送信する。
 *
 * CoreServer の CRON ジョブから毎日 11:00 に実行する想定:
 *   php /virtual/dcreation/public_html/attendance/server/cron/daily_summary.php
 * またはブラウザ/wget から:
 *   https://<domain>/attendance/server/cron/daily_summary.php?token=<app_token>
 *   (?preview=1 を付けると送信せず本文を表示)
 */
declare(strict_types=1);

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/mailer.php';
require __DIR__ . '/../lib/summary.php';

$configPath = __DIR__ . '/../config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo "config.php missing\n";
    exit(1);
}
$config = require $configPath;

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
    $token = (string)($_GET['token'] ?? '');
    if (!hash_equals($config['app_token'], $token)) {
        http_response_code(401);
        echo "invalid token\n";
        exit;
    }
}
$preview = !$isCli && !empty($_GET['preview']);

try {
    $pdo = attendance_db($config);
    $summaries = collect_daily_summaries($pdo, $config);
} catch (Throwable $e) {
    http_response_code(500);
    echo 'error: ' . $e->getMessage() . "\n";
    exit(1);
}

$from = $config['notify_from'] ?? ('attendance@' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
foreach ($summaries as $s) {
    echo '===== ' . $s['subject'] . ' -> ' . implode(', ', $s['emails']) . " =====\n";
    echo $s['body'] . "\n\n";
    if ($preview) {
        continue;
    }
    $ok = send_notification_mail($s['emails'], $s['subject'], $s['body'], $from);
    echo $ok ? "sent\n\n" : "SEND FAILED\n\n";
}
if (count($summaries) === 0) {
    echo "エリア別メール通知が1件も設定されていません。\n";
}
