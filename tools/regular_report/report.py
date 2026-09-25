#!/usr/bin/env python3
"""madonna-bbs.site の「ご来店予告」から、当日営業分(5:00区切り)の予告者を
男女別・部別(1部/1.5部/2部)・常連/非常連で集計する。部は予告文から推定。"""
import html
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://madonna-bbs.site/"
JST = timezone(timedelta(hours=9))

# 常連(代表提供のランキング上位30名ずつ)
REGULAR_FEMALE = [
    "のん", "も", "サトシ", "もえ", "しずく", "はるぴ", "りん", "ちょも", "みな", "momo",
    "もも", "雨", "えふ", "ゆい", "あ", "はち", "ななせ", "ミーミ", "なつ", "なな",
    "りこ", "K", "百", "ゆかり", "えむ", "なつ。", "かえで", "おこげ", "m", "めめ",
]
REGULAR_MALE = [
    "チャンス", "ゆう", "リュウ♂", "まる", "あつし", "りく", "れもさわ", "つかさ", "よや(しょーや)", "ひろ",
    "そら", "おた", "Coke", "ねじ", "スタッフ", "りょう", "クロ", "ヒロシマ", "しろ○", "れん",
    "ジョンソン", "けい", "ミズキ", "しんちゃん", "かい", "れい", "とと", "りおん", "たんたん", "ボブ",
]

POST_RE = re.compile(
    r'名前:\s*(?P<name>.*?)\s*\((?P<gender>[^()]*)\)</h3>\s*'
    r'<h4[^>]*>(?P<msg>.*?)<p class="days">投稿日：\s*(?P<date>\d{4}-\d{2}-\d{2}) (?P<time>[\d:]+)',
    re.S,
)


def fetch(page):
    req = urllib.request.Request(f"{BASE}?page={page}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def norm(s):
    return html.unescape(s).strip().replace("（", "(").replace("）", ")")


PARTS = ("1部", "1.5部", "2部", "時間不明")


def classify(msg, post_time):
    """予告メッセージから部を推定する。明示 > 時刻記載 > 今から等(投稿時刻) の順。"""
    t = re.sub(r"<[^>]+>", "", html.unescape(msg))
    t = t.translate(str.maketrans("０１２３４５６７８９．", "0123456789."))
    if "明日" in t:
        return "明日"
    m = re.search(r"(1\.5|１．５|2|1)部", t)
    if m:
        return {"1.5": "1.5部", "2": "2部", "1": "1部"}[m.group(1)]
    m = re.search(r"(\d{1,2})\s*(?:時|:\d{2})(半)?", t)
    if m:
        h = int(m.group(1)) % 24
        mins = h * 60 + (30 if m.group(2) else 0)
    elif "夜" in t:
        return "2部"
    elif "夕方" in t:
        return "1.5部"
    elif re.search(r"今から|これから|向かい|戻ります|今行|伺|行きます|いきます|行かせて", t):
        hh, mm = map(int, post_time.split(":")[:2])
        mins = hh * 60 + mm
        if mins < 13 * 60 - 60 and mins >= 5 * 60:
            return "時間不明"
    else:
        return "時間不明"
    if mins < 5 * 60:
        return "2部"
    if mins < 16 * 60 + 30:
        return "1部"
    if mins < 19 * 60:
        return "1.5部"
    return "2部"


def main():
    # 営業日は 5:00 区切り(2部は翌5:00まで)
    now_dt = datetime.now(JST)
    start = (now_dt - timedelta(hours=5)).replace(hour=5, minute=0, second=0, microsecond=0)
    start_s = start.strftime("%Y-%m-%d %H:%M:%S")
    end_s = (start + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    today = start.strftime("%Y-%m-%d")
    posts = []
    for page in range(1, 30):
        found = [m.groupdict() for m in POST_RE.finditer(fetch(page))]
        if not found:
            break
        posts += [p for p in found if start_s <= f'{p["date"]} {p["time"]}' < end_s]
        if any(f'{p["date"]} {p["time"]}' < start_s for p in found):
            break

    reg = {"女性": set(map(norm, REGULAR_FEMALE)), "男性": set(map(norm, REGULAR_MALE))}
    people = {}  # (gender, name) -> 最初の投稿
    for p in posts:
        g = norm(p["gender"])
        if g == "スタッフ":
            continue
        # 「たま♂、たか♂」のような複数名投稿は1人ずつに分ける(カップルは1組のまま)
        names = [norm(p["name"])] if g == "カップル" else re.split(r"[、,，　&＆]", norm(p["name"]))
        for n in names:
            if n.strip():
                people.setdefault((g, n.strip()), classify(p["msg"], p["time"]))

    now = now_dt.strftime("%Y-%m-%d %H:%M")
    print(f"■ ご来店予告 集計({now} JST 時点 / 営業日 {today} 5:00〜)")
    # 部の移動はないものとして、部ごとに表を分けて表示する
    for part in PARTS:
        rows = []
        for g in ("女性", "男性"):
            ns = [n for (gg, n), pt in people.items() if gg == g and pt == part]
            rows.append((g, [n for n in ns if n in reg[g]], [n for n in ns if n not in reg[g]]))
        couples = [n for (gg, n), pt in people.items() if gg == "カップル" and pt == part]
        total = sum(len(r) + len(o) for _, r, o in rows)
        if part == "時間不明" and not total and not couples:
            continue
        print(f"\n【{part}】計{total}名" + (f" + カップル{len(couples)}組" if couples else ""))
        print("| | 常連 | 非常連 | 計 |")
        print("|---|---|---|---|")
        for g, r, o in rows:
            print(f"| {g} | {len(r)} | {len(o)} | {len(r) + len(o)} |")
        print(f"| カップル | - | - | {len(couples)}組 |")
        for g, r, o in rows:
            if r or o:
                print(f"- {g} 常連: {'、'.join(r) or '-'} / 非常連: {'、'.join(o) or '-'}")
        if couples:
            print(f"- カップル: {'、'.join(couples)}")
    tomorrow = [f"{n}({g})" for (g, n), part in people.items() if part == "明日"]
    if tomorrow:
        print(f"\n※明日の予告(集計外): {'、'.join(tomorrow)}")
    others = [f"{n}({g})" for (g, n) in people if g not in ("女性", "男性", "カップル")]
    if others:
        print(f"その他: {'、'.join(others)}")


if __name__ == "__main__":
    sys.exit(main())
