import { ThemeKeysExtractor } from "../../../js/extractors/theme-keys.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SAMPLE = `export default {
    _ButtonBase: {
        root: {
            class: ["inline-flex items-center"],
        },
    },
    _ButtonGhost: {
        root: { class: "hover:bg-accent" },
    },
    Button: {
        root: ({ variant }) => ({
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["px-2"],
        }),
    },
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["size-8", "p-0"],
        },
    },
};
`;

describe("ThemeKeysExtractor", () => {
    let tempDir;
    let srcPath;
    let outputPath;

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(tmpdir(), "theme-keys-extract-"));
        srcPath = path.join(tempDir, "controls.js");
        outputPath = path.join(tempDir, "theme-keys.json");
        await writeFile(srcPath, SAMPLE);
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it("extracts every top-level entry with isMetaKey set for underscore-prefixed names", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        const names = payload.entries.map((e) => e.name);
        expect(names).toEqual(["_ButtonBase", "_ButtonGhost", "Button", "CalendarCellTrigger"]);

        const meta = payload.entries.filter((e) => e.isMetaKey).map((e) => e.name);
        expect(meta).toEqual(["_ButtonBase", "_ButtonGhost"]);
    });

    it("captures composes references and rawClasses for static slots", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        const cct = payload.entries.find((e) => e.name === "CalendarCellTrigger");
        const slot = cct.slots.find((s) => s.name === "root");
        expect(slot.isFunction).toBe(false);
        expect(slot.composes).toEqual(["_ButtonBase.root", "_ButtonGhost.root"]);
        expect(slot.rawClasses).toEqual(["size-8", "p-0"]);
    });

    it("flags function-form slots with isFunction: true and empty composes/rawClasses", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        const button = payload.entries.find((e) => e.name === "Button");
        const slot = button.slots.find((s) => s.name === "root");
        expect(slot.isFunction).toBe(true);
        expect(slot.composes).toEqual([]);
        expect(slot.rawClasses).toEqual([]);
    });

    it("captures source file and line for each entry and slot", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        const base = payload.entries.find((e) => e.name === "_ButtonBase");
        expect(base.source.file).toMatch(/controls\.js$/);
        expect(base.source.line).toBeGreaterThan(0);
        expect(base.slots[0].source.line).toBeGreaterThan(base.source.line - 1);
    });

    it("produces description: null in stage 2", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        for (const entry of payload.entries) {
            expect(entry.description).toBeNull();
        }
    });

    it("requires outputPath", async () => {
        const extractor = new ThemeKeysExtractor();
        await expect(extractor.extract({ sources: [srcPath] })).rejects.toThrow(/outputPath/);
    });

    it("captures string-literal class shorthand alongside array form", async () => {
        const code = `export default {
    Foo: {
        root: { class: "single-class" },
    },
};
`;
        await writeFile(srcPath, code);
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const foo = payload.entries.find((e) => e.name === "Foo");
        expect(foo.slots[0].rawClasses).toEqual(["single-class"]);
    });
});
