#!/bin/bash
# 本地启动 AI Image Splitter
PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "AI Image Splitter 已启动: http://localhost:${PORT}"
echo "按 Ctrl+C 停止服务"
cd "$DIR" && python3 -m http.server "$PORT"
