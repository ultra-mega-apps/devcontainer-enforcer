#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

echo "[build] Running production bundle (esbuild + obfuscation)"
cd "$ROOT"
npm run esbuild

echo "[assets] Generating PNGs from SVGs"
if [[ -d node_modules/@resvg/resvg-js ]]; then
  npm run assets:png
else
  echo "[assets] @resvg/resvg-js not installed; skipping PNG generation (placeholders may be used)"
fi

echo "[dist] Preparing clean dist folder"
rm -rf dist
mkdir -p dist

echo "[dist] Copying bundle"
cp -R out/extension.js dist/extension.js

echo "[dist] Writing trimmed manifest and copying docs"
# Create trimmed package.json inside dist (no scripts/devDependencies)
PUBLISHER_ARG=${1:-""}
export PUBLISHER_ARG
node - <<'NODE'
  const fs = require('fs');
  const path = require('path');
  const root = process.cwd();
  const dist = path.join(root, 'dist');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  pkg.main = 'extension.js';
  // Inject publisher if provided via first script arg or PUBLISHER env
  const publisherArg = process.env.PUBLISHER_ARG || '';
  if (publisherArg) pkg.publisher = publisherArg;
  // Use PNG icon for Marketplace
  pkg.icon = 'images/icon.png';
  delete pkg.scripts;
  delete pkg.devDependencies;
  // Whitelist files included in the VSIX
  pkg.files = [
    'extension.js',
    'README.md',
  'LICENSE.txt',
  'images/icon.svg',
    'images/banner.svg',
    'images/icon.png',
    'images/banner.png'
  ];

  fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  console.log('[dist] package.json written');
NODE
[[ -f README.md ]] && cp README.md dist/
[[ -f LICENSE.txt ]] && cp LICENSE.txt dist/
[[ -f CHANGELOG.md ]] && cp CHANGELOG.md dist/
mkdir -p dist/images
cp -f images/icon.svg dist/images/ 2>/dev/null || true
cp -f images/banner.svg dist/images/ 2>/dev/null || true
cp -f images/icon.png dist/images/ 2>/dev/null || true
cp -f images/banner.png dist/images/ 2>/dev/null || true

# Generate PNG placeholders if PNGs are missing
if [[ ! -f dist/images/icon.png ]]; then
  echo "[dist] generating placeholder icon.png"
  base64 -d > dist/images/icon.png <<'PNG'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=
PNG
fi
if [[ ! -f dist/images/banner.png ]]; then
  echo "[dist] generating placeholder banner.png"
  base64 -d > dist/images/banner.png <<'PNG'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAEwCAQAAACe7+ZXAAAADElEQVR4nGNgYGBgYAAAAA0AAcOA6OQAAAAASUVORK5CYII=
PNG
fi

# Rewrite README image reference to PNG for Marketplace rendering
if [[ -f dist/README.md ]]; then
  sed -i '' -e 's/images\/banner.svg/images\/banner.png/g' dist/README.md 2>/dev/null || \
  sed -i -e 's/images\/banner.svg/images\/banner.png/g' dist/README.md
fi

echo "[vsce] Packaging from dist"
cd dist
npx --yes vsce package

echo "[done] VSIX created in dist/"
