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
        'SELECT display_name, nearest_station, is_active FROM staff_accounts WHERE login_id = :login_id'
    );
    $stmt->execute(['login_id' => $loginId]);
    $row = $stmt->fetch();
} catch (Throwable $e) {
    error_log('profile.php DB error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

if (!$row || (int)$row['is_active'] !== 1) {
    respond(401, ['ok' => false, 'error' => 'アカウントが無効です']);
}

respond(200, [
    'ok' => true,
    'login_id' => $loginId,
    'display_name' => $row['display_name'],
    'nearest_station' => $row['nearest_station'],
]);
