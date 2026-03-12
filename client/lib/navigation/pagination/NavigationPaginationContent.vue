<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationList } from "reka-ui";

/**
 * The list container for pagination items.
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
    <PaginationList
        v-slot="slotProps"
        data-slot="pagination-content"
        v-bind="delegatedProps"
        :class="cn('flex flex-row items-center gap-1', props.class)"
    >
        <slot v-bind="slotProps" />
    </PaginationList>
</template>
