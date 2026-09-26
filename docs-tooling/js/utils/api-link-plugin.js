/**
 * markdown-it plugin that resolves {@api <id>} references to links.
 *
 * A reference renders the target's title as the link text. The labeled form,
 * `[label]{@api <id>}`, renders the label instead (see `labeled-ref.js`).
 *
 * References reach the plugin through two paths, because markdown-it exposes
 * them differently. In prose an inline rule sees them. Inside a raw HTML block
 * (a `<VuedaDemo>` caption, for instance) markdown-it runs no inline rule, so
 * a core rule rewrites the block's token stream instead.
 *
 * Both paths emit `link_open` tokens rather than literal `<a>` markup.
 * VitePress rewrites the `.md` extension and prepends the site base in its own
 * `link_open` renderer rule, so a hand-built anchor string keeps an href that
 * resolves to nothing.
 */
import { findTrailingLabel, parseLabeledRef, pushLabelTokens } from "./labeled-ref.js";
import { parseApiRef } from "./reference-parser.js";

const API_PREFIX = "{@api";
const SOFTBREAK_SPACER = " ";

const unknownIdMessage = (rawId, env) =>
    `Unknown API id "${rawId}" in ${env?.relativePath || env?.path || "unknown file"}`;

/**
 * Attributes for a resolved reference. An upstream documentation link also carries its title, such
 * as "Django: GeneratedField", so a labeled link still names the site it leads to.
 */
const linkAttrs = (entry) =>
    entry.external
        ? [
              ["href", entry.href],
              ["title", entry.title],
          ]
        : [["href", entry.href]];

const linkTokens = (Token, part, { md, env }) => {
    const open = new Token("link_open", "a", 1);
    open.attrs = linkAttrs(part);
    let content;
    if (part.label) {
        content = md.parseInline(part.label, env)[0].children;
    } else {
        const text = new Token("text", "", 0);
        text.content = part.title;
        content = [text];
    }
    return [open, ...content, new Token("link_close", "a", -1)];
};

/**
 * Split raw HTML content into literal runs and resolved references.
 *
 * Returns `null` when the content holds no resolvable reference, so callers
 * can leave the original token untouched.
 */
const splitApiRefs = (src, { resolve, strict, env }) => {
    const parts = [];
    let literal = "";
    let index = 0;
    let resolved = false;

    const flushLiteral = () => {
        if (literal) {
            parts.push({ type: "literal", content: literal });
            literal = "";
        }
    };

    while (index < src.length) {
        const start = src.indexOf(API_PREFIX, index);
        if (start === -1) {
            literal += src.slice(index);
            break;
        }
        literal += src.slice(index, start);
        const parsed = parseApiRef(src, start);
        if (!parsed) {
            literal += API_PREFIX;
            index = start + API_PREFIX.length;
            continue;
        }
        const { raw, rawId, length } = parsed;
        const entry = resolve ? resolve(rawId) : null;
        if (entry) {
            const trailing = findTrailingLabel(literal);
            if (trailing) {
                literal = literal.slice(0, trailing.start);
            }
            flushLiteral();
            parts.push({
                type: "link",
                href: entry.href,
                title: entry.title || rawId,
                external: entry.external,
                label: trailing?.label,
            });
            resolved = true;
        } else {
            if (strict) {
                throw new Error(unknownIdMessage(rawId, env));
            }
            literal += raw;
        }
        index = start + length;
    }
    flushLiteral();

    return resolved ? parts : null;
};

const expandHtmlInline = (children, Token, context) => {
    let changed = false;
    const expanded = [];

    for (const child of children) {
        const parts = child.type === "html_inline" ? splitApiRefs(child.content, context) : null;
        if (!parts) {
            expanded.push(child);
            continue;
        }
        changed = true;
        for (const part of parts) {
            if (part.type === "link") {
                expanded.push(...linkTokens(Token, part, context));
                continue;
            }
            const token = new Token("html_inline", "", 0);
            token.content = part.content;
            expanded.push(token);
        }
    }

    return changed ? expanded : null;
};

