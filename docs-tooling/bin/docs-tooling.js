#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { JavaScriptExtractor } from "../js/extractors/javascript.js";
import { ComponentsExtractor } from "../js/extractors/components.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

async function extractPython(outDir) {
  const outputPath = path.join(outDir, "pdoc.json");
  await execFileAsync(
    "uv",
    [
      "run",
      "--no-sync",
      "python",
      path.join(repoRoot, "docs-tooling", "py", "dump_pdoc.py"),
      "--output",
      outputPath,
    ],
    {
      cwd: path.join(repoRoot, "server"),
      env: { ...process.env, DJANGO_SETTINGS_MODULE: "doc_settings" },
    }
  );
}

async function extractRest(outDir) {
  const outputPath = path.join(outDir, "openapi.json");
  await execFileAsync(
    "uv",
    [
      "run",
      "--no-sync",
      "python",
      "manage.py",
      "spectacular",
      "--format",
      "openapi-json",
      "--file",
      outputPath,
    ],
    {
      cwd: path.join(repoRoot, "server"),
      env: { ...process.env, DJANGO_SETTINGS_MODULE: "doc_settings" },
    }
  );
}

async function extractJavaScript(outDir) {
  const extractor = new JavaScriptExtractor();
  await extractor.extract({ outputPath: path.join(outDir, "typedoc.json") });
}

async function extractComponents(outDir) {
  const extractor = new ComponentsExtractor();
  await extractor.extract({ outputPath: path.join(outDir, "vue-docgen.json") });
}

function resolveOutDir(outDir) {
  return outDir
    ? path.resolve(process.cwd(), outDir)
    : path.join(repoRoot, "docs-tooling", "samples");
}

function expandTargets(targets) {
  const set = new Set(targets.length ? targets : ["all"]);
  if (set.has("all")) {
    set.add("python");
    set.add("rest");
    set.add("javascript");
    set.add("components");
    set.delete("all");
  }
  return Array.from(set);
}

async function runExtract(argv) {
  const outDir = resolveOutDir(argv.outDir);
  const targets = expandTargets(argv.target);

  for (const target of targets) {
    switch (target) {
      case "python":
        await extractPython(outDir);
        break;
      case "rest":
        await extractRest(outDir);
        break;
      case "javascript":
        await extractJavaScript(outDir);
        break;
      case "components":
        await extractComponents(outDir);
        break;
      default:
        throw new Error(`Unknown target: ${target}`);
    }
  }
}

yargs(hideBin(process.argv))
  .command(
    "extract",
    "Run documentation extractors",
    (y) =>
      y
        .option("target", {
          alias: "t",
          array: true,
          choices: ["all", "python", "rest", "javascript", "components"],
          default: ["all"],
          describe: "Which extractors to run",
        })
        .option("out-dir", {
          alias: "o",
          type: "string",
          describe: "Directory for extracted JSON",
        }),
    runExtract
  )
  .demandCommand(1)
  .strict()
  .help()
  .parse();
