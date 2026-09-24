<script setup>
import BooleanDisplay from "@vueda/display/boolean-display/BooleanDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for boolean fields. Wraps {@link WidgetReadOnly} so the row keeps
 * its label association, theme slots, and lookup behavior, and fills the value with
 * {@link BooleanDisplay} instead of the raw serialized literal.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget` and supplies the per-type
 * labels through `readOnlyWidgetProps`, so a project that says "Enabled" and "Disabled"
 * sets them once in its own mapping rather than per field.
 *
 * A consumer's own `default` slot still wins: this widget supplies the boolean rendering
 * only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
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
});
</script>

<template>
    <widget-read-only v-bind="$attrs">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <boolean-display :false-label="falseLabel" :true-label="trueLabel" :value="rawValue" inline />
        </template>
    </widget-read-only>
</template>
