<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationPrev, useForwardProps } from "reka-ui";

/**
 * A button to navigate to the previous page in a pagination control.
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
const icon = useIcons("PaginationPrevious");
</script>

<template>
    <PaginationPrev
        data-slot="pagination-previous"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="forwarded"
    >
        <slot>
            <component
                :is="icon('chevronLeft').component"
                v-if="icon('chevronLeft')"
                v-bind="icon('chevronLeft').props"
                aria-hidden="true"
            />
            <span class="hidden sm:block">Previous</span>
        </slot>
    </PaginationPrev>
</template>
