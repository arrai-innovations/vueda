<script setup>
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import InputNumber from "primevue/inputnumber";
import { computed, inject, reactive, ref } from "vue";

/**
 * A duration input widget that renders separate numeric spinners for days, hours, minutes, and
 * seconds. Each time unit can be shown or hidden independently via props; the combined value is
 * stored as an object with the corresponding numeric fields.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** When true, renders the days spinner. */
    showDays: {
        type: Boolean,
        default: false,
    },
    /** When true, renders the hours spinner. */
    showHours: {
        type: Boolean,
        default: false,
    },
    /** When true, renders the minutes spinner. */
    showMinutes: {
        type: Boolean,
        default: true,
    },
    /** When true, renders the seconds spinner. */
    showSeconds: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
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
</script>
<template>
    <div :class="theme('root')">
        <div
            :aria-labelledby="fieldContext?.state.fieldId"
            :class="theme('inner')"
            data-qa="widget-duration-inner"
            @click="focusFirstInput"
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
                    :aria-required="widgetContext.state.required"
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
                    :aria-required="widgetContext.state.required"
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
                    :aria-required="widgetContext.state.required"
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
                    :aria-required="widgetContext.state.required"
                    @update:model-value="(newValue) => updateSecond(newValue)"
                />
            </div>
        </div>
    </div>
</template>
