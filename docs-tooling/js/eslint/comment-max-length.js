/**
 * ESLint rule that limits comment lines to a maximum length and rewraps the lines that exceed it.
 *
 * Prettier wraps code at its print width but never reflows comment text, so nothing else in the toolchain keeps JSDoc
 * within the width that the code uses. Python docstrings get the same limit from ruff's `W505`.
 *
 * The fix rewraps a paragraph from its first over-long line to the paragraph's end. Lines before that line keep their
 * breaks, so the diff stays small. The rule only enforces the maximum. It does not reflow paragraphs that someone
 * wrapped at a shorter width.
 *
 * Some text keeps its line breaks because those breaks carry meaning. The rule does not rewrap:
 *
 * - fenced code blocks and the body of an `@example` tag;
 * - Markdown tables, headings, and lines that start with an HTML tag;
 * - a line whose only overflow is one word that cannot be split, such as a URL.
 *
 * The rule never splits an inline code span, an inline tag such as `{@link Foo}`, or the head of a block tag. The head
 * is the tag, its `{type}`, and the parameter or type name for tags that take one. A wrapped line never starts with a
 * token that would turn it into a list item, a tag, a heading, a table row, or a block quote.
 *
 * The rule reports a few over-long comments without a fix. A comment that shares its line with code, and a block
 * comment whose lines lack the leading `*`, need a person to decide where the text goes.
 */

const DEFAULT_MAX = 120;

/** Comment bodies that tools parse as directives. Rewrapping them would change what the tool reads. */
const DIRECTIVE =
    /^\s*(?:eslint\b|eslint-|global\s|globals\s|exported\s|jshint\b|istanbul\s|c8\s|v8\s|@ts-|prettier-ignore|#(?:end)?region\b|@?vitest-environment\b|webpackChunkName\b|[#@]__PURE__|!)/;

/** Block tags whose first word after the optional `{type}` is a name that must stay on the tag's line. */
const NAMED_TAGS = new Set([
    "alias",
    "arg",
    "argument",
    "callback",
    "emits",
    "event",
    "fires",
    "member",
    "memberof",
    "module",
    "name",
    "param",
    "prop",
    "property",
    "slot",
    "template",
    "typedef",
    "var",
]);

const LIST_MARKER = /^([-*+]|\d+[.)])\s+/;
const FENCE = /^(```|~~~)/;
const VERBATIM_START = /^[|#<]/;

/**
 * A token that changes how Markdown or JSDoc reads a line when the token starts that line. The wrapper keeps each such
 * token on the same line as the token before it.
 */
const UNSAFE_LINE_START = /^(?:[-*+>|]$|#|@|\d+[.)]$)/;

/**
 * Splits a paragraph's text into the tokens that the wrapper places on lines. Whitespace separates tokens, except
 * inside an inline code span or a `{...}` group. Those stay whole so the wrapper never splits a `{@link}` tag or a
 * `{type}`.
 *
 * @param {string} text - The paragraph text, with line breaks already replaced by spaces.
 * @returns {string[]} The tokens in order.
 */
export function tokenize(text) {
    const tokens = [];
    let current = "";
    let inCode = false;
    let braceDepth = 0;
    for (const char of text) {
        if (char === "`") {
            inCode = !inCode;
        } else if (!inCode && char === "{") {
            braceDepth += 1;
        } else if (!inCode && char === "}" && braceDepth > 0) {
            braceDepth -= 1;
        }
        if (/\s/.test(char) && !inCode && braceDepth === 0) {
            if (current) {
                tokens.push(current);
                current = "";
            }
        } else {
            current += char;
        }
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}

/**
 * Joins the head of a block tag into one token. The head is the tag, its `{type}`, and the name for tags in
 * `NAMED_TAGS`.
 *
 * @param {string[]} tokens - The tokens of a paragraph that starts with a block tag.
 * @returns {string[]} The tokens, with the head joined into the first one.
 */
