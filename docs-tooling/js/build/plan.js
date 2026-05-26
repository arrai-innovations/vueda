/**
 * @module build/plan
 * @description Incremental-build planner for the docs pipeline. Decides which
 * extractors must re-run by comparing a content hash of each source's inputs
 * (and its own tooling modules) against a stored manifest. Pure and
 * side-effect-light: callers own the actual extract/normalize/render.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {object} InputSpec
 * @property {"tree"|"children"|"file"} type - Resolution strategy.
 * @property {string} [dir] - Directory for "tree"/"children" specs.
 * @property {string[]} [exts] - File extensions to include for "tree" specs.
 * @property {string} [name] - File name to look for under each immediate child dir ("children").
 * @property {string} [path] - File path for "file" specs.
 */

/**
 * @typedef {object} SourceDescriptor
 * @property {string} key - Canonical source name (matches `extract --target`).
 * @property {string} extractTarget - Value passed to `extract --target`.
 * @property {string} normalizeSource - Value passed to `normalize`/`render --source`.
 * @property {string} canonical - Normalized artifact filename under the generated dir.
 * @property {InputSpec[]} inputs - Source files whose change requires re-extraction.
 * @property {string[]} tooling - Tooling module files (repo-relative) whose change also invalidates the cache.
 */

const SERVER_PY_INPUTS = [
    { type: "tree", dir: "server/vueda", exts: [".py"] },
    { type: "file", path: "server/doc_settings.py" },
    { type: "file", path: "server/doc_urls.py" },
    { type: "tree", dir: "server/doc_app", exts: [".py"] },
];

/** @type {SourceDescriptor[]} */
export const SOURCES = [
    {
        key: "python",
        extractTarget: "python",
        normalizeSource: "pdoc",
        canonical: "pdoc.canonical.json",
        inputs: SERVER_PY_INPUTS,
        tooling: [
            "docs-tooling/py/dump_pdoc.py",
            "docs-tooling/js/normalizers/pdoc.js",
            "docs-tooling/js/renderers/pdoc.js",
        ],
    },
    {
        key: "rest",
        extractTarget: "rest",
        normalizeSource: "openapi",
        canonical: "openapi.canonical.json",
        inputs: SERVER_PY_INPUTS,
        tooling: ["docs-tooling/js/normalizers/openapi.js", "docs-tooling/js/renderers/openapi.js"],
    },
    {
        key: "javascript",
        extractTarget: "javascript",
        normalizeSource: "typedoc",
        canonical: "typedoc.canonical.json",
        inputs: [{ type: "tree", dir: "client/lib", exts: [".js", ".ts"] }],
        tooling: [
            "docs-tooling/js/extractors/javascript.js",
            "docs-tooling/js/normalizers/typedoc.js",
            "docs-tooling/js/renderers/typedoc.js",
        ],
    },
    {
        key: "components",
        extractTarget: "components",
        normalizeSource: "vue-docgen",
        canonical: "vue-docgen.canonical.json",
        inputs: [{ type: "tree", dir: "client/lib", exts: [".vue"] }],
        tooling: [
            "docs-tooling/js/extractors/components.js",
            "docs-tooling/js/normalizers/vue-docgen-api.js",
            "docs-tooling/js/renderers/vue-docgen.js",
        ],
    },
    {
        key: "css-tokens",
        extractTarget: "css-tokens",
        normalizeSource: "css-tokens",
        canonical: "css-tokens.canonical.json",
        inputs: [{ type: "file", path: "client/lib/theme/vueda-tailwind/base.css" }],
        tooling: [
            "docs-tooling/js/extractors/css-tokens.js",
            "docs-tooling/js/normalizers/css-tokens.js",
            "docs-tooling/js/renderers/css-tokens.js",
        ],
    },
    {
        key: "theme-keys",
        extractTarget: "theme-keys",
        normalizeSource: "theme-keys",
        canonical: "theme-keys.canonical.json",
        inputs: [{ type: "children", dir: "client/lib/theme/vueda-tailwind", name: "index.js" }],
        tooling: [
            "docs-tooling/js/extractors/theme-keys.js",
            "docs-tooling/js/normalizers/theme-keys.js",
            "docs-tooling/js/renderers/theme-keys.js",
        ],
    },
];

