<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The primary content area of a ShellItem, arranged vertically with a flex column layout.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the content container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="item-content"
        :class="cn('flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none', props.class)"
    >
        <slot />
    </div>
</template>
