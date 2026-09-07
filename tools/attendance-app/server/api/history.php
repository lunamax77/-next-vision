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

$token = $_SERVER['HTTP_X_APP_TOKEN'] ?? '';
if (!hash_equals($config['app_token'], $token)) {
    respond(401, ['ok' => false, 'error' => 'invalid app token']);
}

$loginId = trim((string)($_GET['login_id'] ?? ''));
if ($loginId === '') {
    respond(400, ['ok' => false, 'error' => 'missing login_id']);
}

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare(
        'SELECT route, transport_method, amount, MAX(recorded_at) AS last_used
         FROM attendance_records
         WHERE login_id = :login_id AND route IS NOT NULL AND route <> \'\'
         GROUP BY route, transport_method, amount
         ORDER BY last_used DESC
         LIMIT 10'
    );
    $stmt->execute(['login_id' => $loginId]);
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    error_log('history.php DB error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$history = array_map(static function (array $r): array {
    return [
        'route' => $r['route'],
        'transport_method' => $r['transport_method'],
        'amount' => $r['amount'] !== null ? (int)$r['amount'] : null,
    ];
}, $rows);

respond(200, ['ok' => true, 'history' => $history]);
