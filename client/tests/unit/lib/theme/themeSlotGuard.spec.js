/**
 * Guard that every theme slot a component reads is a slot some theme registers.
 *
 * `useTheme("X")` returns "" for a slot no `patchTheme` call defines, so a component
 * whose theme entry is missing still renders. It just renders unstyled, silently. That
 * shipped three times: `WidgetDateField` and `WidgetDateRangeField` drew an unstyled
 * calendar trigger, `WidgetTimeRangeField` stacked its two bounds because its root had
 * no `flex`, and `WidgetUnmapped` inherited whatever typography surrounded it.
 *
 * Two failures are reported. A component calls `useTheme("X")` and no theme registers
 * `X` at all. Or a theme registers `X`, and the component reads a slot that entry does
 * not define.
 *
 * Only a read this file can attribute with certainty is checked: a variable bound to
 * `useTheme` or `useWidgetTheme` in the same file, called with a string literal. A slot
 * name built at runtime, or read through a theme function a composable returned, is
 * skipped rather than guessed at.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

// Capture each raw partialTheme before patchTheme combines it (same approach as the
// hairline border guard).
const { captured } = vi.hoisted(() => ({ captured: [] }));
vi.mock("@vueda/use/themeRegistry.js", () => ({
    patchTheme: (partial) => captured.push(partial),
    setTheme: () => {},
    getTheme: () => ({}),
    mergeTheme: (...themes) => themes[0],
    defaultTheme: { value: {} },
}));

const themeModules = import.meta.glob("../../../../lib/theme/vueda-tailwind/**/*.theme.js");
const sources = import.meta.glob(["../../../../lib/**/*.vue", "../../../../lib/**/*.js"], {
    query: "?raw",
    import: "default",
    eager: true,
});

// Exceptions no automatic rule covers, keyed by `Component` or `Component.slot`.
const ALLOWLIST = {};

// `const theme = useTheme("Input", ...)` and the useWidgetTheme wrapper around it.
const THEME_BINDING = /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:useTheme|useWidgetTheme)\(\s*["'](\w+)["']/g;

// A call on that bound name carrying a string literal: `theme("root")`.
const slotReads = (source, varName) => {
    const found = new Set();
    const pattern = new RegExp(String.raw`\b${varName}\(\s*["'](\w+)["']`, "g");
    for (const m of source.matchAll(pattern)) {
        found.add(m[1]);
    }
    return found;
};

describe("lib/theme/vueda-tailwind/**/*.theme.js, lib/**/*.{vue,js}", () => {
    describe("Theme slot guard", () => {
        /** @type {{[component: string]: Set<string>}} */
        const registered = {};
        const missingEntry = [];
        const missingSlot = [];
        const usedAllowlist = new Set();
        const checkedComponents = new Set();
        let readCount = 0;

        beforeAll(async () => {
            // Drop the setup-cached theme modules so each re-import runs patchTheme(mock).
            vi.resetModules();
            await Promise.all(Object.values(themeModules).map((load) => load()));

            for (const partial of captured) {
                for (const [component, slots] of Object.entries(partial)) {
                    if (!slots || typeof slots !== "object") {
                        continue;
                    }
                    registered[component] ??= new Set();
                    for (const slotName of Object.keys(slots)) {
                        registered[component].add(slotName);
                    }
                }
            }

            for (const [file, source] of Object.entries(sources)) {
                const name = file.replace(/^(\.\.\/)+/, "");
                for (const [, varName, component] of source.matchAll(THEME_BINDING)) {
                    checkedComponents.add(component);
                    const entry = registered[component];
                    if (!entry) {
                        if (ALLOWLIST[component]) {
                            usedAllowlist.add(component);
                        } else {
                            missingEntry.push(`${name}: useTheme("${component}") but no theme registers it`);
                        }
                        continue;
                    }
                    for (const slotName of slotReads(source, varName)) {
                        readCount += 1;
                        if (entry.has(slotName)) {
                            continue;
                        }
                        const path = `${component}.${slotName}`;
                        if (ALLOWLIST[path]) {
                            usedAllowlist.add(path);
                        } else {
                            missingSlot.push(`${path}: read in ${name}, not registered`);
                        }
                    }
                }
            }
        });

        // Floors well under the current reach (355 components, 755 reads). They catch a
        // binding or read pattern that stopped matching, which would otherwise leave every
        // assertion below passing against nothing.
        it("still reaches most of the themed surface", () => {
            expect(captured.length).toBeGreaterThan(0);
            expect(
                checkedComponents.size,
                "theme bindings resolved; has the binding pattern stopped matching?",
            ).toBeGreaterThan(300);
            expect(readCount, "slot reads attributed; has the read pattern stopped matching?").toBeGreaterThan(600);
        });

        it("every themed component has a theme entry", () => {
            expect(missingEntry, `components with no theme entry:\n${missingEntry.join("\n")}`).toEqual([]);
        });

        it("every slot a component reads is registered", () => {
            expect(missingSlot, `theme slots read but never registered:\n${missingSlot.join("\n")}`).toEqual([]);
        });

        it("every allowlist entry still covers a missing slot", () => {
            const stale = Object.keys(ALLOWLIST).filter((key) => !usedAllowlist.has(key));
            expect(stale, `allowlist entries with nothing to excuse:\n${stale.join("\n")}`).toEqual([]);
        });
    });
});
