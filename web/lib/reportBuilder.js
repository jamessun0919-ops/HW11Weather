// port 自專案根目錄的 report_builder.py（不含畫圖部分，圖表在 components/ 裡用 Plotly.js 畫）。

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

export function weekdayLabel(date) {
  const day = (date.getDay() + 6) % 7; // JS getDay(): 0=Sun -> 轉成 0=Mon
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_NAMES[day]}）`;
}

export function iconFor(wxText) {
  const text = wxText || "";
  if (text.includes("雷")) return "⛈️";
  if (text.includes("雪")) return "🌨️";
  if (text.includes("雨")) {
    return !text.includes("晴") && !text.includes("雲") ? "🌧️" : "🌦️";
  }
  if (text.includes("晴") && text.includes("雲")) return "⛅";
  if (text.includes("晴")) return "☀️";
  if (text.includes("雲")) return "☁️";
  return "🌡️";
}

// 把 12 小時 slots 分組成每日卡片：日期、代表天氣、當日最高/最低溫、最大降雨機率。
export function buildDayCards(slots) {
  const byDate = new Map();
  for (const s of slots) {
    const key = s.start.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(s);
  }

  const cards = [];
  for (const key of [...byDate.keys()].sort()) {
    const daySlots = byDate.get(key);
    const maxTVals = daySlots.map((s) => s.maxT).filter((v) => v != null);
    const minTVals = daySlots.map((s) => s.minT).filter((v) => v != null);
    const popVals = daySlots.map((s) => s.pop).filter((v) => v != null);
    // 代表天氣現象：優先取白天時段 (06-18)，否則取第一筆
    const daytime =
      daySlots.find((s) => s.start.getHours() >= 6 && s.start.getHours() < 18) ?? daySlots[0];

    cards.push({
      dateLabel: weekdayLabel(daySlots[0].start),
      wx: daytime.wx || "",
      icon: iconFor(daytime.wx),
      maxT: maxTVals.length ? Math.max(...maxTVals) : null,
      minT: minTVals.length ? Math.min(...minTVals) : null,
      popPct: popVals.length ? Math.max(...popVals) : 0,
    });
  }
  return cards;
}

export function buildTableRows(slots) {
  const fmtTime = (d) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(
      d.getHours()
    ).padStart(2, "0")}:00`;
  const fmtHour = (d) => `${String(d.getHours()).padStart(2, "0")}:00`;

  return slots.map((s) => ({
    periodLabel: `${fmtTime(s.start)} - ${fmtHour(s.end)}`,
    wx: s.wx || "-",
    maxT: s.maxT ?? "-",
    minT: s.minT ?? "-",
    popPct: s.pop != null ? `${s.pop}%` : "-",
    ci: s.ci || "-",
  }));
}

export function fmtTemp(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return String(Math.round(value));
}
