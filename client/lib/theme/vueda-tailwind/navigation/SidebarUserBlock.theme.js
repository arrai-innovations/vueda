/**
 * @module theme/vueda-tailwind/navigation/SidebarUserBlock.theme
 *
 * Per-component theme registration for SidebarUserBlock. Imported as a side effect by
 * SidebarUserBlock.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarUserBlock lays out user identity details inside the sidebar footer.
     */
    SidebarUserBlock: {
        /** Horizontal account row for the sidebar footer. */
        root: {
            class: [
                // Layout and spacing.
                "flex w-full items-center gap-2",

                // Collapsed state.
                "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
                "group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-0!",
            ],
        },
        /** Min-width guard for truncating name and role text beside the avatar and action button. */
        text: {
            class: "flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden",
        },
        /** Display-name text. Tight leading and truncation keep long names inside the dense footer row. */
        name: {
            class: [
                // Type and color.
                "truncate text-[length:var(--vueda-text-body)] font-medium leading-tight text-sidebar-foreground",
            ],
        },
        /** Secondary role text using the same micro scale as {@api theme-key:SidebarGroupLabel.root}. */
        role: {
            class: [
                // Type and color.
                "truncate text-[length:var(--vueda-text-micro)] font-normal leading-tight text-muted-foreground",
            ],
        },
        /** Slot wrapper for the optional account-menu trigger. Hidden in the icon-collapsed rail. */
        kebab: {
            class: "contents group-data-[collapsible=icon]:hidden",
        },
    },
});
