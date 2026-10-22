/** Publish source Markdown with resolved documentation links and embedded examples. */
import { CHANGELOG_PAGES, TOWNCRIER_MARKER, renderUnreleased } from "../utils/changelog-draft-plugin.js";
import { parseLabeledRef } from "../utils/labeled-ref.js";
import { buildApiLinks, buildGlossaryLinks } from "../utils/reference-links.js";
import {
    normalizeTerm,
    parseApiRef,
    parseFrontmatter,
    parseTermRef,
    stripInlineMarkdown,
} from "../utils/reference-parser.js";
import { syncRenderedFiles } from "../utils/sync-rendered-files.js";
import MarkdownIt from "markdown-it";
import fs from "node:fs";
import path from "node:path";

export const DOCS_SRC_EXCLUDE = ["**/AGENTS.md", "**/CLAUDE.md", "**/CONTENT_PLAN.md", "**/README.md", "temp/**"];
const internalNames = new Set(["AGENTS.md", "CLAUDE.md", "CONTENT_PLAN.md", "README.md"]);

export function isPublishedMarkdown(relativePath) {
    const parts = relativePath.split("/");
    return (
        relativePath.endsWith(".md") &&
        !internalNames.has(parts.at(-1)) &&
        !["temp", "public", "node_modules"].includes(parts[0]) &&
        !parts.some((part) => part.startsWith("."))
    );
}

function collectPages(docsRoot, dir = docsRoot) {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) => {
            if (entry.name.startsWith(".") || entry.name === "node_modules") {
                return [];
            }
            const file = path.join(dir, entry.name);
            const relative = path.relative(docsRoot, file).split(path.sep).join("/");
            if (entry.isDirectory()) {
                return ["temp", "public"].includes(relative) ? [] : collectPages(docsRoot, file);
            }
            return isPublishedMarkdown(relative) ? [relative] : [];
        })
        .sort();
}

