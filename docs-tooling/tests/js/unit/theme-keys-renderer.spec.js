import { ThemeKeysExtractor } from "../../../js/extractors/theme-keys.js";
import { ThemeKeysNormalizer } from "../../../js/normalizers/theme-keys.js";
import { renderThemeKeysBundle } from "../../../js/renderers/theme-keys.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "theme-keys");
const fixturePath = path.join(fixtureDir, "sample.js");

async function buildBundle() {
    const tempDir = await mkdtemp(path.join(tmpdir(), "theme-keys-render-"));
    const outputPath = path.join(tempDir, "theme-keys.json");
    try {
        const extractor = new ThemeKeysExtractor();
        await extractor.extract({ outputPath, sources: [fixturePath] });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        return new ThemeKeysNormalizer().normalize(payload);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

describe("renderThemeKeysBundle", () => {
    let bundle;
    let outputs;

    beforeEach(async () => {
        bundle = await buildBundle();
        outputs = renderThemeKeysBundle(bundle);
    });
    afterEach(() => {
        bundle = null;
        outputs = null;
    });

    it("emits a global index, a family index, and one page per component", () => {
        expect(outputs.has("theming/keys.md")).toBe(true);
        expect(outputs.has("theming/keys/family/theme-keys.md")).toBe(true);
        expect(outputs.has("theming/keys/Button.md")).toBe(true);
        expect(outputs.has("theming/keys/_ButtonBase.md")).toBe(true);
        expect(outputs.has("theming/keys/Toggle.md")).toBe(true);
        expect(outputs.has("theming/keys/CalendarCellTrigger.md")).toBe(true);
    });

    it("global index page has theming:keys id and a section per family with component tables", () => {
        const index = outputs.get("theming/keys.md");
        expect(index).toContain('id: "theming:keys"');
        expect(index).toContain("| Component | Kind | Slots | Description |");
        // Family heading links to family index page.
        expect(index).toContain("./keys/family/theme-keys.md");
        // Component rows link to per-component pages.
        expect(index).toContain("[Button](./keys/Button.md)");
        expect(index).toContain("[_ButtonBase](./keys/_ButtonBase.md)");
    });

    it("family index page has theming:keys:family:<slug> id and component table", () => {
        const page = outputs.get("theming/keys/family/theme-keys.md");
        expect(page).toContain('id: "theming:keys:family:theme-keys"');
        expect(page).toContain("| Component | Kind | Slots | Description |");
        // Family-page component link is relative to theming/keys/family/.
        expect(page).toContain("[Button](../Button.md)");
        expect(page).toContain("[_ButtonBase](../_ButtonBase.md)");
    });

    it("family index page sections by banner group when groups are present", () => {
        const page = outputs.get("theming/keys/family/theme-keys.md");
        const metaIdx = page.indexOf("## Button-family meta keys");
        const buttonsIdx = page.indexOf("## Buttons");
        const togglesIdx = page.indexOf("## Toggles");
        expect(metaIdx).toBeGreaterThan(-1);
        expect(buttonsIdx).toBeGreaterThan(metaIdx);
        expect(togglesIdx).toBeGreaterThan(buttonsIdx);
    });

    it("per-component page frontmatter exposes member ids for component and every slot", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain('id: "theming:keys:Button"');
        expect(page).toContain('"theme-key:Button"');
        expect(page).toContain('"theme-key:Button.root"');
        expect(page).toContain('"theme-key:Button.icon"');
        expect(page).toContain('family: "theme-keys"');
        expect(page).toContain('kind: "key"');
    });

    it("per-component page emits H1 title, source footer, and slot summary table", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain("# Button");
        expect(page).toMatch(/Source:\s+`[^`]*sample\.js`/);
        expect(page).toContain("| Slot | Default classes | Description |");
        expect(page).toContain("[root](#theme-key-Button-root)");
        expect(page).toContain("[icon](#theme-key-Button-icon)");
    });

    it("per-component page emits anchor and H2 detail block per slot", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain('<a id="theme-key-Button-root"></a>');
        expect(page).toContain('<a id="theme-key-Button-icon"></a>');
        expect(page).toMatch(/##\s+root/);
        expect(page).toMatch(/##\s+icon/);
    });

    it("per-component page renders callback sources inside fenced javascript blocks", () => {
        const buttonPage = outputs.get("theming/keys/Button.md");
        const togglePage = outputs.get("theming/keys/Toggle.md");
        expect(buttonPage).toMatch(/```javascript[\s\S]+?\({ variant }\)[\s\S]+?```/);
        expect(togglePage).toMatch(/```javascript[\s\S]+?\({ size }\)[\s\S]+?```/);
    });

    it("per-component page renders composes references as inline code chips", () => {
        const page = outputs.get("theming/keys/CalendarCellTrigger.md");
        expect(page).toContain("Composes: ");
        expect(page).toContain("`_ButtonBase.root`");
    });

    it("per-component page renders descriptions as blockquotes", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain("> Primary button surface used across action contexts.");
        expect(page).toContain("> Optional decorative icon slot.");
    });

    it("renders slots without a description and no blockquote", () => {
        const page = outputs.get("theming/keys/CalendarCellTrigger.md");
        const start = page.indexOf('<a id="theme-key-CalendarCellTrigger-root">');
        const end = page.indexOf("Source:", start);
        const block = page.slice(start, end);
        expect(block.split("\n").some((line) => line.startsWith("> "))).toBe(false);
    });

    it("renders each slot detail with a Source: <file>:<line> footer", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toMatch(/Source:\s+`[^`]*\.theme\.js:\d+`/);
    });

    it("renders primitive components with an italic composition-primitive note and primitive frontmatter kind", () => {
        const page = outputs.get("theming/keys/_ButtonBase.md");
        expect(page).toContain('kind: "primitive"');
        expect(page).toContain("_Composition primitive, consumed by leaf keys via `composes`._");
        expect(page).toContain("# _ButtonBase");
    });

    it("emits a vue-docgen back-link only when the component is in componentNames", () => {
        const linked = renderThemeKeysBundle(bundle, { componentNames: new Set(["Button"]) });
        const buttonPage = linked.get("theming/keys/Button.md");
        expect(buttonPage).toContain("Vue component: {@api vue:component:Button}");

        const togglePage = linked.get("theming/keys/Toggle.md");
        expect(togglePage).not.toContain("Vue component:");

        const primitivePage = linked.get("theming/keys/_ButtonBase.md");
        expect(primitivePage).not.toContain("Vue component:");
    });

    it("omits the vue-docgen back-link when componentNames is not provided", () => {
        const page = outputs.get("theming/keys/Button.md");
        expect(page).not.toContain("Vue component:");
    });

    it("renders components that have no description without a leading blockquote on the page", () => {
        const page = outputs.get("theming/keys/Toggle.md");
        // The component-level blockquote sits between the source footer and the
        // summary table; Toggle has no JSDoc, so nothing should appear there.
        const sourceIdx = page.indexOf("Source:");
        const tableIdx = page.indexOf("| Slot |");
        expect(sourceIdx).toBeGreaterThan(-1);
        expect(tableIdx).toBeGreaterThan(sourceIdx);
        const between = page.slice(sourceIdx, tableIdx);
        expect(between.split("\n").some((line) => line.startsWith("> "))).toBe(false);
    });

    it("returns an empty Map for a bundle whose source is not theme-keys", () => {
        const empty = renderThemeKeysBundle({ source: "css-tokens", families: [] });
        expect(empty.size).toBe(0);
    });

    it("emits only the global index page for an empty families array", () => {
        const empty = renderThemeKeysBundle({
            source: "theme-keys",
            schemaVersion: "1.0",
            families: [],
        });
        expect(empty.size).toBe(1);
        expect(empty.has("theming/keys.md")).toBe(true);
    });
});
