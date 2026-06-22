/**
 * @module theme/vueda-tailwind/controls/CommandFooter.theme
 *
 * Per-component theme registration for CommandFooter. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Optional chin below CommandList carrying keyboard-navigation hints (↑↓
     * navigate, ↵ select, Esc close) and custom action labels. Inline `<kbd>`
     * inside the footer drops to 18x18 / mono 10px so the chin trades
     * legibility for density.
     */
    CommandFooter: {
        /** The optional chin below {@api theme-key:CommandList.root}. Sits at `--vueda-cmd-footer-height` (32px) on `--muted` with a top hairline, holding keyboard-navigation hints on the leading edge and custom action labels on the trailing edge; supporting-size copy on `--muted-foreground` reads as status rather than primary chrome. Inline `<kbd>` elements inside the footer are restyled to 18x18 / mono 10px / 2px radius (a deliberate departure from the body {@api theme-key:Kbd} primitive) so a `↑↓` chord fits in the chin without breaking the row baseline. */
        root: {
            class: [
                // Footer shell.
                "flex h-[var(--vueda-cmd-footer-height)] items-center justify-between gap-3 border-t bg-muted px-[var(--vueda-control-px-md)] text-[length:var(--vueda-text-supporting)] text-muted-foreground",

                // Inline kbd elements.
                "[&_kbd]:inline-flex [&_kbd]:h-[18px] [&_kbd]:min-w-[18px] [&_kbd]:items-center [&_kbd]:justify-center",
                "[&_kbd]:rounded-[2px] [&_kbd]:border [&_kbd]:bg-background [&_kbd]:px-1 [&_kbd]:font-mono [&_kbd]:text-[10px] [&_kbd]:font-medium [&_kbd]:text-foreground",
            ],
        },
        /** The hints cluster inside a {@api theme-key:CommandFooter.root}. Inline-flex row with a 12px gap so consecutive kbd-plus-label pairs (`↑↓ navigate`, `↵ select`, `Esc close`) sit as one readable strip rather than collapsing into a run-on glyph soup. */
        hints: { class: "inline-flex items-center gap-3" },
        /** A single kbd-plus-label pair inside {@api theme-key:CommandFooter.hints}. Tighter 6px inner gap pairs the `<kbd>` with its trailing label so the pair reads as one unit against the wider gap between sibling hints. */
        hint: { class: "inline-flex items-center gap-1.5" },
    },
});
