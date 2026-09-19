<script setup>
import NumberField from "@vueda/controls/number-field/NumberField.vue";
import NumberFieldContent from "@vueda/controls/number-field/NumberFieldContent.vue";
import NumberFieldDecrement from "@vueda/controls/number-field/NumberFieldDecrement.vue";
import NumberFieldIncrement from "@vueda/controls/number-field/NumberFieldIncrement.vue";
import NumberFieldInput from "@vueda/controls/number-field/NumberFieldInput.vue";
import "@vueda/theme/vueda-tailwind/widgets/WidgetDuration.theme.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, ref, useId } from "vue";

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
const id = useId();
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
            @click.self="focusFirstInput"
        >
            <div v-if="showDays" :class="theme('innerItem')">
                <label :for="`${id}-days`" :class="theme('unitLabel')">Days</label>
                <NumberField
                    :id="`${id}-days`"
                    ref="daysInput"
                    :model-value="valueDay"
                    :min="0"
                    :max="365"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateDay"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-days"
                        />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
            </div>
            <div v-if="showHours" :class="theme('innerItem')">
                <label :for="`${id}-hours`" :class="theme('unitLabel')">Hours</label>
                <NumberField
                    :id="`${id}-hours`"
                    ref="hoursInput"
                    :model-value="valueHour"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateHour"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-hours"
                        />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
            </div>
            <div v-if="showMinutes" :class="theme('innerItem')">
                <label :for="`${id}-minutes`" :class="theme('unitLabel')">Minutes</label>
                <NumberField
                    :id="`${id}-minutes`"
                    ref="minutesInput"
                    :model-value="valueMinute"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateMinute"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-minutes"
                        />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
            </div>
            <div v-if="showSeconds" :class="theme('innerItem')">
                <label :for="`${id}-seconds`" :class="theme('unitLabel')">Seconds</label>
                <NumberField
                    :id="`${id}-seconds`"
                    ref="secondsInput"
                    :model-value="valueSecond"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateSecond"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :aria-required="widgetContext.state.required || undefined"
                            data-qa="duration-seconds"
                        />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
            </div>
        </div>
    </div>
</template>
