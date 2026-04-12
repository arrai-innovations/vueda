<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationFirst, useForwardProps } from "reka-ui";

/**
 * A button to navigate to the first page in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Size variant for the button.
     * @type {import('@vueda/controls/button/ControlButton.vue').ButtonSize}
     */
    size: { type: String, default: "default" },
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
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
    <PaginationFirst data-slot="pagination-first" :class="[theme('root'), props.class]" v-bind="forwarded">
        <slot>
            <span aria-hidden="true" class="select-none">‹</span>
            <span class="hidden sm:block">First</span>
        </slot>
    </PaginationFirst>
</template>
