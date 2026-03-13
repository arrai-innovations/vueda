<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A relative-positioned wrapper that manages padding around a NumberField input
 * when increment or decrement buttons are present.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="number-field-content"
        :class="
            cn(
                'relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5',
                props.class,
            )
        "
    >
        <slot />
    </div>
</template>
