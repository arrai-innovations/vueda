<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A group of related sidebar items with optional label and actions.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="sidebar-group"
        data-sidebar="group"
        :class="cn('relative flex w-full min-w-0 flex-col p-2', props.class)"
    >
        <slot />
    </div>
</template>
