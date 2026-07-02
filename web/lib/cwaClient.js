// 封裝中央氣象署 (CWA) Open Data API 未來1週逐12小時天氣預報 (F-D0047 系列)。
// port 自專案根目錄的 cwa_client.py。用 Next.js 的 fetch cache（10 分鐘）取代
// Python 版一次性 CLI 呼叫；不移植 verify=False 的 TLS workaround，那是本機
// Windows Python/OpenSSL 的問題，Vercel 的 Node 執行環境預期不會重現。

import { WEEKLY_DATASET_ID } from "./locations";

const API_URL_TMPL = (datasetId) =>
  `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${datasetId}`;

const REVALIDATE_SECONDS = 600; // 10 分鐘

export class CwaApiError extends Error {}

async function callApi(datasetId, params) {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) {
    throw new CwaApiError("找不到授權碼，請設定環境變數 CWA_API_KEY。");
  }

  const url = new URL(API_URL_TMPL(datasetId));
  url.searchParams.set("Authorization", apiKey);
  url.searchParams.set("format", "JSON");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  let resp;
  try {
    resp = await fetch(url.toString(), {
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (exc) {
    throw new CwaApiError(`連線中央氣象署 API 失敗：${exc.message}`);
  }

  if (resp.status === 401) {
    throw new CwaApiError("授權碼 (Authorization key) 無效，請確認 CWA_API_KEY 是否正確。");
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new CwaApiError(`CWA API 回傳非預期狀態碼 ${resp.status}：${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (String(data.success).toLowerCase() !== "true") {
    throw new CwaApiError(`CWA API 回應 success=false：${JSON.stringify(data)}`);
  }
  return data;
}

// 回傳 { town, township }：指定鄉鎮的 Location 物件，以及實際使用的鄉鎮名稱。
export async function fetchWeeklyForecast(city, township) {
  const datasetId = WEEKLY_DATASET_ID[city];
  if (!datasetId) {
    throw new CwaApiError(`「${city}」目前沒有對應的一週預報 dataset id。`);
  }

  const data = await callApi(datasetId, { LocationName: township });
  const townList = data.records?.Locations?.[0]?.Location ?? [];
  if (townList.length === 0) {
    throw new CwaApiError(
      `「${city}」查無鄉鎮「${township}」的資料，請確認鄉鎮市區名稱是否正確。`
    );
  }
  return townList[0];
}

// 回傳該縣市轄下所有鄉鎮市區的 Location 物件陣列（一次 API 呼叫拿全部）。
export async function fetchAllTownships(city) {
  const datasetId = WEEKLY_DATASET_ID[city];
  if (!datasetId) {
    throw new CwaApiError(`「${city}」目前沒有對應的一週預報 dataset id。`);
  }

  const data = await callApi(datasetId, {});
  const townList = data.records?.Locations?.[0]?.Location ?? [];
  if (townList.length === 0) {
    throw new CwaApiError(`「${city}」查無任何鄉鎮資料。`);
  }
  return townList;
}

// 把 WeatherElement 攤平、依 StartTime 對齊，回傳依時間排序的 12 小時預報列表。
export function parseForecast(town) {
  const records = new Map();

  for (const element of town.WeatherElement ?? []) {
    for (const slot of element.Time ?? []) {
      const start = slot.StartTime;
      if (!records.has(start)) {
        records.set(start, { start: new Date(start), end: new Date(slot.EndTime) });
      }
      const record = records.get(start);
      for (const value of slot.ElementValue ?? []) {
        if (value.MaxTemperature !== undefined) record.maxT = toNumber(value.MaxTemperature);
        if (value.MinTemperature !== undefined) record.minT = toNumber(value.MinTemperature);
        if (value.ProbabilityOfPrecipitation !== undefined)
          record.pop = toNumber(value.ProbabilityOfPrecipitation);
        if (value.Weather !== undefined) record.wx = value.Weather;
        if (value.WeatherCode !== undefined) record.wxCode = value.WeatherCode;
        if (value.MaxComfortIndexDescription !== undefined)
          record.ci = value.MaxComfortIndexDescription;
      }
    }
  }

  if (records.size === 0) {
    throw new CwaApiError("解析結果為空，CWA 回應格式可能與預期不同。");
  }

  return [...records.values()].sort((a, b) => a.start - b.start);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
