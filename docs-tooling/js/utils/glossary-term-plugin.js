/**
 * markdown-it plugin that resolves {@term <term>} references to
 * `<GlossaryTerm>` links.
 *
 * A reference renders the glossary heading as the link text. The labeled
 * form, `[label]{@term <term>}`, renders the label instead (see
 * `labeled-ref.js`).
 */
import { parseLabeledRef, pushLabelTokens } from "./labeled-ref.js";
import { parseTermRef } from "./reference-parser.js";

const escapeAttr = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unknownTermMessage = (rawTerm, env) =>
    `Unknown glossary term "${rawTerm}" in ${env?.relativePath || env?.path || "unknown file"}`;

const termAttrs = (entry) => `term="${escapeAttr(entry.term)}" href="${escapeAttr(entry.href)}"`;

export const glossaryTermPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;

    md.inline.ruler.before("emphasis", "vueda-term-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseTermRef(state.src, pos);
        if (!parsed) {
            return false;
        }
        if (silent) {
            state.pos += parsed.length;
            return true;
        }

        const { raw, rawTerm, length } = parsed;
        const entry = resolve ? resolve(rawTerm) : null;
        if (!entry) {
            if (strict) {
                throw new Error(unknownTermMessage(rawTerm, state.env));
            }
            const token = state.push("text", "", 0);
            token.content = raw;
            state.pos += length;
            return true;
        }

        const token = state.push("html_inline", "", 0);
        token.content = `<GlossaryTerm ${termAttrs(entry)} />`;
        state.pos += length;
        return true;
    });

    md.inline.ruler.before("link", "vueda-term-labeled-link", (state, silent) => {
        const match = parseLabeledRef(state, parseTermRef);
        if (!match) {
            return false;
        }
        if (silent) {
            state.pos = match.end;
            return true;
        }

        const { rawTerm } = match.parsed;
        const entry = resolve ? resolve(rawTerm) : null;
        if (!entry) {
            if (strict) {
                throw new Error(unknownTermMessage(rawTerm, state.env));
            }
            // The bracketed label and the reference then render as written.
            return false;
        }

        state.push("html_inline", "", 0).content = `<GlossaryTerm ${termAttrs(entry)}>`;
        pushLabelTokens(state, match);
        state.push("html_inline", "", 0).content = "</GlossaryTerm>";
        return true;
    });
};
