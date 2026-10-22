/**
 * @module theme/vueda-tailwind/views/ViewUpdate.theme
 *
 * Per-component theme registration for ViewUpdate. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * ViewUpdate loads a model instance into an editable form. PageTitle and a
     * StickyBar own the page chrome above the form; these slots style the form
     * body region beneath them.
     */
    ViewUpdate: {
        /** Outer wrapper. Layout-only; PageTitle, the StickyBar, and the form body below own the visible chrome, so this stays empty by default. The `class` prop merges here. */
        root: {
            class: [],
        },
        /** Form body region wrapping the error display and the generated form. `px-5 py-5` sets the content gutter; the horizontal `px-5` aligns the form's left edge with the {@api theme-key:StickyBar} controls and {@api theme-key:PageTitle} title above it so the page chrome reads as a continuous column. Merge extra classes here via `themeOverride` (or `setTheme`). */
        body: {
            class: ["px-5 py-5"],
        },
        /** Heading at the top of the body that names the record by its formatted name, above the form. It scrolls with the body rather than sticking with the page title, so a long name wraps instead of growing the sticky header. */
        recordName: {
            class: ["mb-4 text-lg font-semibold leading-tight break-words"],
        },
        /** Placeholder shown in place of {@api theme-key:ViewUpdate.recordName} while the record is loading. Sized to one line of the heading. */
        recordNameSkeleton: {
            class: ["mb-4 h-[22px] w-64 max-w-full"],
        },
    },
});
