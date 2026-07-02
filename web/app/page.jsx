import { fetchWeeklyForecast, parseForecast, CwaApiError } from "../lib/cwaClient";
import { COUNTIES, DEFAULT_TOWNSHIP } from "../lib/locations";
import { buildDayCards, fmtTemp } from "../lib/reportBuilder";
import { HEADLINE_CITIES } from "../lib/taiwanMap";
import CountyPicker from "../components/CountyPicker";
import TaiwanMapClient from "../components/TaiwanMapClient";

async function loadHeadlineCity(h) {
  try {
    const town = await fetchWeeklyForecast(h.city, DEFAULT_TOWNSHIP[h.city]);
    const slots = parseForecast(town);
    const today = buildDayCards(slots)[0];
    return { ...h, icon: today.icon, maxT: fmtTemp(today.maxT) };
  } catch (exc) {
    if (exc instanceof CwaApiError) {
      return { ...h, icon: "❔", maxT: "-" };
    }
    throw exc;
  }
}

export default async function HomePage() {
  const headlineCities = await Promise.all(HEADLINE_CITIES.map(loadHeadlineCity));

  return (
    <div className="index-body">
      <header className="index-header">
        <h1>台灣一週天氣預報</h1>
        <p>選擇城市查看未來一週天氣預報・資料來源：中央氣象署開放資料平台</p>
      </header>

      <CountyPicker counties={COUNTIES} />

      <div className="map-wrap">
        <TaiwanMapClient headlineCities={headlineCities} />
      </div>

      <footer className="index-footer">資料版權屬中央氣象署所有・每 10 分鐘重新驗證一次資料</footer>
    </div>
  );
}
