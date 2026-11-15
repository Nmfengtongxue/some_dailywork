#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d node_modules ]]; then
  echo "正在安装依赖（首次会比较久）…"
  npm install
fi
echo "本地预览：http://127.0.0.1:5178/"
exec npx vite --host --port 5178 --open
