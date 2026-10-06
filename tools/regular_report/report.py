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

# 常連: 過去半年(2026-03-30〜09-29)の来店予告日数 男女別トップ30(30位同数は全員含む)
REGULAR_FEMALE = [
    "のん", "も", "もも🍑", "しずく", "サトシ", "みな", "なつ。", "K", "百", "mimi",
    "もえ", "はち", "雨", "なつ", "まな", "りん", "ゆい", "えむ", "ゆかり", "なな",
    "ちょも", "すい", "はるぴ", "ななせ", "えふ", "m", "momo", "りこ", "ゆき", "あ",
    "キキ",
    "ミーミ",
]
REGULAR_MALE = [
    "チャンス", "まる", "リュウ♂", "ゆう", "おた", "りく", "つかさ", "そら", "れもさわ",
    "れん", "守安🌳", "ミズキ", "しろ⚪", "ヒロシマ", "ジョンソン", "しんちゃん", "けい", "れい", "よや(しょーや)",
    "ねじ", "Coke", "りょう", "ひろ", "ぼると", "かず", "クロ", "りおん", "たんたん", "S",
    "あつし",
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
    s = unicodedata.normalize("NFKC", s)  # 半角・全角を同一視
    return "".join(c for c in s if unicodedata.category(c) not in ("So", "Sk", "Cf", "Mn")).strip()


def norm(s):
    return html.unescape(s).strip().replace("（", "(").replace("）", ")")


# 常連レベル(過去半年の予告日数: Lv3=78日以上/週3〜, Lv2=52〜77日/週2〜3, Lv1=それ以外の常連。Lv4は代表の個別認定)
REGULAR_LEVEL = {
    "女性": {3: ["のん", "も", "もも🍑"],
             2: ["しずく", "サトシ", "みな"]},
    "男性": {4: ["あつし"],  # 代表の個別認定
             3: ["チャンス", "まる", "リュウ♂", "ゆう"],
             2: ["おた", "りく", "つかさ", "そら", "れもさわ", "れん"]},
}


LV4_DAYS = 100  # 半年の予告日数がこれ以上ならLv4


def level(g, n):
    """常連レベル(3/2/1)。常連でなければ 0。"""
    k = key(norm(n))
    if g not in REGULAR_LEVEL:
        return 0
    if HISTORY.get("counts", {}).get(g, {}).get(k, 0) >= LV4_DAYS:
        return 4
    for lv, names in REGULAR_LEVEL[g].items():
        if k in {key(norm(x)) for x in names}:
            return lv
    regs = REGULAR_FEMALE if g == "女性" else REGULAR_MALE
    return 1 if k in {key(norm(x)) for x in regs} else 0


# 過去の来店回数(予告日数)。build_history で作る history.json を読む
try:
    import json, os
    with open(os.path.join(os.path.dirname(__file__), "history.json"), encoding="utf-8") as f:
        HISTORY = json.load(f)
except (OSError, ValueError):
    HISTORY = {}


def label(g, n):
    """表示名: 常連はレベル、過去に来た人は回数を付ける。"""
    if n.startswith("予告なし"):
        return n
    lv = level(g, n) if g in ("女性", "男性") else 0
    tag = n + (f"[Lv{lv}]" if lv else "")
    if not HISTORY:
        return tag
    c = HISTORY.get("counts", {}).get(g, {}).get(n if g == "カップル" else key(norm(n)), 0)
    return tag + (f"({c}回)" if c else "(初)")


# 集計から除外する名前(代表ご本人)
EXCLUDE = {"たっぴー"}


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


STAY_HOURS_REGULAR = 5  # 常連の滞在時間(投稿からこの時間まで在店とみなす)
STAY_HOURS_OTHER = 3  # 常連以外・カップルの滞在時間


PART_START = {"1": 13 * 60, "1.5": 16 * 60 + 30, "2": 19 * 60}
PART_END = {"1部": 19 * 60, "1.5部": 23 * 60 + 30, "2部": 29 * 60}  # 2部は翌5:00


def at(day_start, mins):
    """営業日 day_start の 0:00 から mins 分後(5:00前は翌日扱い)。"""
    base = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
    if mins < 5 * 60:
        mins += 24 * 60
    return base + timedelta(minutes=mins)


def arrival(msg, post_dt, day_start):
    """来店時刻の推定。予告文の時刻/部が投稿より後ならそれを、なければ投稿時刻。
    開店(13:00)前の投稿は13:00来店扱い。明日の予告は対象外。"""
    t = re.sub(r"<[^>]+>", "", html.unescape(msg))
    t = t.translate(str.maketrans("０１２３４５６７８９．", "0123456789."))
    if "明日" in t:
        return None
    base = max(post_dt, at(day_start, 13 * 60)) if 5 <= post_dt.hour < 13 else post_dt
    m = re.search(r"(\d{1,2})\s*(?:時|:(\d{2}))(半)?", t)
    if m:
        mins = int(m.group(1)) % 24 * 60 + (int(m.group(2)) if m.group(2) else 30 if m.group(3) else 0)
        return max(base, at(day_start, mins))
    m = re.search(r"(1\.5|2|1)部", t)
    if m:
        return max(base, at(day_start, PART_START[m.group(1)]))
    return base


def walkins(msg):
    """スタッフの来店お礼投稿から (性別, 人数) を取り出す。予告へのお礼は除く。"""
    t = re.sub(r"<[^>]+>", "", html.unescape(msg))
    t = t.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    if "ご来店" not in t or "予告" in t:
        return []
    out = []
    for m in re.finditer(r"(女性|男性|カップル)[、,\s]*(?:(\d+)\s*[名組])?\s*様", t):
        out.append(({"カップル": "カップル"}.get(m.group(1), m.group(1)), int(m.group(2) or 1)))
    return out


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
    present = {}  # (gender, 照合キー) -> (表示名, 来店予定時刻, 部)
    walkin_no = 0
    for p in posts:
        g = norm(p["gender"])
        if norm(p["name"]) == "スタッフ":  # 性別を付けたスタッフ投稿もお店側として扱う
            g = "スタッフ"
        if g == "スタッフ":
            # 予告なしで来店した人はスタッフが「単独女性2名様ご来店…」と代理投稿する
            for wg, cnt in walkins(p["msg"]):
                post_dt = datetime.strptime(f'{p["date"]} {p["time"]}', "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST)
                for _ in range(cnt):
                    walkin_no += 1
                    n = f"予告なし{walkin_no}"
                    part = classify("", p["time"])
                    people.setdefault((wg, n), part)
                    present[(wg, n)] = (n, post_dt, part)
            continue
        # 「たま♂、たか♂」のような複数名投稿は1人ずつに分ける(カップルは1組のまま)
        names = [norm(p["name"])] if g == "カップル" else re.split(r"[、,，　&＆]", norm(p["name"]))
        for n in names:
            if n.strip() and key(norm(n)) not in EXCLUDE:
                people.setdefault((g, n.strip()), classify(p["msg"], p["time"]))
                post_dt = datetime.strptime(f'{p["date"]} {p["time"]}', "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST)
                k = (g, n.strip() if g == "カップル" else key(n.strip()))
                if k not in present:  # 新しい投稿を優先
                    part = classify(p["msg"], p["time"])
                    arr = arrival(p["msg"], post_dt, start)
                    if arr and part in PART_END:  # 部の開始前には来ない
                        arr = max(arr, at(start, PART_START[part.rstrip("部")]))
                    present[k] = (n.strip(), arr, part)

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
        print("| | Lv4 | Lv3 | Lv2 | Lv1 | 常連以外 | 計 |")
        print("|---|---|---|---|---|---|---|")
        for g, r, o in rows:
            lv = [sum(1 for n in r if level(g, n) == x) for x in (4, 3, 2, 1)]
            print(f"| {g} | {' | '.join(map(str, lv))} | {len(o)} | {len(r) + len(o)} |")
        print(f"| カップル | - | - | - | - | - | {len(couples)}組 |")
        for g, r, o in rows:
            if r or o:
                print(f"- {g} 常連: {'、'.join(label(g, n) for n in r) or '-'} / 非常連: {'、'.join(label(g, n) for n in o) or '-'}")
        if couples:
            print(f"- カップル: {'、'.join(label('カップル', n) for n in couples)}")
    # 在店推定: 投稿時刻から滞在時間以内の人
    def stay(k):
        g, kk = k
        return STAY_HOURS_REGULAR if g in reg and kk in reg[g] else STAY_HOURS_OTHER

    def leave(k, v):
        end = v[1] + timedelta(hours=stay(k))
        if v[2] in PART_END:  # 部の終了時刻で退店
            end = min(end, at(start, PART_END[v[2]]))
        return end

    here = {k: v for k, v in present.items() if v[1] and v[1] <= now_dt < leave(k, v)}
    print(f"\n【今いると思われる人】(来店から 常連{STAY_HOURS_REGULAR}h・それ以外{STAY_HOURS_OTHER}h、部の終了で退店)")
    print("| | Lv4 | Lv3 | Lv2 | Lv1 | 常連以外 | 計 | 常連の割合 |")
    print("|---|---|---|---|---|---|---|---|")
    tl = [0, 0, 0, 0]
    lines = []
    tr = to = 0

    def ratio(a, b):
        return f"{a * 100 // (a + b)}%" if a + b else "-"

    for g in ("女性", "男性"):
        hs = sorted((v[:2] for k, v in here.items() if k[0] == g), key=lambda v: v[1])
        r = [f"{label(g, n)} {a:%H:%M}" for n, a in sorted(
            (x for x in hs if key(x[0]) in reg[g]), key=lambda x: -level(g, x[0]))]
        o = [f"{label(g, n)} {a:%H:%M}" for n, a in hs if key(n) not in reg[g]]
        lv = [sum(1 for n, _a in hs if key(n) in reg[g] and level(g, n) == x) for x in (4, 3, 2, 1)]
        tl = [a + b for a, b in zip(tl, lv)]
        print(f"| {g} | {' | '.join(map(str, lv))} | {len(o)} | {len(r) + len(o)} | {ratio(len(r), len(o))} |")
        tr += len(r)
        to += len(o)
        if r or o:
            lines.append(f"- {g} 常連: {'、'.join(r) or '-'} / 非常連: {'、'.join(o) or '-'}")
    cs = [f"{label('カップル', n)} {a:%H:%M}" for (g, _), (n, a, _p) in here.items() if g == "カップル"]
    print(f"| 男女計 | {' | '.join(map(str, tl))} | {to} | {tr + to} | {ratio(tr, to)} |")
    print(f"| カップル | - | - | - | - | - | {len(cs)}組 | - |")
    print("\n".join(lines))
    if cs:
        print(f"- カップル: {'、'.join(cs)}")
    # 代表の実測との比較(補正倍率)
    try:
        import csv
        with open(os.path.join(os.path.dirname(__file__), "observations.csv"), encoding="utf-8") as f:
            obs = [r for r in csv.DictReader(x for x in f if not x.startswith("#"))]
    except OSError:
        obs = []
    if obs:
        pf = sum(int(r["pred_female"]) for r in obs); af = sum(int(r["actual_female"]) for r in obs)
        pm = sum(int(r["pred_male"]) for r in obs); am = sum(int(r["actual_male"]) for r in obs)
        nf = sum(1 for k in here if k[0] == "女性"); nm = sum(1 for k in here if k[0] == "男性")
        rf = af / pf if pf else 1; rm = am / pm if pm else 1
        print(f"\n【実測補正】(代表の実測{len(obs)}件: 女性 実測/推定={rf:.1f}倍、男性={rm:.1f}倍)")
        print(f"- 補正後の推定: 女性 約{round(nf * rf)}名、男性 約{round(nm * rm)}名"
              f"(未把握・滞在超過の割合 女性{max(0, 1 - 1 / rf) * 100:.0f}% / 男性{max(0, 1 - 1 / rm) * 100:.0f}%)")
    # 代表の判断基準: Lv4が2名以上 / 男性の常連が50%超 / 女性率50%以下 の時は行かない
    lv4 = [(k, v) for k, v in present.items() if k[0] in reg and v[1] and level(k[0], v[0]) == 4]
    men = [(k, v) for k, v in present.items() if k[0] == "男性" and v[1]]
    women = [(k, v) for k, v in present.items() if k[0] == "女性" and v[1]]

    def judge(t):
        n4 = [v[0] for k, v in lv4 if v[1] <= t < leave(k, v)]
        m = [(k, v) for k, v in men if v[1] <= t < leave(k, v)]
        mr = sum(1 for k, v in m if key(v[0]) in reg["男性"])
        why = []
        if len(n4) >= 2:
            why.append(f"Lv4が{len(n4)}名")
        if m and mr * 2 > len(m):
            why.append(f"男性常連{mr * 100 // len(m)}%")
        nw = sum(1 for k, v in women if v[1] <= t < leave(k, v))
        if nw + len(m) and nw * 2 <= nw + len(m):
            why.append(f"女性率{nw * 100 // (nw + len(m))}%")
        return why, n4, (mr, len(m))

    why, lv4_now, (mr, mn) = judge(now_dt)
    verdict = f"✕ 行かない方がいい({'・'.join(why)})" if why else "○ OK"
    print(f"\n**判定: {verdict}** 今いるLv4: {'、'.join(lv4_now) or 'なし'} / 男性常連 {mr}/{mn}名")
    # この先(閉店まで)の✕の時間帯
    t, close, bad, cur = now_dt.replace(minute=now_dt.minute // 10 * 10, second=0, microsecond=0), at(start, 29 * 60), [], None
    while t < close:
        lab = {"Lv4": "Lv4が2名以上", "男性": "男性常連50%超", "女性": "女性率50%以下"}
        w = {lab[x[:3] if x.startswith("Lv4") else x[:2]] for x in judge(t)[0]}
        if w and cur is None:
            cur, cw = t, set()
        if w:
            cw |= w
        if not w and cur is not None:
            bad.append(f"{cur:%H:%M}〜{t:%H:%M}({'・'.join(sorted(cw))})")
            cur = None
        t += timedelta(minutes=10)
    if cur is not None:
        bad.append(f"{cur:%H:%M}〜閉店({'・'.join(sorted(cw))})")
    for k, v in lv4:
        if v[1] > now_dt:
            print(f"- これから来るLv4: {v[0]}({v[1]:%H:%M}〜{leave(k, v):%H:%M})")
    print(f"- この先 ✕になる時間帯: {'、'.join(bad) or 'なし(今の予告では)'}")
    tomorrow = [f"{n}({g})" for (g, n), part in people.items() if part == "明日"]
    if tomorrow:
        print(f"\n※明日の予告(集計外): {'、'.join(tomorrow)}")
    others = [f"{n}({g})" for (g, n) in people if g not in ("女性", "男性", "カップル")]
    if others:
        print(f"その他: {'、'.join(others)}")


if __name__ == "__main__":
    sys.exit(main())
