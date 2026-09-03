<?php

function reverse_geocode(float $lat, float $lng): ?string
{
    $url = sprintf(
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%s&lon=%s&accept-language=ja&zoom=18',
        rawurlencode((string)$lat),
        rawurlencode((string)$lng)
    );

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['User-Agent: NextVision-AttendanceApp/1.0 (internal tool)'],
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status >= 300) {
        return null;
    }

    $data = json_decode($response, true);
    return $data['display_name'] ?? null;
}

function maps_link(float $lat, float $lng): string
{
    return sprintf('https://www.google.com/maps?q=%s,%s', $lat, $lng);
}

/**
 * 駅名などの自由記述テキストを座標に変換する(取得できなければ null)。
 * 「(仮)」等の曖昧な入力は失敗して当然なので、呼び出し側は null を許容すること。
 */
function forward_geocode(string $query): ?array
{
    $url = sprintf(
        'https://nominatim.openstreetmap.org/search?format=jsonv2&q=%s&accept-language=ja&limit=1&countrycodes=jp',
        rawurlencode($query)
    );

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['User-Agent: NextVision-AttendanceApp/1.0 (internal tool)'],
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status >= 300) {
        return null;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || count($data) === 0) {
        return null;
    }

    return [
        'lat' => (float)$data[0]['lat'],
        'lng' => (float)$data[0]['lon'],
    ];
}

/**
 * 駅名から座標を取得する。
 * 「香芝駅」のように末尾に既に「駅」が付いていても二重に付けないよう正規化し、
 * 「〇〇駅」で見つからない場合は「〇〇」単体でも再検索する(取得できなければ null)。
 */
function geocode_station(string $stationName): ?array
{
    $base = (mb_substr($stationName, -1) === '駅') ? mb_substr($stationName, 0, -1) : $stationName;

    $result = forward_geocode($base . '駅');
    if ($result !== null) {
        return $result;
    }
    return forward_geocode($base);
}

/**
 * 2点間の距離をメートルで返す(ハーヴァサイン公式)。
 */
function distance_meters(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthRadius = 6371000.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2
        + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}
