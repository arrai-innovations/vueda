<script setup>
import JsonDisplay from "@vueda/display/json-display/JsonDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for `JSON` fields. Wraps {@link WidgetReadOnly} so the row keeps
 * its label association, theme slots, and lookup behavior, and fills the value with
 * {@link JsonDisplay} instead of the one-line literal the plain read-only widget prints.
 *
 * The block form is the point: a read view has the room to indent a nested payload, while
 * a list cell does not, so {@link ColumnJson} renders the same value inline. Both give a
 * null value the same dash.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget` and supplies the display
 * options through `readOnlyWidgetProps`.
 *
 * A consumer's own `default` slot still wins: this widget supplies the `JSON` rendering
 * only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Spaces per nesting level. */
    indent: {
        type: Number,
        default: 2,
    },
});
</script>

<template>
    <widget-read-only v-bind="$attrs">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <json-display :indent="indent" :value="rawValue" />
        </template>
    </widget-read-only>
</template>
