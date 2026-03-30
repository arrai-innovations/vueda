<script setup>
import { PopoverRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A popover container built on Reka UI's PopoverRoot, managing open/close
 * state and providing context to trigger, anchor, and content children.
 */
defineOptions({});

const props = defineProps({
    /** The open state of the popover when initially rendered. */
    defaultOpen: { type: Boolean, default: undefined },
    /** The controlled open state of the popover. Can be bound as v-model:open. */
    open: { type: Boolean, default: undefined },
    /** The modality of the popover. When true, interaction with outside elements is disabled. */
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
