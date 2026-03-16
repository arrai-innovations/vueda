<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * Header section of a Sheet, typically containing the title and description.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="sheet-header" :class="cn('flex flex-col gap-1.5 p-4', props.class)">
        <slot />
    </div>
</template>
