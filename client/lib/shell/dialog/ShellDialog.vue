<script setup>
import { DialogRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root dialog component built on Reka UI's DialogRoot.
 */
defineOptions({});

const props = defineProps({
    /** Whether the dialog is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DialogRoot v-slot="slotProps" data-slot="dialog" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </DialogRoot>
</template>
