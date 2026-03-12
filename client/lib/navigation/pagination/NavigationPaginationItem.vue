<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationListItem } from "reka-ui";

/**
 * A single page number button in a pagination control.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('@vueda/controls/button').ButtonVariants['size']} */
    size: { type: String, default: "icon" },
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether this item represents the currently active page. */
    isActive: { type: Boolean, default: undefined },
    /** The page value for this item. */
    value: { type: Number, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "size", "isActive");
</script>

<template>
    <PaginationListItem
        data-slot="pagination-item"
        v-bind="delegatedProps"
        :class="
            cn(
                buttonVariants({
                    variant: isActive ? 'outline' : 'ghost',
                    size,
                }),
                props.class,
            )
        "
    >
        <slot />
    </PaginationListItem>
</template>
