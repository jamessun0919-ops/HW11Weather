"""共用的報告產生邏輯：把解析後的預報 slots 轉成圖表與 HTML。

fetch_weather.py（單一縣市 CLI）與 build_site.py（整站產生）都是呼叫這裡的函式，
避免同一段 Plotly/模板邏輯維護兩份。
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

import plotly.graph_objects as go
from jinja2 import Environment, FileSystemLoader

BASE_DIR = Path(__file__).resolve().parent
_env = Environment(loader=FileSystemLoader(str(BASE_DIR / "templates")))

# 深色主題色票（來自 dataviz skill 的 dark categorical 步階）
SURFACE = "#1a1a19"
GRID = "#2c2c2a"
BASELINE = "#383835"
TEXT_SECONDARY = "#c3c2b7"
TEXT_MUTED = "#898781"
SERIES_MAX = "#e66767"
SERIES_MIN = "#3987e5"
SERIES_POP = "#199e70"


def weekday_label(dt: datetime) -> str:
    names = ["一", "二", "三", "四", "五", "六", "日"]
    return f"{dt.month}/{dt.day}（{names[dt.weekday()]}）"


def icon_for(wx_text: str | None) -> str:
    text = wx_text or ""
    if "雷" in text:
        return "⛈️"
    if "雪" in text:
        return "🌨️"
    if "雨" in text:
        return "🌧️" if ("晴" not in text and "雲" not in text) else "🌦️"
    if "晴" in text and "雲" in text:
        return "⛅"
    if "晴" in text:
        return "☀️"
    if "雲" in text:
        return "☁️"
    return "🌡️"


def build_day_cards(slots: list[dict]) -> list[dict]:
    by_date: dict[str, list[dict]] = {}
    for s in slots:
        by_date.setdefault(s["start"].date().isoformat(), []).append(s)

    cards = []
    for date_key in sorted(by_date):
        day_slots = by_date[date_key]
        max_t_vals = [s["max_t"] for s in day_slots if s.get("max_t") is not None]
        min_t_vals = [s["min_t"] for s in day_slots if s.get("min_t") is not None]
        pop_vals = [s["pop"] for s in day_slots if s.get("pop") is not None]
        # 代表天氣現象：優先取白天時段 (06-18)，否則取第一筆
        daytime = next((s for s in day_slots if 6 <= s["start"].hour < 18), day_slots[0])
        cards.append({
            "date_label": weekday_label(day_slots[0]["start"]),
            "wx": daytime.get("wx") or "",
            "icon": icon_for(daytime.get("wx")),
            "max_t": max(max_t_vals) if max_t_vals else float("nan"),
            "min_t": min(min_t_vals) if min_t_vals else float("nan"),
            # 注意：不要用 "pop" 當 dict key，Jinja2 對 dict 做屬性存取時會撞到 dict.pop 方法
            "pop_pct": max(pop_vals) if pop_vals else 0,
        })
    return cards


def build_temp_chart(slots: list[dict]) -> str:
    x = [s["start"] for s in slots]
    y_max = [s.get("max_t") for s in slots]
    y_min = [s.get("min_t") for s in slots]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=x, y=y_max, name="最高溫", mode="lines+markers",
        line=dict(color=SERIES_MAX, width=2), marker=dict(size=8, line=dict(width=2, color=SURFACE)),
        fill="tonexty", fillcolor="rgba(233,120,120,0.10)",
        hovertemplate="最高溫 <b>%{y}°C</b><extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=x, y=y_min, name="最低溫", mode="lines+markers",
        line=dict(color=SERIES_MIN, width=2), marker=dict(size=8, line=dict(width=2, color=SURFACE)),
        hovertemplate="最低溫 <b>%{y}°C</b><extra></extra>",
    ))

    # 端點直接標示數值（只標最後一點，避免每點都標）
    for y, color in ((y_max, SERIES_MAX), (y_min, SERIES_MIN)):
        if y and y[-1] is not None:
            fig.add_annotation(x=x[-1], y=y[-1], text=f"{y[-1]:g}°", showarrow=False,
                                xanchor="left", xshift=10, font=dict(color=color, size=13))

    fig.update_layout(
        template=None,
        paper_bgcolor=SURFACE, plot_bgcolor=SURFACE,
        font=dict(color=TEXT_SECONDARY, family="system-ui, -apple-system, Segoe UI, sans-serif"),
        margin=dict(l=40, r=50, t=10, b=30),
        height=360,
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0,
                    font=dict(color=TEXT_SECONDARY), bgcolor="rgba(0,0,0,0)"),
        xaxis=dict(showgrid=False, linecolor=BASELINE, tickfont=dict(color=TEXT_MUTED)),
        yaxis=dict(showgrid=True, gridcolor=GRID, gridwidth=1, zeroline=False,
                   ticksuffix="°C", tickfont=dict(color=TEXT_MUTED)),
    )
    return fig.to_html(full_html=False, include_plotlyjs="cdn", config={"displayModeBar": False})


def build_pop_chart(slots: list[dict]) -> str:
    x = [s["start"] for s in slots]
    y = [s.get("pop") for s in slots]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=x, y=y, name="降雨機率", marker=dict(color=SERIES_POP),
        hovertemplate="%{x|%m/%d %H:%M}<br>降雨機率 <b>%{y}%</b><extra></extra>",
    ))
    fig.update_layout(
        paper_bgcolor=SURFACE, plot_bgcolor=SURFACE,
        font=dict(color=TEXT_SECONDARY, family="system-ui, -apple-system, Segoe UI, sans-serif"),
        margin=dict(l=40, r=20, t=10, b=30),
        height=240,
        bargap=0.35,
        showlegend=False,
        xaxis=dict(showgrid=False, linecolor=BASELINE, tickfont=dict(color=TEXT_MUTED)),
        yaxis=dict(showgrid=True, gridcolor=GRID, gridwidth=1, zeroline=False, range=[0, 100],
                   ticksuffix="%", tickfont=dict(color=TEXT_MUTED)),
    )
    return fig.to_html(full_html=False, include_plotlyjs=False, config={"displayModeBar": False})


def build_table_rows(slots: list[dict]) -> list[dict]:
    rows = []
    for s in slots:
        rows.append({
            "period_label": f"{s['start']:%m/%d %H:%M} - {s['end']:%H:%M}",
            "wx": s.get("wx") or "-",
            "max_t": s.get("max_t", "-"),
            "min_t": s.get("min_t", "-"),
            "pop_pct": f"{s['pop']:g}%" if s.get("pop") is not None else "-",
            "ci": s.get("ci") or "-",
        })
    return rows


def render_report(
    city: str,
    township: str,
    slots: list[dict],
    *,
    back_to_select: str | None = None,
    back_to_index: str | None = None,
) -> str:
    template = _env.get_template("report.html.j2")
    return template.render(
        city=f"{city}・{township}",
        update_time=datetime.now().strftime("%Y-%m-%d %H:%M"),
        days=build_day_cards(slots),
        temp_chart_html=build_temp_chart(slots),
        pop_chart_html=build_pop_chart(slots),
        table_rows=build_table_rows(slots),
        back_to_select=back_to_select,
        back_to_index=back_to_index,
    )


def render_select_page(city: str, townships: list[dict], *, back_to_index: str) -> str:
    template = _env.get_template("select.html.j2")
    return template.render(city=city, townships=townships, back_to_index=back_to_index)


def render_index_page(
    headline_cities: list[dict],
    all_counties: list[dict],
    *,
    viewbox: str,
    county_paths: dict[str, str],
) -> str:
    template = _env.get_template("index.html.j2")
    return template.render(
        headline_cities=headline_cities,
        all_counties=all_counties,
        viewbox=viewbox,
        county_paths=county_paths,
    )
