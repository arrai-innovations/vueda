/**
 * @module theme/vueda-tailwind/shell/CardHeader.theme
 *
 * Per-component theme registration for CardHeader. Imported as a side effect by
 * CardHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardHeader lays out the leading card title area and optional action.
     */
    CardHeader: {
        /**
         * The leading card header grid. It creates title and description rows and switches to a two-column layout when {@api theme-key:CardAction.root} is present.
         */
        root: {
            class: [
                // Layout and spacing.
                "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6",

                // Slot and border states. The divider padding fires for a raw `border-b`
                // or the DPR-tracked `border-b-hairline`; prefer the hairline form so the
                // divider matches the rest of the system (see README § 7.3).
                "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 [.border-b-hairline]:pb-6",
            ],
        },
    },
});
