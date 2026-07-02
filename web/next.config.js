/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4 的 MapContainer 在 React 18 StrictMode 下，dev 模式的
  // mount→unmount→mount 雙重呼叫會導致 Leaflet 對同一個 DOM node 初始化兩次
  // 噴出 "Map container is already initialized"。StrictMode 的雙重呼叫只在
  // 開發模式生效，正式 build（Vercel 上線）不受影響，這裡關掉純粹是為了讓
  // 本機 dev 可以正常測試地圖。
  reactStrictMode: false,
};

module.exports = nextConfig;
