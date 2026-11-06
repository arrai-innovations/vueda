/**
 * Replaces the long utility class strings in rendered snapshots with short
 * named classes, and writes the `@apply` rules that define those names.
 *
 * A class token counts as a utility when the compiled kit stylesheet has a rule
 * for it inside `@layer utilities`. Every other token (`group`, `peer`,
 * `drag-handle`, Font Awesome's and CodeMirror's classes) stays on the element,
 * because `@apply` accepts only utilities and scripts or selectors may depend
 * on the others.
 */

/** A utility string shorter than this stays on the element as written. */
const MIN_HOISTED_LENGTH = 40;

/** Element attributes whose values make a named class easier to recognize. */
const NAME_ATTRIBUTES = ["data-tone", "data-emphasis", "data-size", "data-variant"];

/**
 * Return the body of the first `@layer <name> { ... }` block in `css`.
 *
 * @param {string} css
 * @param {string} name
 * @returns {string}
 */
function layerBody(css, name) {
    const start = css.search(new RegExp(`@layer ${name}\\s*\\{`));
    if (start === -1) {
        throw new Error(`The kit stylesheet has no @layer ${name} block.`);
    }
    const open = css.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
        if (css[i] === "{") {
            depth++;
        } else if (css[i] === "}") {
            depth--;
            if (depth === 0) {
                return css.slice(open + 1, i);
            }
        }
    }
    throw new Error(`The kit stylesheet's @layer ${name} block is not closed.`);
}

/**
 * Undo CSS identifier escaping: `\:` becomes `:` and `\32 ` becomes `2`.
 *
 * @param {string} escaped
 * @returns {string}
 */
function unescapeIdentifier(escaped) {
    return escaped.replace(/\\([0-9a-fA-F]{1,6}) ?|\\(.)/g, (_match, hex, char) =>
        hex ? String.fromCodePoint(parseInt(hex, 16)) : char,
    );
}

// Classes that variants select on an ancestor, so they appear in utility
// selectors without being utilities: `group` and `peer` markers (optionally
// named, as in `group/input-group`) and the `dark` theme class.
const VARIANT_MARKER = /^(group|peer)(\/.+)?$|^dark$/;

/**
 * Collect every class name that a rule in the utilities layer selects.
 *
 * @param {string} css - The compiled kit stylesheet.
 * @returns {Set<string>}
 */
export function utilityClassNames(css) {
    const names = new Set();
    const selector = /\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g;
    for (const match of layerBody(css, "utilities").matchAll(selector)) {
        const name = unescapeIdentifier(match[1]);
        if (!VARIANT_MARKER.test(name)) {
            names.add(name);
        }
    }
    return names;
}

/**
 * Turn an attribute value into a class-name fragment.
 *
 * @param {string} value
 * @returns {string}
 */
function slug(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * @param {Element} element
 * @returns {string|null}
 */
function ownRole(element) {
    return element.getAttribute("data-slot") || element.getAttribute("data-qa");
}

/**
 * Pick the base of a named class from the element's own description of itself.
 * An element without one is named after its nearest described ancestor and its
 * tag, such as `vk-objects-grid-row-div`.
 *
 * @param {Element} element
 * @returns {string}
 */
function baseName(element) {
    let role = ownRole(element);
    if (!role) {
        let ancestor = element.parentElement;
        while (ancestor && !ownRole(ancestor)) {
            ancestor = ancestor.parentElement;
        }
        role = ancestor ? `${ownRole(ancestor)} ${element.tagName}` : element.tagName;
    }
    const parts = [role, ...NAME_ATTRIBUTES.map((name) => element.getAttribute(name)).filter(Boolean)];
    return `vk-${slug(parts.join(" "))}`;
}

/**
 * @typedef {object} HoistedClass
 * @property {string} name - The named class, such as `vk-button-primary-fill`.
 * @property {string} utilities - The utility string that the name stands for.
 */

/**
 * Replace long utility strings across several snapshots with named classes.
 * The same string gets the same name in every snapshot. Names come from the
 * element's `data-slot` or `data-qa` attribute, and a number distinguishes
 * strings that share a base name, in the order that they first appear.
 *
 * @param {Element[]} roots - Snapshot subtrees; modified in place.
 * @param {Set<string>} utilities - Class names that are utilities.
 * @returns {HoistedClass[]} The named classes, in the order that they were first used.
 */
export function hoistClasses(roots, utilities) {
    /** @type {Map<string, string>} */
    const nameByUtilities = new Map();
    /** @type {Map<string, number>} */
    const countByBase = new Map();
    /** @type {HoistedClass[]} */
    const hoisted = [];

    for (const root of roots) {
        for (const element of root.querySelectorAll("[class]")) {
            const tokens = element.getAttribute("class").split(/\s+/).filter(Boolean);
            const utilityTokens = tokens.filter((token) => utilities.has(token));
            const literalTokens = tokens.filter((token) => !utilities.has(token));
            const utilityString = utilityTokens.join(" ");
            if (utilityString.length < MIN_HOISTED_LENGTH) {
                continue;
            }
            let name = nameByUtilities.get(utilityString);
            if (!name) {
                const base = baseName(element);
                const count = (countByBase.get(base) ?? 0) + 1;
                countByBase.set(base, count);
                name = count === 1 ? base : `${base}-${count}`;
                nameByUtilities.set(utilityString, name);
                hoisted.push({ name, utilities: utilityString });
            }
            element.setAttribute("class", [name, ...literalTokens].join(" "));
        }
    }
    return hoisted;
}

/**
 * Write the stylesheet that defines the named classes. The rules sit in the
 * components layer, so a utility that an agent adds to an element still wins.
 *
 * @param {HoistedClass[]} hoisted
 * @returns {string}
 */
export function hoistedClassesCss(hoisted) {
    const rules = hoisted.map(({ name, utilities }) => `    .${name} {\n        @apply ${utilities};\n    }`);
    return `/* Generated by client/scripts/mockup-kit. Do not edit. */\n@layer components {\n${rules.join("\n")}\n}\n`;
}
