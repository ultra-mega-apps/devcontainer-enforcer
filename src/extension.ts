import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as path from "path";
let disabledOnce = false; // in-memory for this window only

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function findAncestorDotDevcontainer(
  startFsPath: string
): Promise<string | null> {
  let cur = path.resolve(startFsPath);
  try {
    const st = await fs.stat(cur);
    if (!st.isDirectory()) cur = path.dirname(cur);
  } catch {
    /* ignore */
  }

  for (;;) {
    const candidate = path.join(cur, ".devcontainer");
    if (await exists(candidate)) return candidate;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

async function inDevContainer(): Promise<boolean> {
  // Primary signal from VS Code Remote Host
  const rn = vscode.env.remoteName;
  if (rn === "dev-container" || rn === "codespaces") return true;

  // Common environment variables
  if (
    process.env.GITHUB_CODESPACES === "true" ||
    process.env.CODESPACES === "true"
  )
    return true;
  if (
    process.env.DEVCONTAINER === "true" ||
    process.env.VSCODE_REMOTE_CONTAINERS === "true"
  )
    return true;

  // Heuristics for containerized Linux
  try {
    if (await exists("/.dockerenv")) return true;
  } catch {}
  try {
    const cgroup = await fs.readFile("/proc/1/cgroup", "utf8").catch(() => "");
    if (/docker|containerd|kubepods|podman/i.test(cgroup)) return true;
  } catch {}

  return false;
}

function openedIsDotDevcontainer(
  folders: readonly vscode.WorkspaceFolder[] | undefined
): boolean {
  if (!folders || folders.length === 0) return false;
  return path.basename(folders[0].uri.fsPath) === ".devcontainer";
}

export async function activate(ctx: vscode.ExtensionContext) {
  // No-op if already inside a dev container.
  if (await inDevContainer()) return;

  // One-time local bypass for this window?
  if (disabledOnce) return;

  const folders = vscode.workspace.workspaceFolders;
  // Minimal MVP: ignore empty/single-file windows
  if (!folders || folders.length === 0) return;

  // If the opened folder itself is ".devcontainer", do nothing.
  if (openedIsDotDevcontainer(folders)) return;

  const root = folders[0].uri.fsPath;
  const found = await findAncestorDotDevcontainer(root);

  // Show a blocking modal. Only one explicit option; Cancel will be used for "open once" flow.
  const CLOSE = "Close VS Code";

  const message = found
    ? [
        "A Dev Container configuration was detected.",
        "Reopen in DevContainer.",
        "Choose an action:",
      ].join("\n")
    : [
        "No Dev Container configuration detected in this workspace or any ancestor.",
        "You must develop in DevContainers.",
        "Choose an action:",
      ].join("\n");

  const choice = await vscode.window.showErrorMessage(
    message,
    { modal: true },
    CLOSE
  );

  // If user pressed the explicit Close button, close now; otherwise (Cancel/dismiss), ask to confirm open-once.
  if (choice === CLOSE) {
    await vscode.commands.executeCommand("workbench.action.closeWindow");
    return;
  }

  // Cancel/dismiss path: confirmation to open once.
  const OPEN_ONCE = "Keep VS Code Opened";
  const confirm = await vscode.window.showWarningMessage(
    "Open this project outside Dev Containers just once?",
    { modal: true },
    OPEN_ONCE
  );
  if (confirm === OPEN_ONCE) {
    disabledOnce = true;
    vscode.window.showWarningMessage(
      "DevContainer Enforcer disabled for this window (once). Reopen to re-enable."
    );
    return;
  }
  await vscode.commands.executeCommand("workbench.action.closeWindow");
}

export function deactivate() {}
