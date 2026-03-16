<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A nested sub-menu list inside a sidebar menu item.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ul
        data-slot="sidebar-menu-sub"
        data-sidebar="menu-badge"
        :class="
            cn(
                'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
                'group-data-[collapsible=icon]:hidden',
                props.class,
            )
        "
    >
        <slot />
    </ul>
</template>
