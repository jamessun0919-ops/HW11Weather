import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchWeeklyForecast, parseForecast, CwaApiError } from "../../../../lib/cwaClient";
import { normalizeCounty } from "../../../../lib/locations";
import { buildDayCards, buildTableRows, fmtTemp } from "../../../../lib/reportBuilder";
import TempChart from "../../../../components/TempChart";
import PopChart from "../../../../components/PopChart";

export default async function ReportPage({ params }) {
  const { city: cityRaw, township: townshipRaw } = await params;
  const city = decodeURIComponent(cityRaw);
  const township = decodeURIComponent(townshipRaw);

  let normalizedCity;
  let slots;
  try {
    normalizedCity = normalizeCounty(city);
    const town = await fetchWeeklyForecast(normalizedCity, township);
    slots = parseForecast(town);
  } catch (exc) {
    if (exc instanceof CwaApiError) {
      return (
        <main className="report-main">
          <p style={{ color: "#e66767" }}>錯誤：{exc.message}</p>
        </main>
      );
    }
    notFound();
  }

  const days = buildDayCards(slots);
  const rows = buildTableRows(slots);
  const updateTime = new Date().toLocaleString("zh-TW", { hour12: false });

  return (
    <>
      <nav className="crumb-nav">
        <Link href="/">🏝️ 地圖首頁</Link>
        <span className="sep">/</span>
        <Link href={`/select/${encodeURIComponent(normalizedCity)}`}>← 返回選擇地區</Link>
      </nav>
      <header className="report-header">
        <h1>
          {normalizedCity}・{township}｜一週天氣預報
        </h1>
        <p>資料來源：中央氣象署開放資料平台（未來1週逐12小時天氣預報）・更新時間：{updateTime}</p>
      </header>

      <main className="report-main">
        <div className="card">
          <h2>每日概況</h2>
          <div className="day-row">
            {days.map((d, i) => (
              <div className="day-card" key={i}>
                <div className="date">{d.dateLabel}</div>
                <div className="icon">{d.icon}</div>
                <div className="wx">{d.wx}</div>
                <div className="temps">
                  <span className="max">{fmtTemp(d.maxT)}°</span> / <span className="min">{fmtTemp(d.minT)}°</span>
                </div>
                <div className="pop">💧 {fmtTemp(d.popPct)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>溫度趨勢</h2>
          <TempChart slots={slots} />
        </div>

        <div className="card">
          <h2>降雨機率</h2>
          <PopChart slots={slots} />
        </div>

        <div className="card">
          <h2>詳細資料</h2>
          <details>
            <summary>展開完整表格（無障礙／原始數值）</summary>
            <table>
              <thead>
                <tr>
                  <th>時段</th>
                  <th>天氣</th>
                  <th>最高溫</th>
                  <th>最低溫</th>
                  <th>降雨機率</th>
                  <th>舒適度</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.periodLabel}</td>
                    <td>{r.wx}</td>
                    <td>{r.maxT}</td>
                    <td>{r.minT}</td>
                    <td>{r.popPct}</td>
                    <td>{r.ci}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </main>

      <footer className="report-footer">資料版權屬中央氣象署所有・每 10 分鐘重新驗證一次資料</footer>
    </>
  );
}
