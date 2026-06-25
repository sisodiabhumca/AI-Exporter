#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
EXT="$ROOT/extension"
ZIP="$DIST/ai-exporter-chrome-v$(node -p "require('$EXT/manifest.json').version" 2>/dev/null || python3 -c "import json; print(json.load(open('$EXT/manifest.json'))['version'])").zip"

mkdir -p "$DIST"
rm -f "$DIST"/ai-exporter-chrome-*.zip

cd "$EXT"
zip -r "$ZIP" . \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x "*.git/*"

echo ""
echo "Chrome Web Store package ready:"
echo "  $ZIP"
echo ""
echo "Upload at: https://chrome.google.com/webstore/devconsole"
