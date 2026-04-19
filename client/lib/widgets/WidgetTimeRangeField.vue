<script setup>
import { parseTime } from "@internationalized/date";
import TimeField from "@vueda/controls/time-field/TimeField.vue";
import TimeFieldInput from "@vueda/controls/time-field/TimeFieldInput.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A time range picker widget that renders two segment-based time inputs for
 * start and end values. Converts between the field's { lower, upper } object
 * format and @internationalized/date Time objects.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    ...WIDGET_PROPS,
    /** The granularity of the time fields ("hour", "minute", or "second"). */
    granularity: { type: String, default: "minute" },
    /** The minimum selectable time (@internationalized/date Time object). */
    minValue: { type: Object, default: undefined },
    /** The maximum selectable time (@internationalized/date Time object). */
    maxValue: { type: Object, default: undefined },
    /** The locale used for formatting time segments. */
    locale: { type: String, default: undefined },
    /** The hour cycle for time formatting (12 or 24). */
    hourCycle: { type: Number, default: undefined },
});

const emit = defineEmits([...WIDGET_EMITS]);

/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

/**
 * @param {string|null|undefined} raw
 * @returns {import('@internationalized/date').Time|undefined}
 */
function parseTimeValue(raw) {
    if (!raw) return undefined;
    try {
        return parseTime(raw);
    } catch {
        return undefined;
    }
}

/**
 * @param {'lower'|'upper'} key
 * @returns {import('vue').WritableComputedRef<import('@internationalized/date').Time|undefined>}
 */
function useBoundaryValue(key) {
    return computed({
        get: () => {
            const raw = widgetContext.state.combinedValue;
            if (!raw || typeof raw !== "object") return undefined;
            return parseTimeValue(raw[key]);
        },
        set: (v) => {
            const current = widgetContext.state.combinedValue ?? {};
            widgetContext.state.combinedValue = {
                ...current,
                [key]: v?.toString() ?? null,
            };
        },
    });
}

const startValue = useBoundaryValue("lower");
const endValue = useBoundaryValue("upper");

const theme = useTheme("WidgetTimeRangeField", props);
</script>

<template>
    <div :class="theme('root')" data-qa="widget-time-range-field" v-bind="$attrs">
        <TimeField
            :id="fieldContext?.state.fieldId"
            v-model="startValue"
            :granularity="granularity"
            :min-value="minValue"
            :max-value="maxValue"
            :locale="locale"
            :hour-cycle="hourCycle"
            :disabled="widgetContext.state.disabled"
            :name="widgetContext.state.combinedName ? widgetContext.state.combinedName + '_lower' : undefined"
            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
            :aria-required="widgetContext.state.required || undefined"
            :class="theme('field')"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="'start-' + segment.part">
                    <TimeFieldInput v-if="segment.part === 'literal'" :part="segment.part" :class="theme('literal')" />
                    <TimeFieldInput v-else :part="segment.part" />
                </template>
            </template>
        </TimeField>
        <span :class="theme('separator')" aria-hidden="true">&ndash;</span>
        <TimeField
            v-model="endValue"
            :granularity="granularity"
            :min-value="minValue"
            :max-value="maxValue"
            :locale="locale"
            :hour-cycle="hourCycle"
            :disabled="widgetContext.state.disabled"
            :name="widgetContext.state.combinedName ? widgetContext.state.combinedName + '_upper' : undefined"
            :class="theme('field')"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="'end-' + segment.part">
                    <TimeFieldInput v-if="segment.part === 'literal'" :part="segment.part" :class="theme('literal')" />
                    <TimeFieldInput v-else :part="segment.part" />
                </template>
            </template>
        </TimeField>
    </div>
</template>
