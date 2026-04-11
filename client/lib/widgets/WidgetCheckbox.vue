<script setup>
import ControlCheckbox from "@vueda/controls/checkbox/ControlCheckbox.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A checkbox widget that renders a ControlCheckbox with form field integration.
 * Supports tri-state (checked, unchecked, indeterminate) for NullBooleanField,
 * translating null field values to the indeterminate visual state.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

const controlValue = computed({
    get: () => (widgetContext.state.combinedValue === null ? "indeterminate" : widgetContext.state.combinedValue),
    set: (v) => {
        widgetContext.state.combinedValue = v === "indeterminate" ? null : v;
    },
});
</script>
<template>
    <ControlCheckbox
        :id="fieldContext?.state.fieldId"
        v-model="controlValue"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
        data-qa="widget-checkbox"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    />
</template>
