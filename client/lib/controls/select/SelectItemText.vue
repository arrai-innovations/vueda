<script setup>
import { SelectItemText } from "reka-ui";

/**
 * The text portion of a SelectItem, used for typeahead and display.
 */
defineOptions({});

const props = defineProps({
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
</script>

<template>
    <SelectItemText data-slot="select-item-text" v-bind="props">
        <slot />
    </SelectItemText>
</template>
