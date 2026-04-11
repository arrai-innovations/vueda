<script setup>
import ControlRangeCalendarCell from "./ControlRangeCalendarCell.vue";
import ControlRangeCalendarCellTrigger from "./ControlRangeCalendarCellTrigger.vue";
import ControlRangeCalendarGrid from "./ControlRangeCalendarGrid.vue";
import ControlRangeCalendarGridBody from "./ControlRangeCalendarGridBody.vue";
import ControlRangeCalendarGridHead from "./ControlRangeCalendarGridHead.vue";
import ControlRangeCalendarGridRow from "./ControlRangeCalendarGridRow.vue";
import ControlRangeCalendarHeadCell from "./ControlRangeCalendarHeadCell.vue";
import ControlRangeCalendarHeader from "./ControlRangeCalendarHeader.vue";
import ControlRangeCalendarHeading from "./ControlRangeCalendarHeading.vue";
import ControlRangeCalendarNextButton from "./ControlRangeCalendarNextButton.vue";
import ControlRangeCalendarPrevButton from "./ControlRangeCalendarPrevButton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A full-featured date range calendar built on RangeCalendarRoot.
 * Supports range selection with configurable date constraints and navigation.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the calendar root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The currently selected date range (use with v-model). */
    modelValue: { type: Object, default: undefined },
    /** The default selected date range. */
    defaultValue: { type: Object, default: undefined },
    /** The current placeholder date (use with v-model:placeholder). */
    placeholder: { type: Object, default: undefined },
    /** The default placeholder date shown when no date is selected. */
    defaultPlaceholder: { type: Object, default: undefined },
    /** The locale string used for date formatting. */
    locale: { type: String, default: undefined },
    /** The minimum selectable date value. */
    minValue: { type: Object, default: undefined },
    /** The maximum selectable date value. */
    maxValue: { type: Object, default: undefined },
    /** Whether to always display a fixed number of weeks. */
    fixedWeeks: { type: Boolean, default: undefined },
    /** A function that returns true for dates that should be disabled. */
    isDateDisabled: { type: Function, default: undefined },
    /** A function that returns true for dates that are unavailable. */
    isDateUnavailable: { type: Function, default: undefined },
    /** The number of months to display at once. */
    numberOfMonths: { type: Number, default: undefined },
    /** Whether to use paged navigation (advance by numberOfMonths at a time). */
    pagedNavigation: { type: Boolean, default: undefined },
    /** Whether to prevent deselecting an already-selected date. */
    preventDeselect: { type: Boolean, default: undefined },
    /** The day of the week the calendar starts on (0 = Sunday). */
    weekStartsOn: { type: Number, default: undefined },
    /** The format of weekday labels: "narrow", "short", or "long". */
    weekdayFormat: { type: String, default: undefined },
    /** An accessible label for the calendar. */
    calendarLabel: { type: String, default: undefined },
    /** Whether the calendar is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** Whether the calendar is read-only. */
    readonly: { type: Boolean, default: undefined },
    /** Whether to focus the calendar on mount. */
    initialFocus: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const emits = defineEmits(["update:modelValue", "update:placeholder"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlRangeCalendar", props);
</script>

<template>
    <RangeCalendarRoot
        v-slot="{ grid, weekDays }"
        data-slot="range-calendar"
        :class="[theme('root'), props.class]"
        v-bind="forwarded"
    >
        <ControlRangeCalendarHeader>
            <ControlRangeCalendarHeading />

            <div class="flex items-center gap-1">
                <ControlRangeCalendarPrevButton />
                <ControlRangeCalendarNextButton />
            </div>
        </ControlRangeCalendarHeader>

        <div class="mt-4 flex flex-col gap-y-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
            <ControlRangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
                <ControlRangeCalendarGridHead>
                    <ControlRangeCalendarGridRow>
                        <ControlRangeCalendarHeadCell v-for="day in weekDays" :key="day">
                            {{ day }}
                        </ControlRangeCalendarHeadCell>
                    </ControlRangeCalendarGridRow>
                </ControlRangeCalendarGridHead>
                <ControlRangeCalendarGridBody>
                    <ControlRangeCalendarGridRow
                        v-for="(weekDates, index) in month.rows"
                        :key="`weekDate-${index}`"
                        class="mt-2 w-full"
                    >
                        <ControlRangeCalendarCell
                            v-for="weekDate in weekDates"
                            :key="weekDate.toString()"
                            :date="weekDate"
                        >
                            <ControlRangeCalendarCellTrigger :day="weekDate" :month="month.value" />
                        </ControlRangeCalendarCell>
                    </ControlRangeCalendarGridRow>
                </ControlRangeCalendarGridBody>
            </ControlRangeCalendarGrid>
        </div>
    </RangeCalendarRoot>
</template>
