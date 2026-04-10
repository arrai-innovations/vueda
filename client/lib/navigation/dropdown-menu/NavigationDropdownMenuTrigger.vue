<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuTrigger, useForwardProps } from "reka-ui";

/**
 * The button that toggles a dropdown menu open or closed.
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
const theme = useTheme("NavigationDropdownMenuTrigger", props);
</script>

<template>
    <DropdownMenuTrigger
        data-slot="dropdown-menu-trigger"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </DropdownMenuTrigger>
</template>
