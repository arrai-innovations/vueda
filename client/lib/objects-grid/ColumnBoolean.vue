<script setup>
import BooleanDisplay from "@vueda/display/boolean-display/BooleanDisplay.vue";
import { fieldChoiceOptions } from "@vueda/utils/choiceLabels.js";
import { computed } from "vue";

/**
 * Boolean list column adapter. Wraps {@link BooleanDisplay}, binding the cell's raw
 * `value` and forwarding the labels resolved from `columnMappings` (per field type) and
 * any `columnProps` override, so a list cell says "Yes" where the read view says "Yes".
 *
 * Receives the ObjectsGrid `value` slot props and reads `value` and `field`. The field's
 * `displayChoices` label the stored values. When the field has no `displayChoices`, its
 * `choices` label them, if those are a static list. A value that matches no label shows the
 * true or false word. An empty value that matches no label shows a dash.
 *
 * `inheritAttrs` is disabled so the remaining cell context props (`formatted`, `obj`, etc.)
 * are not leaked as DOM attributes onto the BooleanDisplay root.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
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
    /** The column's field descriptor. Its `displayChoices` or `choices` label the stored values. */
    field: {
        type: Object,
        default: undefined,
    },
});

const options = computed(() => fieldChoiceOptions(props.field));
</script>
<template>
    <boolean-display
        :value="value"
        :true-label="trueLabel"
        :false-label="falseLabel"
        :options="options"
        :inline="inline"
    />
</template>
