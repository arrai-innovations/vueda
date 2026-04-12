<script setup>
import { ComboboxRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root of a Combobox widget. Combines a searchable input with a filtered option list.
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
    /** Whether multiple options can be selected. */
    multiple: { type: Boolean, default: undefined },
    /** Reading direction. */
    dir: { type: String, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Whether hovering an item triggers highlight. */
    highlightOnHover: { type: Boolean, default: undefined },
    /** Field for object comparison, or a custom comparison function. */
    by: { type: [String, Function], default: undefined },
    /** Name for form submission. */
    name: { type: String, default: undefined },
    /** Whether the field is required. */
    required: { type: Boolean, default: undefined },
    /** Whether to reset the search term when the input blurs. */
    resetSearchTermOnBlur: { type: Boolean, default: undefined },
    /** Whether to reset the search term when a value is selected. */
    resetSearchTermOnSelect: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
    /** Emitted when the open state changes. */
    "update:open": null,
    /** Emitted when an item is highlighted. */
    highlight: null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <ComboboxRoot v-slot="slotProps" data-slot="combobox" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </ComboboxRoot>
</template>
