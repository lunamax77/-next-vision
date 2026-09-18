<?php
/**
 * 打刻通知メール送信(外部ライブラリなし・PHP標準の mail() を使用)。
 * 共有サーバー(CoreServer)では mail() がそのまま使えるため、SMTP設定は不要。
 */

/**
 * "a@x.com, b@y.com" のような文字列を配列にして、形式が正しいものだけ返す。
 */
function parse_email_list(string $raw): array
{
    $list = [];
    foreach (preg_split('/[,\s;、]+/u', $raw) ?: [] as $addr) {
        $addr = trim($addr);
        if ($addr !== '' && filter_var($addr, FILTER_VALIDATE_EMAIL)) {
            $list[] = $addr;
        }
    }
    return array_values(array_unique($list));
}

/**
 * 日本語件名・本文のメールを送る。成功したら true。
 */
function send_notification_mail(array $to, string $subject, string $body, string $from): bool
{
    if (count($to) === 0) {
        return false;
    }
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = implode("\r\n", [
        'From: ' . $from,
        'Reply-To: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    return mail(implode(',', $to), $encodedSubject, $body, $headers);
}

/**
 * 打刻1件分の通知メール本文を組み立てる。
 */
function build_attendance_mail(array $info): array
{
    $subject = sprintf(
        '【勤怠】%s %s %s%s',
        $info['staff_name'],
        $info['label'],
        $info['time_jst'],
        $info['area'] !== '' ? '(' . $info['area'] . ')' : ''
    );

    $lines = [
        '打刻がありました。',
        '',
        '氏名: ' . $info['staff_name'],
        'エリア: ' . ($info['area'] !== '' ? $info['area'] : '未設定'),
        'グループ: ' . ($info['group_name'] !== '' ? $info['group_name'] : '未設定'),
        '種別: ' . $info['label'],
        '日時: ' . $info['time_jst'],
    ];
    if ($info['transport_method'] !== null || $info['route'] !== null || $info['amount'] !== null) {
        $lines[] = '移動手段: ' . ($info['transport_method'] ?? '-');
        $lines[] = '経路: ' . ($info['route'] ?? '-');
        $lines[] = '金額: ' . ($info['amount'] !== null ? number_format((int)$info['amount']) . '円' : '-');
    }
    if ($info['address'] !== null) {
        $lines[] = '住所: ' . $info['address'];
    }
    if ($info['maps_url'] !== null) {
        $lines[] = '地図: ' . $info['maps_url'];
    }
    if ($info['photo_url'] !== null) {
        $lines[] = '写真: ' . $info['photo_url'];
    }
    if (!empty($info['location_mismatch'])) {
        $lines[] = '';
        $lines[] = '⚠ 登録された最寄駅から離れた場所からの打刻です';
    }
    $lines[] = '';
    $lines[] = '管理画面: ' . $info['admin_url'];

    return [$subject, implode("\n", $lines)];
}
