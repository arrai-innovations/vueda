<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useVModel } from "@vueuse/core";

/**
 * A styled textarea built on the native HTML textarea element, with support for v-model binding.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the textarea. */
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

const theme = useTheme("Textarea", props);
</script>

<template>
    <textarea v-model="modelValue" data-slot="textarea" v-bind="$attrs" :class="[theme('root'), props.class]" />
</template>
