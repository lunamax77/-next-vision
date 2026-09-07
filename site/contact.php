<?php
/**
 * nextvision.fun お問い合わせフォーム受信処理
 *
 *  - POST のみ受付／同一オリジン確認（簡易CSRF対策）／ハニーポット
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

/* ------------------------------------------------------------ 受付条件 */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nv_redirect($cfg['ERROR_URL'] . '#contact');
}
if (!nv_same_origin()) {
    nv_back_with_error($cfg, '送信元を確認できませんでした。お手数ですが、もう一度ページを開き直して送信してください。', []);
}
/* ハニーポット: 人間には見えない欄。埋まっていれば bot とみなし、成功したふりをして終了 */
if (nv_post('website') !== '') {
    nv_redirect($cfg['THANKS_URL']);
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
