/**
 * @module theme/vueda-tailwind/widgets/WidgetJson.theme
 *
 * Per-component theme registration for WidgetJson. Imported as a side effect by
 * WidgetJson.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
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
        /** The CodeMirror mount point. Internal selectors keep editor chrome aligned with VUEDA controls. */
        editor: {
            class: [
                "min-h-16 text-base md:text-sm",
                "[&_.cm-editor]:min-h-16 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none",
                "[&_.cm-content]:min-h-16 [&_.cm-content]:px-3 [&_.cm-content]:py-2 [&_.cm-content]:font-mono",
                "[&_.cm-line]:px-0",
                "[&_.cm-scroller]:font-mono",
            ],
        },
    },
});
