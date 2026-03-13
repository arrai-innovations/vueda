<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A header row at the top of a ShellItem that distributes content between its start and end.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the header container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="item-header" :class="cn('flex basis-full items-center justify-between gap-2', props.class)">
        <slot />
    </div>
</template>
