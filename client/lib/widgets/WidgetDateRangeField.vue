<script setup>
import { parseDate, parseDateTime } from "@internationalized/date";
import { ControlDateRangeField, ControlDateRangeFieldInput } from "@vueda/controls/date-range-field";
import { ControlRangeCalendar } from "@vueda/controls/range-calendar";
import { ShellPopover, ShellPopoverContent, ShellPopoverTrigger } from "@vueda/shell/popover";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, ref } from "vue";

/**
 * A date or datetime range picker widget that combines segment-based input with
 * a range calendar popover. Uses ControlDateRangeField for keyboard-friendly
 * segment editing and ControlRangeCalendar for visual range selection. Set
 * granularity to "minute" or "second" for datetime range input.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
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
    rangeValue.value = value;
    if (props.granularity === "day" && value?.start && value?.end) {
        popoverOpen.value = false;
    }
};
</script>

<template>
    <ShellPopover v-model:open="popoverOpen">
        <ControlDateRangeField
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
            class="items-center"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments.start" :key="'start-' + segment.part">
                    <ControlDateRangeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        type="start"
                        class="text-muted-foreground"
                    />
                    <ControlDateRangeFieldInput v-else :part="segment.part" type="start" />
                </template>
                <span class="mx-2 text-muted-foreground" aria-hidden="true">&ndash;</span>
                <template v-for="segment in segments.end" :key="'end-' + segment.part">
                    <ControlDateRangeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        type="end"
                        class="text-muted-foreground"
                    />
                    <ControlDateRangeFieldInput v-else :part="segment.part" type="end" />
                </template>
                <ShellPopoverTrigger as-child>
                    <button
                        type="button"
                        class="ml-auto inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        :disabled="widgetContext.state.disabled"
                        tabindex="-1"
                        data-qa="widget-date-range-field-trigger"
                    >
                        <span aria-hidden="true" class="select-none text-sm leading-none">📅</span>
                    </button>
                </ShellPopoverTrigger>
            </template>
        </ControlDateRangeField>
        <ShellPopoverContent class="w-auto p-3" align="start">
            <ControlRangeCalendar
                :model-value="rangeValue"
                :min-value="minValue"
                :max-value="maxValue"
                :locale="locale"
                :disabled="widgetContext.state.disabled"
                initial-focus
                @update:model-value="onCalendarSelect"
            />
        </ShellPopoverContent>
    </ShellPopover>
</template>
