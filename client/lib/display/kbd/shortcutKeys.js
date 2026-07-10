const MODIFIER_GLYPHS = new Set(["⌘", "⇧", "⌥", "⌃"]);

const textFromVNode = (node) => {
    if (typeof node?.children === "string") {
        return node.children;
    }
    if (Array.isArray(node?.children)) {
        return textFromVNodes(node.children);
    }
    return "";
};

const textFromVNodes = (nodes) => nodes.map(textFromVNode).join("");

/**
 * Normalize a shortcut value into physical key labels.
 *
 * Arrays are the canonical input for shortcut components because they preserve
 * key boundaries without relying on text parsing. Strings are accepted for
 * compatibility with existing slot content and compact menu notation.
 *
 * @param {string|string[]|null|undefined} value - Shortcut keys as structured labels or display text.
 * @returns {string[]} The key labels in display order.
 */
export function normalizeShortcutKeys(value) {
    if (Array.isArray(value)) {
        return value.map((key) => String(key ?? "").trim()).filter(Boolean);
    }
    return splitShortcutKeys(value);
}

/**
 * Split a shortcut label into physical key labels.
 *
 * Whitespace is the explicit separator used by command demos (`⌘ ⇧ S`,
 * `G R`). Compact modifier notation from menus (`⇧⌘L`, `⌘⌫`) is also split
 * so shortcut wrappers can render one Kbd per physical key.
 *
 * @param {string} value - The shortcut label to split.
 * @returns {string[]} The key labels in display order.
 */
export function splitShortcutKeys(value) {
    const text = String(value ?? "").trim();
    if (!text) {
        return [];
    }

    if (/\s/.test(text)) {
        return text.split(/\s+/).filter(Boolean);
    }

    const keys = [];
    let buffer = "";
    for (const char of text) {
        if (MODIFIER_GLYPHS.has(char)) {
            if (buffer) {
                keys.push(buffer);
                buffer = "";
            }
            keys.push(char);
        } else {
            buffer += char;
        }
    }
    if (buffer) {
        keys.push(buffer);
    }
    return keys;
}

/**
 * Extract and split shortcut text from a Vue slot.
 *
 * @param {import("vue").VNode[]} nodes - Slot VNodes.
 * @returns {string[]} The key labels in display order.
 */
export function shortcutKeysFromVNodes(nodes) {
    return normalizeShortcutKeys(textFromVNodes(nodes));
}
