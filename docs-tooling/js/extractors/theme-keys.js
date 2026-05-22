/**
 * Theme keys extraction.
 *
 * Parses every `client/lib/theme/vueda-tailwind/<family>/index.js` file with
 * @babel/parser and produces a raw JSON payload describing every slot defined
 * across the family default exports.
 *
 * Each emitted entry corresponds to one slot of one component (or composition
 * primitive) and records:
 *   - family (directory name), component (top-level key), slot (nested key)
 *   - kind: "key" | "primitive" (primitive = underscore-prefixed component name)
 *   - valueShape: "static" | "callback" (callback when the slot value is a
 *     callback expression, or when the inner `class:` value is a callback)
 *   - staticClass: flattened array of class strings, with nested callbacks
 *     inside arrays represented by the marker string "callback"
 *   - callbackSource: raw source slice of the callback expression
 *   - composes: array of "Target.slot" references
 *   - description: JSDoc text on the slot key, falling back to the component
 *     key's JSDoc when the slot has none
 *   - group: most recent banner-style line comment above the component
 *   - source: { file, line, column }
 */
import { Extractor } from "../core.js";
import { parse as babelParse } from "@babel/parser";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FAMILY_DIRS = [
    "controls",
    "grid",
    "objects-grid",
    "form",
    "widgets",
    "shell",
    "views",
    "navigation",
    "display",
    "feedback",
];

function defaultSources() {
    return FAMILY_DIRS.map((dir) => `client/lib/theme/vueda-tailwind/${dir}/index.js`);
}

function literalKeyName(key) {
    if (!key) return null;
    if (key.type === "Identifier") return key.name;
    if (key.type === "StringLiteral") return key.value;
    if (key.type === "Literal" && typeof key.value === "string") return key.value;
    return null;
}

function isCallbackNode(node) {
    return node && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression");
}

function bannerText(commentValue) {
    const match = (commentValue || "").match(/-{3,}\s*(.+?)\s*-{3,}/);
    return match ? match[1].trim() : null;
}

function extractJsDocText(comment) {
    if (!comment || comment.type !== "CommentBlock") return null;
    const raw = comment.value || "";
    if (!raw.startsWith("*")) return null;
    const lines = raw
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, "").replace(/\s+$/, ""))
        .filter((line, idx, arr) => !(idx === 0 && line === "") && !(idx === arr.length - 1 && line === ""));
    return lines.join("\n").trim() || null;
}

function pickJsDocComment(comments) {
    if (!comments || comments.length === 0) return null;
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];
        if (c.type === "CommentBlock" && (c.value || "").startsWith("*")) {
            return c;
        }
    }
    return null;
}

function pickBannerFromComments(comments) {
    if (!comments || comments.length === 0) return null;
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];
        if (c.type !== "CommentLine") continue;
        const banner = bannerText(c.value);
        if (banner) return banner;
    }
    return null;
}

function sourceSlice(source, node) {
    if (!node || typeof node.start !== "number" || typeof node.end !== "number") return null;
    return source.slice(node.start, node.end);
}

function locOf(node, sourceFile) {
    const start = node?.loc?.start || { line: 0, column: 0 };
    return { file: sourceFile, line: start.line, column: start.column };
}

/**
 * Flatten an `ArrayExpression` (or any class node) into a list of class strings.
 * Object expressions contribute their string keys. Callbacks contribute the
 * marker "callback". Templates without expressions contribute their cooked
 * text. Unknown nodes are skipped.
 */
function flattenClassNode(node, sink) {
    if (!node) return;
    switch (node.type) {
        case "StringLiteral":
            sink.push(node.value);
            return;
        case "Literal":
            if (typeof node.value === "string") sink.push(node.value);
            return;
        case "TemplateLiteral":
            if (node.expressions.length === 0) {
                sink.push(node.quasis.map((q) => q.value.cooked).join(""));
            }
            return;
        case "ArrayExpression":
            for (const el of node.elements) flattenClassNode(el, sink);
            return;
        case "ObjectExpression":
            for (const prop of node.properties) {
                if (prop.type !== "ObjectProperty" && prop.type !== "Property") continue;
                if (prop.computed) continue;
                const name = literalKeyName(prop.key);
                if (name !== null && name !== undefined) {
                    sink.push(name);
                }
            }
            return;
        case "ArrowFunctionExpression":
        case "FunctionExpression":
            sink.push("callback");
            return;
        default:
            console.warn(`theme-keys: skipping unknown class node type "${node.type}"`);
    }
}

function extractComposes(arrayExpr) {
    if (!arrayExpr || arrayExpr.type !== "ArrayExpression") return [];
    const out = [];
    for (const el of arrayExpr.elements) {
        if (!el) continue;
        if (el.type === "StringLiteral") {
            out.push(el.value);
        } else if (el.type === "Literal" && typeof el.value === "string") {
            out.push(el.value);
        } else if (el.type === "TemplateLiteral" && el.expressions.length === 0) {
            out.push(el.quasis.map((q) => q.value.cooked).join(""));
        }
    }
    return out;
}

/**
 * Parse a slot value (the right-hand side of a slot key like `root: ...`).
 * Returns { valueShape, staticClass, callbackSource, composes }.
 */
