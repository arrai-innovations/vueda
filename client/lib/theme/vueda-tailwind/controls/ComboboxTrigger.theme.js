/**
 * @module theme/vueda-tailwind/controls/ComboboxTrigger.theme
 *
 * Per-component theme registration for ComboboxTrigger. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxTrigger slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The pressable surface that opens the Combobox popover. Combobox uses
     * the input shell (not the neutral chip Select uses) because the user is
     * about to type.
     */
    ComboboxTrigger: {
        /** The pressable surface that opens the {@api theme-key:ComboboxList.root}. Ships empty today: in-tree consumers (`WidgetCombobox`) supply their own input-shell chrome via `asChild`, so the bare primitive has no usable default. The Combobox-vs-Select differentiator (Combobox reads as a field because the user is about to type) is enforced by consumers, not by this slot; see BACKLOG-008 for the API session that bakes the input-shell default into this primitive and resolves the multi-select div-trigger pattern. */
        root: {
            class: [""],
        },
    },
});
