/**
 * @module theme/vueda-tailwind/views/ViewUpdate.theme
 *
 * Per-component theme registration for ViewUpdate. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

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
        /** Form body region wrapping the error display and the generated form. `px-5 py-5` sets the content gutter; the horizontal `px-5` aligns the form's left edge with the {@api theme-key:StickyBar} controls and {@api theme-key:PageTitle} title above it so the page chrome reads as a continuous column. The `outerClass` prop merges here. */
        body: {
            class: ["px-5 py-5"],
        },
    },
});
