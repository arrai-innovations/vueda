<script setup>
import { ControlInput } from "@vueda/controls/input";
import { cn } from "@vueda/utils/cn.js";

/**
 * A search or filter input styled for use inside the sidebar.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ControlInput
        data-slot="sidebar-input"
        data-sidebar="input"
        :class="cn('bg-background h-8 w-full shadow-none', props.class)"
    />
</template>
