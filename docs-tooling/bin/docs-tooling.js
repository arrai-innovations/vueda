#!/usr/bin/env node
import { ComponentsExtractor } from "../js/extractors/components.js";
import { JavaScriptExtractor } from "../js/extractors/javascript.js";
import { OpenApiNormalizer } from "../js/normalizers/openapi.js";
import { PdocNormalizer } from "../js/normalizers/pdoc.js";
import { TypeDocNormalizer } from "../js/normalizers/typedoc.js";
import { VueDocgenNormalizer } from "../js/normalizers/vue-docgen-api.js";
import { renderOpenApiBundle } from "../js/renderers/openapi.js";
import { renderPdocBundle } from "../js/renderers/pdoc.js";
import { renderTypeDocBundle } from "../js/renderers/typedoc.js";
import { renderVueDocgenBundle } from "../js/renderers/vue-docgen.js";
import { validateReferences } from "../js/validators/references.js";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
        },
    );
}

async function extractRest(outDir) {
    const outputPath = path.join(outDir, "openapi.json");
    await execFileAsync(
        "uv",
        ["run", "--no-sync", "python", "manage.py", "spectacular", "--format", "openapi-json", "--file", outputPath],
        {
            cwd: path.join(repoRoot, "server"),
            env: { ...process.env, DJANGO_SETTINGS_MODULE: "doc_settings" },
        },
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
    return outDir ? path.resolve(process.cwd(), outDir) : path.join(repoRoot, "docs-tooling", ".generated");
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

function expandNormalizeTargets(targets) {
    const set = new Set(targets.length ? targets : ["all"]);
    if (set.has("all")) {
        set.add("typedoc");
        set.add("vue-docgen");
        set.add("openapi");
        set.add("pdoc");
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

async function runNormalize(argv) {
    const defaults = {
        typedoc: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "typedoc.json"),
            output: path.join(repoRoot, "docs-tooling", ".generated", "typedoc.canonical.json"),
        },
        "vue-docgen": {
            input: path.join(repoRoot, "docs-tooling", ".generated", "vue-docgen.json"),
            output: path.join(repoRoot, "docs-tooling", ".generated", "vue-docgen.canonical.json"),
        },
        openapi: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "openapi.json"),
            output: path.join(repoRoot, "docs-tooling", ".generated", "openapi.canonical.json"),
        },
        pdoc: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "pdoc.json"),
            output: path.join(repoRoot, "docs-tooling", ".generated", "pdoc.canonical.json"),
        },
    };

    const requestedSources = expandNormalizeTargets(argv.source || []);

    if (requestedSources.length > 1 && argv.input) {
        throw new Error("input can only be used with a single source");
    }

    for (const source of requestedSources) {
        let normalizer;
        switch (source) {
            case "typedoc":
                normalizer = new TypeDocNormalizer();
                break;
            case "vue-docgen":
                normalizer = new VueDocgenNormalizer();
                break;
            case "openapi":
                normalizer = new OpenApiNormalizer();
                break;
            case "pdoc":
                normalizer = new PdocNormalizer();
                break;
            default:
                throw new Error(`Unknown source: ${source}`);
        }

        const inputPath = path.resolve(process.cwd(), argv.input || defaults[source].input);
        const outputPath = path.resolve(process.cwd(), argv.output || defaults[source].output);
        const raw = await fs.promises.readFile(inputPath, "utf-8");
        const payload = JSON.parse(raw);

        const normalized = normalizer.normalize(payload);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, JSON.stringify(normalized, null, 2));
    }
}

async function writeRenderedFiles(outputDir, outputs) {
    await fs.promises.mkdir(outputDir, { recursive: true });
    for (const [filename, contents] of outputs.entries()) {
        const target = path.join(outputDir, filename);
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, contents);
    }
}

function titleForDir(dirPath) {
    if (!dirPath) {
        return "API Reference";
    }
    const parts = dirPath.split(path.sep).filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) {
        return "API Reference";
    }
    if (last === "py") return "Python API";
    if (last === "js") return "JavaScript API";
    if (last === "rest") return "REST API";
    if (last === "vue") return "Vue Components";
    return last;
}

