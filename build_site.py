"""整站產生器：地圖首頁 → 選地區 → 一週天氣預報，全部輸出成靜態 HTML。

依序對 22 縣市各呼叫一次 CWA API（不指定鄉鎮，一次拿回該縣市所有鄉鎮的資料），
所以總共只需要 22 次 API 請求，就能生出每個鄉鎮各自的預報頁面。

用法：
    python build_site.py --key <CWA_API_KEY>
    CWA_API_KEY=xxxx python build_site.py

輸出結構（都在 output/ 底下，跟 serve.py 服務的目錄一致）：
    output/index.html                地圖首頁
    output/select/{縣市}.html         選鄉鎮頁
    output/report/{縣市}/{鄉鎮}.html  一週天氣預報
"""
from __future__ import annotations

import argparse
import os
import sys
import webbrowser
from pathlib import Path

import locations
import taiwan_map
from cwa_client import CwaApiError, fetch_all_townships, parse_forecast
from report_builder import build_day_cards, render_index_page, render_report, render_select_page
from taiwan_map import HEADLINE_CITIES

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
SELECT_DIR = OUTPUT_DIR / "select"
REPORT_DIR = OUTPUT_DIR / "report"

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

HEADLINE_CITY_NAMES = {h["city"] for h in HEADLINE_CITIES}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="產生地圖首頁 + 22縣市 + 各鄉鎮的完整靜態天氣站台")
    parser.add_argument("--key", default=os.environ.get("CWA_API_KEY"), help="CWA Open Data 授權碼，預設讀取環境變數 CWA_API_KEY")
    parser.add_argument("--no-open", action="store_true", help="產生後不自動開啟瀏覽器")
    return parser.parse_args()


def _fmt_temp(value: float) -> str:
    if value is None or value != value:  # NaN 自我比較會是 False
        return "-"
    return str(int(round(value)))


def build_one_county(city: str, api_key: str) -> tuple[list[dict], dict | None]:
    """回傳 (township_cards, headline_snapshot)。headline_snapshot 只在此城市是重點城市時有值。"""
    town_list = fetch_all_townships(city, api_key)
    default_township = locations.DEFAULT_TOWNSHIP[city]

    township_cards: list[dict] = []
    headline_snapshot: dict | None = None

    report_dir = REPORT_DIR / city
    report_dir.mkdir(parents=True, exist_ok=True)

    for town in town_list:
        township_name = town.get("LocationName")
        try:
            slots = parse_forecast(town)
        except CwaApiError:
            print(f"  跳過 {city}{township_name}：資料格式異常", file=sys.stderr)
            continue

        html = render_report(
            city, township_name, slots,
            back_to_select=f"../../select/{city}.html",
            back_to_index="../../index.html",
        )
        (report_dir / f"{township_name}.html").write_text(html, encoding="utf-8")

        first_day = build_day_cards(slots)[0]
        card = {
            "name": township_name,
            "href": f"../report/{city}/{township_name}.html",
            "icon": first_day["icon"],
            "wx": first_day["wx"],
            "max_t": _fmt_temp(first_day["max_t"]),
            "min_t": _fmt_temp(first_day["min_t"]),
            "pop_pct": _fmt_temp(first_day["pop_pct"]),
        }
        township_cards.append(card)

        if city in HEADLINE_CITY_NAMES and township_name == default_township:
            headline_snapshot = {"icon": first_day["icon"], "max_t": _fmt_temp(first_day["max_t"])}

    return township_cards, headline_snapshot


def main() -> int:
    args = parse_args()
    if not args.key:
        print("錯誤：找不到授權碼，請用 --key 傳入，或設定環境變數 CWA_API_KEY。", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(exist_ok=True)
    SELECT_DIR.mkdir(exist_ok=True)
    REPORT_DIR.mkdir(exist_ok=True)

    all_counties = []
    headline_snapshots: dict[str, dict] = {}

    for city in locations.COUNTIES:
        print(f"處理 {city} ...")
        try:
            township_cards, headline_snapshot = build_one_county(city, args.key)
        except CwaApiError as exc:
            print(f"  跳過 {city}：{exc}", file=sys.stderr)
            continue

        select_html = render_select_page(city, township_cards, back_to_index="../index.html")
        (SELECT_DIR / f"{city}.html").write_text(select_html, encoding="utf-8")
        all_counties.append({"name": city, "href": f"select/{city}.html"})

        if headline_snapshot:
            headline_snapshots[city] = headline_snapshot

    headline_cities = []
    for h in HEADLINE_CITIES:
        snap = headline_snapshots.get(h["city"])
        headline_cities.append({
            "city": h["city"],
            "x": h["x"],
            "y": h["y"],
            "icon": snap["icon"] if snap else "❔",
            "max_t": snap["max_t"] if snap else "-",
            "href": f"select/{h['city']}.html",
        })

    index_html = render_index_page(
        headline_cities, all_counties,
        viewbox=taiwan_map.VIEWBOX, county_paths=taiwan_map.COUNTY_PATHS,
    )
    (OUTPUT_DIR / "index.html").write_text(index_html, encoding="utf-8")

    print(f"\n完成！共產生 {len(all_counties)} 個縣市的站台於 {OUTPUT_DIR}")
    print("地圖首頁：output/index.html")

    if not args.no_open:
        webbrowser.open((OUTPUT_DIR / "index.html").resolve().as_uri())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
