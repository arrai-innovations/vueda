/**
 * Shared parsers for {@api} and {@term} references.
 *
 * Used by both the VitePress markdown-it plugins (config.mjs) and the
 * standalone reference validator.
 */

export const parseFrontmatter = (raw) => {
    const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) {
        return { frontmatter: {}, body: raw };
    }
    const frontmatter = {};
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx <= 0) {
            continue;
        }
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (!key) {
            continue;
        }
        if (value.startsWith('"') || value.startsWith("[")) {
            try {
                frontmatter[key] = JSON.parse(value);
            } catch {
                frontmatter[key] = value.replace(/^"|"$/g, "");
            }
        } else if (value.startsWith("'")) {
            frontmatter[key] = value.replace(/^'|'$/g, "");
        } else {
            frontmatter[key] = value;
        }
    }
    return { frontmatter, body: raw.slice(match[0].length) };
};

export const normalizeTerm = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

export const stripInlineMarkdown = (value) =>
    value
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_~]/g, "")
        .trim();

/**
 * Parse an {@api <id>} reference starting at `pos` in `src`.
 * Returns `{ raw, rawId, length }` or `null`.
 */
export const parseApiRef = (src, pos) => {
    const prefix = "{@api";
    if (!src.startsWith(prefix, pos)) {
        return null;
    }

    let i = pos + prefix.length;
    if (i >= src.length || !/\s/.test(src[i])) {
        return null;
    }

    while (i < src.length && /\s/.test(src[i])) {
        i += 1;
    }

    const idStart = i;
    let braceDepth = 0;

    while (i < src.length) {
        const char = src[i];
        if (char === "{") {
            braceDepth += 1;
            i += 1;
            continue;
        }
        if (char === "}") {
            if (braceDepth === 0) {
                const raw = src.slice(pos, i + 1);
                const rawId = src
                    .slice(idStart, i)
                    .trim()
                    .replace(/\\([\\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g, "$1");
                if (!rawId) {
                    return null;
                }
                return { raw, rawId, length: raw.length };
            }
            braceDepth -= 1;
        }
        i += 1;
    }

    return null;
};

/**
 * Parse a {@term <term>} reference starting at `pos` in `src`.
 * Returns `{ raw, rawTerm, length }` or `null`.
 */
export const parseTermRef = (src, pos) => {
    const prefix = "{@term";
    if (!src.startsWith(prefix, pos)) {
        return null;
    }

    let i = pos + prefix.length;
    if (i >= src.length || !/\s/.test(src[i])) {
        return null;
    }
    while (i < src.length && /\s/.test(src[i])) {
        i += 1;
    }
    const termStart = i;
    while (i < src.length && src[i] !== "}") {
        i += 1;
    }
    if (i >= src.length) {
        return null;
    }
    const raw = src.slice(pos, i + 1);
    const rawTerm = src.slice(termStart, i).trim();
    if (!rawTerm) {
        return null;
    }
    return { raw, rawTerm, length: raw.length };
};
