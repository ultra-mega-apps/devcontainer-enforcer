import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as path from "path";

let disabledOnce = false;

async function pathExists(fileSystemPath: string): Promise<boolean> {
  try {
    await fs.stat(fileSystemPath);
    return true;
  } catch {
    return false;
  }
}

async function findNearestDevcontainer(
  startFolderPath: string
): Promise<string | null> {
  let currentDirectory = path.resolve(startFolderPath);
  try {
    const stat = await fs.stat(currentDirectory);
    if (!stat.isDirectory()) currentDirectory = path.dirname(currentDirectory);
  } catch {
    /* ignore */
  }

  for (;;) {
    const devcontainerPath = path.join(currentDirectory, ".devcontainer");
    if (await pathExists(devcontainerPath)) return devcontainerPath;
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) break;
    currentDirectory = parentDirectory;
  }
  return null;
}

async function isRunningInDevContainer(): Promise<boolean> {
  const remoteName = vscode.env.remoteName;
  if (remoteName === "dev-container" || remoteName === "codespaces")
    return true;

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

  try {
    if (await pathExists("/.dockerenv")) return true;
  } catch {}
  try {
    const cgroupContent = await fs
      .readFile("/proc/1/cgroup", "utf8")
      .catch(() => "");
    if (/docker|containerd|kubepods|podman/i.test(cgroupContent)) return true;
  } catch {}

  return false;
}

function isDevcontainerFolderOpened(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined
): boolean {
  if (!workspaceFolders || workspaceFolders.length === 0) return false;
  return path.basename(workspaceFolders[0].uri.fsPath) === ".devcontainer";
}

export async function activate(context: vscode.ExtensionContext) {
  if (await isRunningInDevContainer()) return;
  if (disabledOnce) return;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  if (isDevcontainerFolderOpened(workspaceFolders)) return;

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const nearestDevcontainerPath = await findNearestDevcontainer(workspaceRoot);

  const closeVsCodeLabel = "Close VS Code";

  const message = nearestDevcontainerPath
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

  const firstChoice = await vscode.window.showErrorMessage(
    message,
    { modal: true },
    closeVsCodeLabel
  );

  if (firstChoice === closeVsCodeLabel) {
    await vscode.commands.executeCommand("workbench.action.closeWindow");
    return;
  }

  const keepOpenLabel = "Keep VS Code Opened";

  const confirmationChoice = await vscode.window.showWarningMessage(
    "Open this project outside Dev Containers just once?",
    { modal: true },
    keepOpenLabel
  );

  if (confirmationChoice === keepOpenLabel) {
    disabledOnce = true;
    vscode.window.showWarningMessage(
      "DevContainer Enforcer disabled for this window (once). Reopen to re-enable."
    );
    return;
  }

  await vscode.commands.executeCommand("workbench.action.closeWindow");
}

export function deactivate() {}
