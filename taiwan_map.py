"""首頁地圖用：台灣本島 19 縣市邊界（簡化 SVG path）與重點城市大頭釘座標。

邊界資料來源：g0v/twgeojson 的縣市界線 GeoJSON（2010 年版，已用 d3.simplify 降低精度），
已離線轉換成 SVG path 存在 data/taiwan_counties.json，build_site.py 不需要重新連線抓地圖資料。
該資料集裡桃園當時還是「桃園縣」（升格直轄市前的行政區劃），載入時已正規化成「桃園市」。
離島（澎湖/金門/馬祖）不含在地圖繪製範圍內，避免投影被拉得很扁；仍可從下拉選單選取。
"""
from __future__ import annotations

import json
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent / "data" / "taiwan_counties.json"
_data = json.loads(_DATA_PATH.read_text(encoding="utf-8"))

VIEWBOX: str = _data["viewbox"]
COUNTY_PATHS: dict[str, str] = _data["county_paths"]  # 縣市名 -> SVG path d 字串

_HEADLINE_ORDER = ["臺北市", "桃園市", "新竹市", "臺中市", "臺南市", "高雄市"]
_pins = _data["headline_pins"]

HEADLINE_CITIES = [
    {"city": name, "x": _pins[name][0], "y": _pins[name][1]}
    for name in _HEADLINE_ORDER
]
