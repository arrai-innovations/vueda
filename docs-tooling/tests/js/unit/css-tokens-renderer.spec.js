import { renderCssTokensBundle } from "../../../js/renderers/css-tokens.js";
import { describe, expect, it } from "vitest";

const BUNDLE = {
    kind: "css-tokens",
    tokens: [
        {
            name: "--primary",
            value: "oklch(0.58 0.19 254)",
            group: "Color palette",
            description: "Primary accent color.",
            source: { file: "base.css", line: 10, column: 5 },
            scope: "root",
            variants: { light: "oklch(0.58 0.19 254)", dark: "oklch(0.68 0.17 254)" },
            themeMapping: { utility: "color", property: "primary" },
        },
        {
            name: "--vueda-control-radius",
            value: "2px",
            group: "Radius",
            description: "Corner radius for slab controls.",
            source: { file: "base.css", line: 14, column: 5 },
            scope: "root",
            variants: { light: "2px" },
            themeMapping: { utility: "radius", property: "vueda-control" },
        },
    ],
    groups: [
        { name: "Color palette", description: null },
        { name: "Radius", description: null },
    ],
};

describe("renderCssTokensBundle", () => {
    it("emits a group page per group plus a tokens index", () => {
        const outputs = renderCssTokensBundle(BUNDLE);
        expect(outputs.has("theming/tokens.md")).toBe(true);
        expect(outputs.has("theming/tokens/color-palette.md")).toBe(true);
        expect(outputs.has("theming/tokens/radius.md")).toBe(true);
    });

    it("includes member_ids and per-token anchors in the group page", () => {
        const outputs = renderCssTokensBundle(BUNDLE);
        const page = outputs.get("theming/tokens/color-palette.md");
        expect(page).toContain('id: "theming:tokens:color-palette"');
        expect(page).toContain('"css-token:primary"');
        expect(page).toContain('<a id="css-token-primary"></a>');
        expect(page).toContain("oklch(0.58 0.19 254)");
        expect(page).toContain("oklch(0.68 0.17 254)");
    });

    it("emits an index page with theming:tokens id and links to each group", () => {
        const outputs = renderCssTokensBundle(BUNDLE);
        const index = outputs.get("theming/tokens.md");
        expect(index).toContain('id: "theming:tokens"');
        expect(index).toContain("./tokens/color-palette.md");
        expect(index).toContain("./tokens/radius.md");
    });
});
