<script setup>
import { fieldVariants } from "./index.js";
import { cn } from "@vueda/utils/cn.js";

/**
 * A form field layout container that groups a label, control, and supporting text
 * with configurable vertical, horizontal, or responsive orientation.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Controls whether the label and input stack vertically, sit side by side, or switch layout responsively. */
    orientation: { type: String, default: undefined },
});
</script>

<template>
    <div
        role="group"
        data-slot="field"
        :data-orientation="orientation"
        :class="cn(fieldVariants({ orientation }), props.class)"
    >
        <slot />
    </div>
</template>
