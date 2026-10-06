#!/usr/bin/env python3
"""駅すぱあと API(フリープラン)で、経路検索結果ページのURLを作る。

フリープランでは運賃・所要時間のデータは取れないため、結果ページへのリンクを出す。
数字は人がリンク先で確認する(またはAIがWebで調べて比較表に書く)。

使い方:
  export EKISPERT_KEY=...   # 駅すぱあと API のアクセスキー
  python3 link.py --from 新大阪 --to 宮崎 --date 2026-10-26 --time 09:00
  python3 link.py --from 宮崎 --to 新大阪 --date 2026-11-01 --time 18:00 --arrival
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("EKISPERT_URL", "https://api.ekispert.jp/v1/json")
# 登録ドメイン(nextvision.fun)で照合される場合に備えて Referer を付ける
REFERER = os.environ.get("EKISPERT_REFERER", "https://nextvision.fun/")


def get(path, params):
    url = f"{BASE}{path}?" + urllib.parse.urlencode({**params, "key": KEY})
    try:
        req = urllib.request.Request(url, headers={"Referer": REFERER})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"APIエラー {e.code}: {e.read().decode(errors='replace')[:300]}")


def station_code(name):
    """駅名を駅コードに変換(同名駅の取り違え防止)。見つからなければ名前のまま使う。"""
    data = get("/station/light", {"name": name, "type": "train"})
    points = data.get("ResultSet", {}).get("Point", [])
    if isinstance(points, dict):
        points = [points]
    for p in points:
        st = p.get("Station", {})
        if st.get("Name") == name:
            return st.get("code", name)
    if points:
        st = points[0].get("Station", {})
        print(f"※ {name} → {st.get('Name')} として検索します", file=sys.stderr)
        return st.get("code", name)
    return name


def main():
    ap = argparse.ArgumentParser(description="駅すぱあと 経路検索結果URLの生成")
    ap.add_argument("--from", dest="src", required=True, help="出発駅")
    ap.add_argument("--to", dest="dst", required=True, help="到着駅")
    ap.add_argument("--via", help="経由駅(任意)")
    ap.add_argument("--date", required=True, help="YYYY-MM-DD")
    ap.add_argument("--time", default="09:00", help="HH:MM")
    ap.add_argument("--arrival", action="store_true", help="到着時刻指定にする")
    a = ap.parse_args()

    params = {
        "from": station_code(a.src), "to": station_code(a.dst),
        "date": a.date.replace("-", ""), "time": a.time.replace(":", ""),
        "searchType": "arrival" if a.arrival else "departure",
    }
    if a.via:
        params["via"] = station_code(a.via)
    data = get("/search/course/light", params)
    uri = data.get("ResultSet", {}).get("ResourceURI")
    if not uri:
        sys.exit(f"URLを取得できませんでした: {json.dumps(data, ensure_ascii=False)[:300]}")
    kind = "着" if a.arrival else "発"
    print(f"{a.src} → {a.dst}  {a.date} {a.time}{kind}\n{uri}")


if __name__ == "__main__":
    KEY = os.environ.get("EKISPERT_KEY")
    if not KEY:
        sys.exit("環境変数 EKISPERT_KEY を設定してください")
    main()
