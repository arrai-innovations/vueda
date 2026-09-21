/**
 * Guard that an editable field keeps its bottom-only line in every state.
 *
 * A field rests on `field-line`, a bottom-only inset hairline, so it cannot be mistaken
 * for an outline button. Focus and invalid recolour that one line (`hairline-ring`,
 * `hairline-destructive`) and leave its shape alone; the separate focus ring is the only
 * mark that goes all the way round a field. Adding a bare `hairline` back under a variant
 * restores the four-sided edge for that state, which both changes the field's shape
 * mid-interaction and draws a second perimeter inside the ring. See the theme README,
 * section 7.5.
 *
 * This test fails on a variant-prefixed bare `hairline` in any registered slot that also
 * carries `field-line`. An unprefixed `hairline` is a different recipe (a card, a chip)
 * and is not a finding. Colour utilities (`hairline-ring`, `hairline-border`) set only
 * `--vueda-hairline-color`, so they compose with `field-line` and are the intended way to
 * express a state.
 */
import { slotDefs, slotTokens, utilityOf } from "@tests/unit/themeSlotResolution.js";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Capture each raw partialTheme before patchTheme combines it (same approach as the
// hairline-border guard).
const { captured } = vi.hoisted(() => ({ captured: [] }));
vi.mock("@vueda/use/themeRegistry.js", () => ({
    patchTheme: (partial) => captured.push(partial),
    setTheme: () => {},
    getTheme: () => ({}),
    mergeTheme: (...themes) => themes[0],
    defaultTheme: { value: {} },
}));

const themeModules = import.meta.glob("../../../../lib/theme/vueda-tailwind/**/*.theme.js");

// Input, Textarea, NativeSelect, SelectTrigger, InputGroup, DateField, DateRangeField,
// TimeField, TagsInput, NumberFieldInput, and the WidgetCombobox trigger. A floor, so a
// resolution change that stops matching the family fails here instead of passing against
// nothing.
const FIELD_SLOT_FLOOR = 10;

const restoredEdges = (classTokens) =>
    classTokens.filter((token) => token.includes(":") && utilityOf(token) === "hairline");

describe("lib/theme/vueda-tailwind/**/*.theme.js", () => {
    describe("Field line guard", () => {
        const findings = [];
        let fieldSlots = 0;

        beforeAll(async () => {
            // Drop the setup-cached theme modules so each re-import runs patchTheme(mock).
            vi.resetModules();
            await Promise.all(Object.values(themeModules).map((load) => load()));

            for (const partial of captured) {
                for (const [comp, slots] of Object.entries(partial)) {
                    if (!slots || typeof slots !== "object") continue;
                    for (const [slotName, slotDef] of Object.entries(slots)) {
                        for (const [path, def] of slotDefs(slotDef, `${comp}.${slotName}`)) {
                            const classTokens = slotTokens(def);
                            if (!classTokens.includes("field-line")) continue;
                            fieldSlots++;
                            const restored = restoredEdges(classTokens);
                            if (restored.length) findings.push(`${path}: ${restored.join(", ")}`);
                        }
                    }
                }
            }
        });

        it("field slots never restore a four-sided hairline in a state variant", () => {
            expect(captured.length).toBeGreaterThan(0);
            expect(findings, `four-sided edges restored on a field:\n${findings.join("\n")}`).toEqual([]);
        });

        it("still reaches the field family", () => {
            expect(fieldSlots).toBeGreaterThanOrEqual(FIELD_SLOT_FLOOR);
        });
    });
});
