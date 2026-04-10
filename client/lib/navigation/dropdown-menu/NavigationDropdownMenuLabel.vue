<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuLabel, useForwardProps } from "reka-ui";

/**
 * A non-interactive label within a dropdown menu.
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
    /** When true, adds left padding to align with items that have an icon. */
    inset: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "inset");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("NavigationDropdownMenuLabel", props);
</script>

<template>
    <DropdownMenuLabel
        data-slot="dropdown-menu-label"
        :data-inset="inset ? '' : undefined"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </DropdownMenuLabel>
</template>
