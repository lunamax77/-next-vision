<?php

function dispatch_notifications(array $config, string $type, string $label, string $staffName, string $recordedAt, ?string $address): void
{
    $notifyTypes = $config['notify']['types'] ?? [];
    if (!in_array($type, $notifyTypes, true)) {
        return;
    }

    if (!empty($config['notify']['email'])) {
        notify_send_email($config, $label, $staffName, $recordedAt, $address);
    }

    if (!empty($config['vapid']['public_key']) && !empty($config['vapid']['private_key_pem'])) {
        notify_send_push($config, $label, $staffName);
    }
}

function notify_send_email(array $config, string $label, string $staffName, string $recordedAt, ?string $address): void
{
    $subject = "[勤怠] {$staffName} が{$label}";
    $body = "{$staffName} さんが「{$label}」を記録しました。\n\n";
    $body .= "日時: {$recordedAt} (UTC)\n";
    if ($address) {
        $body .= "場所: {$address}\n";
    }
    if (!empty($config['notify']['admin_url'])) {
        $body .= "\n管理画面: " . $config['notify']['admin_url'] . "\n";
    }

    try {
        if (function_exists('mb_send_mail')) {
            mb_language('japanese');
            mb_internal_encoding('UTF-8');
            mb_send_mail($config['notify']['email'], $subject, $body);
        } else {
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            mail($config['notify']['email'], $encodedSubject, $body, "Content-Type: text/plain; charset=UTF-8\r\n");
        }
    } catch (Throwable $e) {
        error_log('notify email failed: ' . $e->getMessage());
    }
}

function notify_send_push(array $config, string $label, string $staffName): void
{
    require_once __DIR__ . '/webpush.php';
    require_once __DIR__ . '/db.php';

    try {
        $pdo = attendance_db($config);
        $subs = $pdo->query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions')->fetchAll();
        foreach ($subs as $sub) {
            $status = send_web_push(
                $sub,
                $config['vapid']['public_key'],
                $config['vapid']['private_key_pem'],
                $config['vapid']['subject'] ?? 'mailto:admin@example.com'
            );
            if ($status === 404 || $status === 410) {
                // 期限切れ・無効な購読は破棄する
                $pdo->prepare('DELETE FROM push_subscriptions WHERE id = :id')->execute(['id' => $sub['id']]);
            } elseif ($status < 200 || $status >= 300) {
                error_log("notify push non-2xx status {$status} for subscription {$sub['id']}");
            }
        }
    } catch (Throwable $e) {
        error_log('notify push failed: ' . $e->getMessage());
    }
}
