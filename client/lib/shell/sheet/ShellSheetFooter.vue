<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * Footer section of a Sheet, typically containing action buttons.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="sheet-footer" :class="cn('mt-auto flex flex-col gap-2 p-4', props.class)">
        <slot />
    </div>
</template>
