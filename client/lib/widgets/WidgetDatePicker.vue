<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import DatePicker from "primevue/datepicker";
import { computed, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    selectionMode: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetDatePicker", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const valueIsArray = computed(() => Array.isArray(widgetContext.state.combinedValue));
const computedSelectionMode = computed(() =>
    props.selectionMode ? props.selectionMode : valueIsArray.value ? "range" : "single",
);
const modelValue = computed(() => {
    return widgetContext.state.combinedValue;
});
const valueUpdated = (value) => {
    widgetContext.state.combinedValue = value;
};
const onTodayButtonClick = () => {
    widgetContext.state.combinedValue = getCurrentDate();
};

const getCurrentDate = () => {
    return new Date();
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-date-picker-root">
        <widget-label v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-date-picker-inner">
                    <DatePicker
                        :clear-button-props="{
                            label: `Clear`,
                            outlined: true,
                            text: true,
                        }"
                        v-bind="omit($attrs, ['value'])"
                        :disabled="widgetContext.state.disabled"
                        :input-id="widgetContext.state.widgetId"
                        :invalid="widgetContext.state.validationState.invalid"
                        :model-value="modelValue"
                        :name="widgetContext.state.combinedName"
                        :pt="effectivePt"
                        :selection-mode="computedSelectionMode"
                        show-button-bar
                        :today-button-props="{
                            label: `Now`,
                            outlined: true,
                            text: true,
                        }"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                        @today-click="onTodayButtonClick"
                        @update:model-value="(value) => valueUpdated(value)"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
