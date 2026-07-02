# 台灣一週天氣預報

[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://hw-11-weather.vercel.app/)

地圖首頁 → 選地區 → 一週天氣預報，資料來源為中央氣象署開放資料平台。

- **Demo（Vercel 即時版）**：https://hw-11-weather.vercel.app/
- `web/`：Next.js App Router 版本，每次請求即時抓取 CWA 資料，10 分鐘快取，部署於 Vercel。
- 根目錄：Python 靜態站台產生器（`build_site.py`），供離線／本機預覽使用。
