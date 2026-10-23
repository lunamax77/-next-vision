<?php
/**
 * セキュリティ監視(1時間ごとに CRON で実行)。
 *
 *   php /virtual/dcreation/public_html/attendance/server/cron/security_check.php
 *   https://<domain>/attendance/server/cron/security_check.php?token=<deploy_token>[&report=1]
 *
 * チェック内容
 *   1. ファイル改ざん: GitHub の正本(展開済みコミット)と /attendance/ 配下のファイルを比較し、
 *      改ざん・不明ファイル(特に uploads 内の実行ファイル)を検知
 *   2. スタッフアカウントの作成・削除・パスワード変更・有効/無効の変化
 *   3. 監査ログ(audit.log)から、トークン不一致やログイン失敗の連発、深夜の管理画面アクセス
 *   4. 毎朝(既定 8時台)に「異常なし」の定時報告(届かなくなれば監視停止に気づける)
 *
 * 異常があれば config.php の security_email(無ければ notify_from)へメール。
 */
declare(strict_types=1);

require __DIR__ . '/../lib/db.php';
require __DIR__ . '/../lib/mailer.php';

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
    if ($expected === '' || !hash_equals($expected, (string)($_GET['token'] ?? ''))) {
        http_response_code(401);
        echo "invalid token\n";
        exit;
    }
}
$forceReport = $isCli ? in_array('--report', $argv ?? [], true) : !empty($_GET['report']);

$jst = new DateTimeZone('Asia/Tokyo');
$now = new DateTime('now', $jst);
$repo = $config['github']['repo'] ?? 'lunamax77/-next-vision';
$subdir = 'tools/attendance-app/';
$appRoot = realpath(__DIR__ . '/../..');
$stateFile = __DIR__ . '/../.security_state.json';
$auditFile = __DIR__ . '/../audit.log';
$state = is_readable($stateFile) ? (json_decode((string)file_get_contents($stateFile), true) ?: []) : [];

$alerts = [];   // 重要: 即時通知
$notes = [];    // 参考: 定時報告に載せる
$out = static function (string $s) { echo $s, "\n"; };

// ---------- 1. ファイル改ざん ----------
$protectedExact = ['config.js', 'server/config.php', 'server/google-service-account.json', 'server/sheets_debug.log', 'server/deploy.log', 'server/audit.log', 'server/.deployed_sha', 'server/.security_state.json'];
$isProtected = static function (string $rel) use ($protectedExact): bool {
    if (in_array($rel, $protectedExact, true)) return true;
    return (bool)preg_match('#(^|/)\.htpasswd$|^server/uploads/|(^|/)\.git[a-z]*$|(^|/)\.ftp-deploy-sync-state\.json$#', $rel);
};
$gitBlobSha = static function (string $path): string {
    $data = (string)file_get_contents($path);
    return sha1('blob ' . strlen($data) . "\0" . $data);
};
$httpGet = static function (string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => ['User-Agent: NextVision-AttendanceSecurity/1.0', 'Accept: application/vnd.github+json']]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, $body];
};

