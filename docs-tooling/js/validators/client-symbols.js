/**
 * Validate that authored documentation names client symbols that exist.
 *
 * Two checks, both chosen because a wrong answer is unambiguous:
 *
 * - Every `@vueda/...` specifier resolves to a file under `client/lib`. A guide whose
 *   import does not resolve fails on the reader's first paste.
 * - Every `Widget*` name written as an inline code span or a Vue element names a real
 *   widget component. Every form widget in the library follows that prefix, so the check
 *   stays precise without guessing at PascalCase names that belong to Django or DRF.
 *
 * Both were live defects: `guides/build-auth-views.md` named `WidgetInput` 21 times,
 * including four imports of `@vueda/widgets/WidgetInput.vue`, where the component is
 * `WidgetTextInput`, and `guides/client-plugin-prerequisites.md` listed five more widget
 * names that never existed.
 *
 * Generated reference trees are skipped. Their content is rendered from the source this
 * check validates against, so a mismatch there is a renderer bug, not an authoring one.
 */
import fs from "node:fs";
import path from "node:path";

const GENERATED_TREES = ["/reference/api/", "/reference/theming/"];

/**
 * `Widget*` names that are not Vue components. The guides teach against an example model
 * named Widget, so its Django and DRF classes share the prefix by coincidence.
 */
const SERVER_CLASS_SUFFIX = /(?:Serializer|ViewSet|FilterSet|Admin)$/;

/** Exceptions no rule above covers, keyed by name, with the reason they are allowed. */
export const WIDGET_NAME_ALLOWLIST = {
    WidgetSegmentedRadio: "proposed component, named in a design note about work not yet done",
};

const WIDGET_NAME = /^Widget[A-Z]\w*$/;
const INLINE_CODE = /`([^`\n]+)`/g;
const VUE_ELEMENT = /<(Widget[A-Z]\w*)/g;
const VUEDA_SPECIFIER = /["']@vueda\/([^"'\n]+)["']/g;

/**
 * Index the component names under a client library directory.
 *
 * @param {string} clientLibDir - Absolute path to `client/lib`.
 * @returns {Set<string>} Every `.vue` file's base name.
 */
export const buildComponentIndex = (clientLibDir) => {
    const names = new Set();
    if (!clientLibDir || !fs.existsSync(clientLibDir)) {
        return names;
    }
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(entryPath);
            } else if (entry.name.endsWith(".vue")) {
                names.add(entry.name.slice(0, -".vue".length));
            }
        }
    };
    walk(clientLibDir);
    return names;
};

/**
 * Collect the client symbols one markdown file names.
 *
 * @param {string} content - The file's text.
 * @returns {{ type: "specifier"|"widget", value: string, line: number }[]}
 */
export const scanClientSymbols = (content) => {
    const found = [];
    const lines = content.split("\n");

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const at = lineIdx + 1;

        for (const match of line.matchAll(VUEDA_SPECIFIER)) {
            // A path written with a placeholder segment stands for a family of real
            // paths, so there is nothing to resolve.
            if (match[1].includes("<") || match[1].includes(">")) {
                continue;
            }
            found.push({ type: "specifier", value: match[1], line: at });
        }
        for (const match of line.matchAll(INLINE_CODE)) {
            if (WIDGET_NAME.test(match[1])) {
                found.push({ type: "widget", value: match[1], line: at });
            }
        }
        for (const match of line.matchAll(VUE_ELEMENT)) {
            found.push({ type: "widget", value: match[1], line: at });
        }
    }

    return found;
};

/**
 * Validate the client symbols named across the given files.
 *
 * @param {object} options
 * @param {string[]} options.files - Markdown files to scan.
 * @param {string} options.clientLibDir - Absolute path to `client/lib`.
 * @returns {{ errors: { file: string, line: number, message: string }[], componentCount: number, checkedFiles: number }}
 */
export const validateClientSymbols = ({ files, clientLibDir }) => {
    const components = buildComponentIndex(clientLibDir);
    const errors = [];
    let checkedFiles = 0;

    for (const filePath of files) {
        const posix = filePath.split(path.sep).join("/");
        if (GENERATED_TREES.some((tree) => posix.includes(tree)) || !fs.existsSync(filePath)) {
            continue;
        }
        checkedFiles += 1;
        const seen = new Set();

        for (const symbol of scanClientSymbols(fs.readFileSync(filePath, "utf-8"))) {
            // One report per name per file. A guide repeats a component across every
            // example, and twenty identical lines bury the other findings.
            const key = `${symbol.type}:${symbol.value}`;
            if (seen.has(key)) {
                continue;
            }

            if (symbol.type === "specifier") {
                if (!fs.existsSync(path.join(clientLibDir, symbol.value))) {
                    seen.add(key);
                    errors.push({
                        file: filePath,
                        line: symbol.line,
                        message: `Unresolved import "@vueda/${symbol.value}"`,
                    });
                }
                continue;
            }

            if (components.has(symbol.value) || SERVER_CLASS_SUFFIX.test(symbol.value)) {
                continue;
            }
            if (WIDGET_NAME_ALLOWLIST[symbol.value]) {
                continue;
            }
            seen.add(key);
            errors.push({
                file: filePath,
                line: symbol.line,
                message: `Unknown widget component "${symbol.value}"`,
            });
        }
    }

    return { errors, componentCount: components.size, checkedFiles };
};
