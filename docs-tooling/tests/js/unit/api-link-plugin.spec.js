import { apiLinkPlugin } from "../../../js/utils/api-link-plugin.js";
import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";

const ENTRIES = {
    "theme-key:WidgetDuration": {
        href: "/reference/theming/keys/WidgetDuration.md",
        title: "WidgetDuration",
    },
    "vue:component:WidgetJson": {
        href: "/reference/api/vue/WidgetJson.md#setup",
        title: "WidgetJson",
    },
};

/**
 * Stand-in for VitePress's own `link_open` renderer rule, which rewrites the
 * `.md` extension and prepends the site base. A plugin that emits literal
 * anchor markup never reaches it, which is the regression these tests guard.
 */
const withVitePressLinkRule = (md, base = "/vueda/") => {
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const href = token.attrGet("href");
        if (href?.startsWith("/")) {
            token.attrSet("href", `${base}${href.replace(/\.md(?=$|#)/, ".html")}`.replace(/\/+/g, "/"));
        }
        return self.renderToken(tokens, idx, options);
    };
    return md;
};

const createMd = ({ strict = false, resolve = (id) => ENTRIES[id] } = {}) =>
    withVitePressLinkRule(new MarkdownIt({ html: true }).use(apiLinkPlugin, { resolve, strict }));