function joinTagHead(tokens) {
    const tag = tokens[0].slice(1);
    let count = 1;
    if (tokens[count]?.startsWith("{")) {
        count += 1;
    }
    if ((NAMED_TAGS.has(tag) || tag.startsWith("vueda-")) && tokens[count] !== undefined) {
        count += 1;
    }
    return [tokens.slice(0, count).join(" "), ...tokens.slice(count)];
}

/**
 * Joins each token that is unsafe at the start of a line onto the token before it.
 *
 * @param {string[]} tokens - The tokens to place on lines.
 * @returns {string[]} The tokens, with each unsafe token joined onto its predecessor.
 */
function joinUnsafeStarts(tokens) {
    const joined = [];
    for (const token of tokens) {
        if (joined.length > 0 && UNSAFE_LINE_START.test(token)) {
            joined[joined.length - 1] += ` ${token}`;
        } else {
            joined.push(token);
        }
    }
    return joined;
}

/**
 * Places tokens on lines, filling each line up to the width before starting the next one.
 *
 * @param {string[]} tokens - The tokens to place.
 * @param {number} width - The number of characters that a line's text may use.
 * @param {string} firstIndent - The indentation of the first line.
 * @param {string} restIndent - The indentation of each later line.
 * @returns {string[]} The wrapped lines. A token that is longer than the width gets a line of its own.
 */
function fill(tokens, width, firstIndent, restIndent) {
    const lines = [];
    let line = firstIndent;
    let lineHasToken = false;
    for (const token of tokens) {
        if (lineHasToken && line.length + 1 + token.length > width) {
            lines.push(line);
            line = restIndent + token;
        } else {
            line += (lineHasToken ? " " : "") + token;
        }
        lineHasToken = true;
    }
    lines.push(line);
    return lines;
}

/**
 * Classifies each line of a comment body. A paragraph is a run of prose lines that Markdown joins into one block.
 *
 * @param {string[]} contents - The text of each line, without the comment gutter.
 * @returns {Array<{verbatim: boolean, paragraph: number}>} One entry per line. `paragraph` is the index of the line
 *   that starts the paragraph. It is -1 for a verbatim line.
 */
export function classifyLines(contents) {
    const result = [];
    let inFence = false;
    let inExample = false;
    let paragraphStart = -1;
    contents.forEach((content, index) => {
        const trimmed = content.trim();
        const indented = content.length > 0 && content[0] === " ";
        if (FENCE.test(trimmed)) {
            inFence = !inFence;
            paragraphStart = -1;
            result.push({ verbatim: true, paragraph: -1 });
            return;
        }
        if (inFence) {
            result.push({ verbatim: true, paragraph: -1 });
            return;
        }
        if (inExample && trimmed.startsWith("@") && !indented) {
            inExample = false;
        }
        if (trimmed.startsWith("@example")) {
            inExample = true;
        }
        if (inExample || trimmed === "" || VERBATIM_START.test(trimmed)) {
            paragraphStart = -1;
            result.push({ verbatim: true, paragraph: -1 });
            return;
        }
        const startsBlock = trimmed.startsWith("@") || LIST_MARKER.test(trimmed);
        if (startsBlock || paragraphStart === -1) {
            paragraphStart = index;
        }
        result.push({ verbatim: false, paragraph: paragraphStart });
        if (/(?: {2}|\\)$/.test(content)) {
            // A Markdown hard line break ends the run that the wrapper may join.
            paragraphStart = -1;
        }
    });
    return result;
}

/**
 * Rewraps the paragraph that contains an over-long line, from that line to the paragraph's end.
 *
 * @param {string[]} contents - The text of each body line, without the comment gutter.
 * @param {number} longIndex - The index of the first over-long line.
 * @param {number} width - The number of characters that a line's text may use.
 * @returns {{start: number, end: number, lines: string[]} | null} The replacement for lines `start` to `end`
 *   inclusive. The result is null when rewrapping cannot shorten the line.
 */
