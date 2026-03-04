/**
 * Normalize vue-docgen-api JSON output into the canonical schema.
 */
import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";
import { getRepoRoot, normalizeSourceFile } from "../utils/source.js";
import fs from "node:fs";
import path from "node:path";

function toTypeRef(type) {
    if (!type) {
        return null;
    }
    if (typeof type === "string") {
        return { name: type };
    }
    if (typeof type === "object" && type.name) {
        return { name: type.name };
    }
    return { name: String(type) };
}

function propDefault(value) {
    if (!value) {
        return null;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "object" && "value" in value) {
        return String(value.value);
    }
    return String(value);
}

function componentId(displayName) {
    return `vue:component:${displayName}`;
}

function slotId(componentIdValue, slotName) {
    return `${componentIdValue}:slot:${slotName}`;
}

/**
 * Returns true if the slot name looks like a JS expression artifact from template
 * extraction (e.g., a property access chain or a camelCase identifier variable)
 * rather than a real kebab-case slot name.
 */
function isExpressionArtifactSlotName(name) {
    if (typeof name !== "string") return false;
    // Property access chains (e.g., "resolvedSlotNames.clearButton.name")
    if (name.includes(".")) return true;
    // camelCase variable names (e.g., "slotName", "fieldSlotName") -- has uppercase
    // but not at position 0. Bare lowercase words like "default", "title" are legitimate.
    if (/^[a-zA-Z$_][a-zA-Z0-9$_]*$/.test(name) && /[A-Z]/.test(name)) return true;
    // Generic loop variable used in pass-through slot forwarding patterns.
    return name === "slot";
}

/**
 * When vue-docgen encounters `<!-- @slot real-name Description text -->` immediately
 * before a `<slot :name="expression">` element, it attaches the comment text as the
 * slot's description. The canonical name is the first word of that description.
 *
 * If the slot has an expression-artifact name and its description starts with a
 * kebab-case token, return a new slot object with the extracted name and trimmed
 * description. Otherwise return the slot unchanged.
 */
function resolveSlotFromDescription(slot) {
    if (!isExpressionArtifactSlotName(slot.name) || !slot.description) {
        return slot;
    }
    const match = slot.description.match(/^([a-z][a-z0-9-]*)(?:\s+([\s\S]*))?$/);
    if (!match) return slot;
    return { ...slot, name: match[1], description: match[2] || undefined };
}

function eventId(componentIdValue, eventName) {
    return `${componentIdValue}:event:${eventName}`;
}

/**
 * Find the position of the matching closing bracket for the opening bracket at pos.
 * Handles string literals to avoid treating brackets inside strings as delimiters.
 */
