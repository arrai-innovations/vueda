<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { SelectRoot } from "reka-ui";

/**
 * Root of a Select widget. Wrap with SelectTrigger and SelectContent.
 */
defineOptions({});

const props = defineProps({
    /** The controlled value. Can be bound with v-model. */
    modelValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
    /** Initial value when uncontrolled. */
    defaultValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
    /** The controlled open state. Can be bound with v-model:open. */
    open: { type: Boolean, default: undefined },
    /** Initial open state when uncontrolled. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Field for object comparison, or a custom comparison function. */
    by: { type: [String, Function], default: undefined },
    /** Reading direction. */
    dir: { type: String, default: undefined },
    /** Whether multiple options can be selected. */
    multiple: { type: Boolean, default: undefined },
    /** Native autocomplete attribute. */
    autocomplete: { type: String, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Name for form submission. */
    name: { type: String, default: undefined },
    /** Whether the field is required. */
    required: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
    /** Emitted when the open state changes. */
    "update:open": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <SelectRoot v-slot="slotProps" data-slot="select" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </SelectRoot>
</template>
