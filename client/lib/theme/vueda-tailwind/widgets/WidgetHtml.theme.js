/**
 * @module theme/vueda-tailwind/widgets/WidgetHtml.theme
 *
 * Per-component theme registration for WidgetHtml. Imported as a side effect by
 * WidgetHtml.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
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
        /** The inner frame supplies the bordered control surface and clips editor content. Uses the `hairline` edge contract shared with {@api theme-key:WidgetJson.root} so the editor frame DPR-tracks like the input-shell controls beside it, with the focus-within ring and `data-[invalid=true]` destructive swap mirroring the other editor widget. */
        inner: {
            class: [
                "flex flex-col hairline rounded-vueda-control overflow-hidden",
                "transition-shadow",
                "focus-within:hairline-ring focus-within:focus-ring-shadow",
                "data-[invalid=true]:hairline-destructive data-[invalid=true]:focus-within:focus-ring-shadow-destructive",
            ],
        },
        /** The toolbar is a muted, wrapping command strip above the editing area. The bottom divider uses the DPR-keyed `border-b-hairline` width with the structural `--border` colour so the rule tracks the canon hairline scale. */
        toolbar: {
            class: ["flex flex-row flex-wrap items-center gap-0.5", "border-b-hairline bg-muted/50 px-1.5 py-1"],
        },
        /** Toolbar buttons use compact slab control styling. */
        toolbarButton: {
            class: [
                "inline-flex items-center justify-center",
                "rounded px-1.5 py-0.5 text-sm font-medium text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                "active:bg-accent-active active:text-accent-foreground",
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