describe("apiLinkPlugin", () => {
    it("resolves a reference in prose", () => {
        const html = createMd().render("See {@api theme-key:WidgetDuration} for details.");
        expect(html).toContain('<a href="/vueda/reference/theming/keys/WidgetDuration.html">WidgetDuration</a>');
    });

    it("resolves a reference inside an HTML block", () => {
        const source = [
            "<VuedaDemo>",
            "  <span>theme key: {@api theme-key:WidgetDuration}</span>",
            "</VuedaDemo>",
        ].join("\n");
        const html = createMd().render(source);
        expect(html).toContain('<a href="/vueda/reference/theming/keys/WidgetDuration.html">WidgetDuration</a>');
        expect(html).toContain("<span>theme key: ");
        expect(html).toContain("</span>");
        expect(html).not.toContain("{@api");
    });

    it("emits the same href whether the reference sits in prose or an HTML block", () => {
        const prose = createMd().render("{@api vue:component:WidgetJson}");
        const block = createMd().render("<VuedaDemo>\n  <span>{@api vue:component:WidgetJson}</span>\n</VuedaDemo>");
        const hrefOf = (html) => html.match(/href="([^"]+)"/)[1];
        expect(hrefOf(block)).toBe(hrefOf(prose));
        expect(hrefOf(block)).toBe("/vueda/reference/api/vue/WidgetJson.html#setup");
    });

    it("resolves several references in one HTML block", () => {
        const source = [
            "<VuedaDemo>",
            "  <span>{@api theme-key:WidgetDuration}, {@api vue:component:WidgetJson}</span>",
            "</VuedaDemo>",
        ].join("\n");
        const html = createMd().render(source);
        expect(html).toContain('<a href="/vueda/reference/theming/keys/WidgetDuration.html">WidgetDuration</a>');
        expect(html).toContain('<a href="/vueda/reference/api/vue/WidgetJson.html#setup">WidgetJson</a>');
        expect(html).toContain(", ");
    });

    it("resolves a reference in an inline HTML span", () => {
        const html = createMd().render("Text <span>{@api theme-key:WidgetDuration}</span> more.");
        expect(html).toContain('<a href="/vueda/reference/theming/keys/WidgetDuration.html">WidgetDuration</a>');
    });

    it("leaves the raw reference in place when the id is unknown and strict is off", () => {
        const html = createMd().render("<VuedaDemo>\n  <span>{@api theme-key:Missing}</span>\n</VuedaDemo>");
        expect(html).toContain("{@api theme-key:Missing}");
    });

    it("throws when the id is unknown and strict is on", () => {
        const md = createMd({ strict: true });
        expect(() => md.render("<VuedaDemo>\n  <span>{@api theme-key:Missing}</span>\n</VuedaDemo>", {})).toThrow(
            /Unknown API id "theme-key:Missing"/,
        );
    });

    it("names the source file in the strict-mode error", () => {
        const md = createMd({ strict: true });
        expect(() =>
            md.render("{@api theme-key:Missing}", { relativePath: "reference/components/widgets.md" }),
        ).toThrow(/in reference\/components\/widgets\.md/);
    });

    it("leaves an HTML block without references untouched", () => {
        const source = "<VuedaDemo>\n  <span>no references here</span>\n</VuedaDemo>";
        const html = createMd().render(source);
        expect(html).toContain("<span>no references here</span>");
    });

    it("ignores a brace run that is not a reference", () => {
        const html = createMd().render("<VuedaDemo>\n  <span>{@apifoo} and {@api }</span>\n</VuedaDemo>");
        expect(html).toContain("{@apifoo} and {@api }");
    });

    it("resolves a reference inside a Markdown link label", () => {
        const html = createMd().render("[see {@api theme-key:WidgetDuration}](https://example.com)");
        expect(html).toContain('<a href="https://example.com">see ');
    });

    describe("labeled form", () => {
        it("renders the label as the link text", () => {
            const html = createMd().render("Set the [duration widget]{@api theme-key:WidgetDuration} slots.");
            expect(html).toContain(
                'Set the <a href="/vueda/reference/theming/keys/WidgetDuration.html">duration widget</a> slots.',
            );
        });

        it("renders inline Markdown in the label", () => {
            const html = createMd().render("[`WidgetJson` setup]{@api vue:component:WidgetJson}");
            expect(html).toContain(
                '<a href="/vueda/reference/api/vue/WidgetJson.html#setup"><code>WidgetJson</code> setup</a>',
            );
        });

        it("resolves inside a table cell", () => {
            const source = [
                "| Widget | Notes |",
                "| --- | --- |",
                "| [JSON]{@api vue:component:WidgetJson} | x |",
            ].join("\n");
            const html = createMd().render(source);
            expect(html).toContain('<td><a href="/vueda/reference/api/vue/WidgetJson.html#setup">JSON</a></td>');
        });

        it("leaves an ordinary Markdown link alone", () => {
            const html = createMd().render("[docs](https://example.com) {@api vue:component:WidgetJson}");
            expect(html).toContain('<a href="https://example.com">docs</a>');
            expect(html).toContain(">WidgetJson</a>");
        });

        it("needs the reference to follow the label directly", () => {
            const html = createMd().render("[note] {@api vue:component:WidgetJson}");
            expect(html).toContain("[note] <a");
            expect(html).toContain(">WidgetJson</a>");
        });

        it("ignores an empty label", () => {
            const html = createMd().render("[]{@api vue:component:WidgetJson}");
            expect(html).toContain("[]<a");
        });

        it("ignores a label that holds another reference", () => {
            const html = createMd().render("[{@api theme-key:WidgetDuration}]{@api vue:component:WidgetJson}");
            expect(html).toContain(">WidgetDuration</a>");
            expect(html).toContain(">WidgetJson</a>");
        });

        it("renders as written when the id is unknown and strict is off", () => {
            const html = createMd().render("[label]{@api theme-key:Missing}");
            expect(html).toContain("[label]{@api theme-key:Missing}");
        });

        it("throws when the id is unknown and strict is on", () => {
            const md = createMd({ strict: true });
            expect(() => md.render("[label]{@api theme-key:Missing}", {})).toThrow(
                /Unknown API id "theme-key:Missing"/,
            );
        });

        it("renders the label in an HTML block", () => {
            const html = createMd().render(
                "<VuedaDemo>\n  <span>see [the `JSON` widget]{@api vue:component:WidgetJson}</span>\n</VuedaDemo>",
            );
            expect(html).toContain(
                '<span>see <a href="/vueda/reference/api/vue/WidgetJson.html#setup">the <code>JSON</code> widget</a></span>',
            );
        });
    });
});
