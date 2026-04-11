<script setup>
import ControlInputGroup from "@vueda/controls/input-group/ControlInputGroup.vue";
import ControlInputGroupAddon from "@vueda/controls/input-group/ControlInputGroupAddon.vue";
import ControlNumberField from "@vueda/controls/number-field/ControlNumberField.vue";
import ControlNumberFieldContent from "@vueda/controls/number-field/ControlNumberFieldContent.vue";
import ControlNumberFieldDecrement from "@vueda/controls/number-field/ControlNumberFieldDecrement.vue";
import ControlNumberFieldIncrement from "@vueda/controls/number-field/ControlNumberFieldIncrement.vue";
import ControlNumberFieldInput from "@vueda/controls/number-field/ControlNumberFieldInput.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A numeric input widget that assembles ControlNumberField sub-components
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
    <ControlNumberField
        v-model="numericValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
    >
        <ControlInputGroup v-if="unit">
            <ControlNumberFieldContent>
                <ControlNumberFieldDecrement />
                <ControlNumberFieldInput
                    :id="fieldContext?.state.fieldId"
                    :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                    :aria-required="widgetContext.state.required || undefined"
                    data-qa="widget-number-input"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
                <ControlNumberFieldIncrement />
            </ControlNumberFieldContent>
            <ControlInputGroupAddon align="inline-end">
                {{ unit }}
            </ControlInputGroupAddon>
        </ControlInputGroup>
        <ControlNumberFieldContent v-else>
            <ControlNumberFieldDecrement />
            <ControlNumberFieldInput
                :id="fieldContext?.state.fieldId"
                :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                :aria-required="widgetContext.state.required || undefined"
                data-qa="widget-number-input"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <ControlNumberFieldIncrement />
        </ControlNumberFieldContent>
    </ControlNumberField>
</template>
