<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/mailer.php';
require __DIR__ . '/../lib/summary.php';

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$configPath = __DIR__ . '/../config.php';
if (!is_readable($configPath)) {
    respond(500, ['ok' => false, 'error' => 'server not configured (config.php missing)']);
}
$config = require $configPath;

try {
    $pdo = attendance_db($config);
    $summaries = collect_daily_summaries($pdo, $config);
} catch (Throwable $e) {
    error_log('summary.php error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(200, ['ok' => true, 'summaries' => $summaries]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $from = $config['notify_from'] ?? ('attendance@' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
    $results = [];
    foreach ($summaries as $s) {
        $results[] = [
            'area' => $s['area'],
            'sent' => send_notification_mail($s['emails'], $s['subject'], $s['body'], $from),
        ];
    }
    respond(200, ['ok' => true, 'results' => $results]);
}

respond(405, ['ok' => false, 'error' => 'method not allowed']);
