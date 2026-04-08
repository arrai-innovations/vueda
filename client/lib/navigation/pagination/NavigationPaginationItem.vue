<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationListItem } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * A single page number button in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('@vueda/controls/button').ButtonSize} */
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

const delegatedProps = reactiveOmit(props, "class", "size", "isActive", "themeOverride");
const theme = useTheme("NavigationPaginationItem", props, reactive({ isActive: toRef(props, "isActive") }));
</script>

<template>
    <PaginationListItem data-slot="pagination-item" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </PaginationListItem>
</template>
