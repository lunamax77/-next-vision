<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/staff_auth.php';

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
} catch (Throwable $e) {
    error_log('accounts.php DB connect error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT id, login_id, display_name, is_active, created_at FROM staff_accounts ORDER BY created_at DESC'
    );
    respond(200, ['ok' => true, 'accounts' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        respond(400, ['ok' => false, 'error' => 'invalid json body']);
    }
    $action = (string)($input['action'] ?? '');

    if ($action === 'create') {
        $displayName = trim((string)($input['display_name'] ?? ''));
        if ($displayName === '') {
            respond(400, ['ok' => false, 'error' => '氏名を入力してください']);
        }
        try {
            $loginId = generate_login_id($pdo);
            $password = generate_temp_password();
            $stmt = $pdo->prepare(
                'INSERT INTO staff_accounts (login_id, password_hash, display_name, is_active)
                 VALUES (:login_id, :password_hash, :display_name, 1)'
            );
            $stmt->execute([
                'login_id' => $loginId,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'display_name' => $displayName,
            ]);
        } catch (Throwable $e) {
            error_log('accounts.php create error: ' . $e->getMessage());
            respond(500, ['ok' => false, 'error' => 'db error']);
        }
        respond(200, ['ok' => true, 'login_id' => $loginId, 'password' => $password, 'display_name' => $displayName]);
    }

    if ($action === 'reset_password') {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) {
            respond(400, ['ok' => false, 'error' => 'invalid id']);
        }
        $password = generate_temp_password();
        $stmt = $pdo->prepare('UPDATE staff_accounts SET password_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => password_hash($password, PASSWORD_BCRYPT), 'id' => $id]);
        if ($stmt->rowCount() === 0) {
            respond(404, ['ok' => false, 'error' => 'account not found']);
        }
        respond(200, ['ok' => true, 'password' => $password]);
    }

    if ($action === 'set_active') {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $isActive = !empty($input['is_active']) ? 1 : 0;
        if ($id <= 0) {
            respond(400, ['ok' => false, 'error' => 'invalid id']);
        }
        $stmt = $pdo->prepare('UPDATE staff_accounts SET is_active = :active WHERE id = :id');
        $stmt->execute(['active' => $isActive, 'id' => $id]);
        respond(200, ['ok' => true]);
    }

    respond(400, ['ok' => false, 'error' => 'unknown action']);
}

respond(405, ['ok' => false, 'error' => 'method not allowed']);
