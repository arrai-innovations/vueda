/**
 * @module theme/vueda-tailwind/display/ConstraintsBar.theme
 *
 * Per-component theme registration for ConstraintsBar. Imported as a side effect
 * by ConstraintsBar.vue, so a route chunk that pulls only that SFC drags only
 * this component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The active-constraints band: filter chips and sort chips on one line.
     * Muted tint a tier below the card-toned toolbar, sharing the page-chrome
     * rhythm and a bottom hairline. Rendered only when a constraint is active.
     */
    ConstraintsBar: {
        /** Collapse wrapper. A `grid-template-rows` animation (0fr to 1fr) reveals or hides the band at the canonical interaction duration; the SFC sets the row value inline. Disabled under reduced-motion. */
        collapse: {
            class: [
                "grid transition-[grid-template-rows]",
                "duration-[var(--vueda-duration-interaction)] ease-[var(--vueda-ease-interaction)]",
                "motion-reduce:transition-none",
            ],
        },
        /** Clipping wrapper inside the collapse grid; hides the band content while the row collapses to zero height. */
        inner: {
            class: ["overflow-hidden min-h-0"],
        },
        /** The band wrapper. A single flex row that the hosted filter and sort groups flow into. */
        root: {
            class: [
                "w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-[10px]",
                "border-b-hairline bg-[color-mix(in_oklab,var(--muted)_25%,var(--card))] text-foreground",
            ],
        },
        /** Hairline divider between the filters group and the sort group; shown only when both are active. */
        divider: {
            class: ["h-5 w-hairline self-center bg-border"],
        },
    },
});
