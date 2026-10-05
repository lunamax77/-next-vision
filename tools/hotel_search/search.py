#!/usr/bin/env python3
"""楽天トラベル空室検索API で、会場周辺の空いている宿を探す。

使い方:
  export RAKUTEN_APP_ID=...        # 楽天ウェブサービスのアプリID
  export RAKUTEN_ACCESS_KEY=pk_... # アクセスキー
  python3 search.py --lat 36.7550 --lng 137.0200 --in 2026-11-14 --out 2026-11-15 \
      --adults 2 --rooms 2 --radius 3 --max 12000 --csv result.csv
"""
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

REFERER = os.environ.get("RAKUTEN_REFERER", "https://nextvision.fun/")
ENDPOINT = os.environ.get(
    "RAKUTEN_VACANT_URL",
    "https://openapi.rakuten.co.jp/engine/api/Travel/VacantHotelSearch/20170426",
)


def fetch(params):
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    # 2026年2月以降の新方式: アクセスキー必須・許可サイトのRefererで照合
    req = urllib.request.Request(url, headers={
        "Referer": REFERER, "Origin": REFERER.rstrip("/"),
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = json.loads(e.read() or b"{}")
        if e.code == 404:  # 条件に合う空室なし
            return {"hotels": [], "pagingInfo": {"pageCount": 0}}
        sys.exit(f"APIエラー {e.code}: {body.get('error_description', body)}")


def parse(data):
    rows = []
    for h in data.get("hotels", []):
        parts = h.get("hotel", [])
        info = next((p["hotelBasicInfo"] for p in parts if "hotelBasicInfo" in p), {})
        rooms = [p["roomInfo"] for p in parts if "roomInfo" in p]
        cheapest = None
        for room in rooms:
            basic = next((x["roomBasicInfo"] for x in room if "roomBasicInfo" in x), {})
            charge = next((x["dailyCharge"] for x in room if "dailyCharge" in x), {})
            total = charge.get("total")
            if total is not None and (cheapest is None or total < cheapest[0]):
                cheapest = (total, basic.get("roomName", ""), basic.get("planName", ""))
        rows.append({
            "宿名": info.get("hotelName", ""),
            "最安(1室/泊)": cheapest[0] if cheapest else info.get("hotelMinCharge", ""),
            "部屋": cheapest[1] if cheapest else "",
            "プラン": cheapest[2] if cheapest else "",
            "評価": info.get("reviewAverage", ""),
            "住所": info.get("address1", "") + info.get("address2", ""),
            "アクセス": info.get("access", ""),
            "予約URL": info.get("planListUrl") or info.get("hotelInformationUrl", ""),
        })
    return rows


def main():
    ap = argparse.ArgumentParser(description="会場周辺の空室検索(楽天トラベル)")
    ap.add_argument("--lat", type=float, required=True, help="会場の緯度(世界測地系)")
    ap.add_argument("--lng", type=float, required=True, help="会場の経度(世界測地系)")
    ap.add_argument("--in", dest="checkin", required=True, help="チェックイン YYYY-MM-DD")
    ap.add_argument("--out", dest="checkout", required=True, help="チェックアウト YYYY-MM-DD")
    ap.add_argument("--adults", type=int, default=1, help="1室あたり大人人数")
    ap.add_argument("--rooms", type=int, default=1, help="部屋数")
    ap.add_argument("--radius", type=float, default=3, help="検索半径km(0.1〜3)")
    ap.add_argument("--max", type=int, help="1室あたり上限料金(円)")
    ap.add_argument("--csv", help="結果をCSVに保存")
    a = ap.parse_args()

    app_id = os.environ.get("RAKUTEN_APP_ID")
    access_key = os.environ.get("RAKUTEN_ACCESS_KEY")
    if not (app_id and access_key):
        sys.exit("環境変数 RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY を設定してください")

    params = {
        "applicationId": app_id, "accessKey": access_key, "format": "json", "formatVersion": 1,
        "checkinDate": a.checkin, "checkoutDate": a.checkout,
        "adultNum": a.adults, "roomNum": a.rooms,
        "latitude": a.lat, "longitude": a.lng, "datumType": 1,
        "searchRadius": a.radius, "sort": "+roomCharge", "hits": 30,
    }
    if a.max:
        params["maxCharge"] = a.max

    rows, page = [], 1
    while True:
        data = fetch({**params, "page": page})
        rows += parse(data)
        if page >= data.get("pagingInfo", {}).get("pageCount", 0) or page >= 5:
            break
        page += 1

    if not rows:
        print("条件に合う空室はありません")
        return
    rows.sort(key=lambda r: r["最安(1室/泊)"] or 10**9)
    print(f"空室あり {len(rows)}件 ({a.checkin}〜{a.checkout} / {a.rooms}室×{a.adults}名)")
    for r in rows:
        print(f"¥{r['最安(1室/泊)']:>7,}  {r['宿名']}  ★{r['評価']}  {r['予約URL']}"
              if isinstance(r["最安(1室/泊)"], int) else f"{r['宿名']}  {r['予約URL']}")
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=rows[0].keys())
            w.writeheader()
            w.writerows(rows)
        print(f"CSV保存: {a.csv}")


if __name__ == "__main__":
    main()
