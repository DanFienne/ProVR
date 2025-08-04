#!/usr/bin/env bash
#
# run.sh  ——  一键启动 uvicorn（仅可改 env / host / port）
#
# 用法（全部都是可选参数，会有默认值）：
#   ./run.sh  [ENV]  [HOST]  [PORT]
#
#   ENV  : Conda 环境名   (默认: myenv)
#   HOST : 监听地址       (默认: 0.0.0.0)
#   PORT : 监听端口       (默认: 9098)
#
# 例子：
#   ./run.sh
#   ./run.sh py310
#   ./run.sh py310 127.0.0.1 8000
#
#####################################################################

set -euo pipefail

# -------- 参数与默认值 --------
ENV_NAME="${1:-myenv}"
HOST="${2:-0.0.0.0}"
PORT="${3:-9098}"

KEY_FILE="server.key"
CERT_FILE="server.crt"

# -------- 前置检查 --------
[[ -f "$KEY_FILE" ]]  || { echo "❌  找不到 $KEY_FILE"; exit 1; }
[[ -f "$CERT_FILE" ]] || { echo "❌  找不到 $CERT_FILE"; exit 1; }

command -v conda >/dev/null 2>&1 || { echo "❌  未找到 conda"; exit 1; }

# -------- 激活 Conda 环境 --------
eval "$(conda shell.bash hook)"
conda activate "$ENV_NAME"
cd server

# -------- 启动 --------
echo "✅  已激活环境: $ENV_NAME"
echo "🚀  uvicorn 正在启动: https://$HOST:$PORT"
echo "───────────────────────────────────────────────"
uvicorn app:app --reload \
                --host "$HOST" \
                --port "$PORT" \
                --ssl-keyfile "$KEY_FILE" \
                --ssl-certfile "$CERT_FILE"