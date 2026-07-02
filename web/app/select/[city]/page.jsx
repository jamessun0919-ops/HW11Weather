import Link from "next/link";
import { fetchAllTownships, parseForecast, CwaApiError } from "../../../lib/cwaClient";
import { normalizeCounty } from "../../../lib/locations";
import { buildDayCards, fmtTemp } from "../../../lib/reportBuilder";

export default async function SelectPage({ params }) {
  const { city: cityRaw } = await params;
  const cityParam = decodeURIComponent(cityRaw);

  let city;
  let townships;
  try {
    city = normalizeCounty(cityParam);
    const townList = await fetchAllTownships(city);
    townships = townList.map((town) => {
      const slots = parseForecast(town);
      const today = buildDayCards(slots)[0];
      return {
        name: town.LocationName,
        icon: today.icon,
        wx: today.wx,
        maxT: fmtTemp(today.maxT),
        minT: fmtTemp(today.minT),
        popPct: fmtTemp(today.popPct),
      };
    });
  } catch (exc) {
    if (exc instanceof CwaApiError) {
      return (
        <main className="select-main">
          <p style={{ color: "#e66767" }}>錯誤：{exc.message}</p>
        </main>
      );
    }
    throw exc;
  }

  return (
    <>
      <nav className="crumb-nav">
        <Link href="/">🏝️ 地圖首頁</Link>
      </nav>
      <header className="select-header">
        <h1>{city}｜選擇地區</h1>
        <p>點選鄉鎮市區查看該地未來一週天氣預報</p>
      </header>
      <main className="select-main">
        <div className="township-grid">
          {townships.map((t) => (
            <Link
              key={t.name}
              className="township-card"
              href={`/report/${encodeURIComponent(city)}/${encodeURIComponent(t.name)}`}
            >
              <div className="name">{t.name}</div>
              <div className="icon">{t.icon}</div>
              <div className="wx">{t.wx}</div>
              <div className="temps">
                <span className="max">{t.maxT}°</span> / <span className="min">{t.minT}°</span>
              </div>
              <div className="pop">💧 {t.popPct}%</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