const escapeLabel = (value) => value.replace(/([\\`*_[\]<>])/g, "\\$1");
const escapeDestination = (value) => value.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
const isExternal = (href) => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);

/** Map a documentation URL to its Markdown file without flattening directory indexes. */
function linkResolver({ pages, base }) {
    const pageSet = new Set(pages);
    return (href, relativePath) => {
        if (!href || href === "#" || isExternal(href)) {
            return href;
        }
        if (href.startsWith("#")) {
            return `${base}${escapeDestination(relativePath)}${href}`;
        }
        const [, pathname, suffix = ""] = href.match(/^([^?#]*)([\s\S]*)$/);
        if (!pathname) {
            return href;
        }
        const fromRoot = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
        const target = path.posix.normalize(
            pathname.startsWith("/") ? fromRoot : path.posix.join(path.posix.dirname(relativePath), pathname),
        );
        const decoded = target === "." ? "" : decodeURI(target);
        const candidates = !decoded
            ? ["index.md"]
            : decoded.endsWith("/")
              ? [`${decoded}index.md`]
              : [decoded, decoded.replace(/\.html$/, ".md"), `${decoded}.md`, `${decoded}/index.md`];
        const page = candidates.find((candidate) => pageSet.has(candidate));
        if (page) {
            return `${base}${escapeDestination(page)}${suffix}`;
        }
        if (/\.(?:md|html)$/.test(decoded) || !path.posix.extname(decoded)) {
            throw new Error(`Unknown documentation link "${href}" in ${relativePath}`);
        }
        // Public assets keep their URLs. Source assets need a separate published copy.
        return `${base}${escapeDestination(target)}${suffix}`;
    };
}

function applyEdits(source, edits) {
    let result = source;
    let boundary = source.length;
    for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
        if (end > boundary) {
            throw new Error("Overlapping Markdown export edits");
        }
        result = result.slice(0, start) + text + result.slice(end);
        boundary = start;
    }
    return result;
}

/**
 * Resolve links by recording parser offsets, leaving the rest of the source untouched.
 * Fenced code, inline code, scripts and styles retain literal examples and Vue expressions.
 */
function transformLinks(source, { relativePath, resolveLink, apiIndex, glossaryIndex }) {
    const md = new MarkdownIt({ html: true });
    const edits = [];
    const env = {};
    const tokens = [];
    const referenceRule = md.block.ruler.__rules__.find((rule) => rule.name === "reference").fn;
    md.block.ruler.at("reference", (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const result = referenceRule(state, startLine, endLine, silent);
        if (result && !silent) {
            const match = state.src.slice(start).match(/^\[[^\]\n]+\]:\s*/);
            if (match) {
                const pos = start + match[0].length;
                const destination = md.helpers.parseLinkDestination(state.src, pos, state.src.length);
                if (destination.ok) {
                    edits.push({
                        start: pos,
                        end: destination.pos,
                        text: escapeDestination(resolveLink(destination.str, relativePath)),
                    });
                }
            }
        }
        return result;
    });
    md.block.parse(source, md, env, tokens);
    const offsets = [0];
    for (let pos = 0; pos < source.length; pos++) {
        if (source[pos] === "\n") {
            offsets.push(pos + 1);
        }
    }
    const protectedBlocks = tokens
        .filter((token) => ["fence", "code_block"].includes(token.type))
        .map((token) => [offsets[token.map[0]], offsets[token.map[1]] ?? source.length]);
    const definitionEdits = [...edits];
    md.inline.ruler.before("escape", "export-protected", (state, silent) => {
        if (state.src !== source) {
            return false;
        }
        let end = protectedBlocks.find(([start, end]) => state.pos >= start && state.pos < end)?.[1];
        if (end === undefined) {
            const block = state.src.slice(state.pos).match(/^<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/i);
            if (block) {
                end = state.pos + block[0].length;
            }
        }
        // Definitions are handled by the block rule, not as inline links.
        const definition = definitionEdits.find((edit) => state.pos === edit.start);
        if (definition) {
            end = definition.end;
        }
        if (end === undefined) {
            return false;
        }
        if (!silent) {
            state.push("text", "", 0).content = state.src.slice(state.pos, end);
        }
        state.pos = end;
        return true;
    });
    md.inline.ruler.before("link", "export-references", (state, silent) => {
        if (state.src !== source) {
            return false;
        }
        for (const [parse, index, key, title] of [
            [parseApiRef, apiIndex, "rawId", "title"],
            [parseTermRef, glossaryIndex, "rawTerm", "term"],
        ]) {
            const labeled = parseLabeledRef(state, parse);
            const parsed = labeled?.parsed || parse(state.src, state.pos);
            if (!parsed) {
                continue;
            }
            const id = key === "rawTerm" ? normalizeTerm(stripInlineMarkdown(parsed[key])) : parsed[key];
            const entry = index.get(id);
            if (!entry) {
                throw new Error(
                    `Unknown ${key === "rawTerm" ? "glossary term" : "API id"} "${parsed[key]}" in ${relativePath}`,
                );
            }
            const start = state.pos;
            const end = labeled?.end ?? start + parsed.length;
            const label = labeled ? state.src.slice(labeled.labelStart, labeled.labelEnd) : escapeLabel(entry[title]);
            const text = `[${label}](${escapeDestination(resolveLink(entry.href, relativePath))})`;
            if (!silent) {
                edits.push({ start, end, text });
                state.push("text", "", 0).content = text;
            }
            state.pos = end;
            return true;
        }
        return false;
    });
    for (const name of ["link", "image"]) {
        const original = md.inline.ruler.__rules__.find((rule) => rule.name === name).fn;
        md.inline.ruler.at(name, (state, silent) => {
            if (state.src[state.pos] !== (name === "image" ? "!" : "[")) {
                return false;
            }
            const start = state.pos + (name === "image" ? 1 : 0);
            const labelEnd = md.helpers.parseLinkLabel(state, start, name === "link");
            const result = original(state, silent);
            if (result && !silent && state.src === source && state.src[labelEnd + 1] === "(") {
                let pos = labelEnd + 2;
                while (/\s/.test(state.src[pos] || "")) {
                    pos++;
                }
                const destination = md.helpers.parseLinkDestination(state.src, pos, state.src.length);
                if (destination.ok) {
                    edits.push({
                        start: pos,
                        end: destination.pos,
                        text: escapeDestination(resolveLink(destination.str, relativePath)),
                    });
                }
            }
            return result;
        });
    }
    const htmlRule = md.inline.ruler.__rules__.find((rule) => rule.name === "html_inline").fn;
    md.inline.ruler.at("html_inline", (state, silent) => {
        const start = state.pos;
        const result = htmlRule(state, silent);
        if (result && !silent && state.src === source) {
            const tag = state.src.slice(start, state.pos);
            if (/^<(?:a|img)\s/i.test(tag)) {
                for (const match of tag.matchAll(/\s(href|src)=(['"])(.*?)\2/g)) {
                    const offset = start + match.index + match[0].indexOf(match[2]) + 1;
                    const text = resolveLink(match[3], relativePath);
                    if (text !== match[3]) {
                        edits.push({ start: offset, end: offset + match[3].length, text });
                    }
                }
            }
        }
        return result;
    });
    md.inline.parse(source, md, env, []);
    return applyEdits(source, edits);
}

function expandContent(raw, file, context, stack = []) {
    if (stack.includes(file)) {
        throw new Error(`Circular Markdown include: ${[...stack, file].join(" -> ")}`);
    }
    const { body } = parseFrontmatter(raw);
    const relativePath = path.relative(context.docsRoot, file).split(path.sep).join("/");
    const pkg = CHANGELOG_PAGES[relativePath];
    let source = body;
    if (pkg && source.includes(TOWNCRIER_MARKER)) {
        const draft = context.renderDraft(pkg);
        if (draft) {
            source = source.replace(TOWNCRIER_MARKER, `${TOWNCRIER_MARKER}\n\n${draft}`);
        }
    }
    const md = new MarkdownIt({ html: true });
    const tokens = [];
    md.block.parse(source, md, {}, tokens);
    const protectedLines = new Set();
    for (const token of tokens) {
        if (
            ["fence", "code_block"].includes(token.type) ||
            (token.type === "html_block" && /^<(script|style)\b/.test(token.content))
        ) {
            for (let line = token.map[0]; line < token.map[1]; line++) {
                protectedLines.add(line);
            }
        }
    }
    // Transform each included page in its own directory so relative links retain their meaning.
    const parts = [];
    let pending = [];
    const flush = () => {
        if (pending.length) {
            parts.push(transformLinks(pending.join("\n"), { ...context, relativePath }));
            pending = [];
        }
    };
    for (const [lineNumber, line] of source.split("\n").entries()) {
        const include = !protectedLines.has(lineNumber) && line.match(/^\s*<!--\s*@include:\s*(.*?)\s*-->\s*$/);
        const snippet = !protectedLines.has(lineNumber) && line.match(/^\s*<<<\s+(.+?)\s*$/);
        if (!include && !snippet) {
            pending.push(line);
            continue;
        }
        flush();
        const target = (include || snippet)[1];
        const targetFile = path.resolve(path.dirname(file), target);
        context.dependencies.add(targetFile);
        const included = fs.readFileSync(targetFile, "utf8");
        if (include) {
            parts.push(expandContent(included, targetFile, context, [...stack, file]));
        } else {
            const runs = included.match(/`+/g) || [];
            const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
            parts.push(`${fence}${path.extname(target).slice(1)}\n${included.trimEnd()}\n${fence}`);
        }
    }
    flush();
    return parts.join("\n");
}

