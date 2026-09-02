<?php

function generate_login_id(PDO $pdo): string
{
    for ($i = 0; $i < 30; $i++) {
        $candidate = 'staff' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM staff_accounts WHERE login_id = :login_id');
        $stmt->execute(['login_id' => $candidate]);
        if ((int)$stmt->fetchColumn() === 0) {
            return $candidate;
        }
    }
    throw new RuntimeException('failed to generate a unique login id');
}

function generate_temp_password(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $out = '';
    for ($i = 0; $i < 10; $i++) {
        $out .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $out;
}
