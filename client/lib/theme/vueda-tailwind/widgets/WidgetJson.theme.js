/**
 * @module theme/vueda-tailwind/widgets/WidgetJson.theme
 *
 * Per-component theme registration for WidgetJson. Imported by WidgetJson.vue,
 * so a route chunk that pulls only that SFC drags only this component's theme
 * entry, not the entire widgets family.
 *
 * The bordered wrapper is themed through the registry (`root` / `editor` slots
 * below). The embedded CodeMirror editor is styled through the editor's own
 * APIs: `widgetJsonCmTheme` (an `EditorView.theme` spec) and
 * `widgetJsonHighlightSpec` (a `HighlightStyle` mapping). Both resolve their
 * colours and fonts from design tokens via `var(...)`, so overriding the
 * tokens (including the dark-mode set) restyles the editor without touching
 * this file.
 */
import { tags } from "@lezer/highlight";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * JSON editor widget chrome around the embedded CodeMirror editor.
     */
    WidgetJson: {
        /** Bordered control surface that mirrors textarea invalid and disabled states. */
        root: {
            class: [
                "overflow-hidden rounded-vueda-control hairline bg-transparent shadow-vueda-control transition-shadow",
                "focus-within:hairline-ring focus-within:focus-ring-shadow",
                "data-[invalid=true]:hairline-destructive data-[invalid=true]:focus-within:focus-ring-shadow-destructive",
                "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
            ],
        },
        /**
         * The CodeMirror mount point. Only wrapper-level sizing and the base
         * font size live here; the editor's internal selectors are styled by
         * `widgetJsonCmTheme` below.
         */
        editor: {
            class: ["min-h-16 text-base md:text-sm"],
        },
    },
});

/**
 * `EditorView.theme` spec for the embedded CodeMirror editor: sizing, content
 * padding, and flush lines, with colour and font drawn from design tokens.
 *
 * @type {{ [selector: string]: { [prop: string]: string } }}
 */
export const widgetJsonCmTheme = {
    ".cm-editor": {
        minHeight: "4rem",
        backgroundColor: "transparent",
        outline: "none",
    },
    ".cm-content": {
        minHeight: "4rem",
        padding: "0.5rem 0.75rem",
        fontFamily: "var(--vueda-font-mono)",
        caretColor: "var(--foreground)",
    },
    ".cm-line": {
        padding: "0",
    },
    ".cm-scroller": {
        fontFamily: "var(--vueda-font-mono)",
    },
};

/**
 * `HighlightStyle` mapping for JSON syntax, near-monochrome per the default
 * theme: property names read as labels (foreground at label weight), structural
 * punctuation recedes (muted-foreground), and scalar values (string / number /
 * bool / null) inherit `--foreground` from `.cm-content`.
 *
 * @type {({ tag: import('@lezer/highlight').Tag | import('@lezer/highlight').Tag[] } & { [prop: string]: string })[]}
 */
export const widgetJsonHighlightSpec = [
    { tag: tags.propertyName, color: "var(--foreground)", fontWeight: "var(--vueda-font-weight-label)" },
    { tag: [tags.brace, tags.squareBracket, tags.separator], color: "var(--muted-foreground)" },
];
