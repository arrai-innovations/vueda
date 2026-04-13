<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A inline text or icon label displayed inside an input group alongside the input.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the text element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("InputGroupText", props);
</script>

<template>
    <span v-bind="$attrs" :class="[theme('root'), props.class]">
        <slot />
    </span>
</template>
