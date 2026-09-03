<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/staff_auth.php';
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
    error_log('accounts.php DB connect error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'db error']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT id, login_id, display_name, group_name, phone_number, nearest_station, is_active, created_at
         FROM staff_accounts ORDER BY created_at DESC'
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
        $phoneNumber = trim((string)($input['phone_number'] ?? ''));
        $nearestStation = trim((string)($input['nearest_station'] ?? ''));
        $groupName = trim((string)($input['group_name'] ?? ''));

        if ($displayName === '' || $phoneNumber === '' || $nearestStation === '') {
            respond(400, ['ok' => false, 'error' => '氏名・電話番号・最寄駅は必須です']);
        }

        $stationCoords = null;
        try {
            $stationCoords = forward_geocode(station_geocode_query($nearestStation));
        } catch (Throwable $e) {
            error_log('accounts.php geocode error: ' . $e->getMessage());
        }

        try {
            $loginId = generate_login_id($pdo);
            $password = generate_temp_password();
            $stmt = $pdo->prepare(
                'INSERT INTO staff_accounts
                    (login_id, password_hash, display_name, group_name, phone_number, nearest_station, nearest_station_lat, nearest_station_lng, is_active)
                 VALUES
                    (:login_id, :password_hash, :display_name, :group_name, :phone_number, :nearest_station, :lat, :lng, 1)'
            );
            $stmt->execute([
                'login_id' => $loginId,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'display_name' => $displayName,
                'group_name' => $groupName !== '' ? $groupName : null,
                'phone_number' => $phoneNumber,
                'nearest_station' => $nearestStation,
                'lat' => $stationCoords['lat'] ?? null,
                'lng' => $stationCoords['lng'] ?? null,
            ]);
        } catch (Throwable $e) {
            error_log('accounts.php create error: ' . $e->getMessage());
            respond(500, ['ok' => false, 'error' => 'db error']);
        }
        respond(200, [
            'ok' => true,
            'login_id' => $loginId,
            'password' => $password,
            'display_name' => $displayName,
            'station_geocoded' => $stationCoords !== null,
        ]);
    }

    if ($action === 'update') {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $displayName = trim((string)($input['display_name'] ?? ''));
        $phoneNumber = trim((string)($input['phone_number'] ?? ''));
        $nearestStation = trim((string)($input['nearest_station'] ?? ''));
        $groupName = trim((string)($input['group_name'] ?? ''));

        if ($id <= 0 || $displayName === '' || $phoneNumber === '' || $nearestStation === '') {
            respond(400, ['ok' => false, 'error' => '氏名・電話番号・最寄駅は必須です']);
        }

        $stmt = $pdo->prepare('SELECT nearest_station, nearest_station_lat, nearest_station_lng FROM staff_accounts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $current = $stmt->fetch();
        if (!$current) {
            respond(404, ['ok' => false, 'error' => 'account not found']);
        }

        $lat = $current['nearest_station_lat'];
        $lng = $current['nearest_station_lng'];
        $stationGeocoded = $lat !== null && $lng !== null;
        $needsGeocode = $current['nearest_station'] !== $nearestStation || !$stationGeocoded;
        if ($needsGeocode) {
            $stationCoords = null;
            try {
                $stationCoords = forward_geocode(station_geocode_query($nearestStation));
            } catch (Throwable $e) {
                error_log('accounts.php geocode error: ' . $e->getMessage());
            }
            $lat = $stationCoords['lat'] ?? null;
            $lng = $stationCoords['lng'] ?? null;
            $stationGeocoded = $stationCoords !== null;
        }

        try {
            $stmt = $pdo->prepare(
                'UPDATE staff_accounts
                 SET display_name = :display_name, group_name = :group_name, phone_number = :phone_number,
                     nearest_station = :nearest_station, nearest_station_lat = :lat, nearest_station_lng = :lng
                 WHERE id = :id'
            );
            $stmt->execute([
                'display_name' => $displayName,
                'group_name' => $groupName !== '' ? $groupName : null,
                'phone_number' => $phoneNumber,
                'nearest_station' => $nearestStation,
                'lat' => $lat,
                'lng' => $lng,
                'id' => $id,
            ]);
        } catch (Throwable $e) {
            error_log('accounts.php update error: ' . $e->getMessage());
            respond(500, ['ok' => false, 'error' => 'db error']);
        }
        respond(200, ['ok' => true, 'station_geocoded' => $stationGeocoded]);
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
