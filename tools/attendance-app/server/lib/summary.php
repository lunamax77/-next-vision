<?php
/**
 * 「本日の出勤状況サマリー」メールの本文を組み立てる。
 * 指定した時間帯(既定 9:00〜11:00)の出勤確認を15分刻みにまとめ、打刻順に並べる。
 */

/**
 * @param array    $staff    [['login_id','display_name','group_name','area','nearest_station'], ...](対象エリアのスタッフ)
 * @param array    $records  [['login_id','type','recorded_at'(UTC),'route','location_mismatch'], ...](当日分)
 * @param DateTime $day      対象日(日本時間)
 * @param string   $from     '09:00'
 * @param string   $to       '11:00'
 * @param string   $area     エリア名('' なら全体)
 * @return array [subject, body, punchedCount]
 */
function build_daily_summary(array $staff, array $records, DateTime $day, string $from, string $to, string $area): array
{
    $jst = new DateTimeZone('Asia/Tokyo');
    $utc = new DateTimeZone('UTC');
    $weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    $dayLabel = sprintf('%d/%d(%s)', (int)$day->format('n'), (int)$day->format('j'), $weekdays[(int)$day->format('w')]);

    [$fromH, $fromM] = array_map('intval', explode(':', $from));
    [$toH, $toM] = array_map('intval', explode(':', $to));
    $fromMin = $fromH * 60 + $fromM;
    $toMin = $toH * 60 + $toM;

    $nameByLogin = [];
    foreach ($staff as $s) {
        $nameByLogin[$s['login_id']] = $s;
    }

    // 対象時間帯の出勤確認を打刻順に拾う(同じ人が複数回押した場合は最初の1件)
    $punched = [];
    foreach ($records as $r) {
        if ($r['type'] !== 'checkin' || !isset($nameByLogin[$r['login_id']])) {
            continue;
        }
        if (isset($punched[$r['login_id']])) {
            continue;
        }
        $t = (new DateTime($r['recorded_at'], $utc))->setTimezone($jst);
        $min = (int)$t->format('G') * 60 + (int)$t->format('i');
        if ($min < $fromMin || $min >= $toMin) {
            continue;
        }
        $punched[$r['login_id']] = [
            'time' => $t,
            'slot' => intdiv($min, 15) * 15,
            'staff' => $nameByLogin[$r['login_id']],
            'route' => $r['route'],
            'mismatch' => (int)$r['location_mismatch'] === 1,
        ];
    }
    uasort($punched, static fn($a, $b) => $a['time'] <=> $b['time']);

    // 15分枠ごとにまとめる
    $bySlot = [];
    foreach ($punched as $p) {
        $bySlot[$p['slot']][] = $p;
    }
    ksort($bySlot);

    $lines = [];
    $lines[] = sprintf('%s %s〜%s の出勤打刻%s', $dayLabel, $from, $to, $area !== '' ? '(エリア: ' . $area . ')' : '');
    $lines[] = sprintf('出勤 %d名 / 対象 %d名', count($punched), count($staff));
    $lines[] = '';

    if (count($bySlot) === 0) {
        $lines[] = 'この時間帯の出勤打刻はありません。';
    }
    foreach ($bySlot as $slot => $list) {
        $slotLabel = sprintf('%02d:%02d', intdiv($slot, 15 * 4), $slot % 60);
        $first = true;
        foreach ($list as $p) {
            $name = $p['staff']['display_name'];
            $detail = [];
            if ($p['route']) {
                $detail[] = $p['route'];
            }
            if ($p['mismatch']) {
                $detail[] = '⚠最寄駅から離れています';
            }
            $lines[] = sprintf(
                '%s  %s %s%s',
                $first ? $slotLabel : '     ',
                $p['time']->format('H:i'),
                $name,
                count($detail) ? '(' . implode(' / ', $detail) . ')' : ''
            );
            $first = false;
        }
    }

    $notPunched = [];
    foreach ($staff as $s) {
        if (!isset($punched[$s['login_id']])) {
            $notPunched[] = $s['display_name'];
        }
    }
    $lines[] = '';
    $lines[] = '未打刻: ' . (count($notPunched) ? implode('、', $notPunched) : 'なし');
    $lines[] = '';
    $lines[] = sprintf('※ %s以降の打刻は含みません', $to);

    $subject = sprintf('【勤怠】%s 出勤状況 %s〜%s%s', $dayLabel, $from, $to, $area !== '' ? '(' . $area . ')' : '');
    return [$subject, implode("\n", $lines), count($punched)];
}

/**
 * DBから当日分を取り出してエリアごとにサマリーを作る。
 * @return array [['area' => ..., 'emails' => [...], 'subject' => ..., 'body' => ...], ...]
 */
function collect_daily_summaries(PDO $pdo, array $config, ?string $onlyArea = null): array
{
    $from = $config['summary']['from'] ?? '09:00';
    $to = $config['summary']['to'] ?? '11:00';

    $jst = new DateTimeZone('Asia/Tokyo');
    $utc = new DateTimeZone('UTC');
    $day = new DateTime('today', $jst);
    $startUtc = (clone $day)->setTimezone($utc)->format('Y-m-d H:i:s');
    $endUtc = (clone $day)->modify('+1 day')->setTimezone($utc)->format('Y-m-d H:i:s');

    $rules = $pdo->query('SELECT area, emails FROM area_notifications ORDER BY area')->fetchAll();
    $staffAll = $pdo->query(
        'SELECT login_id, display_name, group_name, area, nearest_station FROM staff_accounts
         WHERE is_active = 1 ORDER BY display_name'
    )->fetchAll();
    $stmt = $pdo->prepare(
        'SELECT login_id, type, recorded_at, route, location_mismatch FROM attendance_records
         WHERE recorded_at >= :s AND recorded_at < :e ORDER BY recorded_at ASC'
    );
    $stmt->execute(['s' => $startUtc, 'e' => $endUtc]);
    $records = $stmt->fetchAll();

    $out = [];
    foreach ($rules as $rule) {
        if ($onlyArea !== null && $rule['area'] !== $onlyArea) {
            continue;
        }
        $staff = array_values(array_filter($staffAll, static fn($s) => (string)$s['area'] === $rule['area']));
        [$subject, $body] = build_daily_summary($staff, $records, $day, $from, $to, $rule['area']);
        $out[] = [
            'area' => $rule['area'],
            'emails' => parse_email_list($rule['emails']),
            'subject' => $subject,
            'body' => $body,
        ];
    }
    return $out;
}
