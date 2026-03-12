<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The footer area of an AlertDialog, used to arrange action and cancel buttons.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="alert-dialog-footer"
        :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)"
    >
        <slot />
    </div>
</template>
