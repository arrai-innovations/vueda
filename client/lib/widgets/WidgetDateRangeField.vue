<script setup>
import { parseDate, parseDateTime, toCalendarDateTime } from "@internationalized/date";
import DateRangeField from "@vueda/controls/date-range-field/DateRangeField.vue";
import DateRangeFieldInput from "@vueda/controls/date-range-field/DateRangeFieldInput.vue";
import RangeCalendar from "@vueda/controls/range-calendar/RangeCalendar.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, ref } from "vue";

/**
 * A date or datetime range picker widget that combines segment-based input with
 * a range calendar popover. Uses DateRangeField for keyboard-friendly
 * segment editing and RangeCalendar for visual range selection. Set
 * granularity to "minute" or "second" for datetime range input.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    ...WIDGET_PROPS,
    /** The granularity of the field: "day" for date-only, "hour"/"minute"/"second" for datetime. */
    granularity: { type: String, default: "day" },
    /** The minimum selectable date (@internationalized/date object). */
    minValue: { type: Object, default: undefined },
    /** The maximum selectable date (@internationalized/date object). */
    maxValue: { type: Object, default: undefined },
    /** The locale used for formatting segment labels. */
    locale: { type: String, default: undefined },
    /** Whether to hide the time zone segment when using zoned datetime values. */
    hideTimeZone: { type: Boolean, default: undefined },
    /** The hour cycle for time formatting (12 or 24). */
    hourCycle: { type: Number, default: undefined },
});

const emit = defineEmits([...WIDGET_EMITS]);

/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

const popoverOpen = ref(false);

/**
 * @param {string|null|undefined} raw
 * @returns {import('@internationalized/date').CalendarDate|import('@internationalized/date').CalendarDateTime|undefined}
 */
function parseISOValue(raw) {
    if (!raw) return undefined;
    try {
        return raw.includes("T") ? parseDateTime(raw) : parseDate(raw);
    } catch {
        return undefined;
    }
}

const rangeValue = computed({
    get: () => {
        const raw = widgetContext.state.combinedValue;
        if (!raw || typeof raw !== "object") return undefined;
        const start = parseISOValue(raw.lower);
        const end = parseISOValue(raw.upper);
        if (!start && !end) return undefined;
        return { start, end };
    },
    set: (v) => {
        if (!v) {
            widgetContext.state.combinedValue = null;
            return;
        }
        widgetContext.state.combinedValue = {
            lower: v.start?.toString() ?? null,
            upper: v.end?.toString() ?? null,
        };
    },
});

const onCalendarSelect = (value) => {
    if (props.granularity !== "day" && value) {
        value = {
            start: value.start ? toCalendarDateTime(value.start, rangeValue.value?.start ?? undefined) : value.start,
            end: value.end ? toCalendarDateTime(value.end, rangeValue.value?.end ?? undefined) : value.end,
        };
    }
    rangeValue.value = value;
    if (props.granularity === "day" && value?.start && value?.end) {
        popoverOpen.value = false;
    }
};

const theme = useTheme("WidgetDateRangeField", props);
</script>

<template>
    <Popover v-model:open="popoverOpen">
        <DateRangeField
            :id="fieldContext?.state.fieldId"
            v-model="rangeValue"
            :granularity="granularity"
            :min-value="minValue"
            :max-value="maxValue"
            :locale="locale"
            :hide-time-zone="hideTimeZone"
            :hour-cycle="hourCycle"
            :disabled="widgetContext.state.disabled"
            :name="widgetContext.state.combinedName"
            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
            :aria-required="widgetContext.state.required || undefined"
            v-bind="$attrs"
            data-qa="widget-date-range-field"
            :class="theme('field')"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments.start" :key="'start-' + segment.part">
                    <DateRangeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        type="start"
                        :class="theme('literal')"
                        >{{ segment.value }}</DateRangeFieldInput
                    >
                    <DateRangeFieldInput v-else :part="segment.part" type="start">{{
                        segment.value
                    }}</DateRangeFieldInput>
                </template>
                <span :class="theme('separator')" aria-hidden="true">&ndash;</span>
                <template v-for="segment in segments.end" :key="'end-' + segment.part">
                    <DateRangeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        type="end"
                        :class="theme('literal')"
                        >{{ segment.value }}</DateRangeFieldInput
                    >
                    <DateRangeFieldInput v-else :part="segment.part" type="end">{{
                        segment.value
                    }}</DateRangeFieldInput>
                </template>
                <PopoverTrigger as-child>
                    <button
                        type="button"
                        :class="theme('trigger')"
                        :disabled="widgetContext.state.disabled"
                        tabindex="-1"
                        data-qa="widget-date-range-field-trigger"
                    >
                        <span aria-hidden="true" :class="theme('triggerIcon')">📅</span>
                    </button>
                </PopoverTrigger>
            </template>
        </DateRangeField>
        <PopoverContent :class="theme('popoverContent')" align="start">
            <RangeCalendar
                :model-value="rangeValue"
                :min-value="minValue"
                :max-value="maxValue"
                :locale="locale"
                :disabled="widgetContext.state.disabled"
                initial-focus
                @update:model-value="onCalendarSelect"
            />
        </PopoverContent>
    </Popover>
</template>
