import { TOWNCRIER_MARKER, changelogDraftPlugin } from "../../../js/utils/changelog-draft-plugin.js";
import MarkdownIt from "markdown-it";
import { describe, expect, it, vi } from "vitest";

const PAGE = ["# Client Changelog", "", TOWNCRIER_MARKER, "", "## v3.0.0-alpha.5 (2026-09-21)", ""].join("\n");
const SECTION = ["## Unreleased", "", "### Fixes", "", "#### Lists and querying", "", "- **A fix**", ""].join("\n");

const createMd = (render) => new MarkdownIt({ html: true }).use(changelogDraftPlugin, { render });

describe("changelogDraftPlugin", () => {
    it("inserts the unreleased section above the newest release", () => {
        const render = vi.fn(() => SECTION);
        const html = createMd(render).render(PAGE, { relativePath: "reference/changelog/client.md" });
        expect(render).toHaveBeenCalledExactlyOnceWith("client");
        expect(html.indexOf("<h2>Unreleased</h2>")).toBeGreaterThan(-1);
        expect(html.indexOf("<h2>Unreleased</h2>")).toBeLessThan(html.indexOf("<h2>v3.0.0-alpha.5"));
        expect(html).toContain("<h4>Lists and querying</h4>");
    });

    it("renders the server page from the server fragments", () => {
        const render = vi.fn(() => "");
        createMd(render).render(PAGE, { relativePath: "reference/changelog/server.md" });
        expect(render).toHaveBeenCalledExactlyOnceWith("server");
    });

    it("leaves the page unchanged when no fragments are waiting", () => {
        const html = createMd(() => "").render(PAGE, { relativePath: "reference/changelog/client.md" });
        expect(html).not.toContain("Unreleased");
    });

    it("ignores other pages", () => {
        const render = vi.fn(() => SECTION);
        createMd(render).render(PAGE, { relativePath: "guides/example.md" });
        expect(render).not.toHaveBeenCalled();
    });
});
