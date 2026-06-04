<script setup>
import "@vueda/theme/vueda-tailwind/navigation/Pagination.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationRoot } from "reka-ui";

/**
 * Root pagination component built on Reka UI's PaginationRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
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
const emits = defineEmits({
    /** Emitted when the current page changes. */
    "update:page": null,
});

const theme = useTheme("Pagination", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <PaginationRoot
        v-slot="slotProps"
        data-slot="pagination"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot v-bind="slotProps" />
    </PaginationRoot>
</template>
