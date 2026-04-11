<script setup>
import ControlRadioGroup from "@vueda/controls/radio-group/ControlRadioGroup.vue";
import ControlRadioGroupItem from "@vueda/controls/radio-group/ControlRadioGroupItem.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A radio group widget that renders a ControlRadioGroup with ControlRadioGroupItem
 * children for each option. Used for choice fields (e.g. BooleanField with choices)
 * when paired with FormField.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Static array of option objects to render as radio items. */
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
    <ControlRadioGroup
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
        data-qa="widget-radio-group"
    >
        <div
            v-for="option in computedOptions"
            :key="option.value"
            class="flex items-center gap-2"
            data-qa="widget-radio-group-option"
        >
            <ControlRadioGroupItem
                :id="`${fieldContext?.state.fieldId ?? widgetContext.state.combinedName}-${option.value}`"
                :value="option.value"
                @focus="widgetContext.focus"
                @blur="widgetContext.blur"
            />
            <label
                :for="`${fieldContext?.state.fieldId ?? widgetContext.state.combinedName}-${option.value}`"
                data-qa="widget-radio-group-label"
            >
                {{ option.label }}
            </label>
        </div>
    </ControlRadioGroup>
</template>