/**
 * Recursively collect files under `dir` whose extension is in `exts`.
 *
 * @param {string} dir - Absolute directory path.
 * @param {string[]} exts - Extensions including the dot (e.g. [".py"]).
 * @returns {string[]} Absolute file paths (unsorted).
 */
function walkTree(dir, exts) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const files = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkTree(full, exts));
        } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
            files.push(full);
        }
    }
    return files;
}

/**
 * Resolve a single input spec to absolute file paths. Missing paths resolve to
 * an empty list so a not-yet-created source dir does not error the planner.
 *
 * @param {string} repoRoot
 * @param {InputSpec} spec
 * @returns {string[]}
 */
function resolveSpec(repoRoot, spec) {
    if (spec.type === "file") {
        const full = path.join(repoRoot, spec.path);
        return fs.existsSync(full) ? [full] : [];
    }
    if (spec.type === "tree") {
        return walkTree(path.join(repoRoot, spec.dir), spec.exts);
    }
    if (spec.type === "children") {
        const base = path.join(repoRoot, spec.dir);
        let entries;
        try {
            entries = fs.readdirSync(base, { withFileTypes: true });
        } catch {
            return [];
        }
        const files = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const candidate = path.join(base, entry.name, spec.name);
            if (fs.existsSync(candidate)) {
                files.push(candidate);
            }
        }
        return files;
    }
    throw new Error(`Unknown input spec type: ${spec.type}`);
}

/**
 * Resolve every input + tooling file for a source to a sorted, de-duplicated
 * list of absolute paths.
 *
 * @param {string} repoRoot
 * @param {SourceDescriptor} source
 * @returns {string[]}
 */
export function sourceFiles(repoRoot, source) {
    const files = new Set();
    for (const spec of source.inputs) {
        for (const f of resolveSpec(repoRoot, spec)) {
            files.add(f);
        }
    }
    for (const rel of source.tooling) {
        const full = path.join(repoRoot, rel);
        if (fs.existsSync(full)) {
            files.add(full);
        }
    }
    return Array.from(files).sort();
}

/**
 * Content hash over a source's resolved files. Each file contributes its
 * repo-relative path and contents, so renames and edits both change the hash.
 *
 * @param {string} repoRoot
 * @param {SourceDescriptor} source
 * @returns {string} Hex sha256 digest.
 */
export function hashSource(repoRoot, source) {
    const hash = crypto.createHash("sha256");
    for (const file of sourceFiles(repoRoot, source)) {
        const rel = path.relative(repoRoot, file);
        hash.update(rel);
        hash.update("\0");
        hash.update(fs.readFileSync(file));
        hash.update("\0");
    }
    return hash.digest("hex");
}

/**
 * Compute current hashes for all (or a subset of) sources.
 *
 * @param {string} repoRoot
 * @param {SourceDescriptor[]} [sources]
 * @returns {{ [key: string]: string }}
 */
export function computeHashes(repoRoot, sources = SOURCES) {
    const out = {};
    for (const source of sources) {
        out[source.key] = hashSource(repoRoot, source);
    }
    return out;
}

/**
 * Read the manifest map ({ sourceKey: hash }); returns {} when absent/unparsable.
 *
 * @param {string} manifestPath
 * @returns {{ [key: string]: string }}
 */
export function readManifest(manifestPath) {
    try {
        return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
        return {};
    }
}

/**
 * Write the manifest map.
 *
 * @param {string} manifestPath
 * @param {{ [key: string]: string }} manifest
 * @returns {void}
 */
export function writeManifest(manifestPath, manifest) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Decide which sources must be re-extracted: hash changed, no manifest entry,
 * or the normalized artifact is missing (bootstrap / cleaned cache).
 *
 * @param {object} options
 * @param {SourceDescriptor[]} options.sources
 * @param {{ [key: string]: string }} options.currentHashes
 * @param {{ [key: string]: string }} options.manifest
 * @param {string} options.generatedDir - Directory holding `<canonical>` artifacts.
 * @returns {SourceDescriptor[]} Stale sources, in `sources` order.
 */
export function selectStale({ sources, currentHashes, manifest, generatedDir }) {
    return sources.filter((source) => {
        const canonicalPath = path.join(generatedDir, source.canonical);
        if (!fs.existsSync(canonicalPath)) {
            return true;
        }
        return manifest[source.key] !== currentHashes[source.key];
    });
}
