/**
 * Guard against a theme-registration footgun.
 *
 * The aggregated barrel (`@vueda/theme/vueda-tailwind/index.js`) snapshots the
 * registry after each family `index.js` side-effect-imports its component
 * `*.theme.js` files. The global-eager `setTheme(vuedaTailwind)` path installs
 * that snapshot. If a component ships a `*.theme.js` but its family `index.js`
 * forgets to import it, the component is absent from the snapshot and every slot
 * resolves to an empty class string in consuming apps that use the eager path.
 *
 * Unit tests import components directly (running the component's own theme
 * side-effect import), so they never surface this gap. This static check does:
 * for each family, every `*.theme.js` present in the directory must be imported
 * by that family's `index.js`.
 */
import { describe, expect, it } from "vitest";

const indexSources = import.meta.glob("../../../../lib/theme/vueda-tailwind/*/index.js", {
    eager: true,
    query: "?raw",
    import: "default",
});
const themeFiles = import.meta.glob("../../../../lib/theme/vueda-tailwind/*/*.theme.js");

const byFamily = {};
for (const path of Object.keys(themeFiles)) {
    const [, family, name] = path.match(/vueda-tailwind\/([^/]+)\/([^/]+)\.theme\.js$/);
    (byFamily[family] ||= []).push(name);
}

describe("lib/theme/vueda-tailwind family barrels register every component theme", () => {
    for (const [family, names] of Object.entries(byFamily)) {
        it(`${family}/index.js imports all ${names.length} component themes`, () => {
            const indexPath = Object.keys(indexSources).find((path) => path.endsWith(`/${family}/index.js`));
            expect(indexPath, `${family}/index.js not found`).toBeTruthy();
            const imported = new Set(
                [...indexSources[indexPath].matchAll(/import\s+"\.\/([^"]+)\.theme\.js"/g)].map((match) => match[1]),
            );
            const missing = names.filter((name) => !imported.has(name)).sort();
            expect(missing, `${family}/index.js is missing theme imports: ${missing.join(", ")}`).toEqual([]);
        });
    }
});
