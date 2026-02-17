/**
 * JavaScript/TypeScript docs extraction via TypeDoc JSON output.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Extractor } from "../core.js";

const execFileAsync = promisify(execFile);

export class JavaScriptExtractor extends Extractor {
  async extract({
    outputPath,
    entryPoints = ["../client/lib"],
    entryPointStrategy = "expand",
    tsconfig = "typedoc.tsconfig.json",
    typedocConfig = "typedoc.json",
  } = {}) {
    if (!outputPath) {
      throw new Error("outputPath is required");
    }

    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const resolvedOutput = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(repoRoot, outputPath);

    await mkdir(path.dirname(resolvedOutput), { recursive: true });

    const args = ["-C", path.join(repoRoot, "docs-tooling"), "exec", "typedoc"];
    if (typedocConfig) {
      args.push("--options", typedocConfig);
    } else {
      args.push("--entryPoints", ...entryPoints, "--entryPointStrategy", entryPointStrategy, "--tsconfig", tsconfig);
    }
    args.push("--json", resolvedOutput);

    await execFileAsync("pnpm", args, { cwd: repoRoot });

    return {
      outputPath: resolvedOutput,
    };
  }
}
