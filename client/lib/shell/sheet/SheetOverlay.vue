<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogOverlay } from "reka-ui";

/**
 * The overlay backdrop rendered behind the sheet content.
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
const theme = useTheme("SheetOverlay", props);
</script>

<template>
    <DialogOverlay
        data-slot="sheet-overlay"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="delegatedProps"
    >
        <slot />
    </DialogOverlay>
</template>
