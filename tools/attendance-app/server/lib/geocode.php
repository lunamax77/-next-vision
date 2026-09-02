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