function parseSlotValue(valueNode, source) {
    if (isCallbackNode(valueNode)) {
        return {
            valueShape: "callback",
            staticClass: null,
            callbackSource: sourceSlice(source, valueNode),
            composes: [],
        };
    }
    if (!valueNode || valueNode.type !== "ObjectExpression") {
        return { valueShape: "static", staticClass: null, callbackSource: null, composes: [] };
    }

    let classNode = null;
    let composesNode = null;
    for (const prop of valueNode.properties) {
        if (prop.type !== "ObjectProperty" && prop.type !== "Property") continue;
        const name = literalKeyName(prop.key);
        if (name === "class") classNode = prop.value;
        else if (name === "composes") composesNode = prop.value;
    }

    const composes = extractComposes(composesNode);

    if (isCallbackNode(classNode)) {
        return {
            valueShape: "callback",
            staticClass: null,
            callbackSource: sourceSlice(source, classNode),
            composes,
        };
    }

    const staticClass = [];
    flattenClassNode(classNode, staticClass);
    return {
        valueShape: "static",
        staticClass,
        callbackSource: null,
        composes,
    };
}

function findDefaultExportObject(ast) {
    for (const node of ast.program.body) {
        if (node.type === "ExportDefaultDeclaration") {
            if (node.declaration && node.declaration.type === "ObjectExpression") {
                return node.declaration;
            }
        }
    }
    return null;
}

function familyFromSourceRel(sourceRel) {
    // Expect a path like client/lib/theme/vueda-tailwind/<family>/index.js
    const parts = sourceRel.split("/");
    const idx = parts.indexOf("vueda-tailwind");
    if (idx >= 0 && idx + 1 < parts.length - 1) {
        return parts[idx + 1];
    }
    // Fallback to the parent directory name when the layout differs (tests).
    return parts.length >= 2 ? parts[parts.length - 2] : "";
}

function extractEntriesFromAst(ast, source, sourceRel, family) {
    const obj = findDefaultExportObject(ast);
    const entries = [];
    if (!obj) return entries;

    let currentGroup = null;

    for (const prop of obj.properties) {
        // Each iteration represents one top-level component key.
        if (prop.type !== "ObjectProperty" && prop.type !== "Property") {
            continue;
        }

        // Walk this property's leading comments to refresh the group banner.
        const leading = prop.leadingComments || [];
        const refreshed = pickBannerFromComments(leading);
        if (refreshed) currentGroup = refreshed;
        const componentDescription = extractJsDocText(pickJsDocComment(leading));

        const componentName = literalKeyName(prop.key);
        if (!componentName) continue;
        const kind = componentName.startsWith("_") ? "primitive" : "key";

        const valueNode = prop.value;
        if (!valueNode || valueNode.type !== "ObjectExpression") {
            continue;
        }

        for (const slotProp of valueNode.properties) {
            if (slotProp.type !== "ObjectProperty" && slotProp.type !== "Property") continue;
            const slotName = literalKeyName(slotProp.key);
            if (!slotName) continue;

            const slotLeading = slotProp.leadingComments || [];
            const slotDescription = extractJsDocText(pickJsDocComment(slotLeading));

            const parsed = parseSlotValue(slotProp.value, source);

            entries.push({
                family,
                component: componentName,
                slot: slotName,
                kind,
                valueShape: parsed.valueShape,
                staticClass: parsed.staticClass,
                callbackSource: parsed.callbackSource,
                composes: parsed.composes,
                description: slotDescription || componentDescription || null,
                group: currentGroup,
                source: locOf(slotProp, sourceRel),
            });
        }
    }
    return entries;
}

export async function extractThemeKeysPayload({ sources, repoRoot } = {}) {
    const resolvedRoot = repoRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const sourceList = sources && sources.length ? sources : defaultSources();
    const allEntries = [];
    const sourceFiles = [];

    for (const src of sourceList) {
        const resolvedSource = path.isAbsolute(src) ? src : path.join(resolvedRoot, src);
        const sourceRel = path.relative(resolvedRoot, resolvedSource).split(path.sep).join("/");
        sourceFiles.push(sourceRel);

        const code = await readFile(resolvedSource, "utf-8");
        const ast = babelParse(code, {
            sourceType: "module",
            attachComment: true,
            tokens: false,
        });
        const family = familyFromSourceRel(sourceRel);
        const entries = extractEntriesFromAst(ast, code, sourceRel, family);
        allEntries.push(...entries);
    }

    return { sources: sourceFiles, entries: allEntries };
}

export class ThemeKeysExtractor extends Extractor {
    async extract({ outputPath, sources } = {}) {
        if (!outputPath) {
            throw new Error("outputPath is required");
        }
        const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
        const resolvedOutput = path.isAbsolute(outputPath) ? outputPath : path.join(repoRoot, outputPath);

        const payload = await extractThemeKeysPayload({ sources, repoRoot });

        await mkdir(path.dirname(resolvedOutput), { recursive: true });
        await writeFile(resolvedOutput, JSON.stringify(payload, null, 2));

        return { outputPath: resolvedOutput };
    }
}
