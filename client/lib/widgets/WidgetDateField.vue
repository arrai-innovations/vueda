<script setup>
import { parseDate, parseDateTime, toCalendarDateTime } from "@internationalized/date";
import Calendar from "@vueda/controls/calendar/Calendar.vue";
import DateField from "@vueda/controls/date-field/DateField.vue";
import DateFieldInput from "@vueda/controls/date-field/DateFieldInput.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, ref } from "vue";

/**
 * A date or datetime picker widget that combines segment-based input with a
 * calendar popover. Uses DateField for keyboard-friendly segment editing
 * and Calendar for visual date selection. Set granularity to "minute" or
 * "second" for datetime input.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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

const dateValue = computed({
    get: () => parseISOValue(widgetContext.state.combinedValue),
    set: (v) => {
        widgetContext.state.combinedValue = v?.toString() ?? null;
    },
});

const onCalendarSelect = (value) => {
    if (props.granularity !== "day" && value) {
        value = toCalendarDateTime(value, dateValue.value ?? undefined);
    }
    dateValue.value = value;
    if (props.granularity === "day") {
        popoverOpen.value = false;
    }
};

const theme = useTheme("WidgetDateField", props);
const icon = useIcons("WidgetDateField", props);
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <Popover v-model:open="popoverOpen">
        <DateField
            :id="fieldContext?.state.fieldId"
            v-model="dateValue"
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
            data-qa="widget-date-field"
            :class="theme('field')"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="segment.part">
                    <DateFieldInput v-if="segment.part === 'literal'" :part="segment.part" :class="theme('literal')">{{
                        segment.value
                    }}</DateFieldInput>
                    <DateFieldInput v-else :part="segment.part">{{ segment.value }}</DateFieldInput>
                </template>
                <PopoverTrigger as-child>
                    <button
                        type="button"
                        :class="theme('trigger')"
                        :disabled="widgetContext.state.disabled"
                        tabindex="-1"
                        data-qa="widget-date-field-trigger"
                    >
                        <component
                            :is="icon('calendar').component"
                            v-if="icon('calendar')"
                            v-bind="icon('calendar').props"
                            :class="theme('triggerIcon')"
                            aria-hidden="true"
                        />
                        <span v-else aria-hidden="true" :class="theme('triggerIcon')">📅</span>
                    </button>
                </PopoverTrigger>
            </template>
        </DateField>
        <PopoverContent :class="theme('popoverContent')" align="start">
            <Calendar
                :model-value="dateValue"
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
