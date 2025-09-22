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
mkdir -p dist

echo "[dist] Copying bundle (preserve out directory)"
cp -R out dist/

echo "[dist] Writing trimmed manifest and copying docs"
# Create trimmed package.json inside dist (no scripts/devDependencies)
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
pkg.main = './out/extension.js';
delete pkg.scripts;
delete pkg.devDependencies;
fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
console.log('[dist] package.json written');
NODE
[[ -f README.md ]] && cp README.md dist/
[[ -f LICENSE.txt ]] && cp LICENSE.txt dist/
[[ -f CHANGELOG.md ]] && cp CHANGELOG.md dist/

echo "[vsce] Packaging from dist"
cd dist
npx --yes vsce package

echo "[done] VSIX created in dist/"
