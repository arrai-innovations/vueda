/**
 * markdown-it helpers for the labeled reference form, `[label]{@api <id>}`
 * and `[label]{@term <term>}`.
 *
 * The bracketed label is inline Markdown and becomes the link text; the braces
 * pick the target. The label sits outside the braces so the form needs no
 * delimiter inside them: a `|` there would split a GFM table cell.
 */

const REF_IN_LABEL = /\{@(?:api|term)\s/;

/**
 * Match a label opening at `state.pos` that a reference follows directly.
 *
 * `parseRef` is `parseApiRef` or `parseTermRef`. Returns
 * `{ labelStart, labelEnd, parsed, end }` or `null`. An empty label, or one
 * holding another reference, does not match, so the source renders as written.
 */
export const parseLabeledRef = (state, parseRef) => {
    const { pos } = state;
    if (state.src.charCodeAt(pos) !== 0x5b) {
        return null;
    }
    const labelEnd = state.md.helpers.parseLinkLabel(state, pos, true);
    if (labelEnd < 0) {
        return null;
    }
    const labelStart = pos + 1;
    const label = state.src.slice(labelStart, labelEnd);
    if (!label.trim() || REF_IN_LABEL.test(label)) {
        return null;
    }
    const parsed = parseRef(state.src, labelEnd + 1);
    if (!parsed) {
        return null;
    }
    const end = labelEnd + 1 + parsed.length;
    if (end > state.posMax) {
        return null;
    }
    return { labelStart, labelEnd, parsed, end };
};

/**
 * Tokenize the label as the link's content, then move past the reference.
 */
export const pushLabelTokens = (state, { labelStart, labelEnd, end }) => {
    const max = state.posMax;
    state.pos = labelStart;
    state.posMax = labelEnd;
    state.linkLevel++;
    state.md.inline.tokenize(state);
    state.linkLevel--;
    state.posMax = max;
    state.pos = end;
};

/**
 * Find the label that ends a run of raw HTML, for a reference that follows it.
 *
 * Returns `{ label, start }`, where `start` is the index of the opening `[`,
 * or `null` when the run does not end in a usable label.
 */
export const findTrailingLabel = (literal) => {
    if (!literal.endsWith("]")) {
        return null;
    }
    let depth = 0;
    for (let i = literal.length - 1; i >= 0; i -= 1) {
        const char = literal[i];
        if (char === "]") {
            depth += 1;
        } else if (char === "[") {
            depth -= 1;
            if (depth === 0) {
                const label = literal.slice(i + 1, -1);
                if (!label.trim() || REF_IN_LABEL.test(label)) {
                    return null;
                }
                return { label, start: i };
            }
        }
    }
    return null;
};
