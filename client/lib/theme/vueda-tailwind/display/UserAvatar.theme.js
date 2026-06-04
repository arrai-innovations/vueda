/**
 * @module theme/vueda-tailwind/display/UserAvatar.theme
 *
 * Per-component theme registration for UserAvatar. Imported as a side effect by
 * UserAvatar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the UserAvatar slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * UserAvatar renders initials with selectable tone recipes for user identity displays. The component controls physical size while the theme key owns color and typography.
     */
    UserAvatar: {
        /**
         * Initials chip frame. The component supplies size inline from its size prop, while tone selects the primary or sidebar color recipe.
         */
        root: ({ tone }) => ({
            class: [
                "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
                {
                    "border border-primary bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary":
                        !tone || tone === "primary",
                    "bg-sidebar-accent text-sidebar-foreground": tone === "sidebar",
                },
            ],
        }),
        /** Uppercase initials text with stable numeric glyphs. */
        initials: {
            class: "font-semibold uppercase leading-none tabular-nums",
        },
    },
});
