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
