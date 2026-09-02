<?php
/**
 * サービスアカウント(JSON鍵)を使い、外部ライブラリなしで
 * Google Sheets API に1行追記するだけの最小クライアント。
 * composer が使えない共有サーバーでも動作するよう curl + openssl のみで実装。
 *
 * Sheets の values:append は「表」の自動検出に失敗すると別の行・列に
 * ずれて書き込まれることがあるため、A列の件数を数えて次の空き行を
 * 自分で計算し、values:update でその行に直接書き込む方式にしている。
 */
class GoogleSheetsClient
{
    private string $clientEmail;
    private string $privateKey;
    private string $spreadsheetId;
    private string $sheetName;
    private string $lastColumn;

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

        // "シート1!A:J" のような形式から シート名 と 最終列 を取り出す
        if (!preg_match('/^(.+)!([A-Z]+):([A-Z]+)$/u', $range, $m)) {
            throw new RuntimeException('invalid sheet range: ' . $range);
        }
        $this->sheetName = $m[1];
        $this->lastColumn = $m[3];
    }

    public function appendRow(array $values): void
    {
        $accessToken = $this->fetchAccessToken();
        $nextRow = $this->findNextRow($accessToken);

        $range = sprintf('%s!A%d:%s%d', $this->sheetName, $nextRow, $this->lastColumn, $nextRow);
        $url = sprintf(
            'https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s?valueInputOption=USER_ENTERED',
            rawurlencode($this->spreadsheetId),
            rawurlencode($range)
        );

        $body = json_encode(['values' => [$values]], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'PUT',
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
            throw new RuntimeException('sheets update failed: HTTP ' . $status . ' ' . $err . ' ' . $response);
        }
    }

    private function findNextRow(string $accessToken): int
    {
        $range = $this->sheetName . '!A:A';
        $url = sprintf(
            'https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s',
            rawurlencode($this->spreadsheetId),
            rawurlencode($range)
        );

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $status >= 300) {
            throw new RuntimeException('sheets read failed: HTTP ' . $status . ' ' . $response);
        }

        $data = json_decode($response, true);
        $rowCount = isset($data['values']) ? count($data['values']) : 0;
        return $rowCount + 1;
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
