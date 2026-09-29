import { syncRenderedFiles } from "../../../js/utils/sync-rendered-files.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("syncRenderedFiles", () => {
    let root;

    const write = (rel, contents) => {
        const target = path.join(root, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
        return target;
    };

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-rendered-files-"));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it("writes new files and leaves a file with the same contents untouched", async () => {
        const kept = write("api/kept.md", "same");
        const past = new Date("2020-01-01T00:00:00Z");
        fs.utimesSync(kept, past, past);

        const outputs = new Map([
            [
                path.join(root, "api"),
                new Map([
                    ["kept.md", "same"],
                    ["js/new.md", "new"],
                ]),
            ],
        ]);
        const counts = await syncRenderedFiles(outputs);

        expect(counts).toEqual({ written: 1, unchanged: 1, removed: 0 });
        expect(fs.statSync(kept).mtime).toEqual(past);
        expect(fs.readFileSync(path.join(root, "api/js/new.md"), "utf-8")).toBe("new");
    });

    it("rewrites a file whose contents changed", async () => {
        write("api/page.md", "old");

        const outputs = new Map([[path.join(root, "api"), new Map([["page.md", "new"]])]]);
        const counts = await syncRenderedFiles(outputs);

        expect(counts.written).toBe(1);
        expect(fs.readFileSync(path.join(root, "api/page.md"), "utf-8")).toBe("new");
    });

    it("removes stale files under a prune root and the directories they leave empty", async () => {
        write("api/kept.md", "same");
        write("api/gone/stale.md", "stale");

        const outputs = new Map([[path.join(root, "api"), new Map([["kept.md", "same"]])]]);
        const counts = await syncRenderedFiles(outputs, { pruneRoots: [path.join(root, "api")] });

        expect(counts.removed).toBe(1);
        expect(fs.existsSync(path.join(root, "api/gone"))).toBe(false);
        expect(fs.existsSync(path.join(root, "api/kept.md"))).toBe(true);
    });

    it("removes a stale prune root that is a single file", async () => {
        write("theming/keys.md", "stale");

        const counts = await syncRenderedFiles(new Map(), { pruneRoots: [path.join(root, "theming/keys.md")] });

        expect(counts.removed).toBe(1);
        expect(fs.existsSync(path.join(root, "theming/keys.md"))).toBe(false);
        expect(fs.existsSync(path.join(root, "theming"))).toBe(true);
    });

    it("leaves files outside the prune roots alone", async () => {
        write("theming/authored.md", "keep");
        write("api/stale.md", "stale");

        await syncRenderedFiles(new Map(), { pruneRoots: [path.join(root, "api")] });

        expect(fs.existsSync(path.join(root, "theming/authored.md"))).toBe(true);
    });

    it("deletes nothing without prune roots", async () => {
        write("api/stale.md", "stale");

        const counts = await syncRenderedFiles(new Map());

        expect(counts.removed).toBe(0);
        expect(fs.existsSync(path.join(root, "api/stale.md"))).toBe(true);
    });

    it("tolerates a prune root that does not exist yet", async () => {
        const counts = await syncRenderedFiles(new Map(), { pruneRoots: [path.join(root, "missing")] });

        expect(counts.removed).toBe(0);
    });
});
