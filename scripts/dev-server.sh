#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"
URL="http://127.0.0.1:${PORT}/index.html"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found."
  exit 1
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
elif command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /C start "" "${URL}" >/dev/null 2>&1 || true
fi

echo "Serving at ${URL}"
echo "Press Ctrl+C to stop."

cd "${REPO_ROOT}"
exec python3 -m http.server "${PORT}"
