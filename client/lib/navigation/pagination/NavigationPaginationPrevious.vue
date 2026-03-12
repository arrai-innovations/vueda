<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronLeftIcon } from "lucide-vue-next";
import { PaginationPrev, useForwardProps } from "reka-ui";

/**
 * A button to navigate to the previous page in a pagination control.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('@vueda/controls/button').ButtonVariants['size']} */
    size: { type: String, default: "default" },
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** Whether the button is disabled. */
    disabled: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
    <PaginationPrev
        data-slot="pagination-previous"
        :class="cn(buttonVariants({ variant: 'ghost', size }), 'gap-1 px-2.5 sm:pr-2.5', props.class)"
        v-bind="forwarded"
    >
        <slot>
            <ChevronLeftIcon />
            <span class="hidden sm:block">Previous</span>
        </slot>
    </PaginationPrev>
</template>
