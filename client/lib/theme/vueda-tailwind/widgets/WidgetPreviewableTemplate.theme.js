/**
 * @module theme/vueda-tailwind/widgets/WidgetPreviewableTemplate.theme
 *
 * Per-component theme registration for WidgetPreviewableTemplate. Imported as a side effect by
 * WidgetPreviewableTemplate.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetPreviewableTemplate slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Template editor with a live preview pane. Arranges the editor, preview,
     * title, and label regions for message or document templates.
     */
    WidgetPreviewableTemplate: {
        /** The root adds no chrome so the surrounding form section owns spacing. */
        root: {
            class: [],
        },
        /** The title uses foreground text for the previewable template heading. */
        title: {
            class: ["text-neutral-900 dark:text-white"],
        },
        /** The inner grid places editor and preview side by side on wide screens. */
        inner: {
            class: ["grid lg:grid-cols-2 gap-2"],
        },
        /** The editor wrapper stacks editing controls with a small gap. */
        editorWrapper: {
            class: ["flex flex-col gap-2"],
        },
        /** The preview pane uses prose defaults while spanning below the label row. */
        preview: {
            class: ["prose max-w-full flex flex-col row-start-2 row-end-3 col-start-1 col-end-3"],
        },
        /** The preview label matches widget label color and line height for alignment. */
        label: {
            class: ["row-start-1 row-end-2 col-start-1 leading-[2.3958125rem] text-neutral-900/60 dark:text-white/60"],
        },
        /** The preview wrapper mirrors {@api theme-key:WidgetLabel.root} for label and preview alignment. */
        previewWrapper: {
            class: ["ml-2 mb-1 gap-1 grid grid-cols-[auto_1fr] justify-between"],
        },
    },
});
