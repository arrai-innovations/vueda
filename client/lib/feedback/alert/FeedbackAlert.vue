<script setup>
import { alertVariants } from ".";
import { cn } from "@vueda/utils/cn.js";

/**
 * An alert box supporting variant styles via cva.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {import('.').AlertVariants['variant']} */
    variant: { type: String, default: undefined },
});
</script>

<template>
    <div data-slot="alert" :class="cn(alertVariants({ variant }), props.class)" role="alert">
        <slot />
    </div>
</template>
