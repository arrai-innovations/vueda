/**
 * @module theme/vueda-tailwind/controls/CommandDialog.theme
 *
 * Per-component theme registration for CommandDialog. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Dialog wrapper that hosts a Command at modal scale. The header is
     * `sr-only`; the content slot drops all padding so Command's own chrome
     * owns the geometry.
     */
    CommandDialog: {
        /** The {@api theme-key:DialogContent.root} pane that hosts a {@api theme-key:Command.root} at modal scale. Drops all padding so Command's own card radius, fill, and inner geometry own the dialog box, and `overflow-hidden` keeps the inner list's scroll edges clipped to the rounded corners. */
        content: { class: "overflow-hidden p-0" },
        /** The dialog header. Hidden with `sr-only` because the Command's own {@api theme-key:CommandInput.root} acts as the visible label; the header still ships so accessible-name requirements are met for screen readers. */
        header: { class: "sr-only" },
    },
});
