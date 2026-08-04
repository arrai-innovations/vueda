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
     * navigate, ↵ select, Esc close) and custom action labels. Keycap styling
     * stays with Kbd / KbdGroup so footer hints match shortcuts elsewhere.
     */
    CommandFooter: {
        /** The optional chin below {@api theme-key:CommandList.root}. Sits at `--vueda-cmd-footer-height` (32px) on `--muted` with a top hairline, holding keyboard-navigation hints on the leading edge and custom action labels on the trailing edge; supporting-size copy on `--muted-foreground` reads as status rather than primary chrome. */
        root: {
            class: [
                // Footer shell.
                "flex h-[var(--vueda-cmd-footer-height)] items-center justify-between gap-3 border-t-hairline bg-muted px-[var(--vueda-control-px-md)] text-[length:var(--vueda-text-supporting)] text-muted-foreground",
            ],
        },
        /** The hints cluster inside a {@api theme-key:CommandFooter.root}. Inline-flex row with a 12px gap so consecutive keycap-plus-label pairs (`↑↓ navigate`, `↵ select`, `Esc close`) sit as one readable strip rather than collapsing into a run-on glyph soup. */
        hints: { class: "inline-flex items-center gap-3" },
        /** A single Kbd-plus-label pair inside {@api theme-key:CommandFooter.hints}. Tighter 6px inner gap pairs the keycap with its trailing label so the pair reads as one unit against the wider gap between sibling hints. */
        hint: { class: "inline-flex items-center gap-1.5" },
    },
});