export function rewrapParagraph(contents, longIndex, width) {
    const kinds = classifyLines(contents);
    const kind = kinds[longIndex];
    if (kind.verbatim) {
        return null;
    }
    const start = kind.paragraph;
    let end = longIndex;
    while (end + 1 < contents.length && kinds[end + 1].paragraph === start) {
        end += 1;
    }

    const indentOf = (content) => content.match(/^ */)[0];
    const startContent = contents[start].trimStart();
    let restIndent;
    if (start + 1 < contents.length && kinds[start + 1].paragraph === start) {
        restIndent = indentOf(contents[start + 1]);
    } else if (startContent.startsWith("@")) {
        restIndent = indentOf(contents[start]) + " ";
    } else if (LIST_MARKER.test(startContent)) {
        restIndent = indentOf(contents[start]) + " ".repeat(startContent.match(LIST_MARKER)[0].length);
    } else {
        restIndent = indentOf(contents[start]);
    }
    const firstIndent = longIndex === start ? indentOf(contents[start]) : indentOf(contents[longIndex]);

    const text = contents
        .slice(longIndex, end + 1)
        .map((content) => content.trim())
        .join(" ");
    let tokens = tokenize(text);
    if (longIndex === start && tokens[0]?.startsWith("@")) {
        tokens = joinTagHead(tokens);
    }
    tokens = joinUnsafeStarts(tokens);
    const lines = fill(tokens, width, firstIndent, restIndent);

    if (lines[0].length >= contents[longIndex].length) {
        return null;
    }
    return { start: longIndex, end, lines };
}

function lineStart(sourceCode, line) {
    return sourceCode.getIndexFromLoc({ line, column: 0 });
}

function isAlone(sourceCode, comment) {
    const before = sourceCode.lines[comment.loc.start.line - 1].slice(0, comment.loc.start.column);
    const after = sourceCode.lines[comment.loc.end.line - 1].slice(comment.loc.end.column);
    return before.trim() === "" && after.trim() === "";
}

/**
 * Finds the first line of a comment whose comment text ends past the maximum length.
 *
 * @param {object} sourceCode - The ESLint source code object.
 * @param {object} comment - The comment to check.
 * @param {number} max - The maximum line length.
 * @returns {number} The 1-based line number. The result is 0 when no line is too long.
 */
function firstLongLine(sourceCode, comment, max) {
    for (let line = comment.loc.start.line; line <= comment.loc.end.line; line += 1) {
        const text = sourceCode.lines[line - 1];
        const commentEnd = line === comment.loc.end.line ? comment.loc.end.column : text.length;
        if ([...text.slice(0, commentEnd)].length > max) {
            return line;
        }
    }
    return 0;
}

/**
 * Builds the fix for a block comment that sits on its own lines.
 *
 * @returns {{fix: Function} | {fix: null} | null} The fix. `fix` is null when the comment needs a manual edit. The
 *   result is null when the over-long text cannot wrap, so the rule does not report it.
 */
function blockFix(sourceCode, comment, max) {
    const indent = sourceCode.lines[comment.loc.start.line - 1].slice(0, comment.loc.start.column);
    const opener = comment.value.startsWith("*") ? "/**" : "/*";
    const gutter = `${indent} * `;
    const width = max - gutter.length;
    const physical = sourceCode.lines.slice(comment.loc.start.line - 1, comment.loc.end.line);

    if (physical.length === 1) {
        const body = comment.value.slice(opener.length - 2).trim();
        // Moving the delimiters to their own lines can be enough to shorten the line.
        const wrapped = rewrapParagraph([body], 0, width)?.lines ?? (body.length <= width ? [body] : null);
        if (!wrapped) {
            return null;
        }
        const text = [`${indent}${opener}`, ...wrapped.map((line) => `${gutter}${line}`), `${indent} */`];
        return { fix: (fixer) => fixer.replaceText(comment, text.join("\n").slice(indent.length)) };
    }

    const first = physical[0].slice(comment.loc.start.column).trim();
    const last = physical[physical.length - 1].trim();
    const middle = physical.slice(1, -1);
    if ((first !== opener && first !== "/*") || last !== "*/" || middle.some((line) => !/^\s*\*( |$)/.test(line))) {
        return { fix: null };
    }
    const contents = middle.map((line) => line.replace(/^\s*\*( |$)/, ""));
    // Rewrap every over-long paragraph in one fix. ESLint applies one fix per comment per pass and stops after ten
    // passes, which is too few for a large block. Lines that no rewrap touches keep their original text.
    const output = [];
    let changed = false;
    let index = 0;
    while (index < contents.length) {
        const result = [...middle[index]].length > max ? rewrapParagraph(contents, index, width) : null;
        if (result) {
            output.push(...result.lines.map((line) => `${gutter}${line}`));
            changed = true;
            index = result.end + 1;
        } else {
            output.push(middle[index]);
            index += 1;
        }
    }
    if (!changed) {
        return null;
    }
    const startLine = comment.loc.start.line + 1;
    const endLine = comment.loc.start.line + middle.length;
    const range = [
        lineStart(sourceCode, startLine),
        lineStart(sourceCode, endLine) + sourceCode.lines[endLine - 1].length,
    ];
    return { fix: (fixer) => fixer.replaceTextRange(range, output.join("\n")) };
}

