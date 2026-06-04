/**
 * @module theme/vueda-tailwind/widgets/WidgetHtml.theme
 *
 * Per-component theme registration for WidgetHtml. Imported as a side effect by
 * WidgetHtml.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetHtml slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * HTML editing widget chrome. Styles the bordered editor frame, toolbar,
     * toolbar buttons, active state, and separators around the editing area.
     */
    WidgetHtml: {
        /** The root adds no spacing so form composition controls the editor block. */
        root: {
            class: [],
        },
        /** The inner frame supplies the bordered control surface and clips editor content. */
        inner: {
            class: ["flex flex-col border border-input rounded-vueda-control overflow-hidden"],
        },
        /** The toolbar is a muted, wrapping command strip above the editing area. */
        toolbar: {
            class: ["flex flex-row flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-1.5 py-1"],
        },
        /** Toolbar buttons use compact slab control styling. */
        toolbarButton: {
            class: [
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-sm font-medium text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** The active toolbar button uses the same accent surface as selected menu actions. */
        toolbarButtonActive: {
            class: ["bg-accent text-accent-foreground"],
        },
        /** Separators divide toolbar command groups with a muted vertical rule. */
        toolbarSeparator: {
            class: ["mx-0.5 h-5 w-px bg-border"],
        },
    },
});
