# DevContainer Enforcer

Minimal alert-only helper for Dev Containers with **ancestor directory search**.

Behavior:

- If inside a dev-container → do nothing.
- If the opened folder is named `.devcontainer` → do nothing.
- Else if an ancestor `.devcontainer` exists → show an info alert suggesting “Dev Containers: Reopen in Container” (no auto-open).
- Else → modal:
  - A) Close (default),
  - B) Disable once (requires typing: open outside devcontainer).

Terminology: prefer “walk up the directory tree” / “ancestor directory search”.

## How to debug

- Install dependencies:
  - `npm install`
- Start dev compile (tsc watch; no esbuild in dev):
  - `npm run dev`
- Launch the Extension Development Host:
  - Press F5 in VS Code (Run and Debug → "Run Extension"). This opens a new window.
- Set breakpoints in `src/extension.ts` and interact with the dev host window.
- Reload the dev host to re-activate if needed (Cmd+R in the dev host window).
- Type-check (optional):
  - `npm run typecheck`

Optional launch config (`.vscode/launch.json`):

{
"version": "0.2.0",
"configurations": [
{
"name": "Run Extension",
"type": "extensionHost",
"request": "launch",
"runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
"outFiles": ["${workspaceFolder}/out/**/*.js"]
}
]
}

Build and package:

- Dev build (no obfuscation): `npm run build`
- Prod build (no sourcemaps, obfuscated): `npm run esbuild`
- Create VSIX: `npm run package`
