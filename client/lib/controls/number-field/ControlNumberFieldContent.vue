<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A relative-positioned wrapper that manages padding around a NumberField input
 * when increment or decrement buttons are present.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlNumberFieldContent", props);
</script>

<template>
    <div data-slot="number-field-content" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
