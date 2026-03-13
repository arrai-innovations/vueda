<script setup>
import {
    ControlCalendarCell,
    ControlCalendarCellTrigger,
    ControlCalendarGrid,
    ControlCalendarGridBody,
    ControlCalendarGridHead,
    ControlCalendarGridRow,
    ControlCalendarHeadCell,
    ControlCalendarHeader,
    ControlCalendarHeading,
    ControlCalendarNextButton,
    ControlCalendarPrevButton,
} from ".";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ControlNativeSelect, ControlNativeSelectOption } from "@vueda/controls/native-select";
import { cn } from "@vueda/utils/cn.js";
import { createReusableTemplate, reactiveOmit, useVModel } from "@vueuse/core";
import { CalendarRoot, useDateFormatter, useForwardPropsEmits } from "reka-ui";
import { createYear, createYearRange, toDate } from "reka-ui/date";
import { computed, toRaw } from "vue";

/**
 * A full-featured calendar component built on CalendarRoot with optional month/year navigation dropdowns.
 * Supports single and multiple date selection, date range constraints, and configurable heading layouts.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the calendar root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The heading layout style: "month-and-year", "month-only", "year-only", or default heading. */
    layout: { type: String, default: undefined },
    /** The currently selected date value (use with v-model). */
    modelValue: { type: Object, default: undefined },
    /** The default placeholder date shown when no date is selected. */
    defaultPlaceholder: { type: Object, default: undefined },
    /** The current placeholder date (use with v-model:placeholder). */
    placeholder: { type: Object, default: undefined },
    /** The locale string used for date formatting. */
    locale: { type: String, default: undefined },
    /** The minimum selectable date value. */
    minValue: { type: Object, default: undefined },
    /** The maximum selectable date value. */
    maxValue: { type: Object, default: undefined },
    /** An explicit array of year date values to populate the year dropdown. */
    yearRange: { type: Array, default: undefined },
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
    /** Whether multiple dates can be selected. */
    multiple: { type: Boolean, default: undefined },
});

const emits = defineEmits(["update:modelValue", "update:placeholder"]);

const delegatedProps = reactiveOmit(props, "class", "layout", "placeholder");

const placeholder = useVModel(props, "placeholder", emits, {
    passive: true,
    defaultValue: props.defaultPlaceholder ?? today(getLocalTimeZone()),
});

const formatter = useDateFormatter(props.locale ?? "en");

const yearRange = computed(() => {
    return (
        props.yearRange ??
        createYearRange({
            start:
                props?.minValue ??
                (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? today(getLocalTimeZone())).cycle("year", -100),

            end:
                props?.maxValue ??
                (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? today(getLocalTimeZone())).cycle("year", 10),
        })
    );
});

const [DefineMonthTemplate, ReuseMonthTemplate] = createReusableTemplate();
const [DefineYearTemplate, ReuseYearTemplate] = createReusableTemplate();

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <DefineMonthTemplate v-slot="{ date }">
        <div class="**:data-[slot=native-select-icon]:right-1">
            <div class="relative">
                <div class="absolute inset-0 flex h-full items-center text-sm pl-2 pointer-events-none">
                    {{ formatter.custom(toDate(date), { month: "short" }) }}
                </div>
                <ControlNativeSelect
                    class="text-xs h-8 pr-6 pl-2 text-transparent relative"
                    @change="
                        (e) => {
                            placeholder = placeholder.set({
                                month: Number(e?.target?.value),
                            });
                        }
                    "
                >
                    <ControlNativeSelectOption
                        v-for="month in createYear({ dateObj: date })"
                        :key="month.toString()"
                        :value="month.month"
                        :selected="date.month === month.month"
                    >
                        {{ formatter.custom(toDate(month), { month: "short" }) }}
                    </ControlNativeSelectOption>
                </ControlNativeSelect>
            </div>
        </div>
    </DefineMonthTemplate>

    <DefineYearTemplate v-slot="{ date }">
        <div class="**:data-[slot=native-select-icon]:right-1">
            <div class="relative">
                <div class="absolute inset-0 flex h-full items-center text-sm pl-2 pointer-events-none">
                    {{ formatter.custom(toDate(date), { year: "numeric" }) }}
                </div>
                <ControlNativeSelect
                    class="text-xs h-8 pr-6 pl-2 text-transparent relative"
                    @change="
                        (e) => {
                            placeholder = placeholder.set({
                                year: Number(e?.target?.value),
                            });
                        }
                    "
                >
                    <ControlNativeSelectOption
                        v-for="year in yearRange"
                        :key="year.toString()"
                        :value="year.year"
                        :selected="date.year === year.year"
                    >
                        {{ formatter.custom(toDate(year), { year: "numeric" }) }}
                    </ControlNativeSelectOption>
                </ControlNativeSelect>
            </div>
        </div>
    </DefineYearTemplate>

    <CalendarRoot
        v-slot="{ grid, weekDays, date }"
        v-bind="forwarded"
        v-model:placeholder="placeholder"
        data-slot="calendar"
        :class="cn('p-3', props.class)"
    >
        <ControlCalendarHeader class="pt-0">
            <nav class="flex items-center gap-1 absolute top-0 inset-x-0 justify-between">
                <ControlCalendarPrevButton>
                    <slot name="calendar-prev-icon" />
                </ControlCalendarPrevButton>
                <ControlCalendarNextButton>
                    <slot name="calendar-next-icon" />
                </ControlCalendarNextButton>
            </nav>

            <slot name="calendar-heading" :date="date" :month="ReuseMonthTemplate" :year="ReuseYearTemplate">
                <template v-if="layout === 'month-and-year'">
                    <div class="flex items-center justify-center gap-1">
                        <ReuseMonthTemplate :date="date" />
                        <ReuseYearTemplate :date="date" />
                    </div>
                </template>
                <template v-else-if="layout === 'month-only'">
                    <div class="flex items-center justify-center gap-1">
                        <ReuseMonthTemplate :date="date" />
                        {{ formatter.custom(toDate(date), { year: "numeric" }) }}
                    </div>
                </template>
                <template v-else-if="layout === 'year-only'">
                    <div class="flex items-center justify-center gap-1">
                        {{ formatter.custom(toDate(date), { month: "short" }) }}
                        <ReuseYearTemplate :date="date" />
                    </div>
                </template>
                <template v-else>
                    <ControlCalendarHeading />
                </template>
            </slot>
        </ControlCalendarHeader>

        <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
            <ControlCalendarGrid v-for="month in grid" :key="month.value.toString()">
                <ControlCalendarGridHead>
                    <ControlCalendarGridRow>
                        <ControlCalendarHeadCell v-for="day in weekDays" :key="day">
                            {{ day }}
                        </ControlCalendarHeadCell>
                    </ControlCalendarGridRow>
                </ControlCalendarGridHead>
                <ControlCalendarGridBody>
                    <ControlCalendarGridRow
                        v-for="(weekDates, index) in month.rows"
                        :key="`weekDate-${index}`"
                        class="mt-2 w-full"
                    >
                        <ControlCalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
                            <ControlCalendarCellTrigger :day="weekDate" :month="month.value" />
                        </ControlCalendarCell>
                    </ControlCalendarGridRow>
                </ControlCalendarGridBody>
            </ControlCalendarGrid>
        </div>
    </CalendarRoot>
</template>
