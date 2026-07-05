#!/bin/bash
# 本地启动离线照片水印工具
PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "离线照片水印工具 已启动: http://localhost:${PORT}"
echo "按 Ctrl+C 停止服务"
cd "$DIR" && python3 -m http.server "$PORT"
