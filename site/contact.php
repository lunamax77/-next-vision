<?php
/**
 * nextvision.fun お問い合わせフォーム受信処理
 *
 *  - POST のみ受付／同一オリジン確認（簡易CSRF対策）／ハニーポット／時間トラップ／回数制限（同一IP 10分3回・1時間8回、全体10分30回）
 *  - 不審な送信は非公開ログに記録し、10分に10件を超えたら代表へ警告メール（1時間に1通）
 *  - 必須チェック・メール形式チェック・文字数上限
 *  - 代表宛 通知メール ＋ 送信者宛 自動返信メール（mb_send_mail、ヘッダインジェクション対策済み）
 *  - Google スプレッドシートへ記録（GAS ウェブアプリへ cURL POST。失敗しても問い合わせは成功扱い）
 *  - 成功: thanks.html へリダイレクト／失敗: index.html?error=...#contact へ戻す
 *
 *  設定値は同じディレクトリの config.php（サーバー上で本番値に書き換える）。
 */
declare(strict_types=1);

mb_language('Japanese');
mb_internal_encoding('UTF-8');

/* ---------------------------------------------------------------- 設定 */
$cfg = [
    'NOTIFY_TO'       => 'data@nextvision.fun',
    'MAIL_FROM'       => 'data@nextvision.fun',
    'MAIL_FROM_NAME'  => '株式会社NextVision',
    'GAS_WEBHOOK_URL' => '',
    'GAS_TOKEN'       => '',
    'THANKS_URL'      => 'thanks.html',
    'ERROR_URL'       => 'index.html',
];
$cfgFile = __DIR__ . '/config.php';
if (is_file($cfgFile)) {
    $loaded = include $cfgFile;
    if (is_array($loaded)) {
        $cfg = array_merge($cfg, $loaded);
    }
}

/* ------------------------------------------------------------ ユーティリティ */
function nv_redirect(string $url): void
{
    header('Location: ' . $url, true, 303);
    exit;
}

/** 1行値: 改行・制御文字を除去（ヘッダインジェクション対策） */
function nv_line(string $s, int $max): string
{
    $s = str_replace(["\r", "\n", "\0"], ' ', $s);
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    $s = trim($s);
    return mb_substr($s, 0, $max);
}

/** 複数行値: 改行は残し、その他の制御文字を除去 */
function nv_text(string $s, int $max): string
{
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    $s = preg_replace('/[^\P{C}\n]/u', '', $s) ?? '';
    $s = trim($s);
    return mb_substr($s, 0, $max);
}

function nv_post(string $key): string
{
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    if (!mb_check_encoding($v, 'UTF-8')) {
        return '';
    }
    return $v;
}

function nv_back_with_error(array $cfg, string $msg, array $fields): void
{
    $q = ['error' => $msg];
    foreach ($fields as $k => $v) {
        // URL が長くなりすぎないよう本文は先頭 600 文字まで
        $q[$k] = ($k === 'message') ? mb_substr((string)$v, 0, 600) : $v;
    }
    nv_redirect($cfg['ERROR_URL'] . '?' . http_build_query($q, '', '&', PHP_QUERY_RFC3986) . '#contact');
}

