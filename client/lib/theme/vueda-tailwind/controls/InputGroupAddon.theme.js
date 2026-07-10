/**
 * @module theme/vueda-tailwind/controls/InputGroupAddon.theme
 *
 * Per-component theme registration for InputGroupAddon. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Decorative or interactive content positioned inside an InputGroup.
     * `align` controls placement (`inline-start`, `inline-end`, `block-start`,
     * `block-end`); inline addons sit flush against the input edge, block
     * addons stack above or below it.
     */
    InputGroupAddon: {
        /** The addon slot inside an {@api theme-key:InputGroup.root}. `align` picks one of four placements: `inline-start` / `inline-end` for icon, kbd, or button content flush against the input edge, and `block-start` / `block-end` for helper-text rows stacked above or below the input. Negative-margin hooks (`has-[>button]:ml-[-0.45rem]`, `has-[>kbd]:ml-[-0.35rem]`) tighten interior padding when the addon hosts a button or kbd so the addon does not visually balloon. Inherits `--muted-foreground` text so the addon reads as chrome, not as content; dimmed in lockstep with the group when the host carries `data-disabled=true`. */
        root: ({ align }) => ({
            class: [
                // Addon layout and type.
                "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none",

                // Child elements and disabled state.
                "[&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50",

                // Alignment classes. Tokens shared across placements (order-*, and the
                // block w-full/justify-start/px-3 pair) are hoisted to their own keys so a
                // sibling branch's `false` cannot clear them (combineClasses last-write-wins).
                {
                    "order-first": !align || align === "inline-start" || align === "block-start",
                    "order-last": align === "inline-end" || align === "block-end",
                    "w-full justify-start px-3": align === "block-start" || align === "block-end",
                    "pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]": !align || align === "inline-start",
                    "pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]": align === "inline-end",
                    "pt-3 [.border-b]:pb-3 [.border-b-hairline]:pb-3 group-has-[>input]/input-group:pt-2.5":
                        align === "block-start",
                    "pb-3 [.border-t]:pt-3 [.border-t-hairline]:pt-3 group-has-[>input]/input-group:pb-2.5":
                        align === "block-end",
                },
            ],
        }),
    },
});
