<script setup>
import BooleanDisplay from "@vueda/display/boolean-display/BooleanDisplay.vue";

/**
 * Boolean list column adapter. Wraps {@link BooleanDisplay}, binding the cell's raw
 * `value` and forwarding the labels resolved from `columnMappings` (per field type) and
 * any `columnProps` override, so a list cell says "Yes" where the read view says "Yes".
 *
 * Receives the ObjectsGrid `value` slot props; only `value` is consumed for rendering.
 * `inheritAttrs` is disabled so the remaining cell context props (`field`, `formatted`,
 * `obj`, etc.) are not leaked as DOM attributes onto the BooleanDisplay root.
 * BooleanDisplay renders a dash for an empty value.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Raw cell value. */
    value: {
        // `String` leads on purpose: Vue casts an empty-string prop to `true` when
        // `Boolean` comes first, which would turn a blank cell into a "Yes".
        type: [String, Boolean, Number],
        default: undefined,
    },
    /** Word shown for a true value. */
    trueLabel: {
        type: String,
        default: "Yes",
    },
    /** Word shown for a false value. */
    falseLabel: {
        type: String,
        default: "No",
    },
    /** When true, renders inline (no wrapping div). */
    inline: {
        type: Boolean,
        default: false,
    },
});
</script>
<template>
    <boolean-display :value="value" :true-label="trueLabel" :false-label="falseLabel" :inline="inline" />
</template>
