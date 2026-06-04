/**
 * @module theme/vueda-tailwind/display/SuggestionList.theme
 *
 * Per-component theme registration for SuggestionList. Imported as a side effect by
 * SuggestionList.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the SuggestionList slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SuggestionList renders typed "Did you mean?" choices for system 404 views. It combines an optional heading row with bordered suggestion rows and shape-specific trailing chips.
     */
    SuggestionList: {
        /** Outer suggestion stack; border treatment lives on {@api theme-key:SuggestionList.list}. */
        root: {
            class: ["flex flex-col gap-2"],
        },
        /** Header row aligning the human label with the optional machine source. */
        headRow: {
            class: ["flex items-baseline justify-between gap-3"],
        },
        /** Uppercase suggestion heading. */
        head: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground leading-none"],
        },
        /** Mono source label for the matching system that produced the suggestions. */
        source: {
            class: ["font-mono text-[10px] text-muted-foreground leading-none"],
        },
        /** Bordered list container with divided suggestion rows. */
        list: {
            class: ["rounded-vueda-card border border-border overflow-hidden divide-y divide-border list-none m-0 p-0"],
        },
        /** Full-width router-link row laid out as icon, text stack, chip, and chevron. */
        item: {
            class: [
                "grid grid-cols-[24px_1fr_auto_auto] items-center gap-x-3 px-2.5 py-2.5",
                "w-full no-underline text-inherit",
                "hover:bg-muted/50 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            ],
        },
        /** Leading icon cell for the suggestion type. */
        icon: {
            class: ["flex items-center justify-center w-6 h-6 shrink-0 text-muted-foreground text-[16px] leading-none"],
        },
        /** Text column stacking label above the route path or action description. */
        labelStack: {
            class: ["flex flex-col gap-0.5 min-w-0"],
        },
        /** Primary suggestion label in foreground text. */
        label: {
            class: ["text-[13px] font-medium text-foreground leading-[1.3] truncate"],
        },
        /** Secondary suggestion text, usually a mono route path or action description. */
        sub: {
            class: ["font-mono text-[12px] font-normal text-muted-foreground leading-[1.3] truncate"],
        },
        /** Route-match score chip with mono numeric text. */
        score: {
            class: [
                "font-mono text-[10px] uppercase leading-none",
                "border border-border rounded-sm bg-muted text-muted-foreground",
                "px-1.5 py-0.5 shrink-0",
            ],
        },
        /** HTTP verb chip for action suggestions, matching {@api theme-key:SuggestionList.score}. */
        verb: {
            class: [
                "font-mono text-[10px] uppercase leading-none",
                "border border-border rounded-sm bg-muted text-muted-foreground",
                "px-1.5 py-0.5 shrink-0",
            ],
        },
        /** Trailing chevron affordance for rows that navigate. */
        chevron: {
            class: ["flex items-center justify-center shrink-0 text-muted-foreground/60 text-[14px] leading-none"],
        },
    },
});
