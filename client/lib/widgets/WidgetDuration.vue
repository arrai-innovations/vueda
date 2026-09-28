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
import { convertDurationToString, normalizeDuration } from "@vueda/utils/duration.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, ref, useId } from "vue";

/**
 * A duration input widget that renders separate numeric spinners for days, hours, minutes, and
 * seconds. Each time unit can be shown or hidden independently via props. The value is DRF's
 * duration string (`[D ]HH:MM:SS`), as a Django `DurationField` sends and reads it, or with
 * `seconds` a number of seconds, as `DurationSecondsField` sends and reads it. The shown units
 * split the value between them, so a duration of two days reads as 48 hours when days are hidden.
 * Clearing a unit while the rest of the value is zero sets the value to `null`. Entering `0` keeps a
 * zero duration.
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
    /** When true, the value is a number of seconds instead of a duration string. */
    seconds: {
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

const UNIT_SECONDS = { days: 86400, hours: 3600, minutes: 60, seconds: 1 };

/** The shown unit names, largest first. */
const shownUnits = computed(() =>
    [
        props.showDays && "days",
        props.showHours && "hours",
        props.showMinutes && "minutes",
        props.showSeconds && "seconds",
    ].filter(Boolean),
);

/**
 * The value split across the shown units, largest first. `remainder` holds the seconds below the
 * smallest shown unit, so editing one unit keeps the part of the value no spinner shows.
 */
const unitValues = computed(() => {
    const normalized = normalizeDuration(widgetContext.state.combinedValue);
    const result = { days: undefined, hours: undefined, minutes: undefined, seconds: undefined, remainder: 0 };
    if (!normalized) {
        return { ...result, negative: false };
    }
    let remaining = Math.trunc(Math.abs(normalized.totalSeconds));
    for (const unit of shownUnits.value) {
        result[unit] = Math.floor(remaining / UNIT_SECONDS[unit]);
        remaining %= UNIT_SECONDS[unit];
    }
    return { ...result, remainder: remaining, negative: normalized.negative };
});

/**
 * @param {"days"|"hours"|"minutes"|"seconds"} unit
 * @param {number|null|undefined} newValue
 */
const updateUnit = (unit, newValue) => {
    const next = { ...unitValues.value, [unit]: Number.isFinite(newValue) ? newValue : undefined };
    const magnitude = shownUnits.value.reduce(
        (total, name) => total + (next[name] ?? 0) * UNIT_SECONDS[name],
        next.remainder,
    );
    if (next[unit] === undefined && magnitude === 0) {
        widgetContext.state.combinedValue = null;
        return;
    }
    const totalSeconds = next.negative ? -magnitude : magnitude;
    widgetContext.state.combinedValue = props.seconds
        ? totalSeconds
        : convertDurationToString({ seconds: totalSeconds });
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
                    :model-value="unitValues.days"
                    :min="0"
                    :max="365"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateUnit('days', $event)"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :data-warning="widgetContext.state.validationState.warning || undefined"
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
                    :model-value="unitValues.hours"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateUnit('hours', $event)"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :data-warning="widgetContext.state.validationState.warning || undefined"
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
                    :model-value="unitValues.minutes"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateUnit('minutes', $event)"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :data-warning="widgetContext.state.validationState.warning || undefined"
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
                    :model-value="unitValues.seconds"
                    :min="0"
                    :disabled="widgetContext.state.disabled"
                    @update:model-value="updateUnit('seconds', $event)"
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                            :data-warning="widgetContext.state.validationState.warning || undefined"
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
