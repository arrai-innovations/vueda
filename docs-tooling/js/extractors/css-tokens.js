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
const BANNER_RE = /-{3,}\s*([^\n]*?)\s*-{3,}/;

function cleanCommentProse(text) {
    const lines = (text || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/^\s*\* ?/, ""));

    while (lines.length && lines[0].trim() === "") {
        lines.shift();
    }
    while (lines.length && lines[lines.length - 1].trim() === "") {
        lines.pop();
    }

    const cleaned = lines.join("\n").trim();
    return cleaned || null;
}

function parseBannerComment(text) {
    const match = (text || "").match(BANNER_RE);
    if (!match) {
        return null;
    }

    return {
        title: match[1].trim(),
        prose: cleanCommentProse(text.slice(match.index + match[0].length)),
    };
}

function hasBlankLineBetween(sourceLines, previous, next) {
    if (!previous?.source?.end || !next?.source?.start) {
        return false;
    }

    const startLine = previous.source.end.line + 1;
    const endLine = next.source.start.line - 1;
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
        if ((sourceLines[lineNumber - 1] || "").trim() === "") {
            return true;
        }
    }
    return false;
}

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
            // Banner comment: `---------- Title ----------`
            const banner = parseBannerComment(prev.text);
            if (banner) {
                return banner.title;
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
            current = boundary.name;
        } else {
            break;
        }
    }
    return current;
}

function collectGroupBoundaries(rule, sourceLines) {
    const boundaries = [];

    for (const node of rule.nodes || []) {
        if (node.type !== "comment") {
            continue;
        }

        const banner = parseBannerComment(node.text);
        if (!banner || !node.source?.start) {
            continue;
        }

        const proseBlocks = [];
        if (banner.prose) {
            proseBlocks.push(banner.prose);
        }

        let current = node;
        let next = current.next();
        while (next && next.type === "comment" && !hasBlankLineBetween(sourceLines, current, next)) {
            if (parseBannerComment(next.text)) {
                break;
            }

            const prose = cleanCommentProse(next.text);
            if (prose) {
                proseBlocks.push(prose);
            }

            current = next;
            next = current.next();
        }

        boundaries.push({
            line: node.source.start.line,
            name: banner.title,
            group_description: proseBlocks.length ? proseBlocks.join("\n\n") : null,
            source: {
                line: node.source.start.line,
                column: node.source.start.column,
            },
        });
    }
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

function collectScope(root, selector, scopeKey, sourceRel, sourceLines) {
    const declarations = [];
    const groups = [];

    root.walkRules((rule) => {
        if (rule.selector !== selector) {
            return;
        }
        const groupBoundaries = collectGroupBoundaries(rule, sourceLines);
        groups.push(
            ...groupBoundaries.map((group) => ({
                name: group.name,
                group_description: group.group_description,
                scope: scopeKey,
                source: {
                    file: sourceRel,
                    line: group.source.line,
                    column: group.source.column,
                },
            })),
        );

        rule.walkDecls((decl) => {
            if (!decl.prop.startsWith("--")) {
                return;
            }
            const description = lastTrailingComment(decl);
            const inlineGroup = leadingBannerComment(decl);
            const groupName = inlineGroup || findGroupForDecl(decl, groupBoundaries) || "Base";
            const start = decl.source && decl.source.start ? decl.source.start : { line: 0, column: 0 };
            declarations.push({
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

    return { declarations, groups };
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
        const sourceLines = css.replace(/\r\n/g, "\n").split("\n");

        const rootScope = collectScope(root, ":root", "root", sourceRel, sourceLines);
        const darkScope = collectScope(root, ".dark", "dark", sourceRel, sourceLines);
        const themeMapping = parseThemeInline(root);

        const payload = {
            sourceFile: sourceRel,
            scopes: {
                root: rootScope.declarations,
                dark: darkScope.declarations,
            },
            groups: [...rootScope.groups, ...darkScope.groups],
            themeMapping: Object.fromEntries(Array.from(themeMapping.entries()).map(([k, v]) => [k, v])),
        };

        await mkdir(path.dirname(resolvedOutput), { recursive: true });
        await writeFile(resolvedOutput, JSON.stringify(payload, null, 2));

        return { outputPath: resolvedOutput };
    }
}
