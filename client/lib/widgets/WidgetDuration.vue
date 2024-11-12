<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputNumber from "primevue/inputnumber";
import { computed, reactive, ref, unref } from "vue";

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
        default: false,
    },
    showMinutes: {
        type: Boolean,
        default: true,
    },
    showSeconds: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetDuration", props, widgetContext.state);

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

const durationObject = reactive({
    days: valueDay.value,
    hours: valueHour.value,
    minutes: valueMinute.value,
    seconds: valueSecond.value,
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
const daysInput = ref(null);
const hoursInput = ref(null);
const minutesInput = ref(null);
const secondsInput = ref(null);

// todo: this is untested
const focusFirstInput = () => {
    if (props.showDays && daysInput.value) {
        daysInput.value.onClick();
    } else if (props.showHours && hoursInput.value) {
        hoursInput.value.onClick();
    } else if (props.showMinutes && minutesInput.value) {
        minutesInput.value.onClick();
    } else if (props.showSeconds && secondsInput.value) {
        secondsInput.value.onClick();
    }
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="`${widgetContext.state.widgetId}-label`"
            :hidden="hidden"
            :label-class="theme('label')"
            v-bind="unref(widgetContext.state.validationState)"
            @click="focusFirstInput"
        >
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :aria-labelledby="`${widgetContext.state.widgetId}-label`" :class="theme('inner')">
                <div v-if="showDays" :class="theme('innerItem')">
                    <InputNumber
                        ref="daysInput"
                        aria-label="days"
                        :disabled="widgetContext.state.disabled"
                        :max="365"
                        :min="0"
                        :model-value="valueDay"
                        show-buttons
                        suffix=" days"
                        v-bind="{
                            invalid: widgetContext.state.validationState.invalid,
                            class: {
                                'p-warning': widgetContext.state.validationState.warning,
                            },
                            ...$attrs,
                        }"
                        @update:model-value="(newValue) => updateDay(newValue)"
                    />
                </div>
                <div v-if="showHours" :class="theme('innerItem')">
                    <InputNumber
                        ref="hoursInput"
                        aria-label="hours"
                        :disabled="widgetContext.state.disabled"
                        :min="0"
                        :model-value="valueHour"
                        show-buttons
                        suffix=" hours"
                        v-bind="{
                            invalid: widgetContext.state.validationState.invalid,
                            class: {
                                'p-warning': widgetContext.state.validationState.warning,
                            },
                            ...$attrs,
                        }"
                        @update:model-value="(newValue) => updateHour(newValue)"
                    />
                </div>
                <div v-if="showMinutes" :class="theme('innerItem')">
                    <InputNumber
                        ref="minutesInput"
                        aria-label="minutes"
                        :disabled="widgetContext.state.disabled"
                        :min="0"
                        :model-value="valueMinute"
                        show-buttons
                        suffix=" minutes"
                        v-bind="{
                            invalid: widgetContext.state.validationState.invalid,
                            class: {
                                'p-warning': widgetContext.state.validationState.warning,
                            },
                            ...$attrs,
                        }"
                        @update:model-value="(newValue) => updateMinute(newValue)"
                    />
                </div>
                <div v-if="showSeconds" :class="theme('innerItem')">
                    <InputNumber
                        ref="secondsInput"
                        aria-label="seconds"
                        :disabled="widgetContext.state.disabled"
                        :min="0"
                        :model-value="valueSecond"
                        show-buttons
                        suffix=" seconds"
                        v-bind="{
                            invalid: widgetContext.state.validationState.invalid,
                            class: {
                                'p-warning': widgetContext.state.validationState.warning,
                            },
                            ...$attrs,
                        }"
                        @update:model-value="(newValue) => updateSecond(newValue)"
                    />
                </div>
            </div>
        </widget-label>
    </div>
</template>
