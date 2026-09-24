/**
 * @module theme/vueda-tailwind/controls/ToggleGroupItem.theme
 *
 * Per-component theme registration for ToggleGroupItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual toggle inside a ToggleGroup. Supports the same `variant` /
     * `size` set as Toggle; when `data-spacing` is `0`, items join into a
     * segmented unit (rounded only on the outer corners, shared borders).
     */
    ToggleGroupItem: {
        /** The individual item inside a {@api theme-key:ToggleGroup}. Mirrors the {@api theme-key:Toggle.root} recipe (same variants, sizes, and accent-pressed treatment) and adds segmented behaviour: when the host group sets `data-spacing=0`, items drop their per-item radius and shadow and re-add them on the first and last child so the cluster reads as one slab. `min-w-0 shrink-0 px-3` overrides the Toggle minimum width so a label-bearing item grows to its content rather than staying square. Disabled items use `--disabled-foreground` ink and a `--border` outline; pressed items keep a `--disabled` fill while unpressed items stay transparent. */
        root: ({ variant, size }) => ({
            class: [
                // Layout and type.
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium",

                // Interactive and active states.
                "hover:bg-muted hover:text-muted-foreground active:bg-accent-active disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",

                // Keep the pressed value visible while replacing interactive colors.
                "disabled:!text-disabled-foreground disabled:!bg-transparent disabled:data-[state=on]:!bg-disabled disabled:!border-border disabled:shadow-none",

                // Icons and focus states.
                "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:hairline-ring focus-visible:focus-ring-shadow transition-shadow",

                // Invalid state and wrapping.
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive whitespace-nowrap",

                // Variant classes. Default is transparent by absence of a fill; only
                // outline adds a border + explicit bg-transparent. (A default-variant
                // bg-transparent key here would be cleared by the outline key anyway,
                // since combineClasses is last-write-wins.)
                {
                    // Same resting and hover edge colours as Toggle's outline, on the real
                    // border the joined seams need.
                    "border border-border-strong hover:border-foreground bg-transparent shadow-vueda-control":
                        variant === "outline",
                },

                // Size classes. Only height varies per size: the group-item override
                // below sets a single px-3 / min-w-0 for every size (label-bearing items
                // grow to content), so mirroring Toggle's per-size px / min-w here would
                // be dead weight that competes with that override.
                {
                    "h-vueda-control": !size || size === "default",
                    "h-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg": size === "lg",
                },

                // Group item overrides.
                "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
                "data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
            ],
        }),
    },
});
