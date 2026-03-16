<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A single item within a sidebar menu list.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <li data-slot="sidebar-menu-item" data-sidebar="menu-item" :class="cn('group/menu-item relative', props.class)">
        <slot />
    </li>
</template>
