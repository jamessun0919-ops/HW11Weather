import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "台灣一週天氣預報",
  description: "中央氣象署開放資料平台 一週天氣預報",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <Script src="https://cdn.plot.ly/plotly-2.35.2.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
