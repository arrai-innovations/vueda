<script setup>
import DurationDisplay from "@vueda/display/duration-display/DurationDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for duration fields. Wraps {@link WidgetReadOnly} so the row keeps
 * its label association, theme slots, and lookup behavior, and fills the value with
 * {@link DurationDisplay} instead of the raw serialized literal.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget` and supplies the display
 * options through `readOnlyWidgetProps`, which mirror the `columnProps` that
 * `columnMappings` gives `ColumnDuration`. A read view and a list therefore word the same
 * field the same way, and an empty value renders the same dash in both.
 *
 * A consumer's own `default` slot still wins: this widget supplies the duration rendering
 * only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Unit wording passed to DurationDisplay; `"long"` names each unit in full. */
    format: {
        type: String,
        default: "long",
    },
});
</script>

<template>
    <widget-read-only v-bind="$attrs">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <duration-display :format="format" :value="rawValue" inline />
        </template>
    </widget-read-only>
</template>
