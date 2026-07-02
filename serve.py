"""本地預覽伺服器：把 output/ 目錄用 http://127.0.0.1:PORT 服務起來，
方便每次改完 templates/report.html.j2 或圖表程式碼後直接重新整理瀏覽器查看。

用法：
    python serve.py            # 預設 port 8000
    python serve.py --port 8080
"""
from __future__ import annotations

import argparse
import functools
import http.server
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"


def main() -> int:
    parser = argparse.ArgumentParser(description="本地預覽 output/ 內產生的天氣報告")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-open", action="store_true", help="啟動後不自動開啟瀏覽器")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUTPUT_DIR))

    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as httpd:
        url = f"http://127.0.0.1:{args.port}/"
        print(f"本地預覽伺服器啟動：{url}（目錄：{OUTPUT_DIR}）")
        print("Ctrl+C 停止伺服器")
        if not args.no_open:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n伺服器已停止")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
