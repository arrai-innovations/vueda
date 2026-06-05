/**
 * @module theme/vueda-tailwind/controls/TimeField.theme
 *
 * Per-component theme registration for TimeField. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Time picker rendered as a row of editable time segments (hour / minute,
     * optional second / period). Shares the input shell with DateField.
     */
    TimeField: {
        /** The input-shell variant for editable time segments (hour / minute, plus optional second / period). See also: {@api theme-key:DateField.root}; identical shell and size-tier recipe, only the segment set inside differs. */
        root: ({ size }) => ({
            class: [
                "dark:bg-input/30 flex w-full items-center rounded-vueda-control hairline bg-transparent text-sm shadow-vueda-control transition-shadow focus-within:hairline-ring focus-within:focus-ring-shadow data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },
});
