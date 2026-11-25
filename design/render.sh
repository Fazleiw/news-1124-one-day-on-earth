#!/bin/sh
# Render design/atlas.html to design/shot.png (1024x1024) with headless Chrome.
set -e
cd "$(dirname "$0")/.."
node design/build.mjs
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1024,1024 --screenshot="$PWD/design/shot.png" \
  "file://$PWD/design/atlas.html" 2>/dev/null
sips -Z 300 design/shot.png --out design/shot300.png >/dev/null
