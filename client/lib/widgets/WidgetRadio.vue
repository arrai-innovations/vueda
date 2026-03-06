<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import RadioButton from "primevue/radiobutton";
import { computed, useSlots } from "vue";

/**
 * Renders a group of radio buttons from a static `options` array, with a shared accessible label.
 * Each radio button and its label are individually slottable for custom rendering.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    /** Static array of options to display as radio buttons. */
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
    /** Callback invoked when any radio button in the group receives focus. */
    onFocus: {
        type: Function,
        default: () => {},
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetRadio", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const computedOptions = computed(() => {
    return props.options.map((option) => {
        return {
            label: option[props.optionLabel],
            value: option[props.optionValue],
        };
    });
});
const handleFocus = () => {
    widgetContext.focus();
    props.onFocus();
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>

<template>
    <div :class="theme('root')">
        <widget-label
            :id="`${widgetContext.state.widgetId}-label`"
            :label-class="theme('optionLabel')"
            label-tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-radio-inner">
                    <ul
                        role="radiogroup"
                        :aria-labelledby="`${widgetContext.state.widgetId}-label`"
                        :aria-required="widgetContext.state.required && widgetContext.state.combinedValue === null"
                        :class="theme('options')"
                    >
                        <li v-for="option in computedOptions" :key="option.value" :class="theme('option')">
                            <slot
                                :id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                :class="theme('optionInput')"
                                :input-name="widgetContext.state.combinedName"
                                :model-value="widgetContext.state.combinedValue"
                                :name="$slots[`radio(${option.value})`] ? `radio(${option.value})` : 'radio'"
                                :value="option.value"
                                @update:model-value="widgetContext.state.combinedValue = $event"
                            >
                                <radio-button
                                    v-model="widgetContext.state.combinedValue"
                                    :class="theme('optionInput')"
                                    :disabled="widgetContext.state.disabled"
                                    :input-id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                    :invalid="widgetContext.state.validationState.invalid"
                                    :name="widgetContext.state.combinedName"
                                    :pt="effectivePt"
                                    :value="option.value"
                                    v-bind="omit($attrs, 'value')"
                                    @blur="widgetContext.blur"
                                    @focus="handleFocus"
                                />
                            </slot>
                            <slot
                                :class="theme('optionLabel')"
                                :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                :label="option.label"
                                :name="$slots[`label(${option.value})`] ? `label(${option.value})` : 'label'"
                            >
                                <label
                                    :class="[theme('optionLabel')]"
                                    :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                    >{{ option.label }}</label
                                >
                            </slot>
                        </li>
                    </ul>
                </div>
            </template>
        </widget-label>
    </div>
</template>
