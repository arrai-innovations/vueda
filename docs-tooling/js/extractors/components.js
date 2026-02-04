/**
 * Vue SFC docs extraction via vue-docgen-api JSON output.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Extractor } from "../core.js";

const execFileAsync = promisify(execFile);

export class ComponentsExtractor extends Extractor {
  async extract({
    outputPath,
    sourceDir = "../client/lib",
    config = null,
  } = {}) {
    if (!outputPath) {
      throw new Error("outputPath is required");
    }

    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
    const resolvedOutput = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(repoRoot, outputPath);

    await mkdir(path.dirname(resolvedOutput), { recursive: true });

    const args = ["-C", path.join(repoRoot, "docs-tooling"), "exec", "vue-docgen-api"];
    if (config) {
      args.push("--config", config);
    }
    args.push(sourceDir, "--out", resolvedOutput, "--format", "json");

    await execFileAsync("pnpm", args, { cwd: repoRoot });

    return {
      outputPath: resolvedOutput,
    };
  }
}
