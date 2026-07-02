// 首頁地圖用的重點城市經緯度（Leaflet 用真實座標，不再需要 SVG 投影）。
// 座標為各城市市政府所在地的概略經緯度。

const HEADLINE_LONLAT = {
  臺北市: [25.033, 121.5654],
  桃園市: [24.9937, 121.301],
  新竹市: [24.8138, 120.9647],
  臺中市: [24.1477, 120.6736],
  臺南市: [22.9908, 120.2513],
  高雄市: [22.6273, 120.3014],
};

export const HEADLINE_CITIES = Object.entries(HEADLINE_LONLAT).map(([city, [lat, lon]]) => ({
  city,
  lat,
  lon,
}));
