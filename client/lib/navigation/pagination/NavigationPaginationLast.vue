<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronRightIcon } from "lucide-vue-next";
import { PaginationLast, useForwardProps } from "reka-ui";

/**
 * A button to navigate to the last page in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('@vueda/controls/button').ButtonSize} */
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

const delegatedProps = reactiveOmit(props, "class", "size", "themeOverride");
const forwarded = useForwardProps(delegatedProps);
const theme = useTheme("NavigationPaginationNavButton", props);
</script>

<template>
    <PaginationLast data-slot="pagination-last" :class="[theme('root'), props.class]" v-bind="forwarded">
        <slot>
            <span class="hidden sm:block">Last</span>
            <ChevronRightIcon />
        </slot>
    </PaginationLast>
</template>
