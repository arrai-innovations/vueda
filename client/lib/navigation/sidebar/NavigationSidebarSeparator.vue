<script setup>
import { ShellSeparator } from "@vueda/shell/separator";
import { cn } from "@vueda/utils/cn.js";

/**
 * A visual separator between sections of the sidebar.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ShellSeparator
        data-slot="sidebar-separator"
        data-sidebar="separator"
        :class="cn('bg-sidebar-border mx-2 w-auto', props.class)"
    />
</template>
