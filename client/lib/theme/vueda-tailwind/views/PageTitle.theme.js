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
     * PageTitle provides the compact header region for the page title, loading state, the
     * page-action zone, and optional sticky chrome.
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
        /** Vertical stack that holds the title row. Layout-only; visible chrome lives on {@api theme-key:PageTitle.root}. */
        container: {
            class: ["flex flex-col"],
        },
        /** Title-row band: title cluster on the left, action zone on the right. `px-5 py-3` sets the page-chrome horizontal rhythm shared with the {@api theme-key:ViewList} strips so the header reads continuous with the list chrome beneath it. */
        titleContainer: {
            class: [
                "w-full flex",
                "sm:flex-row sm:justify-between",
                "items-baseline justify-between",
                "gap-2 md:gap-4",
                "px-5 py-3",
            ],
        },
        /** Inner column that holds the title row. `min-w-min` keeps long titles from collapsing the column below their longest unbreakable word. */
        titleWrapper: {
            class: ["flex flex-col gap-1", "min-w-min"],
        },
        /** Baseline-aligned row that holds the title. Wraps on narrow viewports. */
        titleRow: {
            class: ["flex items-baseline flex-wrap gap-2"],
        },
        /** The page `<h1>`. Display-role type: 22 px / 600 / 1.2 with a small negative tracking so the title reads as the highest-rank text on the page. */
        title: {
            class: ["text-[22px] font-semibold leading-[1.2] tracking-[-0.005em]"],
        },
        /** Page-action zone on the right of the title row. `PageActions` in the active view teleports its buttons here. Wraps so a long action list folds onto a second line instead of crowding the title. */
        buttons: {
            class: ["flex gap-1 flex-wrap", "justify-end", "self-center"],
        },
        /** Sticky-mode gradient cap rendered below the bar. The 12 px band lets ObjectsGrid stripes fade under the pinned header instead of clipping abruptly. */
        gradient: {
            class: ["w-full h-3"],
        },
    },
});
