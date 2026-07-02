"use client";

import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import countiesGeo from "../data/taiwanCountiesGeo.json";

const COUNTY_FILL = "#24344a";
const COUNTY_STROKE = "#4a6483";
const COUNTY_HOVER_FILL = "#2e4666";
const PIN_COLOR = "#3987e5";

// 台灣本島實際經緯度範圍（算自 taiwanCountiesGeo.json）加一點邊界留白，
// 讓地圖初始畫面跟可拖曳範圍都聚焦在台灣本身，不要把福建海岸線大片露出來。
const TAIWAN_BOUNDS = [
  [21.7, 119.8],
  [25.6, 122.3],
];
const MAX_PAN_BOUNDS = [
  [20.5, 118.5],
  [26.3, 123.5],
];

function countyStyle() {
  return { fillColor: COUNTY_FILL, fillOpacity: 1, color: COUNTY_STROKE, weight: 1 };
}

// 只用來做導覽跟 hover 高亮，本身不是資料視覺化圖表，色票沿用既有深色主題數值。
export default function TaiwanLeafletMap({ headlineCities }) {
  const router = useRouter();

  const onEachCounty = (feature, layer) => {
    const name = feature.properties.name;
    layer.bindTooltip(name, { sticky: true });
    layer.on({
      mouseover: () => layer.setStyle({ fillColor: COUNTY_HOVER_FILL }),
      mouseout: () => layer.setStyle({ fillColor: COUNTY_FILL }),
      click: () => router.push(`/select/${encodeURIComponent(name)}`),
    });
  };

  return (
    <MapContainer
      bounds={TAIWAN_BOUNDS}
      maxBounds={MAX_PAN_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={8}
      maxZoom={12}
      style={{ height: "760px", width: "100%", background: "#0d0d0d" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON data={countiesGeo} style={countyStyle} onEachFeature={onEachCounty} />
      {headlineCities.map((h) => (
        <CircleMarker
          key={h.city}
          center={[h.lat, h.lon]}
          radius={7}
          pathOptions={{ color: "#0d0d0d", weight: 2, fillColor: PIN_COLOR, fillOpacity: 1 }}
          eventHandlers={{ click: () => router.push(`/select/${encodeURIComponent(h.city)}`) }}
        >
          <Tooltip permanent direction="right" offset={[8, 0]} className="city-pin-tooltip">
            <strong>{h.city}</strong> {h.icon} {h.maxT}°
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
