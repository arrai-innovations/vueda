import { mermaidSchemePlugin } from "../../../js/utils/mermaid-scheme-plugin.js";
import MarkdownIt from "markdown-it";
import { describe, expect, it, vi } from "vitest";

const SCHEMES = {
    light: { theme: "base", themeVariables: { primaryColor: "#ffffff" } },
    dark: { theme: "base", themeVariables: { primaryColor: "#000000", darkMode: true } },
};

const createMd = (render) => new MarkdownIt({ html: true }).use(mermaidSchemePlugin, { schemes: SCHEMES, render });

describe("mermaidSchemePlugin", () => {
    it("renders one figure per scheme with the scheme config prepended", () => {
        const render = vi.fn((source, { name }) => `<figure>${name}</figure>`);
        const html = createMd(render).render("```mermaid\nflowchart TD\n    A --> B\n```\n", {
            path: "/docs/core-concepts/page.md",
        });

        expect(render).toHaveBeenCalledTimes(2);
        expect(render.mock.calls[0][0]).toBe(
            `---\nconfig: ${JSON.stringify(SCHEMES.light)}\n---\nflowchart TD\n    A --> B`,
        );
        expect(render.mock.calls[1][0]).toBe(
            `---\nconfig: ${JSON.stringify(SCHEMES.dark)}\n---\nflowchart TD\n    A --> B`,
        );
        expect(html).toContain('<div class="vueda-diagram-light"><figure>page-0-light</figure></div>');
        expect(html).toContain('<div class="vueda-diagram-dark"><figure>page-0-dark</figure></div>');
    });

    it("passes the caption and a per-scheme id from the diagram comment", () => {
        const render = vi.fn(() => "");
        createMd(render).render(
            '```mermaid\nflowchart TD\n    A --> B\n```\n\n<!-- diagram id="flow" caption="The flow" -->\n',
            { path: "page.md" },
        );

        expect(render.mock.calls[0][1]).toEqual({ caption: "The flow", id: "flow-light", name: "page-0-light" });
        expect(render.mock.calls[1][1]).toEqual({ caption: "The flow", id: "flow-dark", name: "page-0-dark" });
    });

    it("adds the config to existing diagram frontmatter", () => {
        const render = vi.fn(() => "");
        createMd(render).render("```mermaid\n---\ntitle: Flow\n---\nflowchart TD\n    A --> B\n```\n");

        expect(render.mock.calls[0][0]).toBe(
            `---\nconfig: ${JSON.stringify(SCHEMES.light)}\ntitle: Flow\n---\nflowchart TD\n    A --> B`,
        );
    });

    it("rejects a diagram that sets its own config", () => {
        const md = createMd(() => "");
        expect(() =>
            md.render("```mermaid\n---\nconfig:\n  theme: forest\n---\nflowchart TD\n    A --> B\n```\n", {
                relativePath: "page.md",
            }),
        ).toThrow("Mermaid diagram in page.md sets frontmatter config");
    });

    it("leaves other fences to the previous fence rule", () => {
        const render = vi.fn();
        const html = createMd(render).render("```js\nconst a = 1;\n```\n");

        expect(render).not.toHaveBeenCalled();
        expect(html).toContain('<code class="language-js">');
    });
});
