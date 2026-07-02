"use client";

import dynamic from "next/dynamic";

// react-leaflet 的 MapContainer 會直接碰 window/document，SSR 階段會噴錯，
// 一定要用 ssr:false 動態載入；這一層 Client Component wrapper 是必要的，
// 因為 Server Component（app/page.jsx）不能直接呼叫 ssr:false 的 dynamic()。
const TaiwanLeafletMap = dynamic(() => import("./TaiwanLeafletMap"), {
  ssr: false,
  loading: () => <div style={{ height: 600, background: "#0d0d0d" }} />,
});

export default function TaiwanMapClient({ headlineCities }) {
  return <TaiwanLeafletMap headlineCities={headlineCities} />;
}
