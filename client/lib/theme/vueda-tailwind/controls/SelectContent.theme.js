/**
 * @module theme/vueda-tailwind/controls/SelectContent.theme
 *
 * Per-component theme registration for SelectContent. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the SelectContent slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The floating popover surface that holds the Select options. `position`
     * picks between `popper` (anchored) and `item-aligned` (legacy aligned
     * with the selected item).
     */
    SelectContent: {
        /** The floating popover surface that holds the {@api theme-key:SelectItem.root} options. Reads as a popover (2px radius, 1px border, `shadow-vueda-popover` elevation) capped at the viewport-available height that Reka exposes via `--reka-select-content-available-height`; the `popper`-position-only translate nudges (`translate-y-1`, etc.) sit the popover one 4px step off the trigger so the surface does not crash into the chip that opened it. The `item-aligned` legacy mode (the popover aligns itself to the selected item rather than anchoring to the trigger) skips those nudges and shares all other chrome. */
        root: ({ position }) => ({
            class: [
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border shadow-vueda-popover",
                {
                    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1":
                        position === "popper",
                },
            ],
        }),
        /** The padded inner region inside {@api theme-key:SelectContent.root} that wraps the option list. In `popper` mode the viewport pins to the trigger's height and width (`--reka-select-trigger-height` / `--reka-select-trigger-width`) so the popover footprint matches the chip that opened it; `scroll-my-1` keeps the highlighted item from crashing into the viewport edge as keyboard navigation crosses long lists. The legacy `item-aligned` mode skips the pin and lets the viewport size to its content. */
        viewport: ({ position }) => ({
            class: [
                "p-1",
                {
                    "h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1":
                        position === "popper",
                },
            ],
        }),
    },
});
