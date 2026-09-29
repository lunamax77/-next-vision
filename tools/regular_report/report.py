#!/usr/bin/env python3
"""madonna-bbs.site の「ご来店予告」から、当日営業分(5:00区切り)の予告者を
男女別・部別(1部/1.5部/2部)・常連/非常連で集計する。部は予告文から推定。"""
import html
import unicodedata
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://madonna-bbs.site/"
JST = timezone(timedelta(hours=9))

# 常連: 過去3ヶ月(2026-06-27〜09-27)の来店予告日数 男女別トップ30(30位同数は全員含む)
REGULAR_FEMALE = [
    "も", "のん", "サトシ", "もえ", "しずく", "もも🍑", "はるぴ", "みな", "ちょも", "りん",
    "momo", "雨", "なな", "はち", "百", "ななせ", "ゆい", "K", "りこ", "なつ",
    "なつ。", "まな", "ゆかり", "あ", "おこげ", "えむ", "m", "えふ", "めめ", "かえで",
]
REGULAR_MALE = [
    "チャンス", "まる", "リュウ♂", "れもさわ", "あつし", "つかさ", "ゆう", "よや(しょーや)", "おた", "そら",
    "れん", "クロ", "ねじ", "しろ⚪", "Coke", "りく", "ヒロシマ", "ジョンソン", "りょう", "ひろ",
    "けい", "ミズキ", "KENZO", "りおん", "かい", "かず", "たんたん", "守安🌳", "れい", "T",
    "コーチ", "ボブ", "とと",
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


def key(s):
    """常連照合用: 絵文字・記号を除いて比較する(例: もも🍑 → もも)。句読点は残す。"""
    s = unicodedata.normalize("NFC", s)
    return "".join(c for c in s if unicodedata.category(c) not in ("So", "Sk", "Cf", "Mn")).strip()


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
        # 来店の言い回しがなくても、営業時間中(13:00〜翌5:00)の投稿は投稿時刻で振り分ける
        hh, mm = map(int, post_time.split(":")[:2])
        mins = hh * 60 + mm
        if 5 * 60 <= mins < 13 * 60:
            return "時間不明"
    if mins < 5 * 60:
        return "2部"
    if mins < 16 * 60 + 30:
        return "1部"
    if mins < 19 * 60:
        return "1.5部"
    return "2部"


STAY_HOURS = 4  # 来店してから最大この時間まで在店とみなす
PART_START = {"1": 13 * 60, "1.5": 16 * 60 + 30, "2": 19 * 60}


def arrival(msg, post_dt, day_start):
    """予告文から来店予定時刻を推定する。書いた時刻 > 部の開始 > 夜/夕方 > 投稿時刻。不明なら None。"""
    t = re.sub(r"<[^>]+>", "", html.unescape(msg))
    t = t.translate(str.maketrans("０１２３４５６７８９．", "0123456789."))
    if "明日" in t:
        return None
    base = day_start.replace(hour=0, minute=0)

    def at(mins):
        d = base + timedelta(minutes=mins)
        return d + timedelta(days=1) if mins < 5 * 60 else d

    m = re.search(r"(\d{1,2})\s*(?:時|:(\d{2}))(半)?", t)
    if m:
        mins = int(m.group(1)) % 24 * 60 + (int(m.group(2)) if m.group(2) else 30 if m.group(3) else 0)
        return at(mins)
    m = re.search(r"(1\.5|2|1)部", t)
    if m:
        return max(post_dt, at(PART_START[m.group(1)]))
    if "夜" in t:
        return max(post_dt, at(20 * 60))
    if "夕方" in t:
        return max(post_dt, at(17 * 60))
    if 5 <= post_dt.hour < 12:
        return None  # 午前中の投稿で時刻の手がかりなし
    return post_dt


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

    reg = {"女性": {key(norm(n)) for n in REGULAR_FEMALE}, "男性": {key(norm(n)) for n in REGULAR_MALE}}
    people = {}  # (gender, name) -> 部
    present = {}  # (gender, 照合キー) -> (表示名, 来店予定時刻)
    for p in posts:
        g = norm(p["gender"])
        if g == "スタッフ":
            continue
        # 「たま♂、たか♂」のような複数名投稿は1人ずつに分ける(カップルは1組のまま)
        names = [norm(p["name"])] if g == "カップル" else re.split(r"[、,，　&＆]", norm(p["name"]))
        for n in names:
            if n.strip():
                people.setdefault((g, n.strip()), classify(p["msg"], p["time"]))
                post_dt = datetime.strptime(f'{p["date"]} {p["time"]}', "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST)
                k = (g, n.strip() if g == "カップル" else key(n.strip()))
                if k not in present:  # 新しい投稿を優先
                    present[k] = (n.strip(), arrival(p["msg"], post_dt, start))

    now = now_dt.strftime("%Y-%m-%d %H:%M")
    print(f"■ ご来店予告 集計({now} JST 時点 / 営業日 {today} 5:00〜)")
    # 部の移動はないものとして、部ごとに表を分けて表示する
    for part in PARTS:
        rows = []
        for g in ("女性", "男性"):
            ns = [n for (gg, n), pt in people.items() if gg == g and pt == part]
            rows.append((g, [n for n in ns if key(n) in reg[g]], [n for n in ns if key(n) not in reg[g]]))
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
    # 在店推定: 来店予定時刻から STAY_HOURS 時間以内の人
    here = {k: v for k, v in present.items()
            if v[1] and v[1] <= now_dt < v[1] + timedelta(hours=STAY_HOURS)}
    print(f"\n【今いると思われる人】(来店予定から{STAY_HOURS}時間以内)")
    print("| | 常連 | 非常連 | 計 |")
    print("|---|---|---|---|")
    lines = []
    for g in ("女性", "男性"):
        hs = sorted((v for k, v in here.items() if k[0] == g), key=lambda v: v[1])
        r = [f"{n}({a:%H:%M})" for n, a in hs if key(n) in reg[g]]
        o = [f"{n}({a:%H:%M})" for n, a in hs if key(n) not in reg[g]]
        print(f"| {g} | {len(r)} | {len(o)} | {len(r) + len(o)} |")
        if r or o:
            lines.append(f"- {g} 常連: {'、'.join(r) or '-'} / 非常連: {'、'.join(o) or '-'}")
    cs = [f"{n}({a:%H:%M})" for (g, _), (n, a) in here.items() if g == "カップル"]
    print(f"| カップル | - | - | {len(cs)}組 |")
    print("\n".join(lines))
    if cs:
        print(f"- カップル: {'、'.join(cs)}")
    tomorrow = [f"{n}({g})" for (g, n), part in people.items() if part == "明日"]
    if tomorrow:
        print(f"\n※明日の予告(集計外): {'、'.join(tomorrow)}")
    others = [f"{n}({g})" for (g, n) in people if g not in ("女性", "男性", "カップル")]
    if others:
        print(f"その他: {'、'.join(others)}")


if __name__ == "__main__":
    sys.exit(main())
