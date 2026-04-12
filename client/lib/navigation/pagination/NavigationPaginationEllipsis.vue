<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationEllipsis } from "reka-ui";

/**
 * An ellipsis indicator for skipped pages in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const theme = useTheme("NavigationPaginationEllipsis", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
</script>

<template>
    <PaginationEllipsis data-slot="pagination-ellipsis" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot>
            <span aria-hidden="true" class="select-none">⋯</span>
            <span class="sr-only">More pages</span>
        </slot>
    </PaginationEllipsis>
</template>
