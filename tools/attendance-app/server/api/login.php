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

$token = $_SERVER['HTTP_X_APP_TOKEN'] ?? '';
if (!hash_equals($config['app_token'], $token)) {
    respond(401, ['ok' => false, 'error' => 'invalid app token']);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    respond(400, ['ok' => false, 'error' => 'invalid json body']);
}

$loginId = trim((string)($input['login_id'] ?? ''));
$password = (string)($input['password'] ?? '');
if ($loginId === '' || $password === '') {
    respond(400, ['ok' => false, 'error' => 'IDとパスワードを入力してください']);
}

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare(
        'SELECT password_hash, display_name, is_active FROM staff_accounts WHERE login_id = :login_id'
    );
    $stmt->execute(['login_id' => $loginId]);
    $row = $stmt->fetch();
} catch (Throwable $e) {
    error_log('login.php DB error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

if (!$row || (int)$row['is_active'] !== 1 || !password_verify($password, $row['password_hash'])) {
    respond(401, ['ok' => false, 'error' => 'IDまたはパスワードが違います']);
}

respond(200, [
    'ok' => true,
    'login_id' => $loginId,
    'display_name' => $row['display_name'],
]);
