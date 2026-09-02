<?php
/**
 * 最小限のWeb Push送信クライアント(ペイロードなし・通知トリガーのみ)。
 * VAPID認証のJWT署名にopensslのみ使用し、外部ライブラリに依存しない。
 */

function vapid_jwt(string $aud, string $subject, string $privateKeyPem): string
{
    $header = ['typ' => 'JWT', 'alg' => 'ES256'];
    $claims = ['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => $subject];

    $segments = [
        webpush_b64url(json_encode($header)),
        webpush_b64url(json_encode($claims)),
    ];
    $signingInput = implode('.', $segments);

    $privKey = openssl_pkey_get_private($privateKeyPem);
    if ($privKey === false) {
        throw new RuntimeException('invalid VAPID private key');
    }
    $ok = openssl_sign($signingInput, $derSig, $privKey, OPENSSL_ALGO_SHA256);
    if (!$ok) {
        throw new RuntimeException('failed to sign VAPID JWT');
    }
    $rawSig = der_ecdsa_to_raw($derSig, 32);
    $segments[] = webpush_b64url($rawSig);
    return implode('.', $segments);
}

function der_ecdsa_to_raw(string $der, int $partLen): string
{
    // DER: 0x30 len 0x02 rlen r 0x02 slen s
    $offset = 0;
    if (ord($der[$offset]) !== 0x30) {
        throw new RuntimeException('invalid DER signature');
    }
    $offset++;
    $offset += der_skip_length($der, $offset);

    [$r, $offset] = der_read_integer($der, $offset);
    [$s, $offset] = der_read_integer($der, $offset);

    return der_fixed_len($r, $partLen) . der_fixed_len($s, $partLen);
}

function der_skip_length(string $der, int $offset): int
{
    $len = ord($der[$offset]);
    if ($len & 0x80) {
        return 1 + ($len & 0x7F);
    }
    return 1;
}

function der_read_integer(string $der, int $offset): array
{
    if (ord($der[$offset]) !== 0x02) {
        throw new RuntimeException('invalid DER integer');
    }
    $offset++;
    $len = ord($der[$offset]);
    $offset++;
    $value = substr($der, $offset, $len);
    $offset += $len;
    return [$value, $offset];
}

function der_fixed_len(string $bytes, int $len): string
{
    $bytes = ltrim($bytes, "\x00");
    if (strlen($bytes) > $len) {
        $bytes = substr($bytes, -$len);
    }
    return str_pad($bytes, $len, "\x00", STR_PAD_LEFT);
}

function webpush_b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * 送信結果のHTTPステータスコードを返す(通信失敗時は0)。
 * 呼び出し側は 404/410 の場合に購読を破棄すること。
 */
function send_web_push(array $subscription, string $vapidPublicKey, string $vapidPrivateKeyPem, string $subject): int
{
    $endpoint = $subscription['endpoint'];
    $parts = parse_url($endpoint);
    if (!isset($parts['scheme'], $parts['host'])) {
        return 0;
    }
    $aud = $parts['scheme'] . '://' . $parts['host'];
    $jwt = vapid_jwt($aud, $subject, $vapidPrivateKeyPem);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => '',
        CURLOPT_HTTPHEADER => [
            'Authorization: vapid t=' . $jwt . ', k=' . $vapidPublicKey,
            'TTL: 60',
            'Content-Length: 0',
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $response === false ? 0 : $status;
}
