<?php
/**
 * 監査ログ(security_check.php が集計して異常を通知する)。
 * 1行1イベントの JSON を server/audit.log に追記する。
 */

function audit_log(string $event, array $detail = []): void
{
    $line = [
        'ts' => date('c'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'event' => $event,
        'detail' => $detail,
        'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 120),
    ];
    @file_put_contents(
        __DIR__ . '/../audit.log',
        json_encode($line, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
        FILE_APPEND | LOCK_EX
    );
}
