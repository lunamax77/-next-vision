<?php
/**
 * スプレッドシートに未反映(sheet_synced = 0)の打刻をまとめて追記する。
 * シート側の障害(タブ名変更・一時的なエラー等)で抜けた分の復旧用。
 *
 *   php /virtual/dcreation/public_html/attendance/server/cron/resync_sheet.php
 *   https://<domain>/attendance/server/cron/resync_sheet.php?token=<deploy_token>
 */
declare(strict_types=1);

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/GoogleSheetsClient.php';
require __DIR__ . '/../lib/geocode.php';

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
}

$configPath = __DIR__ . '/../config.php';
if (!is_readable($configPath)) {
    echo "config.php missing\n";
    exit(1);
}
$config = require $configPath;

if (!$isCli) {
    $expected = (string)($config['deploy_token'] ?? '');
    $given = (string)($_GET['token'] ?? '');
    if ($expected === '' || !hash_equals($expected, $given)) {
        http_response_code(401);
        echo "invalid token\n";
        exit;
    }
}
if (empty($config['google']['enabled'])) {
    echo "google sheets sync is disabled in config.php\n";
    exit;
}

$pdo = attendance_db($config);
$rows = $pdo->query(
    'SELECT id, staff_name, label, transport_method, route, amount, recorded_at, lat, lng, address, accuracy_m, photo_path, location_mismatch
     FROM attendance_records WHERE sheet_synced = 0 ORDER BY recorded_at ASC, id ASC'
)->fetchAll();

echo 'unsynced records: ' . count($rows) . "\n";
if (count($rows) === 0) {
    exit;
}

$utc = new DateTimeZone('UTC');
$jst = new DateTimeZone('Asia/Tokyo');
$uploadsBase = rtrim($config['uploads_url_base'], '/');
$values = [];
$ids = [];
foreach ($rows as $r) {
    $timeJst = (new DateTime($r['recorded_at'], $utc))->setTimezone($jst)->format('Y-m-d H:i:s');
    $mapsUrl = ($r['lat'] !== null && $r['lng'] !== null) ? maps_link((float)$r['lat'], (float)$r['lng']) : null;
    $values[] = [
        $timeJst,
        $r['staff_name'],
        $r['label'],
        $r['transport_method'],
        $r['route'],
        $r['amount'] !== null ? (int)$r['amount'] : null,
        $r['address'],
        $mapsUrl,
        $r['accuracy_m'] !== null ? (int)$r['accuracy_m'] : null,
        $r['photo_path'] ? $uploadsBase . '/' . $r['photo_path'] : null,
        (int)$r['location_mismatch'] === 1 ? '⚠ 最寄駅から離れています' : '',
    ];
    $ids[] = (int)$r['id'];
}

try {
    $client = new GoogleSheetsClient(
        $config['google']['service_account_json'],
        $config['google']['spreadsheet_id'],
        $config['google']['sheet_range']
    );
    // 一度に送りすぎないよう 100 行ずつ
    foreach (array_chunk($values, 100, false) as $i => $chunk) {
        $client->appendRows($chunk);
        $chunkIds = array_slice($ids, $i * 100, 100);
        $in = implode(',', array_fill(0, count($chunkIds), '?'));
        $pdo->prepare("UPDATE attendance_records SET sheet_synced = 1 WHERE id IN ($in)")->execute($chunkIds);
        echo 'appended ' . count($chunk) . " rows\n";
    }
    echo "done\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo 'ERROR: ' . $e->getMessage() . "\n";
    @file_put_contents(__DIR__ . '/../sheets_debug.log', date('c') . ' resync: ' . $e->getMessage() . "\n", FILE_APPEND);
    exit(1);
}
