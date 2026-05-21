/**
 * CSS tokens extraction.
 *
 * Parses the vueda-tailwind base.css file with PostCSS and produces a raw JSON
 * payload describing every custom property declaration in :root and .dark, plus
 * the @theme inline block used to map tokens to Tailwind utilities.
 *
 * The shape produced here is intentionally raw; a separate normalizer turns it
 * into the canonical css-tokens bundle shape.
 */
import { Extractor } from "../core.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const DEFAULT_BASE_CSS = "client/lib/theme/vueda-tailwind/base.css";

function lastTrailingComment(decl) {
    const raws = decl.raws || {};
    if (raws.value && raws.value.raw && raws.value.raw.includes("/*")) {
        const match = raws.value.raw.match(/\/\*([\s\S]*?)\*\//);
        if (match) {
            return match[1].trim();
        }
    }
    // PostCSS sometimes attaches a trailing comment as the next sibling.
    const next = decl.next();
    if (next && next.type === "comment") {
        // Heuristic: only treat as inline trailing comment when it's on the
        // same line as the declaration in the source. The declaration may
        // span multiple lines (prettier breaks long `oklch(...)` calls), in
        // which case the trailing comment lands on the declaration's end
        // line rather than its start line.
        if (next.source && decl.source && next.source.start && decl.source.start) {
            const declEndLine = (decl.source.end && decl.source.end.line) || decl.source.start.line;
            if (next.source.start.line === decl.source.start.line || next.source.start.line === declEndLine) {
                return next.text.trim();
            }
        }
    }
    return null;
}

function leadingBannerComment(node) {
    // Walk backwards looking for a banner-style comment (containing dashes)
    // that introduces a group of declarations.
    let prev = node.prev();
    while (prev) {
        if (prev.type === "comment") {
            const text = prev.text || "";
            // Banner comment: `---------- Title ----------`
            const banner = text.match(/-{3,}\s*(.+?)\s*-{3,}/);
            if (banner) {
                return banner[1].trim();
            }
            return null;
        }
        if (prev.type === "decl") {
            return null;
        }
        prev = prev.prev();
    }
    return null;
}

function findGroupForDecl(decl, groupBoundaries) {
    const declLine = decl.source && decl.source.start ? decl.source.start.line : 0;
    let current = null;
    for (const boundary of groupBoundaries) {
        if (boundary.line <= declLine) {
            current = boundary.title;
        } else {
            break;
        }
    }
    return current;
}

function collectGroupBoundaries(rule) {
    const boundaries = [];
    rule.walkComments((comment) => {
        const text = comment.text || "";
        const banner = text.match(/-{3,}\s*(.+?)\s*-{3,}/);
        if (banner && comment.source && comment.source.start) {
            boundaries.push({ line: comment.source.start.line, title: banner[1].trim() });
        }
    });
    return boundaries;
}

function parseThemeInline(root) {
    const mapping = new Map();
    root.walkAtRules("theme", (atRule) => {
        if ((atRule.params || "").trim() !== "inline") {
            return;
        }
        atRule.walkDecls((decl) => {
            // Match `--<utility>-<property>: var(--<token>)` patterns.
            const match = (decl.value || "").match(/^\s*var\(\s*--([a-zA-Z0-9_-]+)\s*\)\s*$/);
            if (!match) {
                return;
            }
            const tokenName = match[1];
            const propMatch = decl.prop.match(/^--([a-z]+)-(.+)$/);
            if (!propMatch) {
                return;
            }
            const utilityFamily = propMatch[1]; // color, radius, shadow, font, spacing, animate
            const property = propMatch[2];
            // Avoid clobbering existing mappings (first occurrence wins).
            if (!mapping.has(tokenName)) {
                mapping.set(tokenName, { utility: utilityFamily, property });
            }
        });
    });
    return mapping;
}

function collectScopeDeclarations(root, selector, scopeKey, repoRoot, sourceRel) {
    const out = [];
    root.walkRules((rule) => {
        if (rule.selector !== selector) return;
        const groupBoundaries = collectGroupBoundaries(rule);
        rule.walkDecls((decl) => {
            if (!decl.prop.startsWith("--")) return;
            const description = lastTrailingComment(decl);
            const inlineGroup = leadingBannerComment(decl);
            const groupName = inlineGroup || findGroupForDecl(decl, groupBoundaries) || "Base";
            const start = decl.source && decl.source.start ? decl.source.start : { line: 0, column: 0 };
            out.push({
                name: decl.prop,
                value: decl.value,
                group: groupName,
                description: description || null,
                scope: scopeKey,
                source: {
                    file: sourceRel,
                    line: start.line,
                    column: start.column,
                },
            });
        });
    });
    return out;
}

export class CssTokensExtractor extends Extractor {
    async extract({ outputPath, baseCss = DEFAULT_BASE_CSS } = {}) {
        if (!outputPath) {
            throw new Error("outputPath is required");
        }

        const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
        const resolvedOutput = path.isAbsolute(outputPath) ? outputPath : path.join(repoRoot, outputPath);
        const resolvedSource = path.isAbsolute(baseCss) ? baseCss : path.join(repoRoot, baseCss);
        const sourceRel = path.relative(repoRoot, resolvedSource).split(path.sep).join("/");

        const css = await readFile(resolvedSource, "utf-8");
        const root = postcss.parse(css, { from: resolvedSource });

        const rootDecls = collectScopeDeclarations(root, ":root", "root", repoRoot, sourceRel);
        const darkDecls = collectScopeDeclarations(root, ".dark", "dark", repoRoot, sourceRel);
        const themeMapping = parseThemeInline(root);

        const payload = {
            sourceFile: sourceRel,
            scopes: {
                root: rootDecls,
                dark: darkDecls,
            },
            themeMapping: Object.fromEntries(Array.from(themeMapping.entries()).map(([k, v]) => [k, v])),
        };

        await mkdir(path.dirname(resolvedOutput), { recursive: true });
        await writeFile(resolvedOutput, JSON.stringify(payload, null, 2));

        return { outputPath: resolvedOutput };
    }
}
