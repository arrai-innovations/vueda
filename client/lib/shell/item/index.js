import { cva } from "class-variance-authority";

export { default as ShellItem } from "./ShellItem.vue";
export { default as ShellItemActions } from "./ShellItemActions.vue";
export { default as ShellItemContent } from "./ShellItemContent.vue";
export { default as ShellItemDescription } from "./ShellItemDescription.vue";
export { default as ShellItemFooter } from "./ShellItemFooter.vue";
export { default as ShellItemGroup } from "./ShellItemGroup.vue";
export { default as ShellItemHeader } from "./ShellItemHeader.vue";
export { default as ShellItemMedia } from "./ShellItemMedia.vue";
export { default as ShellItemSeparator } from "./ShellItemSeparator.vue";
export { default as ShellItemTitle } from "./ShellItemTitle.vue";

export const itemVariants = cva(
    "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                outline: "border-border",
                muted: "bg-muted/50",
            },
            size: {
                default: "p-4 gap-4 ",
                sm: "py-3 px-4 gap-2.5",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export const itemMediaVariants = cva(
    "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
                image: "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);
