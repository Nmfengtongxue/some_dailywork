#!/bin/bash
# 618 业绩统计 — 请双击本文件启动；勿复制下面命令到终端（$0 会失效）
set -e

WEB_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$WEB_DIR" || { echo "找不到目录: $WEB_DIR"; exit 1; }

if [ ! -f "start.py" ]; then
  echo "错误: 未找到 start.py，当前目录: $(pwd)"
  exit 1
fi

echo "启动 618 业绩统计服务..."
echo "目录: $(pwd)"

PORT="${PORT:-8766}"

# 若端口被占用，先结束旧进程
if lsof -ti :"$PORT" >/dev/null 2>&1; then
  echo "检测到 ${PORT} 端口占用，正在结束旧服务..."
  lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

export PORT
exec python3 start.py
