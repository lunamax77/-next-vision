#!/usr/bin/env python3
"""madonna-bbs.site の「ご来店予告」から、今日(JST)の予告者を男女別・常連/非常連で集計する。"""
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


def main():
    today = datetime.now(JST).strftime("%Y-%m-%d")
    posts = []
    for page in range(1, 30):
        found = [m.groupdict() for m in POST_RE.finditer(fetch(page))]
        if not found:
            break
        posts += [p for p in found if p["date"] == today]
        if any(p["date"] < today for p in found):
            break

    reg = {"女性": set(map(norm, REGULAR_FEMALE)), "男性": set(map(norm, REGULAR_MALE))}
    people = {}  # (gender, name) -> 最初の投稿
    for p in posts:
        g = norm(p["gender"])
        # 「たま♂、たか♂」のような複数名投稿は1人ずつに分ける
        for n in re.split(r"[、,，]", norm(p["name"])):
            if n.strip():
                people.setdefault((g, n.strip()), p)

    now = datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    print(f"■ ご来店予告 集計({now} JST 時点 / 対象: {today} の投稿)")
    for g in ("女性", "男性"):
        names = [n for (gg, n) in people if gg == g]
        r = [n for n in names if n in reg[g]]
        o = [n for n in names if n not in reg[g]]
        print(f"{g}: 計{len(names)}名(常連 {len(r)} / 非常連 {len(o)})")
        print(f"  常連: {'、'.join(r) or '-'}")
        print(f"  非常連: {'、'.join(o) or '-'}")
    others = [f"{n}({g})" for (g, n) in people if g not in ("女性", "男性")]
    if others:
        print(f"その他(カップル・スタッフ等): {'、'.join(others)}")


if __name__ == "__main__":
    sys.exit(main())
