<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import DatePicker from "primevue/datepicker";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    selectionMode: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetDatePicker", props, widgetContext.state);
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
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <DatePicker
                    :clear-button-props="{
                        label: `Clear`,
                        outlined: true,
                        text: true,
                    }"
                    :model-value="modelValue"
                    :name="widgetContext.state.combinedName"
                    :selection-mode="computedSelectionMode"
                    v-bind="$attrs"
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
        </widget-label>
    </div>
</template>
