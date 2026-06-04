<script setup>
import "@vueda/theme/vueda-tailwind/display/KbdGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A container for grouping multiple Kbd key elements inline.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("KbdGroup", props);
</script>

<template>
    <kbd data-slot="kbd-group" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </kbd>
</template>
