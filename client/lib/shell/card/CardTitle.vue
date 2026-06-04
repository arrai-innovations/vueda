<script setup>
import "@vueda/theme/vueda-tailwind/shell/CardTitle.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The title heading inside a CardHeader.
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

const theme = useTheme("CardTitle", props);
</script>

<template>
    <h3 data-slot="card-title" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </h3>
</template>
