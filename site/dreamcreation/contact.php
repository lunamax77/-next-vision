<?php
/**
 * お問い合わせフォーム送信スクリプト（株式会社DreamCreation）
 * index.html のフォームから JSON を受け取り、data@d-creation-o.com へメール送信し、
 * 送信者へ自動返信を行う。PHP 7.4 以上 / mb_send_mail が使えるサーバーを想定。
 */
mb_language('Japanese');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

$TO        = 'data@d-creation-o.com';                 // 受信先
$FROM      = 'noreply@d-creation-o.com';              // 送信元（ドメインのメールにするとスパム判定されにくい）
$FROM_NAME = '株式会社DreamCreation';
$SITE      = 'https://d-creation-o.com/';

function fail($msg, $code = 400) { http_response_code($code); echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed', 405);

// 同一オリジンからの送信のみ許可
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) fail('Forbidden', 403);

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;

$clean = function ($v, $max = 2000) {
    $v = trim((string)($v ?? ''));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
};
$company = $clean($data['company'] ?? '', 200);
$name    = $clean($data['name'] ?? '', 100);
$email   = $clean($data['email'] ?? '', 200);
$tel     = $clean($data['tel'] ?? '', 40);
$type    = $clean($data['type'] ?? '', 100);
$message = $clean($data['message'] ?? '', 5000);
$honey   = $clean($data['_honey'] ?? '', 100);

if ($honey !== '') { echo json_encode(['ok' => true]); exit; }           // bot はサイレントに無視
if ($name === '' || $email === '' || $message === '') fail('必須項目が未入力です。');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('メールアドレスの形式が正しくありません。');
if (preg_match('/[\r\n]/', $email . $name . $company)) fail('不正な入力です。');

// 簡易レート制限（同一IPから60秒に1回）
$lock = sys_get_temp_dir() . '/dc_contact_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
if (file_exists($lock) && time() - filemtime($lock) < 60) fail('送信間隔が短すぎます。しばらくしてから再度お試しください。', 429);
touch($lock);

$sentAt = date('Y-m-d H:i:s');
$ip     = $_SERVER['REMOTE_ADDR'] ?? '';
$ua     = $clean($_SERVER['HTTP_USER_AGENT'] ?? '', 300);

$body = <<<TXT
ホームページのお問い合わせフォームから送信がありました。

■ 会社名　　　：{$company}
■ お名前　　　：{$name}
■ メール　　　：{$email}
■ 電話番号　　：{$tel}
■ お問い合わせ種別：{$type}

■ お問い合わせ内容
{$message}

-----
送信日時：{$sentAt}
IP：{$ip}
UA：{$ua}
TXT;

$subject = '【HPお問い合わせ】' . $type . '：' . ($company !== '' ? $company : $name);
$headers = "From: " . mb_encode_mimeheader($FROM_NAME) . " <{$FROM}>\r\n"
         . "Reply-To: {$email}\r\n"
         . "X-Mailer: PHP/" . phpversion();
$ok = mb_send_mail($TO, $subject, $body, $headers);
if (!$ok) fail('送信に失敗しました。時間をおいて再度お試しください。', 500);

// 送信者への自動返信
$autoBody = <<<TXT
{$name} 様

この度は株式会社DreamCreationへお問い合わせいただき、誠にありがとうございます。
以下の内容で受け付けました。担当者より2営業日以内にご連絡いたします。

■ お問い合わせ種別：{$type}
■ お問い合わせ内容
{$message}

※ このメールは自動送信です。お心当たりがない場合は破棄してください。

-----
株式会社DreamCreation
〒550-0015 大阪府大阪市西区南堀江1-10-1 KT堀江801号室
TEL 06-4967-1038　MAIL {$TO}
{$SITE}
TXT;
$autoHeaders = "From: " . mb_encode_mimeheader($FROM_NAME) . " <{$FROM}>\r\nReply-To: {$TO}";
@mb_send_mail($email, '【株式会社DreamCreation】お問い合わせを受け付けました', $autoBody, $autoHeaders);

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
