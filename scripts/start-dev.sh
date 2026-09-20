#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_LOG="$ROOT_DIR/.logs/backend.log"
FRONTEND_LOG="$ROOT_DIR/.logs/frontend.log"
mkdir -p "$ROOT_DIR/.logs"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "$BACKEND_DIR"
if [ ! -x ./.venv/Scripts/python.exe ]; then
  echo "Backend venv not found at $BACKEND_DIR/.venv/Scripts/python.exe"
  exit 1
fi

echo "Starting backend on http://0.0.0.0:8000"
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

sleep 2

cd "$FRONTEND_DIR"
export VITE_BACKEND_URL="http://192.168.1.76:8000"

echo "Starting frontend on http://0.0.0.0:5174"
nohup npm run dev -- --host 0.0.0.0 --port 5174 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Logs:"
echo "  Backend: $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo ""
echo "Open: http://192.168.1.76:5174/"
wait "$BACKEND_PID"
