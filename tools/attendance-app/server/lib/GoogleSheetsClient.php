<?php
/**
 * サービスアカウント(JSON鍵)を使い、外部ライブラリなしで
 * Google Sheets API に1行追記するだけの最小クライアント。
 * composer が使えない共有サーバーでも動作するよう curl + openssl のみで実装。
 */
class GoogleSheetsClient
{
    private string $clientEmail;
    private string $privateKey;
    private string $spreadsheetId;
    private string $range;

    public function __construct(string $serviceAccountJsonPath, string $spreadsheetId, string $range)
    {
        if (!is_readable($serviceAccountJsonPath)) {
            throw new RuntimeException('service account json not found: ' . $serviceAccountJsonPath);
        }
        $data = json_decode(file_get_contents($serviceAccountJsonPath), true);
        if (!isset($data['client_email'], $data['private_key'])) {
            throw new RuntimeException('invalid service account json');
        }
        $this->clientEmail = $data['client_email'];
        $this->privateKey = $data['private_key'];
        $this->spreadsheetId = $spreadsheetId;
        $this->range = $range;
    }

    public function appendRow(array $values): void
    {
        $accessToken = $this->fetchAccessToken();

        $url = sprintf(
            'https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
            rawurlencode($this->spreadsheetId),
            rawurlencode($this->range)
        );

        $body = json_encode(['values' => [$values]], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
            ],
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($response === false || $status >= 300) {
            throw new RuntimeException('sheets append failed: HTTP ' . $status . ' ' . $err . ' ' . $response);
        }
    }

    private function fetchAccessToken(): string
    {
        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $claim = [
            'iss' => $this->clientEmail,
            'scope' => 'https://www.googleapis.com/auth/spreadsheets',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ];

        $segments = [
            $this->base64UrlEncode(json_encode($header)),
            $this->base64UrlEncode(json_encode($claim)),
        ];
        $signingInput = implode('.', $segments);

        $signature = '';
        $ok = openssl_sign($signingInput, $signature, $this->privateKey, 'sha256WithRSAEncryption');
        if (!$ok) {
            throw new RuntimeException('failed to sign JWT');
        }
        $segments[] = $this->base64UrlEncode($signature);
        $jwt = implode('.', $segments);

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $status >= 300) {
            throw new RuntimeException('failed to obtain access token: HTTP ' . $status . ' ' . $response);
        }

        $token = json_decode($response, true);
        if (!isset($token['access_token'])) {
            throw new RuntimeException('access_token missing in response');
        }
        return $token['access_token'];
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
