<script setup>
import "@vueda/theme/vueda-tailwind/shell/CardContent.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The main content area of a Card component.
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

const theme = useTheme("CardContent", props);
</script>

<template>
    <div data-slot="card-content" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
