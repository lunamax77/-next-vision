<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method not allowed']);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input) || !isset($input['endpoint'], $input['keys']['p256dh'], $input['keys']['auth'])) {
    respond(400, ['ok' => false, 'error' => 'invalid subscription']);
}

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare('SELECT id FROM push_subscriptions WHERE endpoint = :endpoint');
    $stmt->execute(['endpoint' => $input['endpoint']]);
    if (!$stmt->fetch()) {
        $pdo->prepare(
            'INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (:endpoint, :p256dh, :auth)'
        )->execute([
            'endpoint' => $input['endpoint'],
            'p256dh' => $input['keys']['p256dh'],
            'auth' => $input['keys']['auth'],
        ]);
    }
} catch (Throwable $e) {
    error_log('subscribe.php error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

respond(200, ['ok' => true]);
