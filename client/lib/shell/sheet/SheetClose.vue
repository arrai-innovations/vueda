<script setup>
import { DialogClose } from "reka-ui";

/**
 * A button that closes the Sheet when clicked.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <DialogClose data-slot="sheet-close" v-bind="props">
        <slot />
    </DialogClose>
</template>