$deployedSha = is_readable(__DIR__ . '/../.deployed_sha') ? trim((string)file_get_contents(__DIR__ . '/../.deployed_sha')) : '';
if (preg_match('/^[0-9a-f]{40}$/', $deployedSha)) {
    [$st, $body] = $httpGet(sprintf('https://api.github.com/repos/%s/git/trees/%s?recursive=1', $repo, $deployedSha));
    $tree = $st === 200 ? json_decode((string)$body, true) : null;
    if (is_array($tree) && !empty($tree['tree'])) {
        $expected = [];
        foreach ($tree['tree'] as $e) {
            if (($e['type'] ?? '') !== 'blob' || strpos($e['path'], $subdir) !== 0) continue;
            $rel = substr($e['path'], strlen($subdir));
            if ($isProtected($rel)) continue;
            $expected[$rel] = $e['sha'];
        }
        $modified = [];
        $missing = [];
        foreach ($expected as $rel => $sha) {
            $p = $appRoot . '/' . $rel;
            if (!is_file($p)) { $missing[] = $rel; continue; }
            if ($gitBlobSha($p) !== $sha) $modified[] = $rel;
        }
        // 不明ファイル(正本に無いファイル)
        $unknown = [];
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($appRoot, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($appRoot) + 1));
            if (isset($expected[$rel]) || $isProtected($rel)) {
                // uploads 内でも実行ファイルは危険
                if (preg_match('#^server/uploads/.*\.(php|phtml|phar|htaccess|cgi|pl|sh)$#i', $rel)) {
                    $alerts[] = "写真フォルダ内に実行ファイル: {$rel}";
                }
                continue;
            }
            if (preg_match('/\.(php|phtml|phar|cgi|pl|sh|htaccess)$/i', $rel) || preg_match('#(^|/)\.htaccess$#', $rel)) {
                $alerts[] = "正本に無い実行ファイル: {$rel}";
            } else {
                $unknown[] = $rel;
            }
        }
        // pathcheck.php 等、以前から置いてある既知の余分ファイルは state で無視リスト化
        $known = $state['known_unknown'] ?? [];
        $newUnknown = array_values(array_diff($unknown, $known));
        if ($modified) $alerts[] = '改ざんの可能性(正本と内容が違う): ' . implode(', ', $modified);
        if ($missing) $alerts[] = '正本にあるファイルが無い: ' . implode(', ', $missing);
        if ($newUnknown) $notes[] = '正本に無いファイル(初回のみ通知): ' . implode(', ', $newUnknown);
        $state['known_unknown'] = array_values(array_unique(array_merge($known, $unknown)));
        $out(sprintf('files: checked=%d modified=%d missing=%d unknown=%d', count($expected), count($modified), count($missing), count($unknown)));
    } else {
        $notes[] = 'GitHub から正本一覧を取得できませんでした(HTTP ' . $st . ')';
    }
} else {
    $notes[] = '展開済みコミットが記録されていないためファイル比較をスキップ(deploy.php を一度実行してください)';
}

// ---------- 2. アカウントの変化 ----------
try {
    $pdo = attendance_db($config);
    $rows = $pdo->query('SELECT id, login_id, display_name, is_active, password_hash FROM staff_accounts ORDER BY id')->fetchAll();
    $snap = [];
    foreach ($rows as $r) {
        $snap[(string)$r['id']] = ['login_id' => $r['login_id'], 'name' => $r['display_name'], 'active' => (int)$r['is_active'], 'pw' => substr(sha1($r['password_hash']), 0, 12)];
    }
    $prev = $state['accounts'] ?? null;
    if (is_array($prev)) {
        foreach ($snap as $id => $a) {
            if (!isset($prev[$id])) { $alerts[] = "アカウント作成: {$a['login_id']} {$a['name']}"; continue; }
            if ($prev[$id]['pw'] !== $a['pw']) $alerts[] = "パスワード変更: {$a['login_id']} {$a['name']}";
            if ($prev[$id]['active'] !== $a['active']) $alerts[] = sprintf('%s: %s %s', $a['active'] ? '有効化' : '無効化', $a['login_id'], $a['name']);
        }
        foreach ($prev as $id => $a) {
            if (!isset($snap[$id])) $alerts[] = "アカウント削除: {$a['login_id']} {$a['name']}";
        }
    }
    $state['accounts'] = $snap;
    $out('accounts: ' . count($snap));
} catch (Throwable $e) {
    $alerts[] = 'DBに接続できません: ' . $e->getMessage();
}

