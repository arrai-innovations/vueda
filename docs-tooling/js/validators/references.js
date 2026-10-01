import {
    normalizeTerm,
    parseApiRef,
    parseFrontmatter,
    parseTermRef,
    stripInlineMarkdown,
} from "../utils/reference-parser.js";
import fs from "node:fs";
import path from "node:path";

const walkFiles = (dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walkFiles(entryPath);
        }
        return [entryPath];
    });
};

/**
 * Build a Map<id, filePath> from API markdown files.
 *
 * Accepts a single root or an array of roots so callers can index multiple
 * generated reference trees (e.g. `reference/api/` plus `reference/theming/`)
 * into a single id space.
 *
 * @param {string|string[]} roots
 */
export const buildApiIndex = (roots) => {
    const index = new Map();
    const rootList = Array.isArray(roots) ? roots : [roots];
    for (const root of rootList) {
        if (!root || !fs.existsSync(root)) {
            continue;
        }
        const files = walkFiles(root).filter((file) => file.endsWith(".md"));
        for (const filePath of files) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const { frontmatter } = parseFrontmatter(raw);
            if (!frontmatter.id) {
                continue;
            }
            index.set(frontmatter.id, filePath);
            if (Array.isArray(frontmatter.member_ids)) {
                for (const memberId of frontmatter.member_ids) {
                    if (memberId) {
                        index.set(memberId, filePath);
                    }
                }
            }
        }
    }
    return index;
};

/**
 * Add the upstream documentation ids that the external-docs extractor wrote, mapped to their URLs.
 * A missing file adds nothing, so an `ext:` reference then fails as unknown.
 */
export const addExternalIds = (index, externalIdsFile) => {
    if (!externalIdsFile || !fs.existsSync(externalIdsFile)) {
        return index;
    }
    const ids = JSON.parse(fs.readFileSync(externalIdsFile, "utf-8"));
    for (const [id, entry] of Object.entries(ids)) {
        index.set(id, entry.href);
    }
    return index;
};

/**
 * Build a Set<normalizedTerm> from glossary ## headings.
 */
export const buildGlossaryIndex = (glossaryFile) => {
    const index = new Set();
    if (!fs.existsSync(glossaryFile)) {
        return index;
    }
    const raw = fs.readFileSync(glossaryFile, "utf-8");
    const { body } = parseFrontmatter(raw);
    const headings = body.matchAll(/^##\s+(.+?)\s*$/gm);
    for (const headingMatch of headings) {
        const term = headingMatch[1].trim();
        if (!term) {
            continue;
        }
        const key = normalizeTerm(stripInlineMarkdown(term));
        if (key) {
            index.add(key);
        }
    }
    return index;
};

/**
 * Scan a file's content for all {@api} and {@term} references.
 * Returns an array of { type, value, line, column } objects.
 */
export const scanFileRefs = (content) => {
    const refs = [];
    const lines = content.split("\n");

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let col = 0;
        while (col < line.length) {
            if (line[col] !== "{") {
                col += 1;
                continue;
            }
            const apiResult = parseApiRef(line, col);
            if (apiResult) {
                refs.push({
                    type: "api",
                    value: apiResult.rawId,
                    line: lineIdx + 1,
                    column: col + 1,
                });
                col += apiResult.length;
                continue;
            }
            const termResult = parseTermRef(line, col);
            if (termResult) {
                refs.push({
                    type: "term",
                    value: termResult.rawTerm,
                    line: lineIdx + 1,
                    column: col + 1,
                });
                col += termResult.length;
                continue;
            }
            col += 1;
        }
    }

    return refs;
};

/**
 * Validate references across the given files.
 *
 * By default an unknown API id or glossary term is an error. With
 * `warnUnknown`, it is a warning instead, so a draft can link a symbol
 * before the generator produces its id.
 *
 * @param {object} options
 * @param {string[]} options.files - markdown files to scan
 * @param {string|string[]} options.apiRoots - path or paths to indexed reference trees (api, theming, etc.)
 * @param {string} options.glossaryFile - path to docs/reference/glossary.md
 * @param {string} [options.externalIdsFile] - path to the extracted upstream documentation ids
 * @param {boolean} [options.warnUnknown=false] - report unknown ids and terms as warnings
 * @returns {{ errors: { file: string, line: number, message: string }[], warnings: { file: string, line: number, message: string, type: "api"|"term", value: string }[], apiIndexSize: number, glossaryIndexSize: number }}
 */
export const validateReferences = ({ files, apiRoots, glossaryFile, externalIdsFile, warnUnknown = false }) => {
    const apiIndex = addExternalIds(buildApiIndex(apiRoots), externalIdsFile);
    const glossaryIndex = buildGlossaryIndex(glossaryFile);
    const errors = [];
    const warnings = [];
    const unknown = warnUnknown ? warnings : errors;

    for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
            continue;
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const refs = scanFileRefs(content);

        for (const ref of refs) {
            if (ref.type === "api") {
                if (!apiIndex.has(ref.value)) {
                    unknown.push({
                        file: filePath,
                        line: ref.line,
                        message: `Unknown API id "${ref.value}"`,
                        type: "api",
                        value: ref.value,
                    });
                }
            } else if (ref.type === "term") {
                const key = normalizeTerm(stripInlineMarkdown(ref.value));
                if (!glossaryIndex.has(key)) {
                    unknown.push({
                        file: filePath,
                        line: ref.line,
                        message: `Unknown glossary term "${ref.value}"`,
                        type: "term",
                        value: ref.value,
                    });
                }
            }
        }
    }

    return { errors, warnings, apiIndexSize: apiIndex.size, glossaryIndexSize: glossaryIndex.size };
};

/**
 * Group unknown-reference warnings by the id or term they name.
 *
 * Each entry lists how many times the reference appears and the files that
 * use it, sorted by type, then by use count (highest first), then by value.
 *
 * @param {{ file: string, type: "api"|"term", value: string }[]} warnings
 * @returns {{ type: "api"|"term", value: string, count: number, files: string[] }[]}
 */
export const summarizeUnknownReferences = (warnings) => {
    const groups = new Map();
    for (const warning of warnings) {
        const key = `${warning.type}\0${warning.value}`;
        let group = groups.get(key);
        if (!group) {
            group = { type: warning.type, value: warning.value, count: 0, files: new Set() };
            groups.set(key, group);
        }
        group.count += 1;
        group.files.add(warning.file);
    }
    return [...groups.values()]
        .map((group) => ({ ...group, files: [...group.files].sort() }))
        .sort((a, b) => a.type.localeCompare(b.type) || b.count - a.count || a.value.localeCompare(b.value));
};
