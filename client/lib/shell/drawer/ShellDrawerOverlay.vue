<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DrawerOverlay } from "vaul-vue";

/**
 * The overlay backdrop rendered behind the drawer content.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to force mount the overlay. */
    forceMount: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellDrawerOverlay", props);
</script>

<template>
    <DrawerOverlay data-slot="drawer-overlay" :class="[theme('root'), props.class]" v-bind="delegatedProps">
        <slot />
    </DrawerOverlay>
</template>
