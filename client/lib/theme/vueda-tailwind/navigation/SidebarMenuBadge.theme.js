/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuBadge.theme
 *
 * Per-component theme registration for SidebarMenuBadge. Imported as a side effect by
 * SidebarMenuBadge.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuBadge styles small count or status badges aligned to sidebar menu buttons.
     */
    SidebarMenuBadge: {
        /** Count or status badge anchored to a menu button. Tone handling stays local to sidebar tokens and hides in icon-collapsed mode. */
        root: ({ tone }) => ({
            class: [
                "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-vueda-control px-1 font-mono text-[length:var(--vueda-text-micro)] font-semibold tabular-nums select-none",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                {
                    "bg-sidebar-accent text-sidebar-foreground peer-data-[active=true]/menu-button:bg-[color-mix(in_oklab,var(--sidebar-primary)_14%,transparent)] peer-data-[active=true]/menu-button:text-sidebar-primary":
                        !tone || tone === "neutral",
                    "bg-[color-mix(in_oklab,var(--sidebar-primary)_14%,transparent)] text-sidebar-primary":
                        tone === "primary",
                    "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-destructive":
                        tone === "destructive",
                },
                "group-data-[collapsible=icon]:hidden",
            ],
        }),
    },
});
