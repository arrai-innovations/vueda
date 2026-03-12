<script setup>
import { cn } from "@vueda/utils/cn.js";
import { Loader2Icon } from "lucide-vue-next";

/**
 * A spinning loading indicator.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <Loader2Icon role="status" aria-label="Loading" :class="cn('size-4 animate-spin', props.class)" />
</template>
