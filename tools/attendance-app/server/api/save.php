<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/GoogleSheetsClient.php';
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

$allowedTypes = ['wakeup', 'checkin', 'move', 'checkout'];
$loginId = trim((string)($input['login_id'] ?? ''));
$type = (string)($input['type'] ?? '');
$label = trim((string)($input['label'] ?? ''));
$time = (string)($input['time'] ?? '');
$lat = isset($input['lat']) ? (float)$input['lat'] : null;
$lng = isset($input['lng']) ? (float)$input['lng'] : null;
$accuracy = isset($input['accuracy']) ? (int)round((float)$input['accuracy']) : null;
$photoDataUrl = $input['photo'] ?? null;
$transportMethod = isset($input['transport_method']) && $input['transport_method'] !== null
    ? trim((string)$input['transport_method']) : null;
$route = isset($input['route']) && $input['route'] !== null ? trim((string)$input['route']) : null;
$amount = isset($input['amount']) && $input['amount'] !== null ? (int)$input['amount'] : null;
if ($transportMethod === '') $transportMethod = null;
if ($route === '') $route = null;

if ($loginId === '' || !in_array($type, $allowedTypes, true) || $label === '') {
    respond(400, ['ok' => false, 'error' => 'missing required fields']);
}

$typesRequiringTrip = ['checkin', 'move', 'checkout'];
if (in_array($type, $typesRequiringTrip, true) && ($transportMethod === null || $route === null || $amount === null)) {
    respond(400, ['ok' => false, 'error' => '移動手段・経路・金額は必須です']);
}

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare(
        'SELECT display_name, is_active, nearest_station, nearest_station_lat, nearest_station_lng
         FROM staff_accounts WHERE login_id = :login_id'
    );
    $stmt->execute(['login_id' => $loginId]);
    $account = $stmt->fetch();
} catch (Throwable $e) {
    error_log('attendance save.php account lookup error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

if (!$account || (int)$account['is_active'] !== 1) {
    respond(401, ['ok' => false, 'error' => 'アカウントが無効です。再度ログインしてください。']);
}
$staffName = $account['display_name'];

$recordedAt = date('Y-m-d H:i:s');
try {
    $dt = new DateTime($time !== '' ? $time : 'now');
    $recordedAt = $dt->format('Y-m-d H:i:s');
} catch (Exception $e) {
    // fall back to server time
}

$photoPath = null;
$photoUrl = null;
if (is_string($photoDataUrl) && strncmp($photoDataUrl, 'data:image/', 11) === 0) {
    if (strlen($photoDataUrl) > 4_000_000) {
        respond(400, ['ok' => false, 'error' => 'photo too large']);
    }
    [, $b64] = explode(',', $photoDataUrl, 2) + [1 => ''];
    $binary = base64_decode($b64, true);
    if ($binary === false) {
        respond(400, ['ok' => false, 'error' => 'invalid photo data']);
    }

    $subdir = date('Y/m');
    $dir = rtrim($config['uploads_dir'], '/') . '/' . $subdir;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        respond(500, ['ok' => false, 'error' => 'failed to create upload dir']);
    }
    $filename = $type . '_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.jpg';
    $fullPath = $dir . '/' . $filename;
    file_put_contents($fullPath, $binary);

    $photoPath = $subdir . '/' . $filename;
    $photoUrl = rtrim($config['uploads_url_base'], '/') . '/' . $subdir . '/' . $filename;
}

$address = null;
$mapsUrl = null;
if ($lat !== null && $lng !== null) {
    $mapsUrl = maps_link($lat, $lng);
    try {
        $address = reverse_geocode($lat, $lng);
    } catch (Throwable $e) {
        error_log('attendance save.php geocode error: ' . $e->getMessage());
        // 住所が取れなくても記録自体は続行する
    }
}

// 出勤・退勤確認時、登録した最寄駅から大きく離れた場所からの打刻は警告フラグを立てる
$locationMismatchThresholdM = 3000;
$locationMismatch = false;
$typesRequiringLocationCheck = ['checkin', 'checkout'];
if (
    in_array($type, $typesRequiringLocationCheck, true) &&
    $lat !== null && $lng !== null &&
    $account['nearest_station_lat'] !== null && $account['nearest_station_lng'] !== null
) {
    $distance = distance_meters(
        $lat,
        $lng,
        (float)$account['nearest_station_lat'],
        (float)$account['nearest_station_lng']
    );
    $locationMismatch = $distance > $locationMismatchThresholdM;
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO attendance_records (login_id, staff_name, type, label, transport_method, route, amount, recorded_at, lat, lng, address, accuracy_m, photo_path, location_mismatch)
         VALUES (:login_id, :staff_name, :type, :label, :transport_method, :route, :amount, :recorded_at, :lat, :lng, :address, :accuracy_m, :photo_path, :location_mismatch)'
    );
    $stmt->execute([
        'login_id' => $loginId,
        'staff_name' => $staffName,
        'type' => $type,
        'label' => $label,
        'transport_method' => $transportMethod,
        'route' => $route,
        'amount' => $amount,
        'recorded_at' => $recordedAt,
        'lat' => $lat,
        'lng' => $lng,
        'address' => $address,
        'accuracy_m' => $accuracy,
        'photo_path' => $photoPath,
        'location_mismatch' => $locationMismatch ? 1 : 0,
    ]);
    $id = (int)$pdo->lastInsertId();
} catch (Throwable $e) {
    error_log('attendance save.php DB error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$sheetSynced = false;
if (!empty($config['google']['enabled'])) {
    try {
        $client = new GoogleSheetsClient(
            $config['google']['service_account_json'],
            $config['google']['spreadsheet_id'],
            $config['google']['sheet_range']
        );
        $client->appendRow([
            $recordedAt,
            $staffName,
            $label,
            $transportMethod,
            $route,
            $amount,
            $address,
            $mapsUrl,
            $accuracy,
            $photoUrl,
            $locationMismatch ? '⚠ 最寄駅から離れています' : '',
        ]);
        $sheetSynced = true;
        $pdo->prepare('UPDATE attendance_records SET sheet_synced = 1 WHERE id = :id')
            ->execute(['id' => $id]);
    } catch (Throwable $e) {
        error_log('attendance save.php Sheets sync error: ' . $e->getMessage());
        // DB保存はできているのでエラーにはしない
    }
}

respond(200, [
    'ok' => true,
    'id' => $id,
    'sheet_synced' => $sheetSynced,
    'address' => $address,
    'maps_url' => $mapsUrl,
    'location_mismatch' => $locationMismatch,
]);
