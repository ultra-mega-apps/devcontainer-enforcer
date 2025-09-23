# DevContainer Enforcer

## How to debug

Install dependencies

```
npm install
```

Start dev compile (tsc watch; no esbuild in dev)

```
npm run dev
```

Launch the Extension Development Host

Press F5 in VS Code (Run and Debug → "Run Extension"). This opens a new window.

Set breakpoints in `src/extension.ts` and interact with the dev host window.

Reload the dev host to re-activate if needed (Cmd+R in the dev host window).

Type-check (optional): `npm run typecheck`

## Build and package:

Dev build (no obfuscation):

```
npm run build
```

Prod build (no sourcemaps, obfuscated)

```
npm run esbuild
```

Create VSIX

```
npm run package
```

## Install locally (pre‑publish)

You can install the packaged VSIX on your machine to test exactly what will ship.

1. Build a VSIX

```
npm run package
```

The VSIX will be created in `dist/`, for example: `dist/devcontainer-enforcer-0.1.0.vsix`.

2. Install the VSIX in VS Code

- GUI:

  - Open VS Code → Extensions view → … (More) → Install from VSIX…
  - Pick the file under `dist/` and Reload when prompted.

- CLI (macOS, zsh):
  - Ensure the `code` CLI is on PATH (Command Palette → “Shell Command: Install 'code' command in PATH”).
  - Then run:

```
code --install-extension dist/devcontainer-enforcer-*.vsix
```

To update, re-run `npm run package` and install the new VSIX again (VS Code will upgrade it). To remove it, uninstall from the Extensions view.
