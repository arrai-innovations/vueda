/**
 * @module theme/vueda-tailwind/widgets/WidgetCombobox.theme
 *
 * Per-component theme registration for WidgetCombobox. Imported as a side effect by
 * WidgetCombobox.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Combobox widget trigger for searchable choice fields. Applies the
     * canonical control sizing, border, placeholder, disabled, and icon
     * treatments to the trigger button.
     */
    WidgetCombobox: {
        /** The trigger uses the input-shell recipe for searchable pickers. */
        trigger: {
            class: [
                // Placeholder, icon, and border states.
                "data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
                "hover:hairline-border-strong hairline",

                // Focus, invalid, and dark-mode states.
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
                "dark:bg-input/30 dark:hover:bg-accent dark:active:bg-accent-active",

                // Layout, shape, and type.
                "flex w-full h-vueda-control items-center justify-between gap-2",
                "rounded-vueda-field bg-transparent px-vueda-control-px text-sm",
                "whitespace-nowrap shadow-vueda-control transition-shadow",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
