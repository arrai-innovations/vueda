<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputNumber from "primevue/inputnumber";
import { computed, reactive } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    showDays: {
        type: Boolean,
        default: false,
    },
    showHours: {
        type: Boolean,
        default: true,
    },
    showMinutes: {
        type: Boolean,
        default: false,
    },
    showSeconds: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetDuration", widgetContext.state);

const durationObject = reactive({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
});
const valueDay = computed(() => {
    return widgetContext.state.combinedValue?.days;
});
const valueHour = computed(() => {
    return widgetContext.state.combinedValue?.hours;
});
const valueMinute = computed(() => {
    return widgetContext.state.combinedValue?.minutes;
});
const valueSecond = computed(() => {
    return widgetContext.state.combinedValue?.seconds;
});
const updateDay = (newValue) => {
    durationObject.days = newValue;
    widgetContext.state.combinedValue = durationObject;
};

const updateHour = (newValue) => {
    durationObject.hours = newValue;
    widgetContext.state.combinedValue = durationObject;
};

const updateMinute = (newValue) => {
    durationObject.minutes = newValue;
    widgetContext.state.combinedValue = durationObject;
};
const updateSecond = (newValue) => {
    durationObject.seconds = newValue;
    widgetContext.state.combinedValue = durationObject;
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div v-if="showDays" :class="theme('innerItem')">
                    <InputNumber
                        :max="365"
                        :min="0"
                        :model-value="valueDay"
                        show-buttons
                        suffix=" days"
                        @update:model-value="(newValue) => updateDay(newValue)"
                    >
                    </InputNumber>
                </div>
                <div v-if="showHours" :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueHour"
                        show-buttons
                        suffix=" hours"
                        @update:model-value="(newValue) => updateHour(newValue)"
                    >
                    </InputNumber>
                </div>
                <div v-if="showMinutes" :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueMinute"
                        show-buttons
                        suffix=" minutes"
                        @update:model-value="(newValue) => updateMinute(newValue)"
                    >
                    </InputNumber>
                </div>
                <div v-if="showSeconds" :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueSecond"
                        show-buttons
                        suffix=" seconds"
                        @update:model-value="(newValue) => updateSecond(newValue)"
                    >
                    </InputNumber>
                </div>
            </div>
        </widget-label>
    </div>
</template>
