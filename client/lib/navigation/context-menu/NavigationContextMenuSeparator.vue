<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuSeparator } from "reka-ui";

/**
 * A visual separator between context menu items or groups.
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
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("NavigationContextMenuSeparator", props);
</script>

<template>
    <ContextMenuSeparator
        data-slot="context-menu-separator"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
    />
</template>
