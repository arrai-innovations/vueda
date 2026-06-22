/**
 * @module theme/vueda-tailwind/display/ConsequencesBullets.theme
 *
 * Per-component theme registration for ConsequencesBullets. Imported as a side effect by
 * ConsequencesBullets.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ConsequencesBullets renders a compact list of consequences for destructive or risky actions. Per-row tone attributes tint the leading icon while keeping labels and descriptions consistent.
     */
    ConsequencesBullets: {
        /** List wrapper for consequence rows with no browser list chrome. */
        root: {
            class: ["flex flex-col gap-2 m-0 p-0 list-none"],
        },
        /** Two-column row that keeps the icon column aligned even when the icon is empty. */
        item: {
            class: ["grid grid-cols-[18px_1fr] items-start gap-x-2.5"],
        },
        /** Fixed icon cell tinted by row tone via {@api theme-key:ConsequencesBullets.toneWarn} or {@api theme-key:ConsequencesBullets.toneDanger}. */
        icon: {
            class: [
                "flex h-[18px] w-[18px] items-center justify-center mt-px",
                "text-[14px] leading-none text-muted-foreground",
            ],
        },
        /** Label and optional description stack for one consequence. */
        text: {
            class: ["flex flex-col gap-0.5 min-w-0"],
        },
        /** Foreground consequence title in the body text role. */
        label: {
            class: ["text-[13px] font-semibold leading-[1.35] text-foreground"],
        },
        /** Supporting consequence detail text below the label. */
        description: {
            class: ["text-[11.5px] font-normal leading-[1.4] text-muted-foreground"],
        },
        /** Warning tone applied to the row icon for cautionary consequences. */
        toneWarn: {
            class: ["text-warning"],
        },
        /** Destructive tone applied to the row icon for irreversible consequences. */
        toneDanger: {
            class: ["text-destructive"],
        },
    },
});
