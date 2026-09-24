<script setup>
import DurationDisplay from "@vueda/display/duration-display/DurationDisplay.vue";

/**
 * Duration list column adapter. Wraps {@link DurationDisplay}, binding the cell's raw
 * `value` and forwarding the display options resolved from `columnMappings` (per field
 * type) and any `columnProps` override, so a list cell words a duration the way the read
 * view does.
 *
 * Receives the ObjectsGrid `value` slot props; only `value` is consumed for rendering.
 * `inheritAttrs` is disabled so the remaining cell context props (`field`, `formatted`,
 * `obj`, etc.) are not leaked as DOM attributes onto the DurationDisplay root.
 * DurationDisplay renders a dash for an empty value.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Raw cell value, as a Django duration string or a number of seconds. */
    value: {
        type: [String, Number],
        default: undefined,
    },
    /** Unit wording passed to DurationDisplay; `"short"` abbreviates it for a dense table. */
    format: {
        type: String,
        default: "long",
    },
    /** When true, renders inline (no wrapping div). */
    inline: {
        type: Boolean,
        default: false,
    },
});
</script>
<template>
    <duration-display :value="value" :format="format" :inline="inline" />
</template>
