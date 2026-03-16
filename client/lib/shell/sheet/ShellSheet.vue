<script setup>
import { DialogRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root Sheet component, a dialog variant that slides in from a side of the screen.
 */
defineOptions({});

const props = defineProps({
    /** Whether the sheet is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether to use modal behavior. */
    modal: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DialogRoot v-slot="slotProps" data-slot="sheet" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </DialogRoot>
</template>
