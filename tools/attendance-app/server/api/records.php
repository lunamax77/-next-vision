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

// 今月(日本時間)の範囲を UTC に変換して絞り込む(recorded_at は UTC で保存されている)
$jst = new DateTimeZone('Asia/Tokyo');
$utc = new DateTimeZone('UTC');
$monthStart = new DateTime('first day of this month 00:00:00', $jst);
$monthEnd = (clone $monthStart)->modify('+1 month');
$fromUtc = (clone $monthStart)->setTimezone($utc)->format('Y-m-d H:i:s');
$toUtc = (clone $monthEnd)->setTimezone($utc)->format('Y-m-d H:i:s');

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare(
        'SELECT id, type, label, transport_method, route, amount, recorded_at, location_mismatch
         FROM attendance_records
         WHERE login_id = :login_id AND recorded_at >= :from_utc AND recorded_at < :to_utc
         ORDER BY recorded_at DESC'
    );
    $stmt->execute(['login_id' => $loginId, 'from_utc' => $fromUtc, 'to_utc' => $toUtc]);
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    error_log('records.php DB error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$records = array_map(static function (array $r): array {
    return [
        'id' => (int)$r['id'],
        'type' => $r['type'],
        'label' => $r['label'],
        'transport_method' => $r['transport_method'],
        'route' => $r['route'],
        'amount' => $r['amount'] !== null ? (int)$r['amount'] : null,
        'time' => $r['recorded_at'],
        'location_mismatch' => (int)$r['location_mismatch'] === 1,
    ];
}, $rows);

respond(200, [
    'ok' => true,
    'month' => $monthStart->format('Y-m'),
    'records' => $records,
]);