const expandHtmlBlock = (token, Token, context) => {
    const parts = splitApiRefs(token.content, context);
    if (!parts) {
        return null;
    }

    return parts.map((part) => {
        if (part.type === "link") {
            const inline = new Token("inline", "", 0);
            inline.content = "";
            inline.level = token.level;
            inline.children = linkTokens(Token, part, context);
            return inline;
        }
        const block = new Token("html_block", "", 0);
        block.content = part.content;
        block.level = token.level;
        return block;
    });
};

/**
 * Move past a reference that ends a line, standing a space in for the line
 * break and the next line's indent.
 */
const skipTrailingNewline = (state, end) => {
    let nextPos = end;
    const char = state.src.charCodeAt(nextPos);
    if (char === 0x0a || char === 0x0d) {
        if (char === 0x0d) {
            nextPos += 1;
            if (state.src.charCodeAt(nextPos) === 0x0a) {
                nextPos += 1;
            }
        } else {
            nextPos += 1;
        }
        while (nextPos < state.src.length) {
            const code = state.src.charCodeAt(nextPos);
            if (code !== 0x20 && code !== 0x09) {
                break;
            }
            nextPos += 1;
        }
        const spacer = state.push("text", "", 0);
        spacer.content = SOFTBREAK_SPACER;
    }
    state.pos = nextPos;
};

export const apiLinkPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;

    md.core.ruler.push("vueda-api-link-html", (state) => {
        const { Token } = state;
        const context = { resolve, strict, env: state.env, md: state.md };
        const tokens = [];
        let changed = false;

        for (const token of state.tokens) {
            if (token.type === "html_block") {
                const expanded = expandHtmlBlock(token, Token, context);
                if (expanded) {
                    tokens.push(...expanded);
                    changed = true;
                    continue;
                }
            }
            if (token.children) {
                const expanded = expandHtmlInline(token.children, Token, context);
                if (expanded) {
                    token.children = expanded;
                    changed = true;
                }
            }
            tokens.push(token);
        }

        if (changed) {
            state.tokens = tokens;
        }
    });

    const resolveOrFallback = (state, parsed) => {
        const { raw, rawId, length } = parsed;
        const entry = resolve ? resolve(rawId) : null;
        if (entry) {
            return entry;
        }
        if (strict) {
            throw new Error(unknownIdMessage(rawId, state.env));
        }
        const token = state.push("text", "", 0);
        token.content = raw;
        state.pos += length;
        return null;
    };

    md.inline.ruler.before("emphasis", "vueda-api-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseApiRef(state.src, pos);
        if (!parsed) {
            return false;
        }
        if (silent) {
            state.pos += parsed.length;
            return true;
        }

        const entry = resolveOrFallback(state, parsed);
        if (!entry) {
            return true;
        }

        const open = state.push("link_open", "a", 1);
        open.attrs = linkAttrs(entry);
        const text = state.push("text", "", 0);
        text.content = entry.title || parsed.rawId;
        state.push("link_close", "a", -1);

        skipTrailingNewline(state, pos + parsed.length);
        return true;
    });

    md.inline.ruler.before("link", "vueda-api-labeled-link", (state, silent) => {
        const match = parseLabeledRef(state, parseApiRef);
        if (!match) {
            return false;
        }
        if (silent) {
            state.pos = match.end;
            return true;
        }

        const { rawId } = match.parsed;
        const entry = resolve ? resolve(rawId) : null;
        if (!entry) {
            if (strict) {
                throw new Error(unknownIdMessage(rawId, state.env));
            }
            // The bracketed label and the reference then render as written.
            return false;
        }

        const open = state.push("link_open", "a", 1);
        open.attrs = linkAttrs(entry);
        pushLabelTokens(state, match);
        state.push("link_close", "a", -1);

        skipTrailingNewline(state, match.end);
        return true;
    });
};
