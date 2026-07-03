<script setup>
import DateTimeDisplay from "@vueda/display/date-display/DateTimeDisplay.vue";

/**
 * Date/time/datetime list column adapter. Wraps {@link DateTimeDisplay},
 * binding the cell's raw `value` and forwarding display configuration resolved
 * from `columnMappings` (per field type) and any `columnProps` override.
 *
 * Receives the ObjectsGrid `value` slot props; only `value` is consumed for
 * rendering. `inheritAttrs` is disabled so the remaining cell context props
 * (`field`, `formatted`, `obj`, etc.) are not leaked as DOM attributes onto the
 * DateTimeDisplay root. DateTimeDisplay renders a dash for empty/invalid values.
 *
 * The default `format` is `"absolute"` (clean absolute text with the relative
 * time on hover), which reads better in a dense table than the inline default.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Raw cell value (ISO string, Date, or Luxon DateTime). */
    value: {
        type: [String, Object, Date],
        default: "",
    },
    /** Display layout passed to DateTimeDisplay; `"absolute"` keeps tables tidy. */
    format: {
        type: [String, Object],
        default: "absolute",
    },
    /** Whether to include the time portion in the absolute output. */
    showTime: {
        type: Boolean,
        default: true,
    },
    /** Whether to show the relative time label. */
    showRelative: {
        type: Boolean,
        default: true,
    },
    /** Whether to show the complementary representation as a hover tooltip. */
    showTooltip: {
        type: Boolean,
        default: true,
    },
    /** Luxon format used for the tooltip when a custom `format` is active. */
    tooltipFormat: {
        type: [String, Object],
        default: "default",
    },
    /** When true, renders inline (no wrapping div). */
    inline: {
        type: Boolean,
        default: false,
    },
});
</script>
<template>
    <date-time-display
        :value="value"
        :format="format"
        :show-time="showTime"
        :show-relative="showRelative"
        :show-tooltip="showTooltip"
        :tooltip-format="tooltipFormat"
        :inline="inline"
    />
</template>
