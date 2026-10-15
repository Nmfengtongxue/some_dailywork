#!/usr/bin/env python3
"""618 活动业绩统计 — 本地 HTTP 服务 + Excel 同步 API"""
import http.server
import socketserver
import json
import os
import sys
import webbrowser
import threading
from urllib.parse import urlparse

DEFAULT_PORT = 8766
DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

from sync_excel import sync_excel, DEFAULT_EXCEL
from export_excel import export_report_excel


def resolve_port():
    if len(sys.argv) > 1:
        return int(sys.argv[1])
    return int(os.environ.get('PORT', DEFAULT_PORT))


class ReuseTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def port_in_use(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/sync-excel':
            self._handle_sync_excel()
        elif path == '/api/export-excel':
            self._handle_export_excel()
        else:
            self.send_error(404)

    def _handle_sync_excel(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))
            result = sync_excel(data, DEFAULT_EXCEL)
            payload = json.dumps({'ok': True, **result}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:
            err = json.dumps({'ok': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(err)

    def _handle_export_excel(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))
            content, report_date = export_report_excel(data)
            filename = f'618业绩报表_{report_date}.xlsx'
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            err = json.dumps({'ok': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(err)


def open_browser(port):
    import time
    time.sleep(0.8)
    webbrowser.open(f'http://localhost:{port}')


if __name__ == '__main__':
    port = resolve_port()
    if port_in_use(port):
        print(f'端口 {port} 已被占用（可能上次服务未关闭）。')
        print(f'请先执行: lsof -ti :{port} | xargs kill -9')
        print('或关闭之前运行 start.py 的终端窗口后重试。')
        raise SystemExit(1)

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    with ReuseTCPServer(('', port), Handler) as httpd:
        print(f'618业绩统计已启动: http://localhost:{port}')
        print('API: POST /api/sync-excel — 同步数据到 Excel 源文件')
        print('API: POST /api/export-excel — 导出报表 Excel 文件')
        print('按 Ctrl+C 停止')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n已停止')
