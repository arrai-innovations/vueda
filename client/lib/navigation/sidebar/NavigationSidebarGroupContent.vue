<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The content container within a sidebar group.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="sidebar-group-content" data-sidebar="group-content" :class="cn('w-full text-sm', props.class)">
        <slot />
    </div>
</template>
