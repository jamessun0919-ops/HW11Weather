"use client";

import { useEffect, useRef } from "react";

const SURFACE = "#1a1a19";
const GRID = "#2c2c2a";
const BASELINE = "#383835";
const TEXT_SECONDARY = "#c3c2b7";
const TEXT_MUTED = "#898781";
const SERIES_POP = "#199e70";

// port 自 report_builder.py 的 build_pop_chart。
export default function PopChart({ slots }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.Plotly) return;

    const x = slots.map((s) => s.start);
    const y = slots.map((s) => s.pop);

    window.Plotly.newPlot(
      ref.current,
      [
        {
          x,
          y,
          name: "降雨機率",
          type: "bar",
          marker: { color: SERIES_POP },
          hovertemplate: "%{x|%m/%d %H:%M}<br>降雨機率 <b>%{y}%</b><extra></extra>",
        },
      ],
      {
        paper_bgcolor: SURFACE,
        plot_bgcolor: SURFACE,
        font: { color: TEXT_SECONDARY, family: "system-ui, -apple-system, Segoe UI, sans-serif" },
        margin: { l: 40, r: 20, t: 10, b: 30 },
        height: 240,
        bargap: 0.35,
        showlegend: false,
        xaxis: { showgrid: false, linecolor: BASELINE, tickfont: { color: TEXT_MUTED } },
        yaxis: {
          showgrid: true,
          gridcolor: GRID,
          gridwidth: 1,
          zeroline: false,
          range: [0, 100],
          ticksuffix: "%",
          tickfont: { color: TEXT_MUTED },
        },
      },
      { displayModeBar: false, responsive: true }
    );

    return () => {
      if (ref.current) window.Plotly.purge(ref.current);
    };
  }, [slots]);

  return <div ref={ref} />;
}