/**
 * Builds the fix for a line comment. The paragraph continues through the line comments that directly follow it at the
 * same column.
 *
 * @returns {{fix: Function} | null} The fix. The result is null when the over-long text cannot wrap.
 */
function lineFix(sourceCode, comment, max, allComments) {
    const column = comment.loc.start.column;
    const group = [comment];
    let index = allComments.indexOf(comment) + 1;
    while (index < allComments.length) {
        const next = allComments[index];
        const previous = group[group.length - 1];
        if (
            next.type !== "Line" ||
            next.loc.start.line !== previous.loc.start.line + 1 ||
            next.loc.start.column !== column ||
            !isAlone(sourceCode, next) ||
            DIRECTIVE.test(next.value)
        ) {
            break;
        }
        group.push(next);
        index += 1;
    }
    const indent = " ".repeat(column);
    const gutter = `${indent}// `;
    const contents = group.map((item) => item.value.replace(/^ /, ""));
    const result = rewrapParagraph(contents, 0, max - gutter.length);
    if (!result) {
        return null;
    }
    const last = group[result.end];
    const text = result.lines.map((line) => `${gutter}${line}`).join("\n");
    return { fix: (fixer) => fixer.replaceTextRange([comment.range[0], last.range[1]], text.slice(indent.length)) };
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
    meta: {
        type: "layout",
        docs: {
            description: "Limit comment lines to a maximum length, and rewrap comment text that exceeds it.",
        },
        fixable: "whitespace",
        schema: [
            {
                type: "object",
                properties: { max: { type: "integer", minimum: 20 } },
                additionalProperties: false,
            },
        ],
        messages: {
            tooLong: "Comment line is {{length}} characters long. The maximum is {{max}}.",
        },
    },
    create(context) {
        const max = context.options[0]?.max ?? DEFAULT_MAX;
        const sourceCode = context.sourceCode;
        return {
            Program() {
                const allComments = sourceCode.getAllComments();
                for (const comment of allComments) {
                    if (DIRECTIVE.test(comment.value)) {
                        continue;
                    }
                    const line = firstLongLine(sourceCode, comment, max);
                    if (!line) {
                        continue;
                    }
                    let outcome;
                    if (!isAlone(sourceCode, comment)) {
                        outcome = { fix: null };
                    } else if (comment.type === "Line") {
                        outcome = lineFix(sourceCode, comment, max, allComments);
                    } else {
                        outcome = blockFix(sourceCode, comment, max);
                    }
                    if (!outcome) {
                        continue;
                    }
                    const length = [...sourceCode.lines[line - 1]].length;
                    context.report({
                        loc: { start: { line, column: 0 }, end: { line, column: sourceCode.lines[line - 1].length } },
                        messageId: "tooLong",
                        data: { length, max },
                        fix: outcome.fix ?? undefined,
                    });
                }
            },
        };
    },
};
