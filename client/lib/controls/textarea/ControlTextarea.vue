<script setup>
import { cn } from "@vueda/utils/cn.js";
import { useVModel } from "@vueuse/core";

/**
 * A styled textarea built on the native HTML textarea element, with support for v-model binding.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the textarea. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: [String, Number], default: undefined },
    /** The controlled value (used with v-model). */
    modelValue: { type: [String, Number], default: undefined },
});

const emits = defineEmits(["update:modelValue"]);

const modelValue = useVModel(props, "modelValue", emits, {
    passive: true,
    defaultValue: props.defaultValue,
});
</script>

<template>
    <textarea
        v-model="modelValue"
        data-slot="textarea"
        v-bind="$attrs"
        :class="
            cn(
                'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                props.class,
            )
        "
    />
</template>
