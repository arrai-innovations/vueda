<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A close button for dismissing an alert. Renders a slotted button that emits a `close` event when clicked.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const emit = defineEmits([
    /** Emitted when the close button is clicked. */
    "close",
]);

const theme = useTheme("FeedbackAlertClose", props);
</script>

<template>
    <button data-slot="alert-close" :class="[theme('root'), props.class]" @click="emit('close')">
        <slot>&#x2715;</slot>
    </button>
</template>
