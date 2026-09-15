/**
 * Guard that structural edges follow the DPR-keyed hairline width.
 *
 * VUEDA paints edges with `hairline` (an inset box-shadow) or the `border-*-hairline`
 * utilities, all sized from `--vueda-hairline-width`: 2px at DPR 1, stepping down to 1px
 * at DPR 2. A raw Tailwind `border`, `border-t`, `border-b`, and so on stays at 1px, so it
 * draws thinner than its neighbours below DPR 2, and in a saturated colour it fringes on
 * common office displays. See the theme README, section 7.
 *
 * This test fails on a raw border width utility in any registered theme slot (resolved
 * across plausible prop values, nested slots included) or in any static `class` attribute
 * of a component template. A slot or element is exempt when it also carries
 * `rounded-full` (a curved edge), `border-dashed`, or a transparent border (a layout
 * spacer). Any other exception needs an ALLOWLIST entry that states its reason.
 */
import { candidateArgs, combos, flatten, resolveClass, tokens } from "@tests/unit/themeSlotResolution.js";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Capture each raw partialTheme before patchTheme combines it (same approach as the
// class-clobber guard).
const { captured } = vi.hoisted(() => ({ captured: [] }));
vi.mock("@vueda/use/themeRegistry.js", () => ({
    patchTheme: (partial) => captured.push(partial),
    setTheme: () => {},
    getTheme: () => ({}),
    mergeTheme: (...themes) => themes[0],
    defaultTheme: { value: {} },
}));

const themeModules = import.meta.glob("../../../../lib/theme/vueda-tailwind/**/*.theme.js");
const componentSources = import.meta.glob("../../../../lib/**/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
});

// Exceptions no automatic rule covers, keyed by theme slot path or component file path.
const ALLOWLIST = {
    "ToggleGroupItem.root": "joined-segment seam: adjacent outline items share one real border",
};

const RAW_BORDER_WIDTH = /^border(-[trblxy])?$/;
const TRANSPARENT_BORDER = /^border(-[trblxy])?-transparent$/;

// The utility a class token applies, with variant prefixes (`hover:`, `data-[x]:`, `[&>*]:`)
// and the important flag removed. A colon inside brackets belongs to the variant, so a
// selector reference such as `[.border-b]:pb-6` resolves to `pb-6`.
const utilityOf = (token) => {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.length; i++) {
        const c = token[i];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ":" && depth === 0) start = i + 1;
    }
    return token.slice(start).replace(/^!|!$/g, "");
};

const rawBorders = (classTokens) => {
    const utilities = classTokens.map(utilityOf);
    const exempt = utilities.some((u) => u === "rounded-full" || u === "border-dashed" || TRANSPARENT_BORDER.test(u));
    return exempt ? [] : classTokens.filter((t) => RAW_BORDER_WIDTH.test(utilityOf(t)));
};

// Every token a slot can render across the prop grid, from strings and conditional keys alike.
const slotTokens = (slotDef) => {
    const fns = [];
    if (typeof slotDef === "function") fns.push(slotDef);
    if (slotDef && typeof slotDef === "object" && typeof slotDef.class === "function") fns.push(slotDef.class);
    const all = new Set();
    let n = 0;
    for (const args of combos(candidateArgs(fns))) {
        if (++n > 5000) break;
        let entries;
        try {
            entries = flatten(resolveClass(slotDef, args));
        } catch {
            continue;
        }
        for (const e of entries) {
            if (typeof e === "string") tokens(e).forEach((t) => all.add(t));
            else for (const k of Object.keys(e)) tokens(k).forEach((t) => all.add(t));
        }
    }
    return [...all];
};

// Walk a component entry down to its slot definitions, following nested slot groups such as
// `ObjectsGrid.rowActions.action` and local `themeOverride` maps.
function* slotDefs(entry, path) {
    if (typeof entry === "function" || (entry && typeof entry === "object" && "class" in entry)) {
        yield [path, entry];
        return;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        for (const [key, child] of Object.entries(entry)) yield* slotDefs(child, `${path}.${key}`);
    }
}

const templateOf = (source) => {
    const start = source.indexOf("<template");
    const end = source.lastIndexOf("</template>");
    return start === -1 || end === -1 ? "" : source.slice(start, end);
};

describe("lib/theme/vueda-tailwind/**/*.theme.js, lib/**/*.vue", () => {
    describe("Hairline border guard", () => {
        const themeFindings = [];
        const componentFindings = [];
        const usedAllowlist = new Set();

        beforeAll(async () => {
            // Drop the setup-cached theme modules so each re-import runs patchTheme(mock).
            vi.resetModules();
            await Promise.all(Object.values(themeModules).map((load) => load()));

            for (const partial of captured) {
                for (const [comp, slots] of Object.entries(partial)) {
                    if (!slots || typeof slots !== "object") continue;
                    for (const [slotName, slotDef] of Object.entries(slots)) {
                        for (const [path, def] of slotDefs(slotDef, `${comp}.${slotName}`)) {
                            const raw = rawBorders(slotTokens(def));
                            if (!raw.length) continue;
                            if (ALLOWLIST[path]) usedAllowlist.add(path);
                            else themeFindings.push(`${path}: ${raw.join(", ")}`);
                        }
                    }
                }
            }

            for (const [file, source] of Object.entries(componentSources)) {
                const name = file.replace(/^(\.\.\/)+/, "");
                for (const m of templateOf(source).matchAll(/(?:^|\s)class="([^"]*)"/g)) {
                    const raw = rawBorders(tokens(m[1]));
                    if (!raw.length) continue;
                    if (ALLOWLIST[name]) usedAllowlist.add(name);
                    else componentFindings.push(`${name}: ${raw.join(", ")}`);
                }
            }
        });

        it("theme slots use hairline border widths", () => {
            expect(captured.length).toBeGreaterThan(0);
            expect(themeFindings, `raw border widths in theme slots:\n${themeFindings.join("\n")}`).toEqual([]);
        });

        it("component templates use hairline border widths", () => {
            expect(Object.keys(componentSources).length).toBeGreaterThan(0);
            expect(
                componentFindings,
                `raw border widths in component templates:\n${componentFindings.join("\n")}`,
            ).toEqual([]);
        });

        it("every allowlist entry still covers a raw border", () => {
            const stale = Object.keys(ALLOWLIST).filter((key) => !usedAllowlist.has(key));
            expect(stale, `allowlist entries with no raw border to excuse:\n${stale.join("\n")}`).toEqual([]);
        });
    });
});
