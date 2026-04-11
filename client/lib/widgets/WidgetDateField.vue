<script setup>
import { parseDate, parseDateTime } from "@internationalized/date";
import ControlCalendar from "@vueda/controls/calendar/ControlCalendar.vue";
import ControlDateField from "@vueda/controls/date-field/ControlDateField.vue";
import ControlDateFieldInput from "@vueda/controls/date-field/ControlDateFieldInput.vue";
import ShellPopover from "@vueda/shell/popover/ShellPopover.vue";
import ShellPopoverContent from "@vueda/shell/popover/ShellPopoverContent.vue";
import ShellPopoverTrigger from "@vueda/shell/popover/ShellPopoverTrigger.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, ref } from "vue";

/**
 * A date or datetime picker widget that combines segment-based input with a
 * calendar popover. Uses ControlDateField for keyboard-friendly segment editing
 * and ControlCalendar for visual date selection. Set granularity to "minute" or
 * "second" for datetime input.
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

const dateValue = computed({
    get: () => parseISOValue(widgetContext.state.combinedValue),
    set: (v) => {
        widgetContext.state.combinedValue = v?.toString() ?? null;
    },
});

const onCalendarSelect = (value) => {
    dateValue.value = value;
    if (props.granularity === "day") {
        popoverOpen.value = false;
    }
};
</script>

<template>
    <ShellPopover v-model:open="popoverOpen">
        <ControlDateField
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
            class="items-center"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="segment.part">
                    <ControlDateFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        class="text-muted-foreground"
                    />
                    <ControlDateFieldInput v-else :part="segment.part" />
                </template>
                <ShellPopoverTrigger as-child>
                    <button
                        type="button"
                        class="ml-auto inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        :disabled="widgetContext.state.disabled"
                        tabindex="-1"
                        data-qa="widget-date-field-trigger"
                    >
                        <span aria-hidden="true" class="select-none text-sm leading-none">📅</span>
                    </button>
                </ShellPopoverTrigger>
            </template>
        </ControlDateField>
        <ShellPopoverContent class="w-auto p-3" align="start">
            <ControlCalendar
                :model-value="dateValue"
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
