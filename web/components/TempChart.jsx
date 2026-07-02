"use client";

import { useEffect, useRef } from "react";

const SURFACE = "#1a1a19";
const GRID = "#2c2c2a";
const BASELINE = "#383835";
const TEXT_SECONDARY = "#c3c2b7";
const TEXT_MUTED = "#898781";
const SERIES_MAX = "#e66767";
const SERIES_MIN = "#3987e5";

// port 自 report_builder.py 的 build_temp_chart：同一組色票／版面設定，只是 Python dict 換成 JS 物件。
export default function TempChart({ slots }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.Plotly) return;

    const x = slots.map((s) => s.start);
    const yMax = slots.map((s) => s.maxT);
    const yMin = slots.map((s) => s.minT);

    const traces = [
      {
        x,
        y: yMax,
        name: "最高溫",
        mode: "lines+markers",
        type: "scatter",
        line: { color: SERIES_MAX, width: 2 },
        marker: { size: 8, line: { width: 2, color: SURFACE } },
        fill: "tonexty",
        fillcolor: "rgba(233,120,120,0.10)",
        hovertemplate: "最高溫 <b>%{y}°C</b><extra></extra>",
      },
      {
        x,
        y: yMin,
        name: "最低溫",
        mode: "lines+markers",
        type: "scatter",
        line: { color: SERIES_MIN, width: 2 },
        marker: { size: 8, line: { width: 2, color: SURFACE } },
        hovertemplate: "最低溫 <b>%{y}°C</b><extra></extra>",
      },
    ];

    const annotations = [];
    for (const [y, color] of [
      [yMax, SERIES_MAX],
      [yMin, SERIES_MIN],
    ]) {
      const last = y[y.length - 1];
      if (last != null) {
        annotations.push({
          x: x[x.length - 1],
          y: last,
          text: `${last}°`,
          showarrow: false,
          xanchor: "left",
          xshift: 10,
          font: { color, size: 13 },
        });
      }
    }

    window.Plotly.newPlot(
      ref.current,
      traces,
      {
        paper_bgcolor: SURFACE,
        plot_bgcolor: SURFACE,
        font: { color: TEXT_SECONDARY, family: "system-ui, -apple-system, Segoe UI, sans-serif" },
        margin: { l: 40, r: 50, t: 10, b: 30 },
        height: 360,
        hovermode: "x unified",
        legend: {
          orientation: "h",
          yanchor: "bottom",
          y: 1.02,
          xanchor: "left",
          x: 0,
          font: { color: TEXT_SECONDARY },
          bgcolor: "rgba(0,0,0,0)",
        },
        xaxis: { showgrid: false, linecolor: BASELINE, tickfont: { color: TEXT_MUTED } },
        yaxis: {
          showgrid: true,
          gridcolor: GRID,
          gridwidth: 1,
          zeroline: false,
          ticksuffix: "°C",
          tickfont: { color: TEXT_MUTED },
        },
        annotations,
      },
      { displayModeBar: false, responsive: true }
    );

    return () => {
      if (ref.current) window.Plotly.purge(ref.current);
    };
  }, [slots]);

  return <div ref={ref} />;
}
