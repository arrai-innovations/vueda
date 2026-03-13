<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A flex column container that groups related controls within a field,
 * adding consistent spacing between the control and its supporting text.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="field-content"
        :class="cn('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', props.class)"
    >
        <slot />
    </div>
</template>
