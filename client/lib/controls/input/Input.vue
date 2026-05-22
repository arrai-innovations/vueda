<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useVModel } from "@vueuse/core";

/**
 * A styled text input built on the native HTML input element, with support for v-model binding.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the input. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: [String, Number], default: undefined },
    /** The controlled value (used with v-model). */
    modelValue: { type: [String, Number], default: undefined },
});

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const modelValue = useVModel(props, "modelValue", emits, {
    passive: true,
    defaultValue: props.defaultValue,
});

const theme = useTheme("Input", props);
</script>

<template>
    <input v-model="modelValue" data-slot="input" v-bind="$attrs" :class="[theme('root'), props.class]" />
</template>
