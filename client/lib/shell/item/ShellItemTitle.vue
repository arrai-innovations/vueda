<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A title element inside a ShellItem, rendered as an inline-flex row with icon support.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the title container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="item-title"
        :class="cn('flex w-fit items-center gap-2 text-sm leading-snug font-medium', props.class)"
    >
        <slot />
    </div>
</template>
