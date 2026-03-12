<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The header area of a Dialog, used to arrange the title and description.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="dialog-header" :class="cn('flex flex-col gap-2 text-center sm:text-left', props.class)">
        <slot />
    </div>
</template>
