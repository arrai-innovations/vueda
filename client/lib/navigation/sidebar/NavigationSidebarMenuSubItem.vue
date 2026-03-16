<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A single item within a sidebar sub-menu list.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <li
        data-slot="sidebar-menu-sub-item"
        data-sidebar="menu-sub-item"
        :class="cn('group/menu-sub-item relative', props.class)"
    >
        <slot />
    </li>
</template>
