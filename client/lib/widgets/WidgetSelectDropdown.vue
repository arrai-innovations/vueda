<script setup>
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A dropdown select widget that assembles Select sub-components for
 * static choice fields. Used when a styled dropdown is preferred over a native
 * select element.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Static options. Empty-string and nullish values represent no selection and are omitted from the menu. */
    options: { type: Array, required: true },
    /** Key on each option object used as the displayed label. */
    optionLabel: { type: String, default: "label" },
    /** Key on each option object used as the submitted value. */
    optionValue: { type: String, default: "value" },
    /** Placeholder text shown when no value is selected; falls back to the first empty option label. */
    placeholder: { type: String, default: undefined },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);
const mappedOptions = computed(() => {
    return props.options.map((option) => ({
        label: option[props.optionLabel],
        value: option[props.optionValue],
    }));
});
// SelectItem reserves the empty string for clearing selection. Nullish options
// also mean no selection; false and 0 are real choices and must remain intact.
const computedOptions = computed(() =>
    mappedOptions.value.filter((option) => option.value !== "" && option.value != null),
);
const computedPlaceholder = computed(
    () =>
        props.placeholder ??
        mappedOptions.value.find((option) => option.value === "" || option.value == null)?.label ??
        "",
);
</script>
<template>
    <Select
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
    >
        <SelectTrigger
            :id="fieldContext?.state.fieldId"
            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
            :data-warning="widgetContext.state.validationState.warning || undefined"
            :aria-required="widgetContext.state.required || undefined"
            data-qa="widget-select-dropdown"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <SelectValue :placeholder="computedPlaceholder" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem v-for="option in computedOptions" :key="option.value" :value="option.value">
                {{ option.label }}
            </SelectItem>
        </SelectContent>
    </Select>
</template>
