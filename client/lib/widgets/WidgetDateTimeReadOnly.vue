<script setup>
import DateTimeDisplay from "@vueda/display/date-display/DateTimeDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for date, time, and datetime fields. Wraps
 * {@link WidgetReadOnly} so the row keeps its label association, theme slots,
 * and lookup behavior, and fills the value with {@link DateTimeDisplay} instead
 * of the raw serialized string.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget` and supplies the
 * per-type display options through `readOnlyWidgetProps`, which mirror the
 * `columnProps` that `columnMappings` gives `ColumnDateTime`. A read view and a
 * list therefore format the same field the same way, and an empty value renders
 * the same dash in both.
 *
 * A consumer's own `default` slot still wins: this widget supplies the date
 * rendering only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Display layout passed to DateTimeDisplay; `"absolute"` matches the list column adapter. */
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
});
</script>

<template>
    <widget-read-only v-bind="$attrs">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <date-time-display
                :format="format"
                :show-relative="showRelative"
                :show-time="showTime"
                :show-tooltip="showTooltip"
                :tooltip-format="tooltipFormat"
                :value="rawValue"
            />
        </template>
    </widget-read-only>
</template>
