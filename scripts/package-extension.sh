#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
EXT="$ROOT/extension"
VERSION="$(python3 -c "import json; print(json.load(open('$EXT/manifest.json'))['version'])")"
ZIP="$DIST/ai-exporter-chrome-v${VERSION}.zip"
FFZIP="$DIST/ai-exporter-firefox-v${VERSION}.zip"
FFBUILD="$(mktemp -d)"

cleanup() {
  rm -rf "$FFBUILD"
}
trap cleanup EXIT

mkdir -p "$DIST"
rm -f "$DIST"/ai-exporter-chrome-*.zip "$DIST"/ai-exporter-firefox-*.zip

# Chrome: MV3 service worker only (Chrome rejects background.scripts in MV3)
cd "$EXT"
zip -r "$ZIP" . \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x "*.git/*"

# Firefox: same files + background.scripts fallback (required by AMO)
cp -R "$EXT"/. "$FFBUILD/"
python3 - "$FFBUILD/manifest.json" <<'PY'
import json
import sys

path = sys.argv[1]
manifest = json.loads(open(path, encoding="utf-8").read())
bg = manifest.setdefault("background", {})
bg["scripts"] = ["background.js"]
# Firefox uses background scripts; service_worker is Chrome-only and triggers AMO warnings
bg.pop("service_worker", None)
open(path, "w", encoding="utf-8").write(json.dumps(manifest, indent=2) + "\n")
PY

cd "$FFBUILD"
zip -r "$FFZIP" . \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x "*.git/*"

echo ""
echo "Chrome Web Store package ready:"
echo "  $ZIP"
echo "  (background.service_worker only)"
echo ""
echo "Firefox AMO package ready:"
echo "  $FFZIP"
echo "  (background.scripts only — no service_worker)"
echo ""
echo "Chrome: https://chrome.google.com/webstore/devconsole"
echo "Firefox: https://addons.mozilla.org/developers/"
