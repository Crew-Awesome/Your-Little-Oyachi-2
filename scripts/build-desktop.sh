#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

require_bun() {
  if ! command -v bun >/dev/null 2>&1; then
    echo "bun is required but not found. Install Bun from https://bun.sh"
    exit 1
  fi
}

require_cargo() {
  if ! command -v cargo >/dev/null 2>&1; then
    echo "cargo is required but not found. Install Rust from https://rustup.rs"
    exit 1
  fi
}

open_output_folder() {
  local target="${REPO_ROOT}/src-tauri/target/release/bundle"
  if command -v open >/dev/null 2>&1; then
    open "${target}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${target}" >/dev/null 2>&1 || true
  fi
}

run_dev() {
  cd "${REPO_ROOT}"
  bun install
  bun run dev
}

run_build_release() {
  cd "${REPO_ROOT}"
  bun install
  bun run build
  echo "Build output: ${REPO_ROOT}/src-tauri/target/release/bundle"
}

run_build_debug() {
  cd "${REPO_ROOT}"
  bun install
  bun run build:debug
  echo "Build output: ${REPO_ROOT}/src-tauri/target/debug"
}

pause_prompt() {
  printf "\nPress Enter to continue..."
  read -r _
}

show_menu() {
  while true; do
    clear || true
    cat <<'EOF'
=========================================
   Your Little Oyachi 2 Desktop Builder
=========================================
1) Run Desktop DEV
2) Build RELEASE
3) Build DEBUG
4) Open output folder
5) Exit
EOF

    printf "Select an option [1-5]: "
    read -r choice

    case "${choice}" in
      1) run_dev ;;
      2) run_build_release; pause_prompt ;;
      3) run_build_debug; pause_prompt ;;
      4) open_output_folder; pause_prompt ;;
      5) exit 0 ;;
      *) echo "Invalid option: ${choice}"; pause_prompt ;;
    esac
  done
}

require_bun
require_cargo

if [[ "${1:-}" == "" || "${1:-}" == "menu" ]]; then
  show_menu
  exit 0
fi

case "${1}" in
  dev)
    run_dev
    ;;
  release)
    run_build_release
    ;;
  debug)
    run_build_debug
    ;;
  *)
    echo "Usage: $0 [menu|dev|release|debug]"
    exit 1
    ;;
esac
