import { ThemeKeysExtractor } from "../../../js/extractors/theme-keys.js";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "theme-keys");
const fixturePath = path.join(fixtureDir, "sample.js");

describe("ThemeKeysExtractor", () => {
    let tempDir;
    let outputPath;

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(tmpdir(), "theme-keys-extract-"));
        outputPath = path.join(tempDir, "theme-keys.json");
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    async function runExtractor(sources = [fixturePath]) {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources });
        return JSON.parse(await readFile(outputPath, "utf-8"));
    }

    it("emits one entry per slot with family, component, slot, kind", async () => {
        const payload = await runExtractor();
        const ids = payload.entries.map((e) => `${e.component}.${e.slot}`);
        expect(ids).toContain("_ButtonBase.root");
        expect(ids).toContain("_ButtonGhost.root");
        expect(ids).toContain("Button.root");
        expect(ids).toContain("Button.icon");
        expect(ids).toContain("CalendarCellTrigger.root");
        expect(ids).toContain("Toggle.root");
        expect(ids).toContain("Bare.root");

        const base = payload.entries.find((e) => e.component === "_ButtonBase");
        expect(base.kind).toBe("primitive");
        const button = payload.entries.find((e) => e.component === "Button" && e.slot === "root");
        expect(button.kind).toBe("key");
    });

    it("classifies a callback slot value as valueShape: callback and captures source", async () => {
        const payload = await runExtractor();
        const button = payload.entries.find((e) => e.component === "Button" && e.slot === "root");
        expect(button.valueShape).toBe("callback");
        expect(button.staticClass).toBeNull();
        expect(button.callbackSource).toContain("({ variant })");
        expect(button.callbackSource).toContain("_ButtonBase.root");
        expect(button.composes).toEqual([]);
    });

    it("captures static class strings and nested object keys", async () => {
        const payload = await runExtractor();
        const cct = payload.entries.find((e) => e.component === "CalendarCellTrigger");
        expect(cct.valueShape).toBe("static");
        expect(cct.staticClass).toEqual(["size-8", "p-0", "bg-primary"]);
        expect(cct.composes).toEqual(["_ButtonBase.root"]);
    });

    it("normalises a bare string class to a one-element array", async () => {
        const payload = await runExtractor();
        const bare = payload.entries.find((e) => e.component === "Bare");
        expect(bare.valueShape).toBe("static");
        expect(bare.staticClass).toEqual(["single-class"]);
    });

    it("classifies a slot with a callback class as valueShape: callback", async () => {
        const payload = await runExtractor();
        const toggle = payload.entries.find((e) => e.component === "Toggle");
        expect(toggle.valueShape).toBe("callback");
        expect(toggle.callbackSource).toContain("({ size })");
        expect(toggle.staticClass).toBeNull();
    });

    it("warns with source context when static classes use an unsupported call expression", async () => {
        const familyDir = path.join(tempDir, "joined-family");
        const indexPath = path.join(familyDir, "index.js");
        await mkdir(familyDir, { recursive: true });
        await writeFile(indexPath, "export default { Joined: {} };\n");
        await writeFile(
            path.join(familyDir, "Joined.theme.js"),
            `
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    Joined: {
        root: {
            class: ["inline-flex", "items-center"].join(" "),
        },
    },
});
`,
        );

        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const payload = await runExtractor([indexPath]);
            const joined = payload.entries.find((e) => e.component === "Joined" && e.slot === "root");
            expect(joined.staticClass).toEqual([]);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported class expression "CallExpression"'));
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("Joined.root"));
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("Joined.theme.js"));
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('do not use .join(" ")'));
        } finally {
            warn.mockRestore();
        }
    });

    it("assigns the most recent banner comment as the group for following components", async () => {
        const payload = await runExtractor();
        const base = payload.entries.find((e) => e.component === "_ButtonBase");
        expect(base.group).toBe("Button-family meta keys");
        const button = payload.entries.find((e) => e.component === "Button" && e.slot === "root");
        expect(button.group).toBe("Buttons");
        const toggle = payload.entries.find((e) => e.component === "Toggle");
        expect(toggle.group).toBe("Toggles");
    });

    it("captures JSDoc descriptions on slots and falls back to component JSDoc", async () => {
        const payload = await runExtractor();
        const buttonRoot = payload.entries.find((e) => e.component === "Button" && e.slot === "root");
        expect(buttonRoot.description).toMatch(/Primary button surface/);
        const buttonIcon = payload.entries.find((e) => e.component === "Button" && e.slot === "icon");
        expect(buttonIcon.description).toMatch(/decorative icon slot/);
        const cct = payload.entries.find((e) => e.component === "CalendarCellTrigger");
        expect(cct.description).toBeNull();
    });

    it("records a source location with file, line, and column for each slot", async () => {
        const payload = await runExtractor();
        for (const entry of payload.entries) {
            expect(entry.source.file).toMatch(/\.theme\.js$/);
            expect(entry.source.line).toBeGreaterThan(0);
            expect(typeof entry.source.column).toBe("number");
        }
    });

    it("computes family from the source directory", async () => {
        const payload = await runExtractor();
        for (const entry of payload.entries) {
            expect(entry.family).toBe("theme-keys");
        }
        // payload.sources lists the index/manifest file; per-slot source.file points at the theme file
        expect(payload.sources[0]).toMatch(/sample\.js$/);
        expect(payload.entries[0].source.file).toMatch(/\.theme\.js$/);
    });

    it("requires outputPath", async () => {
        const extractor = new ThemeKeysExtractor();
        await expect(extractor.extract({ sources: [fixturePath] })).rejects.toThrow(/outputPath/);
    });
});
