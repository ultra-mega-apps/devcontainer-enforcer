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
