<script setup>
import "@vueda/theme/vueda-tailwind/shell/DrawerOverlay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DrawerOverlay } from "vaul-vue";

/**
 * The overlay backdrop rendered behind the drawer content.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to force mount the overlay. */
    forceMount: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("DrawerOverlay", props);
</script>

<template>
    <DrawerOverlay
        data-slot="drawer-overlay"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="delegatedProps"
    >
        <slot />
    </DrawerOverlay>
</template>
