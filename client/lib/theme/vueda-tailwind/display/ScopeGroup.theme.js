/**
 * @module theme/vueda-tailwind/display/ScopeGroup.theme
 *
 * Per-component theme registration for ScopeGroup. Imported as a side effect by
 * ScopeGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ScopeGroup renders a list's active scopes as a chips strip plus a Clear
     * scopes control. Only rendered when a scope is active.
     */
    ScopeGroup: {
        /** Active-scope chips strip. Muted tint a tier below the card; shares the page-chrome rhythm and carries a bottom hairline. */
        strip: {
            class: [
                "w-full flex flex-wrap items-center gap-2 px-5 py-[10px]",
                "border-b-hairline bg-[color-mix(in_oklab,var(--muted)_25%,var(--card))] text-foreground",
            ],
        },
        /** Bare chips group used when hosted inside a shared ConstraintsBar: the band chrome (border, tint, padding) belongs to the host, so this carries only the flex layout for the eyebrow and chips. */
        subgroup: {
            class: ["flex min-w-0 flex-wrap items-center gap-2"],
        },
        /** "Scope" eyebrow at the left of the chips strip. 11 px / 600 / 0.06em uppercase against `--muted-foreground`. */
        eyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Clear-all control, pushed to the right edge of the chips strip. */
        clear: {
            class: ["ml-auto text-xs"],
        },
    },
});
