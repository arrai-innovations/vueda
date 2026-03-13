<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A vertical list container for grouping multiple ShellItem components.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div role="list" data-slot="item-group" :class="cn('group/item-group flex flex-col', props.class)">
        <slot />
    </div>
</template>
