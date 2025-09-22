#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

echo "[build] Running production bundle (esbuild + obfuscation)"
cd "$ROOT"
npm run esbuild

echo "[dist] Preparing clean dist folder"
rm -rf dist
mkdir -p dist/out

echo "[dist] Copying bundle"
cp -R out/ dist/

echo "[dist] Copying manifest and docs"
cp package.json dist/
[[ -f README.md ]] && cp README.md dist/
[[ -f LICENSE.txt ]] && cp LICENSE.txt dist/
[[ -f CHANGELOG.md ]] && cp CHANGELOG.md dist/

echo "[vsce] Packaging from dist"
cd dist
npx --yes vsce package

echo "[done] VSIX created in dist/"
