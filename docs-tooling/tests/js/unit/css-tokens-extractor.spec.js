import { CssTokensExtractor } from "../../../js/extractors/css-tokens.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SAMPLE_CSS = `@theme inline {
    --color-primary: var(--primary);
    --radius-vueda-control: var(--vueda-control-radius);
    --font-sans: var(--vueda-font-sans);
}

:root {
    --radius: 0.25rem;

    /* ---------- Color palette: light ---------- */
    --primary: oklch(0.58 0.19 254);
    --primary-foreground: oklch(0.99 0.003 250);

    /* ---------- Semantic radius tokens ---------- */
    --vueda-control-radius: 2px; /* buttons, inputs, selects */
    --vueda-card-radius: 4px; /* cards, panels */
}

.dark {
    --primary: oklch(0.68 0.17 254);
}
`;

describe("CssTokensExtractor", () => {
    let tempDir;
    let cssPath;
    let outputPath;

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(tmpdir(), "css-tokens-extract-"));
        cssPath = path.join(tempDir, "base.css");
        outputPath = path.join(tempDir, "css-tokens.json");
        await writeFile(cssPath, SAMPLE_CSS);
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it("extracts root and dark declarations with groups and descriptions", async () => {
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        expect(Array.isArray(payload.scopes.root)).toBe(true);
        const primary = payload.scopes.root.find((d) => d.name === "--primary");
        expect(primary).toBeTruthy();
        expect(primary.value).toBe("oklch(0.58 0.19 254)");
        expect(primary.group).toBe("Color palette: light");

        const controlRadius = payload.scopes.root.find((d) => d.name === "--vueda-control-radius");
        expect(controlRadius.group).toBe("Semantic radius tokens");
        expect(controlRadius.description).toBe("buttons, inputs, selects");

        const darkPrimary = payload.scopes.dark.find((d) => d.name === "--primary");
        expect(darkPrimary.value).toBe("oklch(0.68 0.17 254)");
    });

    it("captures @theme inline mappings keyed by token name", async () => {
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));

        expect(payload.themeMapping.primary).toEqual({ utility: "color", property: "primary" });
        expect(payload.themeMapping["vueda-control-radius"]).toEqual({
            utility: "radius",
            property: "vueda-control",
        });
        expect(payload.themeMapping["vueda-font-sans"]).toEqual({
            utility: "font",
            property: "sans",
        });
    });

    it("requires outputPath", async () => {
        const extractor = new CssTokensExtractor();
        await expect(extractor.extract({ baseCss: cssPath })).rejects.toThrow(/outputPath/);
    });
});
