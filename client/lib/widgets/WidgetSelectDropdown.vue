<script setup>
import {
    ControlSelect,
    ControlSelectContent,
    ControlSelectItem,
    ControlSelectTrigger,
    ControlSelectValue,
} from "@vueda/controls/select";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A dropdown select widget that assembles ControlSelect sub-components for
 * static choice fields. Used when a styled dropdown is preferred over a native
 * select element.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Static array of option objects to render as select items. */
    options: { type: Array, required: true },
    /** Key on each option object used as the displayed label. */
    optionLabel: { type: String, default: "label" },
    /** Key on each option object used as the submitted value. */
    optionValue: { type: String, default: "value" },
    /** Placeholder text shown when no value is selected. */
    placeholder: { type: String, default: "" },
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
    <ControlSelect
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
    >
        <ControlSelectTrigger
            :id="fieldContext?.state.fieldId"
            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
            :aria-required="widgetContext.state.required || undefined"
            data-qa="widget-select-dropdown"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <ControlSelectValue :placeholder="placeholder" />
        </ControlSelectTrigger>
        <ControlSelectContent>
            <ControlSelectItem v-for="option in computedOptions" :key="option.value" :value="option.value">
                {{ option.label }}
            </ControlSelectItem>
        </ControlSelectContent>
    </ControlSelect>
</template>
