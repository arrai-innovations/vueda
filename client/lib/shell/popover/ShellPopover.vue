<script setup>
import { PopoverRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root popover component built on Reka UI's PopoverRoot.
 */
defineOptions({});

const props = defineProps({
    /** Whether the popover is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether to prevent closing when clicking outside. */
    modal: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <PopoverRoot v-slot="slotProps" data-slot="popover" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </PopoverRoot>
</template>
