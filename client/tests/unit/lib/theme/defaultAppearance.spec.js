import { scopedIt } from "@tests/unit/utils.js";
import "@vueda/theme/vueda-tailwind/controls/Button.theme.js";
import "@vueda/theme/vueda-tailwind/controls/InputGroup.theme.js";
import "@vueda/theme/vueda-tailwind/display/SuggestionList.theme.js";
import "@vueda/theme/vueda-tailwind/form/FieldSetMany.theme.js";
import "@vueda/theme/vueda-tailwind/form/FieldSetRange.theme.js";
import "@vueda/theme/vueda-tailwind/form/TypedConfirmField.theme.js";
import "@vueda/theme/vueda-tailwind/navigation/SidebarMenuButtonChild.theme.js";
import "@vueda/theme/vueda-tailwind/shell/Item.theme.js";
import "@vueda/theme/vueda-tailwind/widgets/WidgetCombobox.theme.js";
import "@vueda/theme/vueda-tailwind/widgets/WidgetJson.theme.js";
import "@vueda/theme/vueda-tailwind/widgets/WidgetLabel.theme.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { normalizeClass } from "vue";

const slotClasses = (component, slot, context = {}) =>
    normalizeClass(useTheme(component, {}, context)(slot)).split(/\s+/);

// Exercise registered defaults through the real resolver, including composition
// and the merger. These utilities preserve the appearance verified in a browser;
// the raw-authoring guards do not check which conflicting utility survives.
describe("lib/theme/vueda-tailwind/**/*.theme.js", () => {
    describe("Default appearance after class merging", () => {
        for (const [component, slot, edge] of [
            ["InputGroup", "root", "field-line"],
            ["TypedConfirmField", "input", "hairline"],
            ["WidgetCombobox", "trigger", "field-line"],
            ["WidgetJson", "root", "hairline"],
        ]) {
            scopedIt(`preserves the painted edge on ${component}.${slot}`, () => {
                expect(slotClasses(component, slot)).toContain(edge);
            });
        }

        scopedIt("keeps both the suggestion separator width and color", () => {
            expect(slotClasses("SuggestionList", "list")).toEqual(
                expect.arrayContaining(["divide-y-[length:var(--vueda-hairline-width)]", "divide-border"]),
            );
        });

        for (const [component, slot] of [
            ["FieldSetMany", "label"],
            ["FieldSetRange", "label"],
            ["FieldSetRange", "title"],
        ]) {
            scopedIt(`keeps the compact line height on ${component}.${slot}`, () => {
                expect(slotClasses(component, slot)).toEqual(
                    expect.arrayContaining(["text-[length:var(--vueda-text-micro)]", "leading-none"]),
                );
            });
        }

        scopedIt("keeps outline Item borders transparent", () => {
            const classes = slotClasses("Item", "root", { variant: "outline" });
            expect(classes).toContain("border-transparent");
            expect(classes).not.toContain("border-border");
        });

        scopedIt("keeps collapsed large sidebar buttons padded", () => {
            const classes = slotClasses("SidebarMenuButtonChild", "root", { size: "lg" });
            expect(classes).toContain("group-data-[collapsible=icon]:p-2!");
            expect(classes).not.toContain("group-data-[collapsible=icon]:p-0!");
        });

        scopedIt("keeps the shared gap on small buttons after composition", () => {
            const classes = slotClasses("Button", "root", { size: "sm", tone: "neutral", emphasis: "fill" });
            expect(classes).toContain("gap-2");
            expect(classes).not.toContain("gap-1.5");
        });

        for (const warning of [false, true]) {
            for (const invalid of [false, true]) {
                scopedIt(`preserves label colors with warning=${warning} and invalid=${invalid}`, () => {
                    const classes = slotClasses("WidgetLabel", "label", { warning, invalid });
                    expect(classes).toEqual(expect.arrayContaining(["text-neutral-900/60", "dark:text-white/60"]));
                    expect(classes.includes("!text-amber-600")).toBe(warning);
                    expect(classes.includes("dark:!text-amber-500")).toBe(warning);
                    expect(classes.some((token) => token.includes("text-maroon-"))).toBe(false);
                    expect(classes.some((token) => token.includes("text-destructive"))).toBe(false);
                });
            }
        }
    });
});