function addIndexPages(outputs) {
    const dirChildren = new Map();
    const ensureDir = (dir) => {
        if (!dirChildren.has(dir)) {
            dirChildren.set(dir, new Set());
        }
    };

    const indexIdForDir = (dir) => {
        if (!dir || dir === ".") {
            return "api:reference";
        }
        const parts = dir.split(path.sep).filter(Boolean);
        const prefix = parts[0];
        if (prefix) {
            const suffix = parts.slice(1).join("/");
            return suffix ? `${prefix}:index:${suffix}` : `${prefix}:index`;
        }
        return `api:index:${parts.join("/")}`;
    };
    for (const filePath of outputs.keys()) {
        const dir = path.dirname(filePath);
        ensureDir(dir);
        dirChildren.get(dir).add(path.basename(filePath));

        let current = dir;
        while (current && current !== "." && current !== path.dirname(current)) {
            const parent = path.dirname(current);
            ensureDir(parent);
            dirChildren.get(parent).add(path.basename(current));
            if (parent === current) break;
            current = parent;
        }
    }

    for (const [dir, childrenSet] of dirChildren.entries()) {
        const indexPath = path.join(dir, "index.md");
        if (outputs.has(indexPath)) {
            continue;
        }
        // A Python package produces both foo.md (the module page) and foo/ (its
        // member files). If foo.md exists and the directory contains no further
        // subdirectories, foo.md is already the canonical landing page — skip
        // generating a redundant foo/index.md that would just list the same members.
        const dirMdPath = dir === "." ? null : `${dir}.md`;
        const hasSubdirs = Array.from(childrenSet).some((c) => !c.endsWith(".md"));
        if (dirMdPath && outputs.has(dirMdPath) && !hasSubdirs) {
            continue;
        }
        const children = Array.from(childrenSet).sort((a, b) => a.localeCompare(b));
        const title = titleForDir(dir === "." ? "" : dir);
        const lines = [];
        lines.push("---", `title: ${title}`, `id: ${indexIdForDir(dir)}`, "---", "");
        lines.push(`# ${title}`, "");
        for (const child of children) {
            if (child === "index.md") continue;
            // When both foo.md and foo/ exist for the same module, link only to
            // foo.md to avoid two identically-labelled entries in the index.
            if (!child.endsWith(".md") && childrenSet.has(`${child}.md`)) continue;
            const label = child.endsWith(".md") ? child.replace(/\.md$/, "") : child;
            const linkTarget = child.endsWith(".md") ? `./${child}` : `./${child}/`;
            lines.push(`- [${label}](${linkTarget})`);
        }
        lines.push("");
        outputs.set(indexPath, lines.join("\n"));
    }
}

async function runRender(argv) {
    const defaults = {
        typedoc: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "typedoc.canonical.json"),
            output: path.join(repoRoot, "docs", "reference", "api"),
        },
        "vue-docgen": {
            input: path.join(repoRoot, "docs-tooling", ".generated", "vue-docgen.canonical.json"),
            output: path.join(repoRoot, "docs", "reference", "api"),
        },
        openapi: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "openapi.canonical.json"),
            output: path.join(repoRoot, "docs", "reference", "api"),
        },
        pdoc: {
            input: path.join(repoRoot, "docs-tooling", ".generated", "pdoc.canonical.json"),
            output: path.join(repoRoot, "docs", "reference", "api"),
        },
    };

    const requestedSources = expandNormalizeTargets(argv.source || []);

    if (requestedSources.length > 1 && argv.input) {
        throw new Error("input can only be used with a single source");
    }

    const combinedOutputs = new Map();
    const outputDir = path.resolve(
        process.cwd(),
        argv.output || defaults[requestedSources[0]]?.output || defaults.typedoc.output,
    );

    for (const source of requestedSources) {
        let renderer;
        switch (source) {
            case "typedoc":
                renderer = renderTypeDocBundle;
                break;
            case "vue-docgen":
                renderer = renderVueDocgenBundle;
                break;
            case "openapi":
                renderer = renderOpenApiBundle;
                break;
            case "pdoc":
                renderer = renderPdocBundle;
                break;
            default:
                throw new Error(`Unknown source: ${source}`);
        }

        const inputPath = path.resolve(process.cwd(), argv.input || defaults[source].input);
        const raw = await fs.promises.readFile(inputPath, "utf-8");
        const bundle = JSON.parse(raw);
        const outputs = renderer(bundle);
        for (const [filePath, contents] of outputs.entries()) {
            combinedOutputs.set(filePath, contents);
        }
    }

    addIndexPages(combinedOutputs);
    await writeRenderedFiles(outputDir, combinedOutputs);
}

