# DevContainer Enforcer

Keep your team inside Dev Containers. This lightweight extension looks for an ancestor `.devcontainer` folder and:

- If inside a dev-container → does nothing.
- If the opened folder is `.devcontainer` → does nothing.
- If an ancestor `.devcontainer` exists → shows an info message to “Reopen in Container”.
- Otherwise → shows a modal with two choices:
  - Close (default)
  - Disable once (requires typing an exact phrase)

The “Disable once” override is in-memory only (per VS Code window); it resets on reload.

> Note: The repository URL points to a “-free” repo that’s intentionally empty and used only for issues/feedback.

## Install

- From VSIX: download the `.vsix` and install via “Extensions” → “…” → “Install from VSIX…”.
- From Marketplace: search for “DevContainer Enforcer” (coming soon).

## Usage

Open a project. If a `.devcontainer` exists anywhere up the tree, you’ll be nudged to use Dev Containers. If not, you’ll be prompted to close or type the confirmation phrase to proceed once.

## Development

- Dev compile (no esbuild):
  - `npm run dev`
- Run the extension:
  - Press F5 (Run and Debug → “Run Extension”).
- Type check:
  - `npm run typecheck`

## Build & Package

- Production bundle (obfuscated, no sourcemaps) and package to VSIX:
  - `npm run package`
- Override publisher for the package step:
  - `npm run package myPublisherId`

## License

See `LICENSE.txt`.
