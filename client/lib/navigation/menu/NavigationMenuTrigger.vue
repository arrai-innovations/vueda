<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuTrigger, useForwardProps } from "reka-ui";

/**
 * The button that toggles a navigation menu item open or closed.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, prevents the user from interacting with the trigger. */
    disabled: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("NavigationMenuTrigger", props);
</script>

<template>
    <NavigationMenuTrigger
        data-slot="navigation-menu-trigger"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot />
        <span
            class="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
            aria-hidden="true"
            ><slot name="icon">▼</slot></span
        >
    </NavigationMenuTrigger>
</template>
