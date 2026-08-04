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
 * @param {object} options
 * @param {string[]} options.files - markdown files to scan
 * @param {string|string[]} options.apiRoots - path or paths to indexed reference trees (api, theming, etc.)
 * @param {string} options.glossaryFile - path to docs/reference/glossary.md
 * @returns {{ errors: { file: string, line: number, message: string }[], apiIndexSize: number, glossaryIndexSize: number }}
 */
export const validateReferences = ({ files, apiRoots, glossaryFile }) => {
    const apiIndex = buildApiIndex(apiRoots);
    const glossaryIndex = buildGlossaryIndex(glossaryFile);
    const errors = [];

    for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
            continue;
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const refs = scanFileRefs(content);

        for (const ref of refs) {
            if (ref.type === "api") {
                if (!apiIndex.has(ref.value)) {
                    errors.push({
                        file: filePath,
                        line: ref.line,
                        message: `Unknown API id "${ref.value}"`,
                    });
                }
            } else if (ref.type === "term") {
                const key = normalizeTerm(stripInlineMarkdown(ref.value));
                if (!glossaryIndex.has(key)) {
                    errors.push({
                        file: filePath,
                        line: ref.line,
                        message: `Unknown glossary term "${ref.value}"`,
                    });
                }
            }
        }
    }

    return { errors, apiIndexSize: apiIndex.size, glossaryIndexSize: glossaryIndex.size };
};
