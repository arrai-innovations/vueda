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
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
                "dark:bg-input/30 dark:hover:bg-input/50",
                "flex w-full h-vueda-control items-center justify-between gap-2 rounded-vueda-control border bg-transparent px-vueda-control-px text-sm",
                "whitespace-nowrap shadow-vueda-control transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
