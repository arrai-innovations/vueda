import { markdownDocsPlugin } from "../../../js/vite/markdown-docs.js";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root;
let docsRoot;
let plugin;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "vueda-markdown-plugin-"));
    docsRoot = path.join(root, "docs");
    fs.mkdirSync(docsRoot);
    fs.writeFileSync(path.join(docsRoot, "index.md"), "# Home\n");
    fs.writeFileSync(path.join(docsRoot, "guide.md"), "# Guide\n\nBefore edit.\n");
    plugin = markdownDocsPlugin({ docsRoot, repoRoot: root, siteUrl: "https://example.com" });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

async function devServer() {
    let middleware;
    const warn = vi.fn();
    const watcher = new EventEmitter();
    watcher.add = () => {};
    plugin.configResolved({ base: "/v3/", build: {}, command: "serve" });
    await plugin.configureServer({
        config: { logger: { warn } },
        watcher,
        middlewares: {
            use: (handler) => {
                middleware = handler;
            },
        },
    });
    const request = async (url, headers = {}) => {
        const result = { headers: {} };
        await middleware(
            { url, headers },
            {
                setHeader: (name, value) => {
                    result.headers[name] = value;
                },
                end: (body) => {
                    result.body = body;
                },
            },
            (error) => {
                result.next = true;
                result.error = error;
            },
        );
        return result;
    };
    return { watcher, request, warn };
}

describe("Markdown Vite integration", () => {
    it("exports before bundling and emits stable filenames only in the client build", async () => {
        plugin.configResolved({ base: "/v3/", build: {}, command: "build" });
        await plugin.buildStart();
        const assets = [];
        plugin.generateBundle.call({ emitFile: (asset) => assets.push(asset) });
        expect(assets.map((asset) => asset.fileName)).toEqual([
            "guide.md",
            "index.md",
            "llms.txt",
            "symbols.json",
            "llms-full.txt",
        ]);
        expect(assets.find((asset) => asset.fileName === "llms.txt").source).toContain(
            "https://example.com/v3/guide.md",
        );
        plugin.configResolved({ base: "/v3/", build: { ssr: true }, command: "build" });
        plugin.generateBundle.call({ emitFile: (asset) => assets.push(asset) });
        expect(assets).toHaveLength(5);
    });

    it("serves raw documents while letting Vue module imports reach Vite", async () => {
        const { request } = await devServer();
        const raw = await request("/v3/guide.md");
        expect(raw.body).toContain("Before edit.");
        expect(raw.headers["Content-Type"]).toBe("text/markdown; charset=utf-8");
        expect((await request("/v3/llms.txt")).headers["Content-Type"]).toBe("text/plain; charset=utf-8");
        const symbols = await request("/v3/symbols.json");
        expect(symbols.headers["Content-Type"]).toBe("application/json; charset=utf-8");
        expect(JSON.parse(symbols.body)).toEqual({ version: 1, symbols: [] });
        expect((await request("/v3/guide.md", { "sec-fetch-dest": "script" })).next).toBe(true);
        expect((await request("/v3/guide.md?import")).next).toBe(true);
        expect((await request("/guide.md")).next).toBe(true);
        expect((await request("/v3/AGENTS.md")).next).toBe(true);
    });

    it("refreshes symbol names and member URLs when reference pages change", async () => {
        const { request, watcher } = await devServer();
        const file = path.join(docsRoot, "reference/api/js/Widget.md");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, '---\nid: js:class:Widget\nmember_ids: ["js:method:Widget.save"]\n---\n# Widget\n');
        watcher.emit("all", "add", file);
        const symbols = JSON.parse((await request("/v3/symbols.json")).body).symbols;
        expect(symbols).toContainEqual({
            id: "js:method:Widget.save",
            name: "Widget.save",
            url: "https://example.com/v3/reference/api/js/Widget.md#save",
        });
        fs.unlinkSync(file);
        watcher.emit("all", "unlink", file);
        expect(JSON.parse((await request("/v3/symbols.json")).body).symbols).toEqual([]);
    });

    it("refreshes edited, added and deleted pages without restarting the server", async () => {
        const { request, watcher } = await devServer();
        const guide = path.join(docsRoot, "guide.md");
        fs.writeFileSync(guide, "# Guide\n\nAfter edit.\n");
        watcher.emit("all", "change", guide);
        expect((await request("/v3/guide.md")).body).toContain("After edit.");
        const added = path.join(docsRoot, "new.md");
        fs.writeFileSync(added, "# Added\n");
        watcher.emit("all", "add", added);
        expect((await request("/v3/llms.txt")).body).toContain("/v3/new.md");
        fs.unlinkSync(added);
        watcher.emit("all", "unlink", added);
        expect((await request("/v3/new.md")).next).toBe(true);
        expect((await request("/v3/llms.txt")).body).not.toContain("/v3/new.md");
    });

    it("reports export errors instead of serving stale content", async () => {
        const { request, watcher } = await devServer();
        const guide = path.join(docsRoot, "guide.md");
        fs.writeFileSync(guide, "# Guide\n\n{@api missing}\n");
        watcher.emit("all", "change", guide);
        const result = await request("/v3/guide.md");
        expect(result.error.message).toContain("Unknown API id");
        expect(result.body).toBeUndefined();
    });

    it("allows HTML development when draft references prevent Markdown export", async () => {
        fs.writeFileSync(path.join(docsRoot, "guide.md"), "# Draft\n\n{@api missing}\n");
        const { request, warn } = await devServer();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("Markdown export unavailable"));
        expect((await request("/v3/guide.html")).next).toBe(true);
        expect((await request("/v3/guide.md")).error.message).toContain("Unknown API id");
    });
});
