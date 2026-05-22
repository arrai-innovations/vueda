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

    it("emits only the master tokens.md (no group pages) for an empty tokens array", () => {
        const outputs = renderCssTokensBundle({ kind: "css-tokens", tokens: [], groups: [] });
        expect(outputs.size).toBe(1);
        expect(outputs.has("theming/tokens.md")).toBe(true);
        const index = outputs.get("theming/tokens.md");
        expect(index).toContain('id: "theming:tokens"');
        // No group bullets when there are no groups.
        expect(index).not.toContain("./tokens/");
    });

    it("returns an empty Map for a bundle whose kind is not css-tokens", () => {
        const outputs = renderCssTokensBundle({ kind: "typedoc", tokens: [], groups: [] });
        expect(outputs.size).toBe(0);
    });

    it("leaves the Tailwind utility column empty when themeMapping is null", () => {
        const outputs = renderCssTokensBundle({
            kind: "css-tokens",
            tokens: [
                {
                    name: "--no-mapping",
                    value: "1px",
                    group: "Misc",
                    description: null,
                    source: { file: "base.css", line: 1, column: 1 },
                    scope: "root",
                    variants: { light: "1px" },
                    themeMapping: null,
                },
            ],
            groups: [{ name: "Misc", description: null }],
        });
        const page = outputs.get("theming/tokens/misc.md");
        expect(page).toBeTruthy();
        expect(page).not.toContain("null");
        expect(page).not.toContain("undefined");
    });

    it("slugifies group names with spaces, colons, and slashes", () => {
        const outputs = renderCssTokensBundle({
            kind: "css-tokens",
            tokens: [
                {
                    name: "--x",
                    value: "1",
                    group: "Color palette: light / dark",
                    description: null,
                    source: { file: "base.css", line: 1, column: 1 },
                    scope: "root",
                    variants: { light: "1" },
                    themeMapping: null,
                },
            ],
            groups: [{ name: "Color palette: light / dark", description: null }],
        });
        // Find the group page key (excluding the index).
        const groupKey = Array.from(outputs.keys()).find(
            (k) => k !== "theming/tokens.md" && k.startsWith("theming/tokens/"),
        );
        expect(groupKey).toBeTruthy();
        // Slug should contain no colons or spaces.
        expect(groupKey).not.toMatch(/[ :]/);
        const slug = groupKey.replace(/^theming\/tokens\//, "").replace(/\.md$/, "");
        const page = outputs.get(groupKey);
        expect(page).toContain(`id: "theming:tokens:${slug}"`);
    });

    it("produces a member_id slug that strips the leading -- for vueda-prefixed tokens", () => {
        const outputs = renderCssTokensBundle({
            kind: "css-tokens",
            tokens: [
                {
                    name: "--vueda-cmd-input-height",
                    value: "32px",
                    group: "Command",
                    description: null,
                    source: { file: "base.css", line: 1, column: 1 },
                    scope: "root",
                    variants: { light: "32px" },
                    themeMapping: null,
                },
            ],
            groups: [{ name: "Command", description: null }],
        });
        const page = outputs.get("theming/tokens/command.md");
        expect(page).toContain('"css-token:vueda-cmd-input-height"');
        expect(page).toContain('<a id="css-token-vueda-cmd-input-height"></a>');
    });

    it("omits detail rows for fields that are not present on a token", () => {
        const outputs = renderCssTokensBundle({
            kind: "css-tokens",
            tokens: [
                {
                    name: "--dark-only",
                    value: "oklch(0.3 0 0)",
                    group: "Dark",
                    description: null,
                    source: {}, // no file, no line
                    scope: "dark",
                    variants: { dark: "oklch(0.3 0 0)" },
                    themeMapping: null,
                },
            ],
            groups: [{ name: "Dark", description: null }],
        });
        const page = outputs.get("theming/tokens/dark.md");
        expect(page).toBeTruthy();
        // Detail section should reference Dark but not Light, Tailwind utility, or Source.
        const detailStart = page.indexOf("--dark-only");
        const detailSection = page.slice(detailStart);
        expect(detailSection).toContain("| Dark |");
        expect(detailSection).not.toContain("| Light |");
        expect(detailSection).not.toContain("| Tailwind utility |");
        expect(detailSection).not.toContain("| Source |");
    });
});
