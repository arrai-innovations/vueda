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
});
