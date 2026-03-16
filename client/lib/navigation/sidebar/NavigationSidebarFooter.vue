<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The footer section of the sidebar.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="sidebar-footer" data-sidebar="footer" :class="cn('flex flex-col gap-2 p-2', props.class)">
        <slot />
    </div>
</template>