const defaultExcludes = ["reference/api", ".vitepress", ".generated", "AGENTS.md", "CONTENT_PLAN.md"];

function collectMarkdownFiles(docsDir, excludes) {
    const results = [];
    const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            const rel = path.relative(docsDir, entryPath).split(path.sep).join("/");
            if (excludes.some((ex) => rel.startsWith(ex) || rel === ex)) {
                continue;
            }
            if (entry.isDirectory()) {
                walk(entryPath);
            } else if (entry.name.endsWith(".md")) {
                results.push(entryPath);
            }
        }
    };
    walk(docsDir);
    return results;
}

async function runValidate(argv) {
    const docsDir = path.join(repoRoot, "docs");
    const apiRoot = path.join(docsDir, "reference", "api");
    const glossaryFile = path.join(docsDir, "reference", "glossary.md");

    if (!fs.existsSync(apiRoot)) {
        console.warn("warning: docs/reference/api/ not found; skipping API reference validation");
    }

    let files;
    if (argv.files && argv.files.length > 0) {
        files = argv.files.map((f) => path.resolve(process.cwd(), f)).filter((f) => f.endsWith(".md"));
    } else {
        files = collectMarkdownFiles(docsDir, defaultExcludes);
    }

    if (files.length === 0) {
        return;
    }

    const { errors, apiIndexSize, glossaryIndexSize } = validateReferences({ files, apiRoot, glossaryFile });

    console.error(
        `Checked ${files.length} file(s) against ${apiIndexSize} API ids and ${glossaryIndexSize} glossary terms`,
    );

    if (errors.length > 0) {
        for (const error of errors) {
            const rel = path.relative(process.cwd(), error.file).split(path.sep).join("/");
            console.log(`${rel}:${error.line}: ${error.message}`);
        }
        process.exit(1);
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
        runExtract,
    )
    .command(
        "normalize",
        "Normalize extracted JSON to the canonical schema",
        (y) =>
            y
                .option("source", {
                    alias: "s",
                    array: true,
                    choices: ["all", "typedoc", "vue-docgen", "openapi", "pdoc"],
                    default: ["all"],
                    describe: "Which source format to normalize",
                })
                .option("input", {
                    alias: "i",
                    type: "string",
                    describe: "Input JSON file",
                })
                .option("output", {
                    alias: "o",
                    type: "string",
                    describe: "Output JSON file",
                }),
        runNormalize,
    )
    .command(
        "render",
        "Render canonical JSON to Markdown files",
        (y) =>
            y
                .option("source", {
                    alias: "s",
                    array: true,
                    choices: ["all", "typedoc", "vue-docgen", "openapi", "pdoc"],
                    default: ["all"],
                    describe: "Which source format to render",
                })
                .option("input", {
                    alias: "i",
                    type: "string",
                    describe: "Input canonical JSON file",
                })
                .option("output", {
                    alias: "o",
                    type: "string",
                    describe: "Output directory for rendered Markdown",
                }),
        runRender,
    )
    .command(
        "validate",
        "Validate {@api} and {@term} references in documentation",
        (y) =>
            y.option("files", {
                alias: "f",
                array: true,
                type: "string",
                describe: "Specific files to validate (default: all authored docs)",
            }),
        runValidate,
    )
    .demandCommand(1)
    .strict()
    .showHelpOnFail(false)
    .fail((msg, err) => {
        const output = err?.message ?? msg;
        if (output) {
            console.error(output);
        }
        process.exit(1);
    })
    .help()
    .parse();
