<script setup>
import { cn } from "@vueda/utils/cn.js";
import { NumberFieldInput } from "reka-ui";

/**
 * The text input element within a ControlNumberField, styled for centered
 * numeric entry and wired to the parent NumberFieldRoot context.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <NumberFieldInput
        data-slot="input"
        :class="
            cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent py-1 text-sm text-center shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )
        "
    />
</template>
