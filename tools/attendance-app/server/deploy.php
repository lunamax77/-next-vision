<?php
/**
 * 自動デプロイ(サーバー側がGitHubから最新版を取りに行く方式)。
 *
 * CoreServer 側から GitHub へは通信できるが、GitHub 側からこのサーバーへは
 * 海外IP制限で届かないため、サーバーが自分で取りに行く。
 *
 * 実行方法:
 *   - CRON(推奨・5分おき): php /virtual/dcreation/public_html/attendance/server/deploy.php
 *   - ブラウザから手動:   https://<domain>/attendance/server/deploy.php?token=<deploy_token>
 *       ?force=1 を付けると変更が無くても再展開する
 *
 * 動き:
 *   1. GitHub API で対象ブランチの最新コミットIDを取得
 *   2. 前回展開したIDと同じなら何もしない
 *   3. 違えば zip をダウンロードし tools/attendance-app/ 配下を /attendance/ に展開
 *      (config.js / config.php / 鍵ファイル / 写真 / .htpasswd は上書きしない)
 */
declare(strict_types=1);

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
}

function out(string $line): void
{
    echo $line, "\n";
}

function fail(string $msg, int $status = 500): void
{
    if (PHP_SAPI !== 'cli') {
        http_response_code($status);
    }
    out('ERROR: ' . $msg);
    @file_put_contents(__DIR__ . '/deploy.log', date('c') . ' ERROR ' . $msg . "\n", FILE_APPEND);
    exit(1);
}

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    fail('config.php missing');
}
$config = require $configPath;

if (!$isCli) {
    $expected = (string)($config['deploy_token'] ?? '');
    $given = (string)($_GET['token'] ?? ($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? ''));
    if ($expected === '' || strlen($expected) < 16 || !hash_equals($expected, $given)) {
        fail('invalid deploy token', 401);
    }
}
if (!class_exists('ZipArchive')) {
    fail('ZipArchive not available');
}

$repo = $config['github']['repo'] ?? 'lunamax77/-next-vision';
$branch = $config['github']['branch'] ?? 'claude/internal-app-development-dw39w5';
$subdir = 'tools/attendance-app/';
$force = $isCli ? in_array('--force', $argv ?? [], true) : !empty($_GET['force']);

$shaFile = __DIR__ . '/.deployed_sha';
$targetRoot = realpath(__DIR__ . '/..');
if ($targetRoot === false) {
    fail('target root not found');
}

function http_get(string $url, array $headers = [], ?string $saveTo = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => array_merge(['User-Agent: NextVision-AttendanceDeploy/1.0'], $headers),
    ];
    $fp = null;
    if ($saveTo !== null) {
        $fp = fopen($saveTo, 'wb');
        $opts[CURLOPT_FILE] = $fp;
    } else {
        $opts[CURLOPT_RETURNTRANSFER] = true;
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($fp) {
        fclose($fp);
    }
    return [$status, $body, $err];
}

// 1. 最新コミットIDを取得
[$status, $sha, $err] = http_get(
    sprintf('https://api.github.com/repos/%s/commits/%s', $repo, rawurlencode($branch)),
    ['Accept: application/vnd.github.sha']
);
if ($status !== 200 || !is_string($sha) || !preg_match('/^[0-9a-f]{40}$/', trim($sha))) {
    fail(sprintf('failed to get latest commit (HTTP %d %s)', $status, $err));
}
$sha = trim($sha);
$current = is_readable($shaFile) ? trim((string)file_get_contents($shaFile)) : '';

out('branch : ' . $branch);
out('latest : ' . $sha);
out('current: ' . ($current !== '' ? $current : '(none)'));

if ($sha === $current && !$force) {
    out('up to date. nothing to do.');
    exit(0);
}

// 2. zip をダウンロード
$tmpZip = tempnam(sys_get_temp_dir(), 'attdeploy');
[$status, , $err] = http_get(sprintf('https://codeload.github.com/%s/zip/%s', $repo, $sha), [], $tmpZip);
if ($status !== 200 || filesize($tmpZip) < 1000) {
    @unlink($tmpZip);
    fail(sprintf('failed to download zip (HTTP %d %s)', $status, $err));
}

// 3. 展開(保護ファイルは上書きしない)
$protectedExact = [
    'config.js',
    'server/config.php',
    'server/google-service-account.json',
    'server/sheets_debug.log',
    'server/deploy.log',
    'server/.deployed_sha',
];
$protectedPatterns = [
    '#(^|/)\.htpasswd$#',
    '#^server/uploads/#',
    '#(^|/)\.git[a-z]*$#',
];

$zip = new ZipArchive();
if ($zip->open($tmpZip) !== true) {
    @unlink($tmpZip);
    fail('invalid zip');
}

$written = 0;
$skipped = [];
$errors = [];
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if ($name === false) {
        continue;
    }
    $name = str_replace('\\', '/', $name);
    // 先頭の "<repo>-<sha>/" を外す
    $slash = strpos($name, '/');
    if ($slash === false) {
        continue;
    }
    $rel = substr($name, $slash + 1);
    if (strpos($rel, $subdir) !== 0) {
        continue; // 勤怠アプリ以外のファイル
    }
    $rel = substr($rel, strlen($subdir));
    if ($rel === '' || substr($rel, -1) === '/') {
        continue;
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
    if (file_exists($dest) && file_get_contents($dest) === $data) {
        continue; // 変更なし
    }
    $tmp = $dest . '.deploy-tmp';
    if (file_put_contents($tmp, $data) === false || !rename($tmp, $dest)) {
        @unlink($tmp);
        $errors[] = 'write failed: ' . $rel;
        continue;
    }
    $written++;
    out('updated: ' . $rel);
}
$zip->close();
@unlink($tmpZip);

if (count($errors) === 0) {
    file_put_contents($shaFile, $sha . "\n");
}
$summary = sprintf('deployed %s: updated=%d skipped=%d errors=%d', substr($sha, 0, 7), $written, count($skipped), count($errors));
out($summary);
foreach ($errors as $e) {
    out('  ' . $e);
}
@file_put_contents(__DIR__ . '/deploy.log', date('c') . ' ' . $summary . (count($errors) ? ' ' . implode('; ', $errors) : '') . "\n", FILE_APPEND);
if (count($errors)) {
    if (!$isCli) {
        http_response_code(500);
    }
    exit(1);
}
