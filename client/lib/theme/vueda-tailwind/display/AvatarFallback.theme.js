/**
 * @module theme/vueda-tailwind/display/AvatarFallback.theme
 *
 * Per-component theme registration for AvatarFallback. Imported as a side effect by
 * AvatarFallback.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AvatarFallback centers fallback content when an avatar image is unavailable. It uses the muted surface treatment for neutral identity placeholders.
     */
    AvatarFallback: {
        /** Centered muted fallback surface for initials or placeholder content. */
        root: {
            class: "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full",
        },
    },
});
