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
 */
export const buildApiIndex = (apiRoot) => {
    const index = new Map();
    if (!fs.existsSync(apiRoot)) {
        return index;
    }
    const files = walkFiles(apiRoot).filter((file) => file.endsWith(".md"));
    for (const filePath of files) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { frontmatter } = parseFrontmatter(raw);
        if (!frontmatter.id) {
            continue;
        }
        index.set(frontmatter.id, filePath);
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
 * @param {string} options.apiRoot - path to docs/reference/api
 * @param {string} options.glossaryFile - path to docs/reference/glossary.md
 * @returns {{ errors: Array<{ file: string, line: number, message: string }>, apiIndexSize: number, glossaryIndexSize: number }}
 */
export const validateReferences = ({ files, apiRoot, glossaryFile }) => {
    const apiIndex = buildApiIndex(apiRoot);
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
