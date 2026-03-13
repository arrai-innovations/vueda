<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A footer row at the bottom of a ShellItem that distributes content between its start and end.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the footer container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="item-footer" :class="cn('flex basis-full items-center justify-between gap-2', props.class)">
        <slot />
    </div>
</template>
