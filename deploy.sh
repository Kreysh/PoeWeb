#!/bin/bash
set -e

cd /workspace/poe-trade

echo "=== POE Trade Analyzer - DEPLOY ==="
echo ""

# Detect CPU/RAM
CORES=$(nproc 2>/dev/null || echo 4)
TOTAL_RAM=$(awk '/MemTotal:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096)

if [ "$TOTAL_RAM" -gt 8000 ]; then
  NODE_MEMORY=4096
else
  NODE_MEMORY=2048
fi

echo "CPU: $CORES cores | RAM: ${TOTAL_RAM}MB | Node.js: ${NODE_MEMORY}MB"
echo ""

# 1. Build
echo "1. Building application..."
export NODE_OPTIONS="--max-old-space-size=$NODE_MEMORY"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production

npm run build 2>&1 | tee build.log > /dev/null

if ! grep -q "Compiled successfully" build.log 2>/dev/null; then
  # Try alternate success indicator
  if ! grep -q "Generating static pages" build.log 2>/dev/null; then
    echo "Build may have failed. Check build.log"
  fi
fi
echo "   Build complete"

# 2. Kill previous servers
echo "2. Stopping previous servers..."

kill_process() {
  local TARGET_CWD=$1
  local NAME=$2
  for pid in $(ls /proc 2>/dev/null | grep -E "^[0-9]+$"); do
    if [ -f "/proc/$pid/cmdline" ] && [ "$pid" != "$$" ]; then
      cwd=$(readlink /proc/$pid/cwd 2>/dev/null || echo "")
      cmd=$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null || echo "")
      if [ "$cwd" = "$TARGET_CWD" ] && echo "$cmd" | grep -q "node.*server" 2>/dev/null; then
        kill -15 $pid 2>/dev/null || true
      fi
    fi
  done
  sleep 1
  for pid in $(ls /proc 2>/dev/null | grep -E "^[0-9]+$"); do
    if [ -f "/proc/$pid/cmdline" ] && [ "$pid" != "$$" ]; then
      cwd=$(readlink /proc/$pid/cwd 2>/dev/null || echo "")
      cmd=$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null || echo "")
      if [ "$cwd" = "$TARGET_CWD" ] && echo "$cmd" | grep -q "node.*server" 2>/dev/null; then
        kill -9 $pid 2>/dev/null || true
      fi
    fi
  done
  echo "   $NAME stopped"
}

kill_process "/workspace/poe-trade" "server.js + server-proxy.js"

sleep 1

# 3. Start servers
echo "3. Starting servers..."
: > server.log
: > server-proxy.log

nohup node server.js > server.log 2>&1 &
HTTPS_PID=$!
export PORT=3009
nohup node server-proxy.js > server-proxy.log 2>&1 &
PROXY_PID=$!

echo "   server.js PID: $HTTPS_PID (port 8447)"
echo "   server-proxy.js PID: $PROXY_PID (port 3009)"

# 4. Health check
echo "4. Verifying..."

check_server() {
  local PORT=$1
  local NAME=$2
  local ATTEMPT=0
  while [ $ATTEMPT -lt 15 ]; do
    if nc -z localhost $PORT 2>/dev/null; then
      echo "   $NAME OK on port $PORT"
      return 0
    fi
    sleep 0.5
    ATTEMPT=$((ATTEMPT + 1))
  done
  echo "   $NAME FAILED on port $PORT"
  return 1
}

HTTPS_OK=false
PROXY_OK=false

check_server 8447 "HTTPS" && HTTPS_OK=true
check_server 3009 "Proxy" && PROXY_OK=true

echo ""
if $HTTPS_OK && $PROXY_OK; then
  echo "DEPLOY SUCCESS"
  echo "  HTTPS: https://127.0.0.1:8447"
  echo "  Proxy: http://127.0.0.1:3009"
  echo "  Time: ${SECONDS}s"
else
  echo "DEPLOY FAILED"
  echo "server.log:" && tail -10 server.log
  echo "server-proxy.log:" && tail -10 server-proxy.log
  exit 1
fi
