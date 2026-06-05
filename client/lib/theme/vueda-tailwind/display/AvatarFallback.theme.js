/**
 * @module theme/vueda-tailwind/display/AvatarFallback.theme
 *
 * Per-component theme registration for AvatarFallback. Imported as a side effect by
 * AvatarFallback.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the AvatarFallback slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
