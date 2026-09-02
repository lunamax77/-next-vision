<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/GoogleSheetsClient.php';

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
$staffName = trim((string)($input['staff_name'] ?? ''));
$type = (string)($input['type'] ?? '');
$label = trim((string)($input['label'] ?? ''));
$time = (string)($input['time'] ?? '');
$lat = isset($input['lat']) ? (float)$input['lat'] : null;
$lng = isset($input['lng']) ? (float)$input['lng'] : null;
$accuracy = isset($input['accuracy']) ? (int)round((float)$input['accuracy']) : null;
$photoDataUrl = $input['photo'] ?? null;

if ($staffName === '' || !in_array($type, $allowedTypes, true) || $label === '') {
    respond(400, ['ok' => false, 'error' => 'missing required fields']);
}

$recordedAt = date('Y-m-d H:i:s');
try {
    $dt = new DateTime($time !== '' ? $time : 'now');
    $recordedAt = $dt->format('Y-m-d H:i:s');
} catch (Exception $e) {
    // fall back to server time
}

$photoPath = null;
$photoUrl = null;
if (is_string($photoDataUrl) && str_starts_with($photoDataUrl, 'data:image/')) {
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

try {
    $pdo = attendance_db($config);
    $stmt = $pdo->prepare(
        'INSERT INTO attendance_records (staff_name, type, label, recorded_at, lat, lng, accuracy_m, photo_path)
         VALUES (:staff_name, :type, :label, :recorded_at, :lat, :lng, :accuracy_m, :photo_path)'
    );
    $stmt->execute([
        'staff_name' => $staffName,
        'type' => $type,
        'label' => $label,
        'recorded_at' => $recordedAt,
        'lat' => $lat,
        'lng' => $lng,
        'accuracy_m' => $accuracy,
        'photo_path' => $photoPath,
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
            $lat,
            $lng,
            $accuracy,
            $photoUrl,
        ]);
        $sheetSynced = true;
        $pdo->prepare('UPDATE attendance_records SET sheet_synced = 1 WHERE id = :id')
            ->execute(['id' => $id]);
    } catch (Throwable $e) {
        error_log('attendance save.php Sheets sync error: ' . $e->getMessage());
        // DB保存はできているのでエラーにはしない
    }
}

respond(200, ['ok' => true, 'id' => $id, 'sheet_synced' => $sheetSynced]);
