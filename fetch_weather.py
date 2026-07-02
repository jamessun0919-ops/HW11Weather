"""CLI：抓取中央氣象署一週縣市天氣預報，產生 windy.com 風格的深色 HTML 報告。

用法：
    python fetch_weather.py --city 臺北市 --key <CWA_API_KEY>
    CWA_API_KEY=xxxx python fetch_weather.py --city 高雄市

要產生含地圖首頁、22 縣市可互選的完整站台，改用 build_site.py。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

from cwa_client import CwaApiError, fetch_weekly_forecast, parse_forecast
from locations import COUNTIES, normalize_county
from report_builder import render_report

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"

# Windows 主控台可能使用非 UTF-8 編碼 (如 cp950)，中文輸出會直接噴例外，這裡強制改為 UTF-8。
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="取得中央氣象署一週縣市天氣預報並產生 HTML 報告")
    parser.add_argument("--city", required=True, help=f"縣市全名，例如：{'、'.join(COUNTIES[:4])} ...")
    parser.add_argument("--township", default=None, help="該縣市轄下的鄉鎮市區名稱，預設用縣市政府所在地（例如臺北市預設信義區）")
    parser.add_argument("--key", default=os.environ.get("CWA_API_KEY"), help="CWA Open Data 授權碼，預設讀取環境變數 CWA_API_KEY")
    parser.add_argument("--no-open", action="store_true", help="產生後不自動開啟瀏覽器")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.key:
        print("錯誤：找不到授權碼，請用 --key 傳入，或設定環境變數 CWA_API_KEY。", file=sys.stderr)
        return 1

    try:
        city = normalize_county(args.city)
        town, township = fetch_weekly_forecast(city, args.key, args.township)
        slots = parse_forecast(town)
    except (CwaApiError, ValueError) as exc:
        print(f"錯誤：{exc}", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")

    raw_path = OUTPUT_DIR / f"{city}_{township}_{stamp}_raw.json"
    raw_path.write_text(json.dumps(town, ensure_ascii=False, indent=2), encoding="utf-8")

    html = render_report(city, township, slots)

    html_path = OUTPUT_DIR / f"{city}_{township}_{stamp}.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"已產生報告：{html_path}（代表地點：{city}{township}）")
    print(f"原始資料備份：{raw_path}")

    if not args.no_open:
        webbrowser.open(html_path.resolve().as_uri())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
