<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The header section of the sidebar.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="sidebar-header" data-sidebar="header" :class="cn('flex flex-col gap-2 p-2', props.class)">
        <slot />
    </div>
</template>
