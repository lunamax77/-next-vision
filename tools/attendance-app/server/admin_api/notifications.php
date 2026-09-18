<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/mailer.php';

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
    error_log('notifications.php DB connect error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$allowedTypes = ['wakeup', 'checkin', 'move', 'checkout'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, area, emails, notify_types FROM area_notifications ORDER BY area');
    $rules = array_map(static function (array $r): array {
        return [
            'id' => (int)$r['id'],
            'area' => $r['area'],
            'emails' => $r['emails'],
            'notify_types' => array_values(array_filter(explode(',', $r['notify_types']))),
        ];
    }, $stmt->fetchAll());
    respond(200, ['ok' => true, 'rules' => $rules]);
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respond(400, ['ok' => false, 'error' => 'invalid json body']);
    }
    $action = (string)($input['action'] ?? '');

    if ($action === 'save') {
        $area = trim((string)($input['area'] ?? ''));
        $emails = parse_email_list((string)($input['emails'] ?? ''));
        $types = array_values(array_intersect($allowedTypes, (array)($input['notify_types'] ?? [])));

        if ($area === '') {
            respond(400, ['ok' => false, 'error' => 'エリア名を入力してください']);
        }
        if (count($emails) === 0) {
            respond(400, ['ok' => false, 'error' => '有効なメールアドレスを1つ以上入力してください']);
        }
        if (count($types) === 0) {
            respond(400, ['ok' => false, 'error' => '通知する種別を1つ以上選んでください']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO area_notifications (area, emails, notify_types)
             VALUES (:area, :emails, :types)
             ON DUPLICATE KEY UPDATE emails = VALUES(emails), notify_types = VALUES(notify_types)'
        );
        $stmt->execute([
            'area' => $area,
            'emails' => implode(', ', $emails),
            'types' => implode(',', $types),
        ]);
        respond(200, ['ok' => true]);
    }

    if ($action === 'delete') {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) {
            respond(400, ['ok' => false, 'error' => 'invalid id']);
        }
        $stmt = $pdo->prepare('DELETE FROM area_notifications WHERE id = :id');
        $stmt->execute(['id' => $id]);
        respond(200, ['ok' => true]);
    }

    if ($action === 'test') {
        // 設定したアドレスにテストメールを送る(送信できる環境か確認用)
        $emails = parse_email_list((string)($input['emails'] ?? ''));
        if (count($emails) === 0) {
            respond(400, ['ok' => false, 'error' => '有効なメールアドレスを入力してください']);
        }
        $from = $config['notify_from'] ?? ('attendance@' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        $ok = send_notification_mail(
            $emails,
            '【勤怠】テストメール',
            "勤怠管理アプリからのテストメールです。\nこのメールが届いていれば通知設定は有効です。",
            $from
        );
        if (!$ok) {
            respond(500, ['ok' => false, 'error' => 'メール送信に失敗しました(サーバーのメール設定を確認してください)']);
        }
        respond(200, ['ok' => true]);
    }

    respond(400, ['ok' => false, 'error' => 'unknown action']);
}

respond(405, ['ok' => false, 'error' => 'method not allowed']);
