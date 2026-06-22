/**
 * @module theme/vueda-tailwind/controls/CommandInput.theme
 *
 * Per-component theme registration for CommandInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Search field at the top of a Command. The wrapper slot adds the inset
     * icon and divider below the input.
     */
    CommandInput: {
        /** The free-text search field at the top of a {@api theme-key:Command.root}. Renders chrome-free at `--vueda-cmd-input-height` so the surrounding {@api theme-key:CommandInput.wrapper} owns the row's geometry and the lower hairline; the input itself just contributes placeholder, focus-clear, and the disabled treatment. */
        root: {
            class: [
                // Placeholder and input shell.
                "placeholder:text-muted-foreground flex h-[var(--vueda-cmd-input-height)] w-full rounded-vueda-control bg-transparent py-3 text-sm outline-hidden",

                // Disabled state.
                "disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        /** The row that wraps {@api theme-key:CommandInput.root} together with the leading search icon, sized to `--vueda-cmd-input-height` and capped by a bottom hairline (`border-b`) so the input separates cleanly from the {@api theme-key:CommandList.root} below. The wrapper, not the input, owns the divider so the seam stays continuous even when the input is empty or focused. */
        wrapper: { class: "flex h-[var(--vueda-cmd-input-height)] items-center gap-2 border-b px-3" },
    },
});
