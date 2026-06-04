/**
 * @module theme/vueda-tailwind/views/PageTitle.theme
 *
 * Per-component theme registration for PageTitle. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the PageTitle slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PageTitle provides the compact header region for view titles, subtitles,
     * contextual actions, and optional sticky chrome.
     */
    PageTitle: {
        /** Outer header bar. Carries the bottom hairline that closes the header and, when `sticky` is set, pins the bar to the top of the scroll viewport at `z-30`. Consumers can merge extra classes via the `headerClass` prop without overriding the chrome. */
        root: ({ headerClass, sticky }) => ({
            class: [
                "border-b border-border",
                headerClass,
                {
                    "sticky top-0 z-30": sticky,
                },
            ],
        }),
        /** Vertical stack that holds the title row, the optional subtitle strip, and the footer. Layout-only; visible chrome lives on {@api theme-key:PageTitle.root}. */
        container: {
            class: ["flex flex-col"],
        },
        /** Title-row band: title cluster on the left, action buttons on the right. `px-5 py-3` sets the page-chrome horizontal rhythm shared with the {@api theme-key:ViewList} strips so the header reads continuous with the list chrome beneath it. */
        titleContainer: {
            class: [
                "w-full flex",
                "sm:flex-row sm:justify-between",
                "items-baseline justify-between",
                "gap-2 md:gap-4",
                "px-5 py-3",
            ],
        },
        /** Inner column that stacks the eyebrow above the title row. `min-w-min` keeps long titles from collapsing the column below their longest unbreakable word. */
        titleWrapper: {
            class: ["flex flex-col gap-1", "min-w-min"],
        },
        /** Page-level eyebrow above the title. Uses the 11 px / 600 / `0.06em` uppercase recipe against `--muted-foreground`. */
        eyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Baseline-aligned row that holds the title and the optional title suffix. Wraps on narrow viewports so a long suffix can drop to a second line without breaking the title. */
        titleRow: {
            class: ["flex items-baseline flex-wrap gap-2"],
        },
        /** The page `<h1>`. Display-role type: 22 px / 600 / 1.2 with a small negative tracking so the title reads as the highest-rank text on the page. */
        title: {
            class: ["text-[22px] font-semibold leading-[1.2] tracking-[-0.005em]"],
        },
        /** Mono trailing fragment beside the title (typically an ID, key, or status code). Mono / muted-foreground recipe, sized one tier below the title so it reads as a tag, not a co-title. */
        titleSuffix: {
            class: ["text-muted-foreground text-[13px]/[1.4] font-normal font-mono"],
        },
        /** Action-button cluster on the right of the title row. Wraps so a long button list folds onto a second line instead of crowding the title. */
        buttons: {
            class: ["flex gap-1 flex-wrap", "justify-end", "self-center"],
        },
        /** Second-tier subtitle strip rendered below the title row when either the `subtitle` or `under-actions` slot is populated. Tinted-muted background and a top hairline distinguish it from the title band above and the list chrome below. */
        subtitleContainer: {
            class: [
                "w-full flex flex-wrap",
                "items-baseline justify-between",
                "gap-2 md:gap-4 lg:gap-7",
                "bg-muted/25 border-t border-border px-5 py-[10px]",
            ],
        },
        /** Footer slot beneath the header bar. Empty by default so consumer markup owns its own layout when populated. */
        footer: {
            class: [],
        },
        /** Sticky-mode gradient cap rendered below the bar. The 12 px band lets ObjectsGrid stripes fade under the pinned header instead of clipping abruptly. */
        gradient: {
            class: ["w-full h-3"],
        },
    },
});
