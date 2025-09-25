#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

echo "[build] Running production bundle (esbuild + obfuscation)"
cd "$ROOT"
npm run esbuild

echo "[dist] Preparing clean dist folder"
rm -rf dist
mkdir -p dist

echo "[dist] Copying bundle"
cp -R out/extension.js dist/extension.js

echo "[dist] Writing trimmed manifest and copying docs"

PUBLISHER_ARG=${1:?PublisherId Required as 1st parm}

export PUBLISHER_ARG
node - <<'NODE'
  const fs = require('fs');
  const path = require('path');
  const root = process.cwd();
  const dist = path.join(root, 'dist');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  pkg.main = 'extension.js';

  
  const publisherArg = process.env.PUBLISHER_ARG || '';
  if (publisherArg) pkg.publisher = publisherArg;
  
  pkg.icon = 'images/icon.png';
  delete pkg.scripts;
  delete pkg.devDependencies;

  pkg.files = [
    'extension.js',
    'README.md',
    'LICENSE.txt',
    'images/icon.svg',
    'images/icon.png',
    'images/banner.svg',
  ];

  fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  console.log('[dist] package.json written');
NODE
[[ -f README.md ]] && cp README.md dist/
[[ -f LICENSE.txt ]] && cp LICENSE.txt dist/
[[ -f CHANGELOG.md ]] && cp CHANGELOG.md dist/
mkdir -p dist/images
cp -f images/* dist/images/ 2>/dev/null || true


echo "[vsce] Packaging from dist"
cd dist
# the vsce publish by default already generate a package
# this should be used only when we want a vsix without publishing
# npx --yes vsce package

echo "[done] VSIX created in dist/"
