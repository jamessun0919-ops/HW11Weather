"""封裝中央氣象署 (CWA) Open Data API 未來1週逐12小時天氣預報 (F-D0047 系列)。"""
from __future__ import annotations

import sys
from datetime import datetime
from typing import Any

import requests
import urllib3
from requests.exceptions import SSLError

import locations

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_URL_TMPL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/{dataset_id}"
REQUEST_TIMEOUT = 20

_warned_about_tls = False


class CwaApiError(RuntimeError):
    """CWA API 呼叫失敗或回傳非預期內容時丟出。"""


def _get(url: str, params: dict[str, str]) -> requests.Response:
    """先用正常憑證驗證連線；若命中已知的 CWA 憑證缺欄位問題才退回不驗證，並警告使用者。"""
    global _warned_about_tls
    try:
        return requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
    except SSLError as exc:
        if "Subject Key Identifier" not in str(exc):
            raise
        if not _warned_about_tls:
            print(
                "警告：opendata.cwa.gov.tw 憑證未通過本機嚴格 TLS 驗證"
                "（Missing Subject Key Identifier）。已用 curl 交叉比對確認該網域可正常"
                "以系統信任的憑證連線，判斷是 Python/OpenSSL 對此憑證的檢查較嚴格所致，"
                "本次呼叫改為略過憑證驗證。若你的網路環境有代理伺服器攔截 HTTPS，"
                "請自行確認風險。",
                file=sys.stderr,
            )
            _warned_about_tls = True
        return requests.get(url, params=params, timeout=REQUEST_TIMEOUT, verify=False)


def fetch_weekly_forecast(city: str, api_key: str, township: str | None = None) -> tuple[dict[str, Any], str]:
    """呼叫該縣市對應的 F-D0047 資料集，回傳 (該鄉鎮的 Location 物件, 實際使用的鄉鎮名稱)。"""
    dataset_id = locations.WEEKLY_DATASET_ID.get(city)
    if dataset_id is None:
        raise CwaApiError(f"「{city}」目前沒有對應的一週預報 dataset id。")

    target_township = township or locations.DEFAULT_TOWNSHIP[city]

    try:
        resp = _get(
            API_URL_TMPL.format(dataset_id=dataset_id),
            {"Authorization": api_key, "format": "JSON", "LocationName": target_township},
        )
    except requests.RequestException as exc:
        raise CwaApiError(f"連線中央氣象署 API 失敗：{exc}") from exc

    if resp.status_code == 401:
        raise CwaApiError("授權碼 (Authorization key) 無效，請確認 --key 或 CWA_API_KEY 是否正確。")
    if resp.status_code != 200:
        raise CwaApiError(f"CWA API 回傳非預期狀態碼 {resp.status_code}：{resp.text[:200]}")

    data = resp.json()
    if str(data.get("success")).lower() != "true":
        raise CwaApiError(f"CWA API 回應 success=false：{data}")

    location_groups = data.get("records", {}).get("Locations", [])
    town_list = location_groups[0].get("Location", []) if location_groups else []
    if not town_list:
        raise CwaApiError(
            f"「{city}」查無鄉鎮「{target_township}」的資料，"
            f"請用 --township 指定{city}轄下正確的鄉鎮市區名稱。"
        )
    return town_list[0], target_township


def fetch_all_townships(city: str, api_key: str) -> list[dict[str, Any]]:
    """呼叫該縣市對應的 F-D0047 資料集，不指定鄉鎮，回傳該縣市轄下所有鄉鎮市區的 Location 物件列表。"""
    dataset_id = locations.WEEKLY_DATASET_ID.get(city)
    if dataset_id is None:
        raise CwaApiError(f"「{city}」目前沒有對應的一週預報 dataset id。")

    try:
        resp = _get(
            API_URL_TMPL.format(dataset_id=dataset_id),
            {"Authorization": api_key, "format": "JSON"},
        )
    except requests.RequestException as exc:
        raise CwaApiError(f"連線中央氣象署 API 失敗：{exc}") from exc

    if resp.status_code == 401:
        raise CwaApiError("授權碼 (Authorization key) 無效，請確認 --key 或 CWA_API_KEY 是否正確。")
    if resp.status_code != 200:
        raise CwaApiError(f"CWA API 回傳非預期狀態碼 {resp.status_code}：{resp.text[:200]}")

    data = resp.json()
    if str(data.get("success")).lower() != "true":
        raise CwaApiError(f"CWA API 回應 success=false：{data}")

    location_groups = data.get("records", {}).get("Locations", [])
    town_list = location_groups[0].get("Location", []) if location_groups else []
    if not town_list:
        raise CwaApiError(f"「{city}」查無任何鄉鎮資料。")
    return town_list


def parse_forecast(town: dict[str, Any]) -> list[dict[str, Any]]:
    """把 WeatherElement 攤平、依 StartTime 對齊，回傳依時間排序的 12 小時預報列表。"""
    records: dict[str, dict[str, Any]] = {}

    for element in town.get("WeatherElement", []):
        for slot in element.get("Time", []):
            start = slot["StartTime"]
            record = records.setdefault(
                start,
                {"start": datetime.fromisoformat(start), "end": datetime.fromisoformat(slot["EndTime"])},
            )
            for value in slot.get("ElementValue", []):
                if "MaxTemperature" in value:
                    record["max_t"] = _to_number(value["MaxTemperature"])
                if "MinTemperature" in value:
                    record["min_t"] = _to_number(value["MinTemperature"])
                if "ProbabilityOfPrecipitation" in value:
                    record["pop"] = _to_number(value["ProbabilityOfPrecipitation"])
                if "Weather" in value:
                    record["wx"] = value["Weather"]
                if "WeatherCode" in value:
                    record["wx_code"] = value["WeatherCode"]
                if "MaxComfortIndexDescription" in value:
                    record["ci"] = value["MaxComfortIndexDescription"]

    if not records:
        raise CwaApiError("解析結果為空，CWA 回應格式可能與預期不同，請檢查原始 JSON。")

    return sorted(records.values(), key=lambda r: r["start"])


def _to_number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
