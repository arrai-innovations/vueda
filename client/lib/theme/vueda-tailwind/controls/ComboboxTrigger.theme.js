/**
 * @module theme/vueda-tailwind/controls/ComboboxTrigger.theme
 *
 * Per-component theme registration for ComboboxTrigger. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The pressable surface that opens the Combobox popover. Combobox uses
     * the input shell (not the neutral chip Select uses) because the user is
     * about to type.
     */
    ComboboxTrigger: {
        /** The pressable surface that opens the {@api theme-key:ComboboxList.root}. Ships empty today: in-tree consumers (`WidgetCombobox`) supply their own input-shell chrome via `asChild`, so the bare primitive has no usable default. The Combobox-vs-Select differentiator (Combobox reads as a field because the user is about to type) is enforced by consumers, not by this slot. Giving the bare primitive an input-shell default is deferred until the same session settles the multi-select div-trigger pattern, since one API choice covers both. */
        root: {
            class: [""],
        },
    },
});
