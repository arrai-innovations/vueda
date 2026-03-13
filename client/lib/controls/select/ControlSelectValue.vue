<script setup>
import { SelectValue } from "reka-ui";

/**
 * Displays the currently selected value inside ControlSelectTrigger.
 */
defineOptions({});

const props = defineProps({
    /** Placeholder text shown when no value is selected. */
    placeholder: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
</script>

<template>
    <SelectValue data-slot="select-value" v-bind="props">
        <slot />
    </SelectValue>
</template>
