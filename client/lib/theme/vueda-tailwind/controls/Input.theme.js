/**
 * @module theme/vueda-tailwind/controls/Input.theme
 *
 * Per-component theme registration for Input. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Single-line text input. The reference input-shell control: input-tinted
     * hairline, control-height scale, focus ring, `aria-invalid` swap,
     * read-only and disabled states.
     */
    Input: {
        /** The single-line input shell and the reference recipe for the input-shaped family. Hairline border with the system focus-ring contract, control-height tier from `base.css § Control sizing`, and the cross-cutting `aria-invalid` swap that paints `--destructive` on the border and ring. Read-only and dark-mode states follow the shared input conventions; the file-picker variant (`<input type=file>`) inherits `file:` classes so a bare file input reads as the same chip family as a button. */
        root: {
            class: [
                // Text selection and surface.
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30",

                // Input shell.
                "hairline h-vueda-control w-full min-w-0 rounded-vueda-field bg-transparent px-vueda-control-px text-base shadow-vueda-control transition-shadow",

                // File input child.
                "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",

                // Disabled and responsive states.
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",

                // Focus and invalid states.
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
                "read-only:bg-muted/50 read-only:cursor-default",
            ],
        },
    },
});
