<?php
/**
 * GitHub Actions からの自動デプロイ受け口。
 *
 * POST で zip(tools/attendance-app 配下をまとめたもの)を受け取り、
 * このファイルの1つ上(= /attendance/)に展開する。
 * サーバー側にしかない設定・鍵・写真は上書きしない。
 *
 * 認証: config.php の 'deploy_token' と、リクエストヘッダ X-Deploy-Token の一致。
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    respond(500, ['ok' => false, 'error' => 'config.php missing']);
}
$config = require $configPath;

$expected = (string)($config['deploy_token'] ?? '');
$given = (string)($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '');
if ($expected === '' || strlen($expected) < 16 || !hash_equals($expected, $given)) {
    respond(401, ['ok' => false, 'error' => 'invalid deploy token']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method not allowed']);
}
if (!class_exists('ZipArchive')) {
    respond(500, ['ok' => false, 'error' => 'ZipArchive not available']);
}
if (empty($_FILES['package']['tmp_name']) || !is_uploaded_file($_FILES['package']['tmp_name'])) {
    respond(400, ['ok' => false, 'error' => 'package file missing']);
}
if ((int)$_FILES['package']['size'] > 30 * 1024 * 1024) {
    respond(400, ['ok' => false, 'error' => 'package too large']);
}

// 展開先(= /attendance/)。config.php と同じ階層の1つ上。
$targetRoot = realpath(__DIR__ . '/..');
if ($targetRoot === false) {
    respond(500, ['ok' => false, 'error' => 'target root not found']);
}

// サーバー側だけにあるファイルは絶対に上書きしない
$protectedExact = [
    'config.js',
    'server/config.php',
    'server/google-service-account.json',
    'server/sheets_debug.log',
    'server/deploy.log',
];
$protectedPatterns = [
    '#(^|/)\.htpasswd$#',
    '#^server/uploads/#',
    '#(^|/)\.ftp-deploy-sync-state\.json$#',
];

$zip = new ZipArchive();
if ($zip->open($_FILES['package']['tmp_name']) !== true) {
    respond(400, ['ok' => false, 'error' => 'invalid zip']);
}

$written = [];
$skipped = [];
$errors = [];
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if ($name === false) {
        continue;
    }
    $rel = ltrim(str_replace('\\', '/', $name), '/');
    // zip 内が tools/attendance-app/... で始まっていても対応
    if (strpos($rel, 'tools/attendance-app/') === 0) {
        $rel = substr($rel, strlen('tools/attendance-app/'));
    }
    if ($rel === '' || substr($rel, -1) === '/') {
        continue; // ディレクトリエントリ
    }
    if (strpos($rel, '..') !== false) {
        $errors[] = 'unsafe path: ' . $rel;
        continue;
    }
    $isProtected = in_array($rel, $protectedExact, true);
    foreach ($protectedPatterns as $p) {
        if (preg_match($p, $rel)) {
            $isProtected = true;
        }
    }
    if ($isProtected) {
        $skipped[] = $rel;
        continue;
    }

    $data = $zip->getFromIndex($i);
    if ($data === false) {
        $errors[] = 'read failed: ' . $rel;
        continue;
    }
    $dest = $targetRoot . '/' . $rel;
    $dir = dirname($dest);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        $errors[] = 'mkdir failed: ' . $dir;
        continue;
    }
    // 途中で壊れたファイルが見えないよう、一時ファイルに書いてから置き換える
    $tmp = $dest . '.deploy-tmp';
    if (file_put_contents($tmp, $data) === false || !rename($tmp, $dest)) {
        @unlink($tmp);
        $errors[] = 'write failed: ' . $rel;
        continue;
    }
    $written[] = $rel;
}
$zip->close();

@file_put_contents(
    __DIR__ . '/deploy.log',
    sprintf("%s written=%d skipped=%d errors=%d %s\n", date('c'), count($written), count($skipped), count($errors), implode('; ', $errors)),
    FILE_APPEND
);

respond(count($errors) ? 500 : 200, [
    'ok' => count($errors) === 0,
    'written' => count($written),
    'skipped' => $skipped,
    'errors' => $errors,
    'files' => $written,
]);
