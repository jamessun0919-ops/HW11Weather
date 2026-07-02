// port 自專案根目錄的 taiwan_map.py。邊界資料來源同樣是 g0v/twgeojson，
// 已經離線算好存在 data/taiwanCounties.json，跟 Python 版共用同一份原始資料。

import taiwanCounties from "../data/taiwanCounties.json";

export const VIEWBOX = taiwanCounties.viewbox;
export const COUNTY_PATHS = taiwanCounties.county_paths;

const HEADLINE_ORDER = ["臺北市", "桃園市", "新竹市", "臺中市", "臺南市", "高雄市"];

export const HEADLINE_CITIES = HEADLINE_ORDER.map((city) => {
  const [x, y] = taiwanCounties.headline_pins[city];
  return { city, x, y };
});