/** 同一オリジンからの送信か（Origin → Referer → Sec-Fetch-Site の順に確認） */
function nv_same_origin(): bool
{
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?? $host;
    if ($host === '') {
        return false;
    }
    $check = static function (string $url) use ($host): ?bool {
        if ($url === '') {
            return null;
        }
        $h = parse_url($url, PHP_URL_HOST);
        if (!is_string($h)) {
            return false;
        }
        $h = strtolower($h);
        return $h === $host || $h === 'www.' . $host || 'www.' . $h === $host;
    };
    $o = $check((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($o !== null) {
        return $o;
    }
    $r = $check((string)($_SERVER['HTTP_REFERER'] ?? ''));
    if ($r !== null) {
        return $r;
    }
    $sfs = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($sfs !== '') {
        return $sfs === 'same-origin';
    }
    return false;
}

function nv_client_ip(): string
{
    return nv_line((string)($_SERVER['REMOTE_ADDR'] ?? ''), 64);
}

/* ------------------------------------------------------------ 大量送信の遮断・警告 */
/** 非公開の作業ディレクトリ（public_html の外。システムの一時領域を使う） */
function nv_private_dir(): string
{
    $d = rtrim(sys_get_temp_dir(), '/') . '/nv-contact-' . substr(md5(__DIR__), 0, 12);
    if (!is_dir($d)) {
        @mkdir($d, 0700, true);
    }
    return $d;
}

/** 不審な送信を1行記録し、短時間に集中したら代表へ警告メール（1時間に1通まで） */
function nv_security_event(array $cfg, string $kind, string $detail): void
{
    $dir  = nv_private_dir();
    $log  = $dir . '/security.log';
    $line = date('Y-m-d H:i:s') . "\t" . $kind . "\t" . nv_client_ip() . "\t" . $detail . "\n";
    @file_put_contents($log, $line, FILE_APPEND | LOCK_EX);
    error_log('[nextvision contact] blocked: ' . $kind . ' ' . $detail);

    // 直近10分の件数を数える
    $recent = 0;
    $since  = time() - 600;
    $lines  = @file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach (array_slice($lines, -500) as $l) {
        $t = strtotime(substr($l, 0, 19));
        if ($t !== false && $t >= $since) {
            $recent++;
        }
    }
    $flag = $dir . '/alert.sent';
    $lastAlert = is_file($flag) ? (int)filemtime($flag) : 0;
    if ($recent >= 10 && time() - $lastAlert > 3600) {
        @touch($flag);
        $to   = nv_line((string)$cfg['NOTIFY_TO'], 300);
        $from = filter_var((string)$cfg['MAIL_FROM'], FILTER_VALIDATE_EMAIL) ?: 'data@nextvision.fun';
        $body = "HP の問い合わせフォームに、短時間で不審な送信が集中しています。\n\n"
              . "直近10分のブロック件数：" . $recent . " 件\n"
              . "最新の記録：" . trim($line) . "\n\n"
              . "問い合わせの受付は継続しています（上限を超えた送信元だけを遮断しています）。\n"
              . "続く場合はコアサーバーのアクセスログを確認し、必要なら WAF や IP 制限をご検討ください。\n"
              . "直近の記録（最大20行）：\n" . implode("\n", array_slice($lines, -20)) . "\n";
        @mb_send_mail($to, '【HP警告】フォームへの大量送信をブロックしました', $body,
            'From: ' . $from . "\r\n" . 'X-Mailer: nextvision-contact-form', '-f' . $from);
    }
    // ログが大きくなりすぎないように末尾2000行だけ残す
    if (count($lines) > 2500) {
        @file_put_contents($log, implode("\n", array_slice($lines, -2000)) . "\n", LOCK_EX);
    }
}

/** 送信回数の上限: 同一IPは10分に3回・1時間に8回まで、全体で10分に30回まで */
function nv_rate_limited(): bool
{
    $file = nv_private_dir() . '/rate.json';
    $fh   = @fopen($file, 'c+');
    if ($fh === false) {
        return false; // 記録できない環境では遮断しない（受付を止めない）
    }
    flock($fh, LOCK_EX);
    $raw  = stream_get_contents($fh);
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) {
        $data = [];
    }
    $now = time();
    $ip  = nv_client_ip();
    foreach ($data as $k => $ts) {
        $data[$k] = array_values(array_filter((array)$ts, static fn($t) => is_int($t) && $t > $now - 3600));
        if (!$data[$k]) {
            unset($data[$k]);
        }
    }
    $mine   = $data[$ip] ?? [];
    $all    = array_merge(...array_values($data ?: [[]]));
    $in10   = count(array_filter($mine, static fn($t) => $t > $now - 600));
    $in60   = count($mine);
    $all10  = count(array_filter($all, static fn($t) => $t > $now - 600));
    $limited = ($in10 >= 3) || ($in60 >= 8) || ($all10 >= 30);
    if (!$limited) {
        $data[$ip] = array_merge($mine, [$now]);
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string)json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $limited;
}

/* ------------------------------------------------------------ 受付条件 */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nv_redirect($cfg['ERROR_URL'] . '#contact');
}
if (!nv_same_origin()) {
    nv_back_with_error($cfg, '送信元を確認できませんでした。お手数ですが、もう一度ページを開き直して送信してください。', []);
}
/* ハニーポット: 人間には見えない欄。埋まっていれば bot とみなし、成功したふりをして終了 */
if (nv_post('website') !== '') {
    nv_security_event($cfg, 'honeypot', 'ua=' . nv_line((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 120));
    nv_redirect($cfg['THANKS_URL']);
}
/* 時間トラップ: ページを開いてから3秒未満の送信は bot とみなす（JS 無効時は ts が無いので通す） */
$ts = nv_post('ts');
if ($ts !== '' && ctype_digit($ts) && (int)(microtime(true) * 1000) - (int)$ts < 3000) {
    nv_security_event($cfg, 'too-fast', 'ms=' . ((int)(microtime(true) * 1000) - (int)$ts));
    nv_redirect($cfg['THANKS_URL']);
}
/* 回数制限: 同一IPから短時間に繰り返し送られた場合は受け付けない */
if (nv_rate_limited()) {
    nv_security_event($cfg, 'rate-limit', 'ua=' . nv_line((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 120));
    nv_back_with_error($cfg, '短時間に送信が集中しているため、しばらく時間をおいてから再度お試しください。お急ぎの場合はお電話（070-1319-2126）でご連絡ください。', []);
}

/* ------------------------------------------------------------ 入力の整形 */
$PURPOSES = ['開催の相談', '資料請求', '写真素材の請求', '見積依頼'];
$PLANS    = ['機材レンタルのみ', '運営代行込み', '相談したい'];
$CONTENTS = ['キッズライセンスパーク', 'スクイーズ ワークショップ', 'シールデコ ワークショップ', 'エア遊具・ゲーム', '組み合わせを相談したい'];

$purpose = nv_line(nv_post('purpose'), 40);
$plan    = nv_line(nv_post('plan'), 40);
$company = nv_line(nv_post('company'), 100);
$name    = nv_line(nv_post('name'), 60);
$email   = nv_line(nv_post('email'), 254);
$content = nv_line(nv_post('content'), 60);
$message = nv_text(nv_post('message'), 3000);

if (!in_array($purpose, $PURPOSES, true)) {
    $purpose = $purpose === '' ? '（未選択）' : 'その他（' . $purpose . '）';
}
if (!in_array($plan, $PLANS, true)) {
    $plan = $plan === '' ? '（未選択）' : 'その他（' . $plan . '）';
}
if (!in_array($content, $CONTENTS, true)) {
    $content = $content === '' ? '（未選択）' : 'その他（' . $content . '）';
}

$fields = compact('purpose', 'plan', 'company', 'name', 'email', 'content', 'message');

/* ------------------------------------------------------------ バリデーション */
$errors = [];
if ($company === '') {
    $errors[] = '会社名・施設名';
}
if ($name === '') {
    $errors[] = 'ご担当者名';
}
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 254) {
    $errors[] = 'メールアドレス（形式をご確認ください）';
}
if ($errors) {
    nv_back_with_error($cfg, '未入力または形式に誤りがある項目があります：' . implode('／', $errors), $fields);
}

/* ------------------------------------------------------------ メール送信 */
$now      = date('Y-m-d H:i:s');
$ip       = nv_client_ip();
$ua       = nv_line((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 200);
$fromAddr = filter_var((string)$cfg['MAIL_FROM'], FILTER_VALIDATE_EMAIL) ?: 'data@nextvision.fun';
$fromName = mb_encode_mimeheader(nv_line((string)$cfg['MAIL_FROM_NAME'], 60), 'UTF-8', 'B', "\r\n");
$notifyTo = nv_line((string)$cfg['NOTIFY_TO'], 300);
$params   = '-f' . $fromAddr;   // エンベロープ送信元（バウンス先）。アドレスは上で形式検証済み

$bodyLines = [
    'ホームページのお問い合わせフォームから、以下の内容で送信がありました。',
    '',
    '受信日時　　　：' . $now,
    'ご用件　　　　：' . $purpose,
    'ご希望のプラン：' . $plan,
    '会社名・施設名：' . $company,
    'ご担当者名　　：' . $name,
    'メールアドレス：' . $email,
    'ご希望の体験　：' . $content,
    '',
    '開催予定日・会場・ご相談内容：',
    $message === '' ? '（記入なし）' : $message,
    '',
    '────────────────────────────',
    'このメールに返信すると、送信者（' . $email . '）宛に届きます。',
    'IP: ' . $ip,
    'UA: ' . $ua,
];

$notifySubject = '【HP問い合わせ】' . $company . '／' . $name;
$notifyHeaders = 'From: ' . $fromName . ' <' . $fromAddr . '>' . "\r\n"
    . 'Reply-To: ' . $email . "\r\n"
    . 'X-Mailer: nextvision-contact-form';

$sentNotify = @mb_send_mail($notifyTo, $notifySubject, implode("\n", $bodyLines), $notifyHeaders, $params);

if (!$sentNotify) {
    error_log('[nextvision contact] notify mail failed: ' . $company . ' / ' . $email);
    nv_back_with_error(
        $cfg,
        '送信処理でエラーが発生しました。お手数ですが、お電話（070-1319-2126）またはメール（data@nextvision.fun）でご連絡ください。',
        $fields
    );
}

/* 自動返信（テンプレート: mail-templates/autoreply.txt） */
$tplFile = __DIR__ . '/mail-templates/autoreply.txt';
$tpl = is_file($tplFile) ? (string)file_get_contents($tplFile) : "{name} 様\n\nお問い合わせありがとうございます。担当者よりご連絡いたします。\n\n株式会社NextVision";
$tpl = str_replace(["\r\n", "\r"], "\n", $tpl);
$replace = [
    '{purpose}' => $purpose,
    '{plan}'    => $plan,
    '{company}' => $company,
    '{name}'    => $name,
    '{email}'   => $email,
    '{content}' => $content,
    '{message}' => $message === '' ? '（記入なし）' : $message,
    '{date}'    => $now,
];
$autoBody = strtr($tpl, $replace);
$autoHeaders = 'From: ' . $fromName . ' <' . $fromAddr . '>' . "\r\n"
    . 'Reply-To: ' . $fromAddr . "\r\n"
    . 'X-Mailer: nextvision-contact-form';
$sentAuto = @mb_send_mail($email, '【株式会社NextVision】お問い合わせありがとうございます', $autoBody, $autoHeaders, $params);
if (!$sentAuto) {
    error_log('[nextvision contact] autoreply failed to: ' . $email);
}

/* ------------------------------------------------------------ スプレッドシート記録（失敗しても続行） */
$gasUrl = (string)$cfg['GAS_WEBHOOK_URL'];
if ($gasUrl !== '' && strpos($gasUrl, 'XXXXXXXX') === false && function_exists('curl_init')) {
    $payload = json_encode([
        'token'    => (string)$cfg['GAS_TOKEN'],
        'datetime' => $now,
        'purpose'  => $purpose,
        'plan'     => $plan,
        'company'  => $company,
        'name'     => $name,
        'email'    => $email,
        'content'  => $content,
        'message'  => $message,
        'ip'       => $ip,
        'ua'       => $ua,
        'referer'  => nv_line((string)($_SERVER['HTTP_REFERER'] ?? ''), 300),
        'notify_sent' => $sentNotify,
        'autoreply_sent' => $sentAuto,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($gasUrl);
    if ($ch !== false && $payload !== false) {
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,   // GAS は 302 でリダイレクトする
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 10,
        ]);
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if ($res === false || $code >= 400) {
            error_log('[nextvision contact] GAS webhook failed: HTTP ' . $code . ' ' . curl_error($ch));
        }
        curl_close($ch);
    }
}

nv_redirect($cfg['THANKS_URL']);