// ---------- 3. 監査ログの集計(直近1時間) ----------
$since = (clone $now)->modify('-65 minutes');
$counts = ['api_token_invalid' => [], 'login_failed' => [], 'admin_access' => []];
$lastPos = (int)($state['audit_pos'] ?? 0);
if (is_readable($auditFile)) {
    $size = filesize($auditFile);
    if ($size < $lastPos) $lastPos = 0; // ローテート等
    $fh = fopen($auditFile, 'r');
    fseek($fh, $lastPos);
    while (($line = fgets($fh)) !== false) {
        $j = json_decode($line, true);
        if (!is_array($j) || empty($j['ts'])) continue;
        $ev = $j['event'] ?? '';
        if (isset($counts[$ev])) $counts[$ev][] = $j;
    }
    $state['audit_pos'] = ftell($fh);
    fclose($fh);
}
$byIp = static function (array $list): string {
    $m = [];
    foreach ($list as $j) { $ip = $j['ip'] ?: '?'; $m[$ip] = ($m[$ip] ?? 0) + 1; }
    arsort($m);
    $parts = [];
    foreach (array_slice($m, 0, 5, true) as $ip => $n) $parts[] = "{$ip}×{$n}";
    return implode(', ', $parts);
};
if (count($counts['api_token_invalid']) >= 10) $alerts[] = sprintf('打刻APIへの不正リクエスト %d件(%s)', count($counts['api_token_invalid']), $byIp($counts['api_token_invalid']));
if (count($counts['login_failed']) >= 10) $alerts[] = sprintf('ログイン失敗 %d件(%s)', count($counts['login_failed']), $byIp($counts['login_failed']));
$night = [];
foreach ($counts['admin_access'] as $j) {
    $t = (new DateTime($j['ts']))->setTimezone($jst);
    $h = (int)$t->format('G');
    if ($h >= 0 && $h < 6) $night[] = $j;
}
if (count($night) > 0) $alerts[] = sprintf('深夜(0〜6時)の管理画面アクセス %d件(%s)', count($night), $byIp($night));
$out(sprintf('audit: token_invalid=%d login_failed=%d admin_access=%d', count($counts['api_token_invalid']), count($counts['login_failed']), count($counts['admin_access'])));

// ---------- 4. 通知 ----------
$to = parse_email_list((string)($config['security_email'] ?? $config['notify_from'] ?? ''));
$from = $config['notify_from'] ?? ('attendance@' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
$reportHour = (int)($config['security_report_hour'] ?? 8);
$today = $now->format('Y-m-d');
$dailyDue = $forceReport || ((int)$now->format('G') === $reportHour && ($state['last_report'] ?? '') !== $today);

$stateDir = dirname($stateFile);
if (count($alerts) > 0) {
    $body = "勤怠サーバーの監視で異常を検知しました。\n\n" . implode("\n", array_map(static fn($a) => '・' . $a, $alerts)) . "\n";
    if ($notes) $body .= "\n参考:\n" . implode("\n", array_map(static fn($a) => '・' . $a, $notes)) . "\n";
    $body .= "\n確認: net2ftp で該当ファイル、管理画面でアカウント一覧をご確認ください。\n";
    if (count($to)) send_notification_mail($to, '【勤怠・警告】' . $now->format('n/j H:i') . ' 異常を検知(' . count($alerts) . '件)', $body, $from);
    $out('ALERT: ' . implode(' | ', $alerts));
} elseif ($dailyDue) {
    $body = sprintf("%s 時点の勤怠サーバー監視結果: 異常なし\n\n・ファイル改ざん: なし\n・アカウント変更: なし\n・不正アクセス兆候: なし\n", $now->format('n/j H:i'));
    if ($notes) $body .= "\n参考:\n" . implode("\n", array_map(static fn($a) => '・' . $a, $notes)) . "\n";
    if (count($to)) send_notification_mail($to, '【勤怠・定時報告】' . $now->format('n/j') . ' 異常なし', $body, $from);
    $state['last_report'] = $today;
    $out('daily report sent');
} else {
    $out('no anomalies');
}
@file_put_contents($stateFile, json_encode($state, JSON_UNESCAPED_UNICODE));
