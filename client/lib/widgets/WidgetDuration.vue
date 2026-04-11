<script setup>
import ControlNumberField from "@vueda/controls/number-field/ControlNumberField.vue";
import ControlNumberFieldContent from "@vueda/controls/number-field/ControlNumberFieldContent.vue";
import ControlNumberFieldDecrement from "@vueda/controls/number-field/ControlNumberFieldDecrement.vue";
import ControlNumberFieldIncrement from "@vueda/controls/number-field/ControlNumberFieldIncrement.vue";
import ControlNumberFieldInput from "@vueda/controls/number-field/ControlNumberFieldInput.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
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
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const theme = useWidgetTheme("WidgetDuration", props, widgetContext.state);

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
        daysInput.value.$el?.querySelector("input")?.focus();
    } else if (props.showHours && hoursInput.value) {
        hoursInput.value.$el?.querySelector("input")?.focus();
    } else if (props.showMinutes && minutesInput.value) {
        minutesInput.value.$el?.querySelector("input")?.focus();
    } else if (props.showSeconds && secondsInput.value) {
        secondsInput.value.$el?.querySelector("input")?.focus();
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
                <ControlNumberField
                    ref="daysInput"
                    :model-value="valueDay"
                    :min="0"
                    :max="365"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateDay"
                >
                    <ControlNumberFieldContent>
                        <ControlNumberFieldDecrement />
                        <ControlNumberFieldInput
                            aria-label="days"
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-days"
                        />
                        <ControlNumberFieldIncrement />
                    </ControlNumberFieldContent>
                </ControlNumberField>
            </div>
            <div v-if="showHours" :class="theme('innerItem')">
                <ControlNumberField
                    ref="hoursInput"
                    :model-value="valueHour"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateHour"
                >
                    <ControlNumberFieldContent>
                        <ControlNumberFieldDecrement />
                        <ControlNumberFieldInput
                            aria-label="hours"
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-hours"
                        />
                        <ControlNumberFieldIncrement />
                    </ControlNumberFieldContent>
                </ControlNumberField>
            </div>
            <div v-if="showMinutes" :class="theme('innerItem')">
                <ControlNumberField
                    ref="minutesInput"
                    :model-value="valueMinute"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateMinute"
                >
                    <ControlNumberFieldContent>
                        <ControlNumberFieldDecrement />
                        <ControlNumberFieldInput
                            aria-label="minutes"
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-minutes"
                        />
                        <ControlNumberFieldIncrement />
                    </ControlNumberFieldContent>
                </ControlNumberField>
            </div>
            <div v-if="showSeconds" :class="theme('innerItem')">
                <ControlNumberField
                    ref="secondsInput"
                    :model-value="valueSecond"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateSecond"
                >
                    <ControlNumberFieldContent>
                        <ControlNumberFieldDecrement />
                        <ControlNumberFieldInput
                            aria-label="seconds"
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-seconds"
                        />
                        <ControlNumberFieldIncrement />
                    </ControlNumberFieldContent>
                </ControlNumberField>
            </div>
        </div>
    </div>
</template>
