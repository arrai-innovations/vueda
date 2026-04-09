<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A spinning loading indicator.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FeedbackSpinner", props);
</script>

<template>
    <span role="status" aria-label="Loading" :class="[theme('root'), props.class]">
        <slot>◌</slot>
    </span>
</template>
