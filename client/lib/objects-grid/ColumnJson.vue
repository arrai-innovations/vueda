<script setup>
import JsonDisplay from "@vueda/display/json-display/JsonDisplay.vue";

/**
 * `JSON` list column adapter. Wraps {@link JsonDisplay} in its inline form, binding the
 * cell's raw `value` and forwarding the options resolved from `columnMappings` (per field
 * type) and any `columnProps` override.
 *
 * A cell has one line to work with, so this renders compact `JSON` and truncates past
 * `maxLength`, while the read view indents the same value through
 * {@link WidgetJsonReadOnly}. That is a layout difference, not a wording one: both print
 * the same `JSON` and give a null value the same dash.
 *
 * This replaces the {@link ColumnText} fallback that previously handled these cells. The
 * visible changes are the mono stack, the dash for a null, and `value` rather than
 * `formatted` as the source, so a cell reflects the stored payload rather than the grid's
 * pre-formatted copy of it.
 *
 * Receives the ObjectsGrid `value` slot props; only `value` is consumed for rendering.
 * `inheritAttrs` is disabled so the remaining cell context props (`field`, `formatted`,
 * `obj`, etc.) are not leaked as DOM attributes onto the JsonDisplay root.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Raw cell value. */
    value: {
        type: [String, Number, Boolean, Object, Array],
        default: undefined,
    },
    /** Character cap past which the text is truncated. `0` removes the cap. */
    maxLength: {
        type: Number,
        default: 200,
    },
});
</script>
<template>
    <json-display :value="value" :max-length="maxLength" inline />
</template>
