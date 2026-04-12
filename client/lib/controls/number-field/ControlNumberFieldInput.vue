<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NumberFieldInput } from "reka-ui";

/**
 * The text input element within a ControlNumberField, styled for centered
 * numeric entry and wired to the parent NumberFieldRoot context.
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

const theme = useTheme("ControlNumberFieldInput", props);
</script>

<template>
    <NumberFieldInput data-slot="input" :class="[theme('root'), props.class]" />
</template>
