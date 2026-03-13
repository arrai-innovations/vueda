<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A inline text or icon label displayed inside an input group alongside the input.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** Additional CSS classes to apply to the text element. */
    class: { type: [String, Array, Object], default: undefined },
});

const BASE_CLASS =
    "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4";
</script>

<template>
    <span v-bind="$attrs" :class="cn(BASE_CLASS, props.class)">
        <slot />
    </span>
</template>
