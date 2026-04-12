<script setup>
import { AlertDialogRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root alert dialog component built on Reka UI's AlertDialogRoot.
 */
defineOptions({});

const props = defineProps({
    /** Whether the alert dialog is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <AlertDialogRoot v-slot="slotProps" data-slot="alert-dialog" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </AlertDialogRoot>
</template>
