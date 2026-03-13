<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A row of action controls (e.g. buttons) aligned at the end of a ShellItem.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the actions container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="item-actions" :class="cn('flex items-center gap-2', props.class)">
        <slot />
    </div>
</template>
