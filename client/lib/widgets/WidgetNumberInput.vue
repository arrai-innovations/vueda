<script setup>
import InputGroup from "@vueda/controls/input-group/InputGroup.vue";
import InputGroupAddon from "@vueda/controls/input-group/InputGroupAddon.vue";
import NumberField from "@vueda/controls/number-field/NumberField.vue";
import NumberFieldContent from "@vueda/controls/number-field/NumberFieldContent.vue";
import NumberFieldDecrement from "@vueda/controls/number-field/NumberFieldDecrement.vue";
import NumberFieldIncrement from "@vueda/controls/number-field/NumberFieldIncrement.vue";
import NumberFieldInput from "@vueda/controls/number-field/NumberFieldInput.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A numeric input widget that assembles NumberField sub-components
 * with increment and decrement buttons. Converts between string field values
 * and numeric display values. Optionally displays a unit label suffix.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Minimum allowed value. */
    min: { type: Number, default: undefined },
    /** Maximum allowed value. */
    max: { type: Number, default: undefined },
    /** Step increment for the spinner buttons. */
    step: { type: Number, default: undefined },
    /** Unit label displayed as a suffix addon (e.g. "CAD", "kg"). */
    unit: { type: String, default: undefined },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

const numericValue = computed({
    get: () => {
        const raw = widgetContext.state.combinedValue;
        if (raw === null || raw === undefined || raw === "") {
            return undefined;
        }
        const num = Number(raw);
        return Number.isNaN(num) ? undefined : num;
    },
    set: (v) => {
        widgetContext.state.combinedValue = v === null || v === undefined ? null : String(v);
    },
});
</script>
<template>
    <NumberField
        v-model="numericValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
    >
        <InputGroup v-if="unit">
            <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput
                    :id="fieldContext?.state.fieldId"
                    :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                    :data-warning="widgetContext.state.validationState.warning || undefined"
                    :aria-required="widgetContext.state.required || undefined"
                    data-qa="widget-number-input"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
                <NumberFieldIncrement />
            </NumberFieldContent>
            <InputGroupAddon align="inline-end">
                {{ unit }}
            </InputGroupAddon>
        </InputGroup>
        <NumberFieldContent v-else>
            <NumberFieldDecrement />
            <NumberFieldInput
                :id="fieldContext?.state.fieldId"
                :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                :data-warning="widgetContext.state.validationState.warning || undefined"
                :aria-required="widgetContext.state.required || undefined"
                data-qa="widget-number-input"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <NumberFieldIncrement />
        </NumberFieldContent>
    </NumberField>
</template>
