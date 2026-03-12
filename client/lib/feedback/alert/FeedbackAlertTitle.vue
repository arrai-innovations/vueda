<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The title element inside an Alert component.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="alert-title"
        :class="cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', props.class)"
    >
        <slot />
    </div>
</template>
