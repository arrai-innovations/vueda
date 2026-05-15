import { ThemeKeysExtractor } from "../../../js/extractors/theme-keys.js";
import { ThemeKeysNormalizer } from "../../../js/normalizers/theme-keys.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "theme-keys");
const fixturePath = path.join(fixtureDir, "sample.js");

async function extractFixture() {
    const tempDir = await mkdtemp(path.join(tmpdir(), "theme-keys-norm-"));
    const outputPath = path.join(tempDir, "theme-keys.json");
    try {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [fixturePath] });
        return JSON.parse(await readFile(outputPath, "utf-8"));
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

describe("ThemeKeysNormalizer", () => {
    let payload;

    beforeEach(async () => {
        payload = await extractFixture();
    });
    afterEach(() => {
        payload = null;
    });

    it("emits a bundle with schemaVersion and source: theme-keys", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        expect(bundle.schemaVersion).toBe("1.0");
        expect(bundle.source).toBe("theme-keys");
        expect(Array.isArray(bundle.families)).toBe(true);
    });

    it("groups slots into families and components in encounter order", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        expect(bundle.families.length).toBe(1);
        const family = bundle.families[0];
        expect(family.name).toBe("theme-keys");
        const componentNames = family.components.map((c) => c.name);
        expect(componentNames).toEqual([
            "_ButtonBase",
            "_ButtonGhost",
            "Button",
            "CalendarCellTrigger",
            "Toggle",
            "Bare",
        ]);
    });

    it("assigns each slot an id of theme-key:<Component>.<slot>", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        const family = bundle.families[0];
        const button = family.components.find((c) => c.name === "Button");
        const ids = button.slots.map((s) => s.id);
        expect(ids).toContain("theme-key:Button.root");
        expect(ids).toContain("theme-key:Button.icon");
    });

    it("preserves valueShape, defaultClasses, callbackSource, composes per slot", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        const family = bundle.families[0];
        const cct = family.components.find((c) => c.name === "CalendarCellTrigger").slots[0];
        expect(cct.valueShape).toBe("static");
        expect(cct.defaultClasses).toEqual(["size-8", "p-0", "bg-primary"]);
        expect(cct.callbackSource).toBeNull();
        expect(cct.composes).toEqual(["_ButtonBase.root"]);

        const buttonRoot = family.components.find((c) => c.name === "Button").slots.find((s) => s.name === "root");
        expect(buttonRoot.valueShape).toBe("callback");
        expect(buttonRoot.callbackSource).toContain("({ variant })");
        expect(buttonRoot.defaultClasses).toBeNull();
    });

    it("marks underscore-prefixed components as kind: primitive", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        const family = bundle.families[0];
        const base = family.components.find((c) => c.name === "_ButtonBase");
        expect(base.kind).toBe("primitive");
        expect(base.slots[0].kind).toBe("primitive");
        const button = family.components.find((c) => c.name === "Button");
        expect(button.kind).toBe("key");
    });

    it("attaches the most recent banner as the component group", () => {
        const bundle = new ThemeKeysNormalizer().normalize(payload);
        const family = bundle.families[0];
        const base = family.components.find((c) => c.name === "_ButtonBase");
        expect(base.group).toBe("Button-family meta keys");
        const toggle = family.components.find((c) => c.name === "Toggle");
        expect(toggle.group).toBe("Toggles");
    });

    it("returns an empty families array for an empty payload", () => {
        const bundle = new ThemeKeysNormalizer().normalize({ sources: [], entries: [] });
        expect(bundle).toEqual({ schemaVersion: "1.0", source: "theme-keys", families: [] });
    });
});
