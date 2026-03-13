<script setup>
import { cn } from "@vueda/utils/cn.js";
import { useVModel } from "@vueuse/core";

/**
 * A styled text input built on the native HTML input element, with support for v-model binding.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the input. */
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
    <input
        v-model="modelValue"
        data-slot="input"
        v-bind="$attrs"
        :class="
            cn(
                'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                props.class,
            )
        "
    />
</template>
