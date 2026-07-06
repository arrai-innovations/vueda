/**
 * @module theme/vueda-tailwind/shell/CardFooter.theme
 *
 * Per-component theme registration for CardFooter. Imported as a side effect by
 * CardFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardFooter arranges trailing card actions or metadata.
     */
    CardFooter: {
        /**
         * The trailing card footer row. It aligns footer content horizontally and adds top padding when the footer carries a top divider (a raw `border-t` or the DPR-tracked `border-t-hairline`; prefer the hairline form, see README § 7.3).
         */
        root: {
            class: "flex items-center px-6 [.border-t]:pt-6 [.border-t-hairline]:pt-6",
        },
    },
});
