/**
 * @module theme/vueda-tailwind/widgets/WidgetReadOnly.theme
 *
 * Per-component theme registration for WidgetReadOnly. Imported as a side effect by
 * WidgetReadOnly.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetReadOnly slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Read-only widget used to render values without editing controls. Handles
     * hidden state, value text, and optional prefix or suffix fragments for
     * linked and plain text items.
     */
    WidgetReadOnly: {
        /** The root has no chrome because read-mode rows are owned by the field shell. */
        root: { class: [] },
        /** The inner wrapper collapses when hidden and stacks visible read-only content. */
        inner: {
            class: ({ hidden }) => ({
                "flex flex-col": !hidden,
            }),
        },
        /** The input slot indents read-only control fragments to align with editable widgets. */
        input: {
            class: ["ml-2"],
        },
        /** The value text uses the read-mode record recipe. */
        value: {
            class: ["text-[13px]/[1.5] text-foreground"],
        },
        /** A linked value item carries link content without adding extra chrome. */
        linkItem: {
            class: [],
        },
        /** A plain value item mirrors {@api theme-key:WidgetReadOnly.linkItem} without link behavior. */
        textItem: {
            class: [],
        },
        /** Prefix content before linked values stays visually neutral. */
        linkItemPrefix: {
            class: [],
        },
        /** Prefix content before plain values follows {@api theme-key:WidgetReadOnly.linkItemPrefix}. */
        textItemPrefix: {
            class: [],
        },
        /** Suffix content after linked values stays visually neutral. */
        linkItemSuffix: {
            class: [],
        },
        /** Suffix content after plain values follows {@api theme-key:WidgetReadOnly.linkItemSuffix}. */
        textItemSuffix: {
            class: [],
        },
    },
});
