<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogOverlay } from "reka-ui";

/**
 * The overlay backdrop rendered behind the sheet content.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to force mount the overlay. */
    forceMount: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <DialogOverlay
        data-slot="sheet-overlay"
        :class="
            cn(
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
                props.class,
            )
        "
        v-bind="delegatedProps"
    >
        <slot />
    </DialogOverlay>
</template>
