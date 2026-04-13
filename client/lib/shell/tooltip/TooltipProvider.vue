<script setup>
import { TooltipProvider } from "reka-ui";

/**
 * Provides tooltip configuration context to all descendant Tooltip components.
 */
defineOptions({});

const props = defineProps({
    /** The delay in ms before tooltips open. */
    delayDuration: { type: Number, default: 0 },
    /** The delay in ms before closing when moving between tooltips. */
    skipDelayDuration: { type: Number, default: undefined },
    /** Whether to disable hoverable tooltip content. */
    disableHoverableContent: { type: Boolean, default: undefined },
    /** Whether to disable closing the tooltip when the trigger is clicked. */
    disableClosingTrigger: { type: Boolean, default: undefined },
    /** Whether all tooltips in this provider are disabled. */
    disabled: { type: Boolean, default: undefined },
    /** Whether to ignore non-keyboard focus for tooltip activation. */
    ignoreNonKeyboardFocus: { type: Boolean, default: undefined },
});
</script>

<template>
    <TooltipProvider v-bind="props">
        <slot />
    </TooltipProvider>
</template>