function findBalancedEnd(source, pos, openChar, closeChar) {
    let depth = 0;
    let inString = false;
    let stringChar = null;
    for (let i = pos; i < source.length; i++) {
        const ch = source[i];
        if (inString) {
            if (ch === "\\") {
                i++;
                continue;
            }
            if (ch === stringChar) inString = false;
        } else if (ch === "/" && source[i + 1] === "*") {
            // Skip block comment (including JSDoc); apostrophes inside must not be treated as string delimiters.
            const end = source.indexOf("*/", i + 2);
            if (end === -1) return -1;
            i = end + 1;
        } else if (ch === "/" && source[i + 1] === "/") {
            // Skip line comment.
            const end = source.indexOf("\n", i + 2);
            i = end === -1 ? source.length : end;
        } else if (ch === '"' || ch === "'" || ch === "`") {
            inString = true;
            stringChar = ch;
        } else if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * Extract a `<script>` or `<script setup>` block from a Vue SFC source.
 * For plain JS files (no `<script` tag in source), returns the entire source.
 *
 * @param {string} source - Full file source
 * @param {boolean} isSetup - If true, extract the `<script setup>` block; otherwise the non-setup `<script>` block
 * @returns {string}
 */
export function extractScriptBlock(source, isSetup = false) {
    if (!source.includes("<script")) return source;

    if (isSetup) {
        const match = /<script\b[^>]*\bsetup\b[^>]*>/i.exec(source);
        if (!match) return "";
        const start = match.index + match[0].length;
        const end = source.indexOf("</script>", start);
        return end === -1 ? source.slice(start) : source.slice(start, end);
    }

    // Non-setup: find first <script> tag without a 'setup' attribute
    const re = /<script(\b[^>]*)?\s*>/gi;
    let m;
    while ((m = re.exec(source)) !== null) {
        if (!/\bsetup\b/.test(m[1] || "")) {
            const start = m.index + m[0].length;
            const end = source.indexOf("</script>", start);
            return end === -1 ? source.slice(start) : source.slice(start, end);
        }
    }
    return "";
}

/**
 * Find all spread identifier names inside a `defineProps({})` or `defineEmits([])` call.
 *
 * @param {string} source - Script block source
 * @param {string} callName - e.g. `"defineProps"` or `"defineEmits"`
 * @param {string} openChar - `"{"` for props, `"["` for emits
 * @param {string} closeChar - `"}"` for props, `"]"` for emits
 * @returns {string[]} Identifier names found as `...IDENTIFIER` spreads
 */
export function findSpreadIdentifiersInCall(source, callName, openChar, closeChar) {
    const re = new RegExp(`\\b${callName}\\s*\\(`);
    const m = re.exec(source);
    if (!m) return [];

    let pos = m.index + m[0].length;
    while (pos < source.length && source[pos] !== openChar && source[pos] !== ")") pos++;
    if (pos >= source.length || source[pos] === ")") return [];

    const end = findBalancedEnd(source, pos, openChar, closeChar);
    if (end === -1) return [];

    const content = source.slice(pos + 1, end);
    const ids = [];
    const spreadRe = /\.\.\.([\w$]+)/g;
    let sm;
    while ((sm = spreadRe.exec(content)) !== null) ids.push(sm[1]);
    return ids;
}

/**
 * Find named import metadata for a local identifier in source.
 * Handles `import { A, B as C } from 'path'` patterns.
 *
 * @param {string} source
 * @param {string} identifier
 * @returns {{ importPath: string, importedName: string, localName: string }|null}
 */
export function findImportPath(source, identifier) {
    const re = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const specifiers = m[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        for (const specifier of specifiers) {
            const normalized = specifier.replace(/^\s*type\s+/, "").trim();
            const parts = normalized.split(/\s+as\s+/i).map((part) => part.trim());
            const importedName = parts[0];
            const localName = parts[1] || importedName;
            if (localName === identifier) {
                return {
                    importPath: m[2],
                    importedName,
                    localName,
                };
            }
        }
    }
    return null;
}

/**
 * Map a `@vueda/` import path to an absolute filesystem path.
 * Returns null for non-`@vueda/` paths.
 *
 * @param {string} importPath
 * @param {string} repoRoot
 * @returns {string|null}
 */
export function resolveVuedaPath(importPath, repoRoot) {
    if (!importPath.startsWith("@vueda/")) return null;
    return path.join(repoRoot, "client", "lib", importPath.slice("@vueda/".length));
}

/**
 * Parse a single prop entry value object and return a Member node.
 *
 * @param {string} name - Prop key name
 * @param {string|undefined} jsdoc - JSDoc description preceding the key
 * @param {string} valContent - Content between the value's `{` and `}`
 * @returns {object} Member node (compact applied)
 */
function parsePropEntry(name, jsdoc, valContent) {
    // Extract type: handles both plain types (String) and array types ([String, Number])
    const typeMatch = /\btype\s*:\s*(\[[\s\S]*?\]|[^,\n}]+)/.exec(valContent);
    let typeRef;
    if (typeMatch) {
        const typeStr = typeMatch[1].trim().replace(/,\s*$/, "");
        if (typeStr.startsWith("[") && typeStr.endsWith("]")) {
            const inner = typeStr.slice(1, -1);
            typeRef = {
                name: inner
                    .split(",")
                    .map((t) => t.trim())
                    .join("|"),
            };
        } else {
            typeRef = { name: typeStr };
        }
    }

    const requiredMatch = /\brequired\s*:\s*(true|false)/.exec(valContent);
    const required = requiredMatch ? requiredMatch[1] === "true" : undefined;

    const defaultMatch = /\bdefault\s*:\s*(.+)/.exec(valContent);
    const defaultVal = defaultMatch ? defaultMatch[1].trim().replace(/,\s*$/, "") : undefined;

    return compact({
        name,
        kind: "prop",
        description: jsdoc || undefined,
        type: typeRef,
        required,
        default: defaultVal,
    });
}

/**
 * Parse prop entries from the content between the outer `{` and `}` of a props object.
 *
 * @param {string} objContent - Content between the outer braces (not including them)
 * @param {Function|null} nestedResolver - Called with an identifier name; returns an entries array or null
 * @returns {object[]} Array of Member nodes
 */
function parsePropsEntries(objContent, nestedResolver = null) {
    const entries = [];
    let i = 0;
    let pendingJsdoc;

    while (i < objContent.length) {
        const ch = objContent[i];

        // Whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Single-line comment
        if (ch === "/" && objContent[i + 1] === "/") {
            while (i < objContent.length && objContent[i] !== "\n") i++;
            continue;
        }

        // Block comment (JSDoc or plain)
        if (ch === "/" && objContent[i + 1] === "*") {
            const isJsdoc = objContent[i + 2] === "*";
            const end = objContent.indexOf("*/", i + 2);
            if (end === -1) break;
            if (isJsdoc) {
                pendingJsdoc =
                    objContent
                        .slice(i + 3, end)
                        .replace(/^\s*\*\s?/gm, "")
                        .trim() || undefined;
            }
            i = end + 2;
            continue;
        }

        // Nested spread: ...IDENTIFIER
        if (ch === "." && objContent[i + 1] === "." && objContent[i + 2] === ".") {
            i += 3;
            const idMatch = /^([\w$]+)/.exec(objContent.slice(i));
            if (idMatch) {
                i += idMatch[1].length;
                if (nestedResolver) {
                    const nestedEntries = nestedResolver(idMatch[1]);
                    if (nestedEntries) entries.push(...nestedEntries);
                }
            }
            pendingJsdoc = undefined;
            continue;
        }

        // Prop key: identifier: { ... }
        const keyMatch = /^([\w$]+)\s*:\s*/.exec(objContent.slice(i));
        if (keyMatch) {
            const keyName = keyMatch[1];
            const jsdoc = pendingJsdoc;
            pendingJsdoc = undefined;
            i += keyMatch[0].length;

            if (i < objContent.length && objContent[i] === "{") {
                const valEnd = findBalancedEnd(objContent, i, "{", "}");
                if (valEnd !== -1) {
                    const valContent = objContent.slice(i + 1, valEnd);
                    i = valEnd + 1;
                    entries.push(parsePropEntry(keyName, jsdoc, valContent));
                    continue;
                }
            }
            continue;
        }

        // Trailing comma or other punctuation
        if (ch === ",") {
            i++;
            continue;
        }
        i++;
    }

    return entries;
}

/**
 * Parse emit entries from the content between the outer `[` and `]` of an emits array.
 *
 * @param {string} arrContent - Content between the outer brackets (not including them)
 * @returns {object[]} Array of partial event nodes (name, kind, description)
 */
function parseEmitsEntries(arrContent) {
    const entries = [];
    let i = 0;
    let pendingJsdoc;

    while (i < arrContent.length) {
        const ch = arrContent[i];

        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        if (ch === "/" && arrContent[i + 1] === "/") {
            while (i < arrContent.length && arrContent[i] !== "\n") i++;
            continue;
        }

        if (ch === "/" && arrContent[i + 1] === "*") {
            const isJsdoc = arrContent[i + 2] === "*";
            const end = arrContent.indexOf("*/", i + 2);
            if (end === -1) break;
            if (isJsdoc) {
                pendingJsdoc =
                    arrContent
                        .slice(i + 3, end)
                        .replace(/^\s*\*\s?/gm, "")
                        .trim() || undefined;
            }
            i = end + 2;
            continue;
        }

        // String literal (emit name)
        if (ch === '"' || ch === "'") {
            const q = ch;
            let j = i + 1;
            while (j < arrContent.length && arrContent[j] !== q) {
                if (arrContent[j] === "\\") j++;
                j++;
            }
            const emitName = arrContent.slice(i + 1, j);
            entries.push(compact({ name: emitName, kind: "event", description: pendingJsdoc }));
            pendingJsdoc = undefined;
            i = j + 1;
            continue;
        }

        if (ch === ",") {
            i++;
            continue;
        }
        i++;
    }

    return entries;
}

/**
 * Parse a spread constant from source, checking for `@vueda-spread` annotation.
 *
 * @param {string} source - Source code to search in
 * @param {string} identifier - Name of the exported constant to find
 * @param {Function|null} nestedResolver - Called with an identifier name for nested spreads; returns entries array or null
 * @returns {{ kind: 'props'|'emits', entries: Array }|null}
 */
export function parseSpreadConstant(source, identifier, nestedResolver = null) {
    // Find the export declaration position first.
    const exportPattern = new RegExp(`export\\s+const\\s+${identifier}\\s*=\\s*`);
    const exportMatch = exportPattern.exec(source);
    if (!exportMatch) return null;

    // Find the last complete /** ... */ block before the export declaration.
    const before = source.slice(0, exportMatch.index);
    const allJsdocs = [...before.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
    const lastJsdoc = allJsdocs.at(-1);
    if (!lastJsdoc) return null;
    // Require only whitespace between the JSDoc close and the export declaration.
    const gap = before.slice(lastJsdoc.index + lastJsdoc[0].length);
    if (/\S/.test(gap)) return null;

    const jsdoc = lastJsdoc[0];
    const kindMatch = jsdoc.match(/@vueda-spread\s+(props|emits)/);
    if (!kindMatch) return null;

    const kind = kindMatch[1];
    const valueStart = exportMatch.index + exportMatch[0].length;

    if (kind === "props") {
        if (source[valueStart] !== "{") return null;
        const closePos = findBalancedEnd(source, valueStart, "{", "}");
        if (closePos === -1) return null;
        const entries = parsePropsEntries(source.slice(valueStart + 1, closePos), nestedResolver);
        return { kind, entries };
    }

    if (kind === "emits") {
        if (source[valueStart] !== "[") return null;
        const closePos = findBalancedEnd(source, valueStart, "[", "]");
        if (closePos === -1) return null;
        const entries = parseEmitsEntries(source.slice(valueStart + 1, closePos));
        return { kind, entries };
    }

    return null;
}

const defaultRepoRoot = getRepoRoot();

export class VueDocgenNormalizer extends Normalizer {
    /**
     * @param {object} [options]
     * @param {(filePath: string) => string} [options.fileResolver] - Override for reading file contents (useful in tests)
     * @param {string} [options.repoRoot] - Override for the repository root path (useful in tests)
     */
    constructor({ fileResolver, repoRoot } = {}) {
        super();
        this._readFile = fileResolver ?? ((p) => fs.readFileSync(p, "utf-8"));
        this._repoRoot = repoRoot ?? defaultRepoRoot;
    }

    normalize(payload) {
        if (!payload || !Array.isArray(payload.files)) {
            throw new Error("Invalid vue-docgen payload");
        }

        const nodes = [];
        const roots = [];

        for (const file of payload.files) {
            const filePath = file.filePath;
            for (const component of file.components || []) {
                const displayName =
                    component.displayName || component.exportName || path.basename(filePath, path.extname(filePath));
                const id = componentId(displayName);

                const sourceFile = normalizeSourceFile(filePath, this._repoRoot);
                const node = compact({
                    id,
                    kind: "component",
                    name: displayName,
                    description: component.description || undefined,
                    members: [],
                    children: [],
                    source: sourceFile ? { file: sourceFile } : undefined,
                    extensions: {
                        vueDocgen: {
                            exportName: component.exportName,
                            tags: component.tags || undefined,
                            sourceFiles: component.sourceFiles || undefined,
                        },
                    },
                });

                // Resolve spread props/emits from source annotations
                const { propEntries: spreadPropEntries, emitEntries: spreadEmitEntries } =
                    this._resolveComponentSpreads(filePath);

                // Build inline prop members
                const inlinePropMembers = [];
                for (const prop of component.props || []) {
                    const typeRef = toTypeRef(prop.type);
                    inlinePropMembers.push(
                        compact({
                            name: prop.name,
                            kind: "prop",
                            description: prop.description || undefined,
                            type: typeRef || undefined,
                            required: prop.required ?? undefined,
                            default: propDefault(prop.defaultValue) || undefined,
                            readonly: undefined,
                        }),
                    );
                }

                // Spread props precede inline props (declaration order)
                node.members.push(...spreadPropEntries, ...inlinePropMembers);

                // Spread event nodes precede inline event nodes in children
                for (const entry of spreadEmitEntries) {
                    const eventNodeId = eventId(id, entry.name);
                    const eventNode = compact({
                        id: eventNodeId,
                        kind: "event",
                        name: entry.name,
                        description: entry.description || undefined,
                        source: sourceFile ? { file: sourceFile } : undefined,
                        extensions: { vueDocgen: { fromSpread: true } },
                    });
                    node.children.push(eventNodeId);
                    nodes.push(eventNode);
                }

                // When vue-docgen sees `<!-- @slot real-name Description -->` before a
                // dynamic-name <slot>, it attaches the comment as the slot's description.
                // Resolve the real name from the description, then suppress remaining
                // expression artifacts if any resolved slots are present.
                const resolvedSlots = (component.slots || []).map(resolveSlotFromDescription);
                const hasResolvedSlots = resolvedSlots.some((s) => !isExpressionArtifactSlotName(s.name));
                const slotsToRender = hasResolvedSlots
                    ? resolvedSlots.filter((s) => !isExpressionArtifactSlotName(s.name))
                    : resolvedSlots;

                for (const slot of slotsToRender) {
                    const slotNodeId = slotId(id, slot.name);
                    const slotNode = compact({
                        id: slotNodeId,
                        kind: "slot",
                        name: slot.name,
                        description: slot.description || undefined,
                        signatures: [
                            compact({
                                label: slot.scoped ? "scoped" : "slot",
                                parameters: (slot.bindings || []).map((binding) => ({
                                    name: binding.name,
                                })),
                            }),
                        ],
                        source: sourceFile ? { file: sourceFile } : undefined,
                        extensions: {
                            vueDocgen: {
                                scoped: slot.scoped,
                                bindings: slot.bindings || [],
                            },
                        },
                    });
                    node.children.push(slotNodeId);
                    nodes.push(slotNode);
                }

                for (const event of component.events || []) {
                    const eventNodeId = eventId(id, event.name);
                    const eventNode = compact({
                        id: eventNodeId,
                        kind: "event",
                        name: event.name,
                        description: event.description || undefined,
                        source: sourceFile ? { file: sourceFile } : undefined,
                        extensions: { vueDocgen: { ...event } },
                    });
                    node.children.push(eventNodeId);
                    nodes.push(eventNode);
                }

                nodes.push(node);
                roots.push(id);
            }
        }

        return {
            schemaVersion: "1.0",
            source: "vue-docgen",
            meta: {
                title: "Vue Components",
                sourcePath: payload.sourceDir,
            },
            nodes,
            roots,
        };
    }

    /**
     * Resolve spread props and emits for a component by reading its source file.
     *
     * @param {string} filePath - Component file path (absolute or relative to repoRoot)
     * @returns {{ propEntries: object[], emitEntries: object[] }}
     */
    _resolveComponentSpreads(filePath) {
        const empty = { propEntries: [], emitEntries: [] };
        if (!filePath) return empty;

        let componentSource;
        try {
            const abs = path.isAbsolute(filePath) ? filePath : path.resolve(this._repoRoot, filePath);
            componentSource = this._readFile(abs);
        } catch {
            return empty;
        }

        const setupSource = extractScriptBlock(componentSource, true);
        if (!setupSource) return empty;

        const propSpreadIds = findSpreadIdentifiersInCall(setupSource, "defineProps", "{", "}");
        const emitSpreadIds = findSpreadIdentifiersInCall(setupSource, "defineEmits", "[", "]");

        const propEntries = [];
        const emitEntries = [];

        const absFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(this._repoRoot, filePath);

        for (const identifier of propSpreadIds) {
            const result = this._resolveSpreadIdentifier(identifier, absFilePath, componentSource);
            if (result?.kind === "props") propEntries.push(...result.entries);
        }

        for (const identifier of emitSpreadIds) {
            const result = this._resolveSpreadIdentifier(identifier, absFilePath, componentSource);
            if (result?.kind === "emits") emitEntries.push(...result.entries);
        }

        return { propEntries, emitEntries };
    }

    /**
     * Resolve a single spread identifier to its constant definition.
     *
     * @param {string} identifier - Constant name (e.g. `FIELD_PROPS`)
     * @param {string} componentAbsPath - Absolute path of the component file
     * @param {string} componentFullSource - Full source of the component file
     * @returns {{ kind: string, entries: object[] }|null}
     */
    _resolveSpreadIdentifier(identifier, componentAbsPath, componentFullSource) {
        const importMatch = findImportPath(componentFullSource, identifier);

        let constantSource;
        let constantAbsPath;
        let constantIdentifier = identifier;

        if (importMatch) {
            if (!importMatch.importPath.startsWith("@vueda/")) return null;
            constantAbsPath = resolveVuedaPath(importMatch.importPath, this._repoRoot);
            constantIdentifier = importMatch.importedName;
            try {
                constantSource = this._readFile(constantAbsPath);
            } catch {
                return null;
            }
        } else {
            // Defined in the same file (e.g. WIDGET_LABEL_PROPS in WidgetLabel.vue)
            constantAbsPath = componentAbsPath;
            constantSource = componentFullSource;
        }

        const isVue = constantAbsPath.endsWith(".vue");
        const parseSource = isVue ? extractScriptBlock(constantSource, false) : constantSource;

        const nestedResolver = (nestedId) => {
            return this._resolveNestedSpread(nestedId, constantAbsPath, constantSource);
        };

        return parseSpreadConstant(parseSource, constantIdentifier, nestedResolver);
    }

    /**
     * Resolve a one-level-deep nested spread (e.g. `...FORM_HIDDEN_FEEDBACK_PROPS` inside `WIDGET_LABEL_PROPS`).
     *
     * @param {string} identifier
     * @param {string} parentAbsPath - Absolute path of the file containing the parent constant
     * @param {string} parentFullSource - Full source of that file
     * @returns {object[]|null}
     */
    _resolveNestedSpread(identifier, parentAbsPath, parentFullSource) {
        const importMatch = findImportPath(parentFullSource, identifier);

        let constantSource;
        let constantAbsPath;
        let constantIdentifier = identifier;

        if (importMatch) {
            if (!importMatch.importPath.startsWith("@vueda/")) return null;
            constantAbsPath = resolveVuedaPath(importMatch.importPath, this._repoRoot);
            constantIdentifier = importMatch.importedName;
            try {
                constantSource = this._readFile(constantAbsPath);
            } catch {
                return null;
            }
        } else {
            constantAbsPath = parentAbsPath;
            constantSource = parentFullSource;
        }

        const isVue = constantAbsPath.endsWith(".vue");
        const parseSource = isVue ? extractScriptBlock(constantSource, false) : constantSource;

        // No further nesting (one level deep only)
        const result = parseSpreadConstant(parseSource, constantIdentifier, null);
        return result ? result.entries : null;
    }
}
