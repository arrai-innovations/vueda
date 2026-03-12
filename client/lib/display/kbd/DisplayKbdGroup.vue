<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A container for grouping multiple Kbd key elements inline.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <kbd data-slot="kbd-group" :class="cn('inline-flex items-center gap-1', props.class)">
        <slot />
    </kbd>
</template>
