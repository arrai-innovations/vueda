/**
 * Theme keys extraction (structural only, no descriptions).
 *
 * Walks the default-export ObjectExpression of each vueda-tailwind theme
 * source file and produces a raw JSON payload describing every theme entry,
 * its slots, statically-resolved `composes` references, and class arrays.
 *
 * The extractor does not evaluate imports or spread elements in the top-level
 * theme index, so category files must be listed explicitly.
 *
 * Function-form slots are flagged but not enumerated (variant-driven).
 */
import { Extractor } from "../core.js";
import * as acorn from "acorn";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCES = [
    "client/lib/theme/vueda-tailwind/controls/index.js",
    "client/lib/theme/vueda-tailwind/grid/index.js",
    "client/lib/theme/vueda-tailwind/objects-grid/index.js",
    "client/lib/theme/vueda-tailwind/form/index.js",
    "client/lib/theme/vueda-tailwind/navigation/index.js",
    "client/lib/theme/vueda-tailwind/shell/index.js",
    "client/lib/theme/vueda-tailwind/widgets/index.js",
    "client/lib/theme/vueda-tailwind/views/index.js",
    "client/lib/theme/vueda-tailwind/display/index.js",
    "client/lib/theme/vueda-tailwind/feedback/index.js",
    "client/lib/theme/vueda-tailwind/index.js",
];

function literalKeyName(key) {
    if (!key) return null;
    if (key.type === "Identifier") return key.name;
    if (key.type === "Literal" && typeof key.value === "string") return key.value;
    return null;
}

function collectStringLiterals(node, out) {
    if (!node) return;
    if (node.type === "Literal" && typeof node.value === "string") {
        out.push(node.value);
        return;
    }
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
        out.push(node.quasis.map((q) => q.value.cooked).join(""));
        return;
    }
    if (node.type === "ArrayExpression") {
        for (const el of node.elements) collectStringLiterals(el, out);
    }
    // Object/conditional class shapes are not statically captured here.
}

function extractComposes(arrayExpr) {
    if (!arrayExpr || arrayExpr.type !== "ArrayExpression") return [];
    const out = [];
    for (const el of arrayExpr.elements) {
        if (el && el.type === "Literal" && typeof el.value === "string") {
            out.push(el.value);
        }
        // Non-literal entries (like the dynamic `variantKey` template) are skipped;
        // their containing slot will already have shape === "function" in that case.
    }
    return out;
}

function parseSlotValue(slotValueNode) {
    if (
        slotValueNode &&
        (slotValueNode.type === "ArrowFunctionExpression" || slotValueNode.type === "FunctionExpression")
    ) {
        return { shape: "function", composes: [], rawClasses: [] };
    }
    if (!slotValueNode || slotValueNode.type !== "ObjectExpression") {
        return { shape: "unknown", composes: [], rawClasses: [] };
    }
    let composes = [];
    const rawClasses = [];
    for (const prop of slotValueNode.properties) {
        if (prop.type !== "Property") continue;
        const name = literalKeyName(prop.key);
        if (name === "composes") {
            composes = extractComposes(prop.value);
        } else if (name === "class") {
            collectStringLiterals(prop.value, rawClasses);
        }
    }
    return { shape: "object", composes, rawClasses };
}

function findDefaultExportObject(ast) {
    for (const node of ast.body) {
        if (node.type === "ExportDefaultDeclaration") {
            if (node.declaration && node.declaration.type === "ObjectExpression") {
                return node.declaration;
            }
        }
    }
    return null;
}

function extractEntriesFromAst(ast, sourceRel) {
    const obj = findDefaultExportObject(ast);
    const entries = [];
    if (!obj) return entries;

    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const name = literalKeyName(prop.key);
        if (!name) continue;
        const isMetaKey = name.startsWith("_");
        const entryLine = prop.loc?.start?.line || 0;

        const slots = [];
        const valueNode = prop.value;
        if (valueNode && valueNode.type === "ObjectExpression") {
            for (const slotProp of valueNode.properties) {
                if (slotProp.type !== "Property") continue;
                const slotName = literalKeyName(slotProp.key);
                if (!slotName) continue;
                const slotLine = slotProp.loc?.start?.line || 0;
                const parsed = parseSlotValue(slotProp.value);
                slots.push({
                    name: slotName,
                    shape: parsed.shape,
                    composes: parsed.composes,
                    rawClasses: parsed.rawClasses,
                    source: { file: sourceRel, line: slotLine },
                });
            }
        }

        entries.push({
            name,
            isMetaKey,
            description: null,
            source: { file: sourceRel, line: entryLine },
            slots,
        });
    }
    return entries;
}

export async function extractThemeKeysPayload({ sources = DEFAULT_SOURCES, repoRoot } = {}) {
    const root = repoRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const allEntries = [];
    const sourceFiles = [];
    for (const src of sources) {
        const resolvedSource = path.isAbsolute(src) ? src : path.join(root, src);
        const sourceRel = path.relative(root, resolvedSource).split(path.sep).join("/");
        sourceFiles.push(sourceRel);

        const code = await readFile(resolvedSource, "utf-8");
        const ast = acorn.parse(code, {
            ecmaVersion: "latest",
            sourceType: "module",
            locations: true,
        });
        const entries = extractEntriesFromAst(ast, sourceRel);
        allEntries.push(...entries);
    }
    return { sourceFiles, entries: allEntries };
}

export class ThemeKeysExtractor extends Extractor {
    async extract({ outputPath, sources = DEFAULT_SOURCES } = {}) {
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
