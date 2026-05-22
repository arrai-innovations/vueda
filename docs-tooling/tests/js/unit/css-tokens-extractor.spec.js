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

    it("assigns each declaration to the banner group at its source line", async () => {
        const css = `:root {
    /* ---------- Group A ---------- */
    --a-one: 1px;
    --a-two: 2px;

    /* ---------- Group B ---------- */
    --b-one: 3px;

    /* ---------- Group C ---------- */
    --c-one: 4px;
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const byName = Object.fromEntries(payload.scopes.root.map((d) => [d.name, d.group]));
        expect(byName["--a-one"]).toBe("Group A");
        expect(byName["--a-two"]).toBe("Group A");
        expect(byName["--b-one"]).toBe("Group B");
        expect(byName["--c-one"]).toBe("Group C");
    });

    it("falls back to the 'Base' group for declarations before any banner", async () => {
        const css = `:root {
    --no-banner: 1px;

    /* ---------- After ---------- */
    --after: 2px;
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const noBanner = payload.scopes.root.find((d) => d.name === "--no-banner");
        expect(noBanner.group).toBe("Base");
    });

    it("silently skips @theme inline declarations whose value is not a var() reference", async () => {
        const css = `@theme inline {
    --color-primary: var(--primary);
    --spacing-fixed: 4px;
    --radius-bare: oklch(0.5 0 0);
}

:root {
    --primary: oklch(0.58 0.19 254);
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        // Only the var() mapping is captured.
        expect(Object.keys(payload.themeMapping)).toEqual(["primary"]);
    });

    it("captures dark-only tokens in scopes.dark and not in scopes.root", async () => {
        const css = `:root {
    --shared: 1px;
}

.dark {
    --shared: 2px;
    --only-dark: oklch(0.3 0 0);
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        expect(payload.scopes.root.find((d) => d.name === "--only-dark")).toBeUndefined();
        const onlyDark = payload.scopes.dark.find((d) => d.name === "--only-dark");
        expect(onlyDark).toBeTruthy();
        expect(onlyDark.value).toBe("oklch(0.3 0 0)");
    });

    it("returns description: null for declarations with no trailing comment", async () => {
        const css = `:root {
    --plain: 4px;
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const plain = payload.scopes.root.find((d) => d.name === "--plain");
        expect(plain.description).toBeNull();
    });

    it("does not pick up a comment on a different line as an inline description", async () => {
        const css = `:root {
    --foo: 4px;
    /* this is on the next line, not trailing */
    --bar: 5px;
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const foo = payload.scopes.root.find((d) => d.name === "--foo");
        expect(foo.description).toBeNull();
    });

    it("preserves multi-line values across continuations", async () => {
        const css = `:root {
    --shadow-stack: 0 1px 2px rgba(0, 0, 0, 0.1),
        0 2px 4px rgba(0, 0, 0, 0.05),
        0 4px 8px rgba(0, 0, 0, 0.025);
}
`;
        await writeFile(cssPath, css);
        const extractor = new CssTokensExtractor();
        await extractor.extract({ outputPath, baseCss: cssPath });
        const payload = JSON.parse(await readFile(outputPath, "utf-8"));
        const shadow = payload.scopes.root.find((d) => d.name === "--shadow-stack");
        expect(shadow.value).toContain("0 1px 2px rgba(0, 0, 0, 0.1)");
        expect(shadow.value).toContain("0 2px 4px rgba(0, 0, 0, 0.05)");
        expect(shadow.value).toContain("0 4px 8px rgba(0, 0, 0, 0.025)");
    });
});
