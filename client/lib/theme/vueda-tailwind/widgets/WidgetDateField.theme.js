/**
 * @module theme/vueda-tailwind/widgets/WidgetDateField.theme
 *
 * Per-component theme registration for WidgetDateField. Imported as a side effect by
 * WidgetDateField.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Date widget for single-date fields. Wraps a {@api theme-key:DateField.root}
     * shell of editable segments and a calendar popover trigger.
     */
    WidgetDateField: {
        /** Pass-through hook for the segment shell. The shell recipe lives on {@api theme-key:DateField.root}. */
        field: {
            class: [],
        },
        /** Pass-through hook for the literal separators between date segments ("/"). Segment type comes from {@api theme-key:DateFieldInput.root}. */
        literal: {
            class: [],
        },
        /** Calendar popover trigger, pinned to the field's end edge so it lands where the {@api theme-key:WidgetCombobox.trigger} chevron does. Muted at rest and inked on hover, because the segments, not this button, are the field's primary target. */
        trigger: {
            class: [
                // Layout and placement.
                "ml-auto flex shrink-0 items-center justify-center cursor-pointer",

                // Color and state.
                "text-muted-foreground hover:text-foreground transition-colors",
                // Disabled: no fill to replace, so the ink carries the state.
                "disabled:pointer-events-none disabled:text-disabled-foreground",

                // Icon sizing for a registered icon component.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
        /** The trigger's glyph. Applied to a registered `calendar` icon and to the built-in fallback character alike, so a registry with no `calendar` entry still gets a sized glyph that inherits the trigger's color. An icon component that carries its own sizing keeps it: Font Awesome sizes by `em`, which matches the {@api theme-key:WidgetCombobox.trigger} chevron. */
        triggerIcon: {
            class: ["size-4 shrink-0 text-center leading-4 select-none"],
        },
        /** Pass-through hook for the calendar popover panel. The floating surface recipe lives on {@api theme-key:PopoverContent.root}. */
        popoverContent: {
            class: [],
        },
    },
});
