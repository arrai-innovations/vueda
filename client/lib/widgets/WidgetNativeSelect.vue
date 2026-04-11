<script setup>
import ControlNativeSelect from "@vueda/controls/native-select/ControlNativeSelect.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A native select dropdown widget that renders a ControlNativeSelect with option elements
 * for each entry. Used for choice fields when a lightweight native dropdown is preferred
 * over the headless ControlSelect.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Static array of option objects to render as select options. */
    options: {
        type: Array,
        required: true,
    },
    /** Key on each option object used as the displayed label. */
    optionLabel: {
        type: String,
        default: "label",
    },
    /** Key on each option object used as the submitted value. */
    optionValue: {
        type: String,
        default: "value",
    },
    /** Placeholder text for the empty/default option. */
    placeholder: {
        type: String,
        default: "",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);
const computedOptions = computed(() => {
    return props.options.map((option) => ({
        label: option[props.optionLabel],
        value: option[props.optionValue],
    }));
});
</script>
<template>
    <ControlNativeSelect
        :id="fieldContext?.state.fieldId"
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
        data-qa="widget-native-select"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in computedOptions" :key="option.value" :value="option.value">
            {{ option.label }}
        </option>
    </ControlNativeSelect>
</template>