/** Generate all exports before writing, so unresolved references fail without partial output. */
export async function exportMarkdown({
    docsRoot,
    repoRoot = path.dirname(docsRoot),
    outDir = path.join(repoRoot, "docs-tooling", ".generated", "markdown"),
    base = process.env.VITEPRESS_BASE || "/vueda/",
    siteUrl = "https://vueda.dev",
    renderDraft = (pkg) => renderUnreleased(pkg, repoRoot),
}) {
    if (!path.relative(outDir, docsRoot).startsWith("..") || !path.relative(docsRoot, outDir).startsWith("..")) {
        throw new Error("Markdown output must not contain or be inside the documentation source directory");
    }
    if (!base.startsWith("/") || !base.endsWith("/")) {
        throw new Error("Markdown export base must start and end with /");
    }
    const pages = collectPages(docsRoot);
    const apiIndex = buildApiLinks(docsRoot, path.join(repoRoot, "docs-tooling", ".generated", "external-ids.json"));
    const glossaryIndex = buildGlossaryLinks(path.join(docsRoot, "reference", "glossary.md"));
    const resolveLink = linkResolver({ pages, base });
    const dependencies = new Set();
    const outputs = new Map();
    const index = [
        "# VUEDA",
        "",
        "> Integrator guides, changelog, and API reference for VUEDA.",
        "",
        "## Documentation",
        "",
    ];
    for (const relativePath of pages) {
        const file = path.join(docsRoot, relativePath);
        dependencies.add(file);
        const raw = fs.readFileSync(file, "utf8");
        const { frontmatter, body } = parseFrontmatter(raw);
        const title = frontmatter.title || body.match(/^#\s+(.+)$/m)?.[1] || relativePath;
        const url = `${siteUrl.replace(/\/$/, "")}${base}${escapeDestination(relativePath)}`;
        const content = expandContent(raw, file, {
            docsRoot,
            apiIndex,
            glossaryIndex,
            resolveLink,
            renderDraft,
            dependencies,
        });
        const metadata = ["---", `url: ${JSON.stringify(url)}`, `title: ${JSON.stringify(title)}`];
        if (frontmatter.description) {
            metadata.push(`description: ${JSON.stringify(frontmatter.description)}`);
        }
        metadata.push("---", "", content.trim(), "");
        outputs.set(relativePath, metadata.join("\n"));
        index.push(`- [${escapeLabel(title)}](${url})`);
    }
    outputs.set("llms.txt", `${index.join("\n")}\n`);
    // Page URLs delimit the combined document and keep links meaningful outside their source page.
    outputs.set(
        "llms-full.txt",
        [...outputs.entries()]
            .filter(([name]) => name.endsWith(".md"))
            .map(([, content]) => content)
            .join("\n"),
    );
    const counts = await syncRenderedFiles(new Map([[outDir, outputs]]), { pruneRoots: [outDir] });
    return { outputs, dependencies: [...dependencies], ...counts };
}

export function markdownDiscoveryHead(relativePath, base) {
    if (!isPublishedMarkdown(relativePath)) {
        return [];
    }
    return [
        ["link", { rel: "alternate", type: "text/markdown", href: `${base}${escapeDestination(relativePath)}` }],
        ["link", { rel: "describedby", href: `${base}llms.txt` }],
    ];
}
