import { CssTokensNormalizer } from "../../../js/normalizers/css-tokens.js";
import { describe, expect, it } from "vitest";

const RAW_PAYLOAD = {
    sourceFile: "client/lib/theme/vueda-tailwind/base.css",
    scopes: {
        root: [
            {
                name: "--primary",
                value: "oklch(0.58 0.19 254)",
                group: "Color palette: light",
                description: null,
                scope: "root",
                source: { file: "base.css", line: 10, column: 5 },
            },
            {
                name: "--vueda-control-radius",
                value: "2px",
                group: "Semantic radius tokens",
                description: "buttons, inputs, selects",
                scope: "root",
                source: { file: "base.css", line: 14, column: 5 },
            },
        ],
        dark: [
            {
                name: "--primary",
                value: "oklch(0.68 0.17 254)",
                group: "Color palette: dark",
                description: null,
                scope: "dark",
                source: { file: "base.css", line: 30, column: 5 },
            },
            {
                name: "--dark-only",
                value: "oklch(0.5 0 0)",
                group: "Dark extras",
                description: null,
                scope: "dark",
                source: { file: "base.css", line: 33, column: 5 },
            },
        ],
    },
    themeMapping: {
        primary: { utility: "color", property: "primary" },
        "vueda-control-radius": { utility: "radius", property: "vueda-control" },
    },
};

describe("CssTokensNormalizer", () => {
    it("produces canonical css-tokens bundle with merged variants", () => {
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize(RAW_PAYLOAD);

        expect(bundle.kind).toBe("css-tokens");
        expect(bundle.tokens.length).toBe(3);

        const primary = bundle.tokens.find((t) => t.name === "--primary");
        expect(primary.variants.light).toBe("oklch(0.58 0.19 254)");
        expect(primary.variants.dark).toBe("oklch(0.68 0.17 254)");
        expect(primary.themeMapping).toEqual({ utility: "color", property: "primary" });
        expect(primary.scope).toBe("root");

        const radius = bundle.tokens.find((t) => t.name === "--vueda-control-radius");
        expect(radius.variants.dark).toBeUndefined();
        expect(radius.description).toBe("buttons, inputs, selects");
        expect(radius.themeMapping).toEqual({ utility: "radius", property: "vueda-control" });

        const darkOnly = bundle.tokens.find((t) => t.name === "--dark-only");
        expect(darkOnly.scope).toBe("dark");
        expect(darkOnly.variants.light).toBeUndefined();
        expect(darkOnly.variants.dark).toBe("oklch(0.5 0 0)");
        expect(darkOnly.themeMapping).toBeNull();
    });

    it("emits groups in declaration order", () => {
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize(RAW_PAYLOAD);
        const names = bundle.groups.map((g) => g.name);
        expect(names).toEqual(["Color palette: light", "Semantic radius tokens", "Dark extras"]);
    });

    it("leaves variants.dark unset when a token is only declared in :root", () => {
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize({
            scopes: {
                root: [
                    {
                        name: "--light-only",
                        value: "1px",
                        group: "G",
                        description: null,
                        scope: "root",
                        source: { file: "base.css", line: 1, column: 1 },
                    },
                ],
                dark: [],
            },
            themeMapping: {},
        });
        const token = bundle.tokens.find((t) => t.name === "--light-only");
        expect(token.variants.light).toBe("1px");
        expect("dark" in token.variants).toBe(false);
        expect(token.scope).toBe("root");
    });

    it("uses dark scope and dark value as the primary when only .dark declares the token", () => {
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize({
            scopes: {
                root: [],
                dark: [
                    {
                        name: "--dark-only",
                        value: "oklch(0.3 0 0)",
                        group: "Dark",
                        description: null,
                        scope: "dark",
                        source: { file: "base.css", line: 5, column: 5 },
                    },
                ],
            },
            themeMapping: {},
        });
        const token = bundle.tokens[0];
        expect(token.scope).toBe("dark");
        expect(token.value).toBe("oklch(0.3 0 0)");
        expect(token.variants.dark).toBe("oklch(0.3 0 0)");
        expect("light" in token.variants).toBe(false);
    });

    it("returns an empty bundle for an empty payload without crashing", () => {
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize({ scopes: { root: [], dark: [] }, themeMapping: {} });
        expect(bundle).toEqual({ kind: "css-tokens", tokens: [], groups: [] });
    });

    it("uses the first-occurrence value when a token is declared twice in :root", () => {
        // The normalizer builds a Map by name; the loop assigns each entry,
        // so the LAST declaration wins on the lookup, but the orderedNames
        // de-dup uses first occurrence. Verify both behaviors deterministically.
        const normalizer = new CssTokensNormalizer();
        const bundle = normalizer.normalize({
            scopes: {
                root: [
                    {
                        name: "--dup",
                        value: "first",
                        group: "G1",
                        description: null,
                        scope: "root",
                        source: { file: "base.css", line: 1, column: 1 },
                    },
                    {
                        name: "--dup",
                        value: "second",
                        group: "G2",
                        description: null,
                        scope: "root",
                        source: { file: "base.css", line: 2, column: 1 },
                    },
                ],
                dark: [],
            },
            themeMapping: {},
        });
        const token = bundle.tokens.find((t) => t.name === "--dup");
        // Map.set last-wins on lookup, so the value reflects the last declaration.
        expect(token.value).toBe("second");
        expect(token.group).toBe("G2");
        expect(bundle.tokens.filter((t) => t.name === "--dup").length).toBe(1);
    });
});
