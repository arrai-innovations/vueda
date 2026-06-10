/**
 * @module theme/vueda-tailwind/views/ViewRead.theme
 *
 * Per-component theme registration for ViewRead. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewRead presents a single model instance in a read-only layout. PageTitle
     * and a StickyBar own the page chrome above the body; these slots style the
     * body region beneath them.
     */
    ViewRead: {
        /** Outer wrapper. Layout-only; PageTitle, the StickyBar, and the body below own the visible chrome, so this stays empty by default. */
        root: {
            class: [],
        },
        /** Body region wrapping the error display and the read-only field layout. `px-5 py-5` sets the content gutter; the horizontal `px-5` aligns the body's left edge with the {@api theme-key:StickyBar} controls and {@api theme-key:PageTitle} title above it so the page chrome reads as a continuous column. Inherited `$attrs` (including a consumer-supplied `class`) merge here. */
        body: {
            class: ["px-5 py-5"],
        },
    },
});
