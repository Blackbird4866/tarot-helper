#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/app"
WORKER_DIR="$ROOT_DIR/worker"

command -v node >/dev/null 2>&1 || {
  echo "Node.js is required. Install it from https://nodejs.org/"
  read -r -p "Press Enter to close..."
  exit 1
}

command -v npm >/dev/null 2>&1 || {
  echo "npm is required. It is normally installed with Node.js."
  read -r -p "Press Enter to close..."
  exit 1
}

echo "== Tarot-Helper local deploy: macOS =="
echo

echo "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci

echo
echo "Running frontend tests..."
npm test

echo
echo "Building frontend..."
npm run build

echo
echo "Installing Worker dependencies..."
cd "$WORKER_DIR"
npm ci

if [ ! -f "$WORKER_DIR/.dev.vars" ]; then
  cp "$WORKER_DIR/.dev.vars.example" "$WORKER_DIR/.dev.vars"
  echo
  echo "Created worker/.dev.vars from template."
  echo "Edit worker/.dev.vars and set DEEPSEEK_API_KEY for AI readings."
fi

echo
echo "Starting local app:"
echo "  http://127.0.0.1:8788"
echo
echo "Press Ctrl+C to stop."

(sleep 3 && open "http://127.0.0.1:8788") >/dev/null 2>&1 &
npx wrangler dev --ip 127.0.0.1 --port 8788
