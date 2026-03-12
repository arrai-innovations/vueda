<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { MoreHorizontal } from "lucide-vue-next";
import { PaginationEllipsis } from "reka-ui";

/**
 * An ellipsis indicator for skipped pages in a pagination control.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <PaginationEllipsis
        data-slot="pagination-ellipsis"
        v-bind="delegatedProps"
        :class="cn('flex size-9 items-center justify-center', props.class)"
    >
        <slot>
            <MoreHorizontal class="size-4" />
            <span class="sr-only">More pages</span>
        </slot>
    </PaginationEllipsis>
</template>
