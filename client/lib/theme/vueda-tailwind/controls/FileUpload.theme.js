/**
 * @module theme/vueda-tailwind/controls/FileUpload.theme
 *
 * Per-component theme registration for FileUpload. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * File-picker control. Supports an inline-trigger mode and a dropzone
     * mode; the dropzone variant adds a dashed-border target that highlights
     * while a file is being dragged over it.
     */
    FileUpload: {
        /** The outer container. In inline-trigger mode this is a tight flex column wrapping the picker button plus optional helper text; in `dropzone` mode it grows into a dashed-border target (2px input-coloured dashes, 6 spacing pad, large radius) that highlights with a primary-tinted fill when `dragging`. The `disabled` state dims the whole region and switches the cursor; the inner trigger still picks up its own disabled treatment from {@api theme-key:_ButtonBase.root}. */
        root: ({ dropzone, dragging, disabled }) => ({
            class: [
                // Base layout.
                "inline-flex flex-col items-center gap-1",

                // Dropzone and disabled states.
                {
                    "rounded-lg border-2 border-dashed border-input p-6 transition-colors": dropzone,
                    "border-primary bg-primary/5": dropzone && dragging,
                    "opacity-50 cursor-not-allowed": disabled,
                },
            ],
        }),
        /** The "choose file" affordance. Composes {@api theme-key:_ButtonBase.root} plus {@api theme-key:_ButtonOutline.root} so the trigger reads as the same neutral chip as an outline-variant {@api theme-key:Button.root}, at the default control height with the icon-aware narrower padding kicking in when the trigger carries an icon. */
        trigger: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: [
                // Sizing.
                "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm",
            ],
        },
        /** The "or drop here" helper line below the trigger. Muted secondary text at the sm tier so it sits as ancillary copy and never competes with the trigger label or a selected-file readout. */
        dropMessage: {
            class: ["text-sm text-muted-foreground"],
        },
    },
});
