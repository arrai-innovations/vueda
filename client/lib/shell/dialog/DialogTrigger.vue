<script setup>
import { DialogTrigger } from "reka-ui";

/**
 * The trigger button that opens a Dialog.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <DialogTrigger data-slot="dialog-trigger" v-bind="props">
        <slot />
    </DialogTrigger>
</template>
