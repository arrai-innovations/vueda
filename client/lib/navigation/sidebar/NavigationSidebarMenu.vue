<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A list of sidebar menu items.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ul data-slot="sidebar-menu" data-sidebar="menu" :class="cn('flex w-full min-w-0 flex-col gap-1', props.class)">
        <slot />
    </ul>
</template>
