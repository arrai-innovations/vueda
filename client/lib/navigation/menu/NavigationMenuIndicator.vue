<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuIndicator, useForwardProps } from "reka-ui";

/**
 * An optional indicator element displayed below the list of navigation menu items.
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
    /** Used to force mounting when more control is needed. */
    forceMount: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("NavigationMenuIndicator", props);
</script>

<template>
    <NavigationMenuIndicator
        data-slot="navigation-menu-indicator"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <div :class="theme('arrow')" />
    </NavigationMenuIndicator>
</template>
