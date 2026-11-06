import { exportMarkdown, markdownDiscoveryHead } from "../../../js/exporters/markdown.js";
import { buildApiLinks, buildGlossaryLinks } from "../../../js/utils/reference-links.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let root;
let docsRoot;
let outDir;
function write(relative, content) {
    const file = path.join(docsRoot, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}
const run = (extra = {}) =>
    exportMarkdown({ docsRoot, repoRoot: root, outDir, base: "/v3/", renderDraft: () => "", ...extra });
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "vueda-markdown-"));
    docsRoot = path.join(root, "docs");
    outDir = path.join(root, "export");
    write("index.md", "# VUEDA\n");
    write("reference/glossary.md", "# Glossary\n\n## Model Actions\n\nActions from the API.\n");
    write("reference/api/index.md", "# API\n\n[JavaScript](./js/)\n");
    write("reference/api/js/index.md", "# JavaScript\n");
    write(
        "reference/api/js/Widget.md",
        '---\nid: js:class:Widget\ntitle: Widget\nmember_ids: ["js:method:Widget.save"]\n---\n# Widget\n',
    );
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("Markdown publishing", () => {
    it("shares API page, member, external and glossary targets with HTML rendering", async () => {
        const external = path.join(root, "docs-tooling/.generated/external-ids.json");
        fs.mkdirSync(path.dirname(external), { recursive: true });
        fs.writeFileSync(
            external,
            JSON.stringify({ "ext:example:Widget": { title: "External Widget", href: "https://example.com/Widget" } }),
        );
        write(
            "guide.md",
            "# Guide\n\n{@api js:class:Widget} [`save`]{@api js:method:Widget.save}\n\n[available actions]{@term Model Actions}\n\n{@api ext:example:Widget}\n",
        );
        const { outputs } = await run();
        const content = outputs.get("guide.md");
        const api = buildApiLinks(docsRoot, external);
        expect(api.get("js:method:Widget.save").title).toBe("Widget.save");
        expect(content).toContain("[Widget](/v3/reference/api/js/Widget.md)");
        expect(content).toContain("[`save`](/v3" + api.get("js:method:Widget.save").href + ")");
        expect(content).toContain("[available actions](/v3/reference/glossary.md#model-actions)");
        expect(content).toContain("[External Widget](https://example.com/Widget)");
        expect(buildGlossaryLinks(path.join(docsRoot, "reference/glossary.md")).get("model actions").href).toBe(
            "/reference/glossary#model-actions",
        );
    });

    it("preserves demos, setup code and literal references inside code", async () => {
        const script = '<script setup>\nconst example = "{@api unknown}";\n</script>';
        const fence = "```vue\n<Button>{@api unknown}</Button>\n```";
        const demo =
            '<VuedaDemo>\n  <Button tone="primary">Save</Button>\n  <span>{@api js:class:Widget} supports {@term Model Actions}</span>\n</VuedaDemo>';
        write(
            "demo.md",
            `# Demo\n\n${script}\n\n${demo}\n\n${fence}\n\nUse \`{@term unknown}\` literally.\n\n<pre>{@api unknown}</pre>\n`,
        );
        const { outputs } = await run();
        const content = outputs.get("demo.md");
        expect(content).toContain(script);
        expect(content).toContain(fence);
        expect(content).toContain('<Button tone="primary">Save</Button>');
        expect(content).toContain(
            "[Widget](/v3/reference/api/js/Widget.md) supports [Model Actions](/v3/reference/glossary.md#model-actions)",
        );
        expect(content).toContain("`{@term unknown}`");
        expect(content).toContain("<pre>{@api unknown}</pre>");
    });

    it("keeps index paths and rewrites Markdown, reference-style and HTML links", async () => {
        write(
            "guide.md",
            '# Guide\n\n[API](reference/api/) [Home](/) [Class](reference/api/js/Widget.html#save)\n\n[reference][widget]\n\n[widget]: reference/api/js/Widget.md "Widget title"\n\n<a href="reference/api/">API</a>\n',
        );
        const { outputs } = await run();
        expect(outputs.has("reference/api/index.md")).toBe(true);
        expect(outputs.has("reference/api.md")).toBe(false);
        expect(outputs.get("reference/api/index.md")).toContain("[JavaScript](/v3/reference/api/js/index.md)");
        const content = outputs.get("guide.md");
        expect(content).toContain("[API](/v3/reference/api/index.md)");
        expect(content).toContain("[Home](/v3/index.md)");
        expect(content).toContain("[Class](/v3/reference/api/js/Widget.md#save)");
        expect(content).toContain('[widget]: /v3/reference/api/js/Widget.md "Widget title"');
        expect(content).toContain('<a href="/v3/reference/api/index.md">API</a>');
    });

    it("expands includes with their own relative links and includes Vue files as fenced code", async () => {
        write("guide.md", "# Guide\n\n<!-- @include: ./parts/example.md -->\n\n<<< ./.vitepress/Example.vue\n");
        write("parts/example.md", "Use [Widget](../reference/api/js/Widget.md).\n");
        const snippet = "<template><Button>{@api literal}</Button></template>\n";
        const snippetFile = write(".vitepress/Example.vue", snippet);
        const { outputs, dependencies } = await run();
        expect(outputs.get("guide.md")).toContain("Use [Widget](/v3/reference/api/js/Widget.md).");
        expect(outputs.get("guide.md")).toContain("```vue\n" + snippet + "```");
        expect(dependencies).toContain(snippetFile);
        expect(outputs.has(".vitepress/Example.vue")).toBe(false);
    });

    it("does not expand include examples inside code fences", async () => {
        const example = "```md\n<!-- @include: missing.md -->\n<<< missing.vue\n```";
        write("guide.md", `# Guide\n\n${example}\n`);
        expect((await run()).outputs.get("guide.md")).toContain(example);
    });

    it("includes unreleased changelog content and resolves its references", async () => {
        write("reference/changelog/client.md", "# Client\n\n<!-- towncrier release notes start -->\n\n## Released\n");
        const { outputs } = await run({ renderDraft: () => "## Unreleased\n\nChanged {@api js:class:Widget}.\n" });
        expect(outputs.get("reference/changelog/client.md")).toContain(
            "Changed [Widget](/v3/reference/api/js/Widget.md).",
        );
        expect(outputs.get("llms-full.txt")).toContain("## Unreleased");
    });

    it("excludes internal files and generates versioned discovery links", async () => {
        for (const name of [
            "AGENTS.md",
            "nested/README.md",
            "nested/CLAUDE.md",
            "CONTENT_PLAN.md",
            "temp/notes.md",
            ".generated/old.md",
            "public/raw.md",
        ]) {
            write(name, "Internal {@api missing}\n");
        }
        const { outputs } = await run();
        expect([...outputs.keys()]).toHaveLength(8);
        expect(outputs.get("llms.txt")).toContain("https://vueda.dev/v3/reference/api/index.md");
        expect(markdownDiscoveryHead("reference/api/index.md", "/v3/")[0][1].href).toBe("/v3/reference/api/index.md");
        expect(markdownDiscoveryHead("README.md", "/v3/")).toEqual([]);
    });

    it("keeps task guides discoverable while replacing detailed reference listings with indexes", async () => {
        write("tutorials/start-building.md", "# Start Building\n");
        write("tutorials/add-workflow.md", "# Add Workflow\n");
        write("guides/use-coding-agents.md", "# Use Coding Agents\n");
        write("guides/customize.md", "---\ndescription: Customize a view.\n---\n# Customize\n");
        write("core-concepts/permissions.md", "# Permissions\n");
        write("reference/components/index.md", "# Components\n\n[Buttons](./buttons.md)\n");
        write("reference/components/buttons.md", "# Buttons\n");
        write("reference/theming/keys.md", "# Theme Keys\n\n[Button](./keys/Button.md)\n");
        write("reference/theming/keys/Button.md", "# Button\n");
        write("reference/changelog/client.md", "# Client Changelog\n");
        const { outputs } = await run();
        const index = outputs.get("llms.txt");
        const links = [...index.matchAll(/^- \[.*?\]\((.*?)\)/gm)].map((match) => match[1]);
        expect(links.slice(0, 3)).toEqual([
            "https://vueda.dev/v3/tutorials/start-building.md",
            "https://vueda.dev/v3/guides/use-coding-agents.md",
            "https://vueda.dev/v3/index.md",
        ]);
        expect(index).toContain("## Core Concepts\n\n- [Permissions]");
        expect(index).toContain(
            "## Guides\n\n- [Customize](https://vueda.dev/v3/guides/customize.md): Customize a view.",
        );
        expect(links).toContain("https://vueda.dev/v3/reference/api/js/index.md");
        expect(links).toContain("https://vueda.dev/v3/reference/theming/keys.md");
        expect(links).toContain("https://vueda.dev/v3/reference/components/index.md");
        for (const relative of [
            "reference/api/js/Widget.md",
            "reference/theming/keys/Button.md",
            "reference/components/buttons.md",
        ]) {
            expect(links).not.toContain(`https://vueda.dev/v3/${relative}`);
            expect(outputs.has(relative)).toBe(true);
            expect(outputs.get("llms-full.txt")).toContain(`url: "https://vueda.dev/v3/${relative}"`);
        }
        expect(index.slice(index.indexOf("## Optional"))).toContain("reference/changelog/client.md");
        for (const link of links) {
            expect(outputs.has(link.replace("https://vueda.dev/v3/", ""))).toBe(true);
        }
    });

    it("exports local identifiers with versioned Markdown member URLs and removes stale entries", async () => {
        write("reference/api/js/index.md", "---\nid: js:index\n---\n# JavaScript\n");
        write("reference/api/README.md", "---\nid: js:internal\n---\n# Internal\n");
        write("reference/api/js/Spaced name.md", "---\nid: js:class:Spaced\n---\n# `Spaced`\n");
        const external = path.join(root, "docs-tooling/.generated/external-ids.json");
        fs.mkdirSync(path.dirname(external), { recursive: true });
        fs.writeFileSync(
            external,
            JSON.stringify({ "ext:Widget": { title: "Widget", href: "https://example.com/Widget" } }),
        );
        const options = { base: "/v4/", siteUrl: "https://example.com/" };
        const { outputs } = await run(options);
        const index = JSON.parse(outputs.get("symbols.json"));
        expect(index.version).toBe(1);
        expect(index.symbols).toEqual([
            { id: "js:class:Spaced", name: "Spaced", url: "https://example.com/v4/reference/api/js/Spaced%20name.md" },
            { id: "js:class:Widget", name: "Widget", url: "https://example.com/v4/reference/api/js/Widget.md" },
            {
                id: "js:method:Widget.save",
                name: "Widget.save",
                url: "https://example.com/v4/reference/api/js/Widget.md#save",
            },
        ]);
        expect(outputs.get("llms.txt")).toContain("https://example.com/v4/symbols.json");
        expect(outputs.get("llms-full.txt")).not.toContain('"symbols":');
        fs.unlinkSync(path.join(docsRoot, "reference/api/js/Widget.md"));
        const changed = await run(options);
        expect(JSON.parse(changed.outputs.get("symbols.json")).symbols).toHaveLength(1);
    });

    it("fails for unknown references and broken documentation links before writing", async () => {
        write("guide.md", "# Guide\n\n{@api missing}\n");
        await expect(run()).rejects.toThrow('Unknown API id "missing" in guide.md');
        expect(fs.existsSync(outDir)).toBe(false);
        write("guide.md", "# Guide\n\n[Missing](missing.html)\n");
        await expect(run()).rejects.toThrow('Unknown documentation link "missing.html" in guide.md');
    });

    it("preserves underscores in symbol names, including Python dunder methods", async () => {
        write(
            "reference/api/py/_Widget.md",
            '---\nid: py:class:_Widget\nmember_ids: ["py:method:_Widget.__init__"]\n---\n# `_Widget`\n',
        );
        const { outputs } = await run();
        const { symbols } = JSON.parse(outputs.get("symbols.json"));
        expect(symbols.find(({ id }) => id === "py:class:_Widget").name).toBe("_Widget");
        expect(symbols.find(({ id }) => id === "py:method:_Widget.__init__").name).toBe("_Widget.__init__");
    });

    it("preserves indented code, escaped references, and image alt text", async () => {
        const code = "    class Example[T](UnknownType):\n        value = '{@api missing}'\n";
        const escaped = "\\{@api missing}";
        write("guide.md", `# Guide\n\n${code}\n${escaped}\n\n[![Example](./assets/example.png)](reference/api/)\n`);
        const { outputs } = await run();
        expect(outputs.get("guide.md")).toContain(code);
        expect(outputs.get("guide.md")).toContain(escaped);
        expect(outputs.get("guide.md")).toContain("[![Example](/v3/assets/example.png)](/v3/reference/api/index.md)");
    });

    it("does not prune source files when given an unsafe output directory", async () => {
        await expect(run({ outDir: docsRoot })).rejects.toThrow("must not contain");
        await expect(run({ outDir: root })).rejects.toThrow("must not contain");
        expect(fs.existsSync(path.join(docsRoot, "index.md"))).toBe(true);
    });

    it("keeps fragment links attached to their page in the full bundle", async () => {
        write("guide.md", "# Guide\n\n[Details](#details)\n\n## Details\n");
        const { outputs } = await run();
        expect(outputs.get("llms-full.txt")).toContain("[Details](/v3/guide.md#details)");
    });

    it("rejects recursive includes", async () => {
        write("loop.md", "<!-- @include: loop.md -->\n");
        await expect(run()).rejects.toThrow("Circular Markdown include");
    });

    it("prunes deleted exports and leaves unchanged output files untouched", async () => {
        write("old.md", "# Old\n");
        await run();
        const before = fs.statSync(path.join(outDir, "index.md")).mtimeMs;
        const repeated = await run();
        expect(repeated.written).toBe(0);
        expect(fs.statSync(path.join(outDir, "index.md")).mtimeMs).toBe(before);
        fs.unlinkSync(path.join(docsRoot, "old.md"));
        const changed = await run();
        expect(changed.removed).toBe(1);
        expect(changed.outputs.get("llms.txt")).not.toContain("old.md");
    });
});
