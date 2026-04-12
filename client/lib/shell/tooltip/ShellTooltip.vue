<script setup>
import { TooltipRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root tooltip component built on Reka UI's TooltipRoot.
 */
defineOptions({});

const props = defineProps({
    /** Whether the tooltip is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** The delay in ms before the tooltip opens. */
    delayDuration: { type: Number, default: undefined },
    /** Whether to skip the delay on hover between tooltips. */
    disableHoverableContent: { type: Boolean, default: undefined },
    /** Whether to disable close on trigger click. */
    disableClosingTrigger: { type: Boolean, default: undefined },
    /** Whether the tooltip is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** Whether to ignore non-keyboard focus. */
    ignoreNonKeyboardFocus: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <TooltipRoot v-slot="slotProps" data-slot="tooltip" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </TooltipRoot>
</template>
