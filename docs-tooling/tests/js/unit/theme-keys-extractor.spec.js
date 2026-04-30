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
        expect(slot.shape).toBe("object");
        expect(slot.composes).toEqual(["_ButtonBase.root", "_ButtonGhost.root"]);
        expect(slot.rawClasses).toEqual(["size-8", "p-0"]);
    });

    it("flags function-form slots with shape: function and empty composes/rawClasses", async () => {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        const button = payload.entries.find((e) => e.name === "Button");
        const slot = button.slots.find((s) => s.name === "root");
        expect(slot.shape).toBe("function");
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

    it("aggregates entries across multiple source files preserving order", async () => {
        const second = path.join(tempDir, "navigation.js");
        await writeFile(
            second,
            `export default {
    NavItem: { root: { class: ["px-1"] } },
};
`,
        );
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath, second] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const names = payload.entries.map((e) => e.name);
        expect(names).toContain("NavItem");
        // controls.js entries appear before navigation.js entries.
        expect(names.indexOf("Button")).toBeLessThan(names.indexOf("NavItem"));
        expect(payload.sourceFiles.length).toBe(2);
        // The NavItem entry is tagged with its own source file, not the first.
        const navItem = payload.entries.find((e) => e.name === "NavItem");
        expect(navItem.source.file).toMatch(/navigation\.js$/);
    });

    it("captures an entry with no slots as an empty slots array", async () => {
        const code = `export default {
    Empty: {},
};
`;
        await writeFile(srcPath, code);
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const empty = payload.entries.find((e) => e.name === "Empty");
        expect(empty).toBeDefined();
        expect(empty.slots).toEqual([]);
    });

    it("returns no entries when the file has no default-export object", async () => {
        const code = `export const notDefault = { Foo: { root: { class: "x" } } };
`;
        await writeFile(srcPath, code);
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        expect(payload.entries).toEqual([]);
    });

    it("skips non-literal composes entries (dynamic refs) without throwing", async () => {
        const code = `const variantKey = "_X.root";
export default {
    Foo: {
        root: {
            composes: ["_ButtonBase.root", variantKey, \`\${variantKey}\`],
            class: ["px-2"],
        },
    },
};
`;
        await writeFile(srcPath, code);
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const foo = payload.entries.find((e) => e.name === "Foo");
        expect(foo.slots[0].composes).toEqual(["_ButtonBase.root"]);
    });

    it("supports string-literal entry keys", async () => {
        const code = `export default {
    "Quoted-Name": { root: { class: ["a"] } },
};
`;
        await writeFile(srcPath, code);
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [srcPath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        expect(payload.entries.map((e) => e.name)).toContain("Quoted-Name");
    });

    it("rejects on malformed source (parse error)", async () => {
        await writeFile(srcPath, `export default { Foo: { root: { class: [ }; `);
        const extractor = new ThemeKeysExtractor();
        await expect(extractor.extract({ outputPath, sources: [srcPath] })).rejects.toThrow();
    });
});
