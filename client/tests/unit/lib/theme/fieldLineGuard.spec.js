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
 *
 * It also fails on a field that has no warning colour, so a control added to the family
 * cannot quietly skip the non-blocking warning state the widgets write as `data-warning`,
 * and on a warning colour that does not exclude the invalid case. That exclusion has to be
 * in the selector: Tailwind emits the arbitrary `data-[warning=true]` variant after the
 * built-in `aria-invalid` one, so an unscoped warning outranks an error on a control that
 * carries both, which a hand-authored form can do.
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

const warningTokens = (classTokens) => classTokens.filter((token) => utilityOf(token) === "hairline-warning");

// The variant half has to rule the invalid case out, whether the recipe reads the
// attribute on itself (`not-aria-invalid`) or on a child (`not-has-[...]`).
const excludesInvalid = (token) => /not-aria-invalid|not-has-\[.*aria-invalid/.test(token);

describe("lib/theme/vueda-tailwind/**/*.theme.js", () => {
    describe("Field line guard", () => {
        const findings = [];
        const missingWarning = [];
        const unscopedWarning = [];
        let fieldSlots = 0;

        beforeAll(async () => {
            // Drop the setup-cached theme modules so each re-import runs patchTheme(mock).
            vi.resetModules();
            await Promise.all(Object.values(themeModules).map((load) => load()));

            for (const partial of captured) {
                for (const [comp, slots] of Object.entries(partial)) {
                    if (!slots || typeof slots !== "object") {
                        continue;
                    }
                    for (const [slotName, slotDef] of Object.entries(slots)) {
                        for (const [path, def] of slotDefs(slotDef, `${comp}.${slotName}`)) {
                            const classTokens = slotTokens(def);
                            if (!classTokens.includes("field-line")) {
                                continue;
                            }
                            fieldSlots++;
                            const restored = restoredEdges(classTokens);
                            if (restored.length) {
                                findings.push(`${path}: ${restored.join(", ")}`);
                            }
                            const warns = warningTokens(classTokens);
                            if (!warns.length) {
                                missingWarning.push(path);
                            } else if (!warns.every(excludesInvalid)) {
                                unscopedWarning.push(`${path}: ${warns.join(", ")}`);
                            }
                        }
                    }
                }
            }
        });

        it("field slots never restore a four-sided hairline in a state variant", () => {
            expect(captured.length).toBeGreaterThan(0);
            expect(findings, `four-sided edges restored on a field:\n${findings.join("\n")}`).toEqual([]);
        });

        it("every field slot carries a warning colour", () => {
            expect(missingWarning, `fields with no warning state:\n${missingWarning.join("\n")}`).toEqual([]);
        });

        it("an error outranks a warning on the same control", () => {
            expect(
                unscopedWarning,
                `warning colours that do not exclude aria-invalid:\n${unscopedWarning.join("\n")}`,
            ).toEqual([]);
        });

        it("still reaches the field family", () => {
            expect(fieldSlots).toBeGreaterThanOrEqual(FIELD_SLOT_FLOOR);
        });
    });
});
