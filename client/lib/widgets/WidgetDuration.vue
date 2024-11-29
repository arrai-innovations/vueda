<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import InputNumber from "primevue/inputnumber";
import { computed, reactive, ref, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
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
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetDuration", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);

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
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="`${widgetContext.state.widgetId}-label`"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            @click="focusFirstInput"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div
                    :aria-labelledby="`${widgetContext.state.widgetId}-label`"
                    :class="combineClasses(theme('inner'), labelControlClass)"
                >
                    <div v-if="showDays" :class="theme('innerItem')">
                        <InputNumber
                            ref="daysInput"
                            aria-label="days"
                            :disabled="widgetContext.state.disabled"
                            :invalid="widgetContext.state.validationState.invalid"
                            :max="365"
                            :min="0"
                            :model-value="valueDay"
                            :pt="effectivePt"
                            show-buttons
                            suffix=" days"
                            v-bind="omit($attrs, 'value')"
                            @update:model-value="(newValue) => updateDay(newValue)"
                        />
                    </div>
                    <div v-if="showHours" :class="theme('innerItem')">
                        <InputNumber
                            ref="hoursInput"
                            aria-label="hours"
                            :disabled="widgetContext.state.disabled"
                            :invalid="widgetContext.state.validationState.invalid"
                            :min="0"
                            :model-value="valueHour"
                            :pt="effectivePt"
                            show-buttons
                            suffix=" hours"
                            v-bind="omit($attrs, 'value')"
                            @update:model-value="(newValue) => updateHour(newValue)"
                        />
                    </div>
                    <div v-if="showMinutes" :class="theme('innerItem')">
                        <InputNumber
                            ref="minutesInput"
                            aria-label="minutes"
                            :disabled="widgetContext.state.disabled"
                            :invalid="widgetContext.state.validationState.invalid"
                            :min="0"
                            :model-value="valueMinute"
                            :pt="effectivePt"
                            show-buttons
                            suffix=" minutes"
                            v-bind="omit($attrs, 'value')"
                            @update:model-value="(newValue) => updateMinute(newValue)"
                        />
                    </div>
                    <div v-if="showSeconds" :class="theme('innerItem')">
                        <InputNumber
                            ref="secondsInput"
                            aria-label="seconds"
                            :disabled="widgetContext.state.disabled"
                            :invalid="widgetContext.state.validationState.invalid"
                            :min="0"
                            :model-value="valueSecond"
                            :pt="effectivePt"
                            show-buttons
                            suffix=" seconds"
                            v-bind="omit($attrs, 'value')"
                            @update:model-value="(newValue) => updateSecond(newValue)"
                        />
                    </div>
                </div>
            </template>
        </widget-label>
    </div>
</template>
