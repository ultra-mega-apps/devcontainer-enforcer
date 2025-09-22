import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/extension.ts"],
  outfile: "out/extension.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  external: ["vscode"],
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      watch ? "development" : "production"
    ),
  },
};

await build({
  ...options,
  watch,
});

if (!watch) {
  try {
    const outFile = path.resolve(__dirname, "out/extension.js");
    const code = await fs.readFile(outFile, "utf8");

    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: false,
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.75,
      target: "node",
    }).getObfuscatedCode();

    await fs.writeFile(outFile, obfuscated, "utf8");
    console.log("[obfuscator] out/extension.js obfuscated");
  } catch (err) {
    console.error("[obfuscator] failed:", err);
    process.exit(1);
  }
}
