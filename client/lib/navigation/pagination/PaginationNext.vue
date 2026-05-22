<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationNext, useForwardProps } from "reka-ui";

/**
 * A button to navigate to the next page in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Size variant for the button.
     * @type {import('@vueda/controls/button/Button.vue').ButtonSize}
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
const icon = useIcons("PaginationNext");
</script>

<template>
    <PaginationNext data-slot="pagination-next" :class="[theme('root'), props.class]" v-bind="forwarded">
        <slot>
            <span class="hidden sm:block">Next</span>
            <component
                :is="icon('chevronRight').component"
                v-if="icon('chevronRight')"
                v-bind="icon('chevronRight').props"
                aria-hidden="true"
            />
        </slot>
    </PaginationNext>
</template>
