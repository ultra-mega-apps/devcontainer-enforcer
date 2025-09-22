import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as path from "path";

const CONFIRM_PHRASE = "open outside devcontainer";
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

function inDevContainer(): boolean {
  return vscode.env.remoteName === "dev-container";
}

function openedIsDotDevcontainer(
  folders: readonly vscode.WorkspaceFolder[] | undefined
): boolean {
  if (!folders || folders.length === 0) return false;
  return path.basename(folders[0].uri.fsPath) === ".devcontainer";
}

export async function activate(_: vscode.ExtensionContext) {
  // No-op if already inside a dev container.
  if (inDevContainer()) return;

  // One-time local bypass for this window?
  if (disabledOnce) return;

  const folders = vscode.workspace.workspaceFolders;
  // Minimal MVP: ignore empty/single-file windows
  if (!folders || folders.length === 0) return;

  // If the opened folder itself is ".devcontainer", do nothing.
  if (openedIsDotDevcontainer(folders)) return;

  const root = folders[0].uri.fsPath;
  const found = await findAncestorDotDevcontainer(root);

  if (found) {
    // Non-blocking nudge; do not auto-open.
    vscode.window.showInformationMessage(
      `Ancestor .devcontainer found at: ${found}. Use "Dev Containers: Reopen in Container".`
    );
    return;
  }

  // No ancestor .devcontainer: modal with A/B (Close | Disable once with typed confirmation).
  const A = "Close VS Code (default)";
  const B = "Disable once";
  const choice = await vscode.window.showErrorMessage(
    [
      "No .devcontainer found in this workspace or any ancestor.",
      "Define one at: <repo>/.devcontainer or <org>/.devcontainer.",
    ].join("\n"),
    { modal: true },
    A,
    B
  );

  if (choice === B) {
    const typed = await vscode.window.showInputBox({
      title: "Confirm opening outside Dev Containers",
      prompt: `Type exactly: ${CONFIRM_PHRASE}`,
      placeHolder: CONFIRM_PHRASE,
      ignoreFocusOut: true,
      value: "",
    });

    if ((typed || "").trim() === CONFIRM_PHRASE) {
      disabledOnce = true;
      vscode.window.showWarningMessage(
        "DevContainer Enforcer disabled for this window (once). Reopen to re-enable."
      );
      return;
    }

    await vscode.commands.executeCommand("workbench.action.closeWindow");
    return;
  }

  await vscode.commands.executeCommand("workbench.action.closeWindow");
}

export function deactivate() {}
