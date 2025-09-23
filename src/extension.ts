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

async function inDevContainer(): Promise<boolean> {
  // Primary signal from VS Code Remote Host
  const rn = vscode.env.remoteName;
  if (rn === "dev-container" || rn === "codespaces") return true;

  // Common environment variables
  if (process.env.GITHUB_CODESPACES === "true" || process.env.CODESPACES === "true") return true;
  if (process.env.DEVCONTAINER === "true" || process.env.VSCODE_REMOTE_CONTAINERS === "true") return true;

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
  // Register diagnostics command
  const out = vscode.window.createOutputChannel("DevContainer Enforcer");
  ctx.subscriptions.push(out);
  ctx.subscriptions.push(
    vscode.commands.registerCommand("devcontainer-enforcer.dumpDiagnostics", async () => {
      try {
        const rn = vscode.env.remoteName;
        const env = process.env;
        const hints: string[] = [];
        const dockerenv = await exists("/.dockerenv");
        let cgroup = "";
        try { cgroup = await fs.readFile("/proc/1/cgroup", "utf8"); } catch {}
        hints.push(`remoteName: ${rn ?? "(undefined)"}`);
        hints.push(`GITHUB_CODESPACES: ${env.GITHUB_CODESPACES ?? ""}`);
        hints.push(`CODESPACES: ${env.CODESPACES ?? ""}`);
        hints.push(`DEVCONTAINER: ${env.DEVCONTAINER ?? ""}`);
        hints.push(`VSCODE_REMOTE_CONTAINERS: ${env.VSCODE_REMOTE_CONTAINERS ?? ""}`);
        hints.push(`/.dockerenv: ${dockerenv}`);
        hints.push(`/proc/1/cgroup contains container keywords: ${/docker|containerd|kubepods|podman/i.test(cgroup)}`);

        const text = [
          "# DevContainer Enforcer Diagnostics",
          "",
          `inDevContainer(): ${(await inDevContainer())}`,
          "",
          "## Signals",
          ...hints.map(h => `- ${h}`),
          "",
          "## Workspace",
          `folders: ${(vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath).join(", ")}`,
        ].join("\n");

        const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: text });
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (e: any) {
        out.appendLine(`Diagnostics failed: ${e?.message || e}`);
        vscode.window.showErrorMessage("Diagnostics failed. See 'DevContainer Enforcer' output.");
      }
    })
  );
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

  // Show a blocking modal in both cases (found or not found), with three options.
  const CLOSE = "Close VS Code (default)";
  const DISABLE_ONCE = "Disable once";
  const CANCEL = "Cancel";

  const message = found
    ? [
        `A .devcontainer was detected at: ${found}.`,
        'Please use "Dev Containers: Reopen in Container" to open this project safely.',
        "Choose an action:",
      ].join("\n")
    : [
        "No .devcontainer found in this workspace or any ancestor.",
        "Define one at: <repo>/.devcontainer or <org>/.devcontainer.",
        "Choose an action:",
      ].join("\n");

  const choice = await vscode.window.showErrorMessage(
    message,
    { modal: true },
    CLOSE,
    DISABLE_ONCE,
    CANCEL
  );

  if (choice === DISABLE_ONCE) {
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

  // For Cancel or dismiss (undefined) or explicit Close: close VS Code to block host session.
  await vscode.commands.executeCommand("workbench.action.closeWindow");
}

export function deactivate() {}
