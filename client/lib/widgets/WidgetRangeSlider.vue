<script setup>
import { ControlSlider } from "@vueda/controls/slider";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { inject } from "vue";

/**
 * A range slider widget that renders a ControlSlider with form field integration.
 * Used for numeric range inputs when paired with FormField.
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
</script>
<template>
    <ControlSlider
        :id="fieldContext?.state.fieldId"
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
        data-qa="widget-range-slider"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    />
</template>
