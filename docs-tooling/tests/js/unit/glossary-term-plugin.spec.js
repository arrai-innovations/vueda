import { glossaryTermPlugin } from "../../../js/utils/glossary-term-plugin.js";
import { normalizeTerm } from "../../../js/utils/reference-parser.js";
import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";

const ENTRIES = {
    "queue item (vdq)": { term: "Queue Item (VDQ)", href: "/reference/glossary#queue-item-vdq" },
};

const createMd = ({ strict = false } = {}) =>
    new MarkdownIt({ html: true }).use(glossaryTermPlugin, {
        resolve: (term) => ENTRIES[normalizeTerm(term)],
        strict,
    });

describe("glossaryTermPlugin", () => {
    it("renders the glossary heading as the link text", () => {
        const html = createMd().render("Each {@term Queue Item (VDQ)} is sent once.");
        expect(html).toContain(
            'Each <GlossaryTerm term="Queue Item (VDQ)" href="/reference/glossary#queue-item-vdq" /> is sent once.',
        );
    });

    it("renders the label as the link text", () => {
        const html = createMd().render("Send the [queue items]{@term Queue Item (VDQ)} now.");
        expect(html).toContain(
            'Send the <GlossaryTerm term="Queue Item (VDQ)" href="/reference/glossary#queue-item-vdq">queue items</GlossaryTerm> now.',
        );
    });

    it("renders inline Markdown in the label", () => {
        const html = createMd().render("[*queued* items]{@term queue item (vdq)}");
        expect(html).toContain("><em>queued</em> items</GlossaryTerm>");
    });

    it("resolves the labeled form inside a table cell", () => {
        const html = createMd().render("| a | b |\n| --- | --- |\n| [items]{@term Queue Item (VDQ)} | x |");
        expect(html).toContain('<td><GlossaryTerm term="Queue Item (VDQ)"');
        expect(html).toContain(">items</GlossaryTerm></td>");
    });

    it("resolves a reference inside a Markdown link label", () => {
        const html = createMd().render("[see {@term Queue Item (VDQ)}](https://example.com)");
        expect(html).toContain('<a href="https://example.com">see <GlossaryTerm');
    });

    it("renders as written when the term is unknown and strict is off", () => {
        const html = createMd().render("[label]{@term Missing}");
        expect(html).toContain("[label]{@term Missing}");
    });

    it("throws when the term is unknown and strict is on", () => {
        const md = createMd({ strict: true });
        expect(() => md.render("[label]{@term Missing}", { relativePath: "guides/x.md" })).toThrow(
            /Unknown glossary term "Missing" in guides\/x\.md/,
        );
        expect(() => md.render("{@term Missing}", {})).toThrow(/Unknown glossary term "Missing"/);
    });
});
