<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root pagination component built on Reka UI's PaginationRoot.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The total number of pages. */
    total: { type: Number, default: undefined },
    /** The current page. */
    page: { type: Number, default: undefined },
    /** The default page. */
    defaultPage: { type: Number, default: undefined },
    /** The number of items per page. */
    itemsPerPage: { type: Number, default: undefined },
    /** The number of sibling pages to show. */
    siblingCount: { type: Number, default: undefined },
    /** Whether to show edges. */
    showEdges: { type: Boolean, default: undefined },
    /** The disabled state. */
    disabled: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:page"]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <PaginationRoot
        v-slot="slotProps"
        data-slot="pagination"
        v-bind="forwarded"
        :class="cn('mx-auto flex w-full justify-center', props.class)"
    >
        <slot v-bind="slotProps" />
    </PaginationRoot>
</template>
