#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "==> Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install

echo "==> Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
pip install -q --user -r requirements.txt

echo "==> Session start complete."
