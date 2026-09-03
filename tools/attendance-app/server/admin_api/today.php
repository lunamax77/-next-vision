<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/geocode.php';

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
    error_log('today.php DB connect error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$tz = new DateTimeZone('Asia/Tokyo');
$utc = new DateTimeZone('UTC');
$startJst = new DateTime('today', $tz);
$endJst = (clone $startJst)->modify('+1 day');
$startUtc = (clone $startJst)->setTimezone($utc)->format('Y-m-d H:i:s');
$endUtc = (clone $endJst)->setTimezone($utc)->format('Y-m-d H:i:s');

$accountsStmt = $pdo->query(
    'SELECT login_id, display_name, group_name, nearest_station FROM staff_accounts
     WHERE is_active = 1 ORDER BY group_name IS NULL, group_name, display_name'
);
$accounts = $accountsStmt->fetchAll();

$recordsStmt = $pdo->prepare(
    'SELECT login_id, type, label, transport_method, route, amount, recorded_at, lat, lng, address, photo_path, location_mismatch
     FROM attendance_records
     WHERE recorded_at >= :start AND recorded_at < :end
     ORDER BY recorded_at ASC'
);
$recordsStmt->execute(['start' => $startUtc, 'end' => $endUtc]);
$records = $recordsStmt->fetchAll();

$byLogin = [];
foreach ($records as $r) {
    $byLogin[$r['login_id']][$r['type']][] = $r;
}

$uploadsBase = rtrim($config['uploads_url_base'], '/');
$result = [];
foreach ($accounts as $acc) {
    $loginId = $acc['login_id'];
    $entry = [
        'login_id' => $loginId,
        'display_name' => $acc['display_name'],
        'group_name' => $acc['group_name'],
        'nearest_station' => $acc['nearest_station'],
        'wakeup' => null,
        'checkin' => null,
        'move' => null,
        'move_count' => 0,
        'checkout' => null,
    ];
    foreach (['wakeup', 'checkin', 'move', 'checkout'] as $type) {
        if (!empty($byLogin[$loginId][$type])) {
            $list = $byLogin[$loginId][$type];
            $last = end($list);
            $lat = $last['lat'] !== null ? (float)$last['lat'] : null;
            $lng = $last['lng'] !== null ? (float)$last['lng'] : null;
            $entry[$type] = [
                'time' => $last['recorded_at'],
                'transport_method' => $last['transport_method'],
                'route' => $last['route'],
                'amount' => $last['amount'] !== null ? (int)$last['amount'] : null,
                'address' => $last['address'],
                'maps_url' => ($lat !== null && $lng !== null) ? maps_link($lat, $lng) : null,
                'photo_url' => $last['photo_path'] ? $uploadsBase . '/' . $last['photo_path'] : null,
                'location_mismatch' => (bool)$last['location_mismatch'],
            ];
            if ($type === 'move') {
                $entry['move_count'] = count($list);
            }
        }
    }
    $result[] = $entry;
}

respond(200, ['ok' => true, 'date' => $startJst->format('Y-m-d'), 'staff' => $result]);
