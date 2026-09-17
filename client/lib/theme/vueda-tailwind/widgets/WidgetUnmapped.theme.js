/**
 * @module theme/vueda-tailwind/widgets/WidgetUnmapped.theme
 *
 * Per-component theme registration for WidgetUnmapped. Imported as a side effect by
 * WidgetUnmapped.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Diagnostic rendered in place of a control when a form model resolves no
     * widget for a field, either because the field's type pair has no mapping or
     * because a configured widget name does not resolve.
     */
    WidgetUnmapped: {
        /** The diagnostic block. Reads as a destructive notice at supporting-text size so it sits inside a field's content column without impersonating a control. The edge is a `hairline`, matching {@api theme-key:Alert.root}, because a saturated 1px border fringes at integer DPR. */
        root: {
            class: [
                // Surface and edge.
                "rounded-vueda-card hairline hairline-destructive bg-destructive/5 px-3 py-2",

                // Type and color.
                "text-destructive text-[length:var(--vueda-text-supporting)] leading-[1.4]",
            ],
        },
    },
});
