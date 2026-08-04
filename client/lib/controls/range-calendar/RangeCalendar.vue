<script setup>
import RangeCalendarCell from "./RangeCalendarCell.vue";
import RangeCalendarCellTrigger from "./RangeCalendarCellTrigger.vue";
import RangeCalendarGrid from "./RangeCalendarGrid.vue";
import RangeCalendarGridBody from "./RangeCalendarGridBody.vue";
import RangeCalendarGridHead from "./RangeCalendarGridHead.vue";
import RangeCalendarGridRow from "./RangeCalendarGridRow.vue";
import RangeCalendarHeadCell from "./RangeCalendarHeadCell.vue";
import RangeCalendarHeader from "./RangeCalendarHeader.vue";
import RangeCalendarHeading from "./RangeCalendarHeading.vue";
import RangeCalendarNextButton from "./RangeCalendarNextButton.vue";
import RangeCalendarPrevButton from "./RangeCalendarPrevButton.vue";
import "@vueda/theme/vueda-tailwind/controls/RangeCalendar.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { ICON_OVERRIDE_PROPS, useIconsOverride } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarRoot } from "reka-ui";
import { toRef } from "vue";

/**
 * A full-featured date range calendar built on RangeCalendarRoot.
 * Supports range selection with configurable date constraints and navigation.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
    /** Emitted when the placeholder date changes. */
    "update:placeholder": null,
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("RangeCalendar", props);
useIconsOverride(toRef(props, "iconOverride"));
</script>

<template>
    <RangeCalendarRoot
        v-slot="{ grid, weekDays }"
        data-slot="range-calendar"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="forwarded"
    >
        <RangeCalendarHeader>
            <RangeCalendarHeading />

            <div class="flex items-center gap-1">
                <RangeCalendarPrevButton />
                <RangeCalendarNextButton />
            </div>
        </RangeCalendarHeader>

        <div class="mt-4 flex flex-col gap-y-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
            <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
                <RangeCalendarGridHead>
                    <RangeCalendarGridRow>
                        <RangeCalendarHeadCell v-for="day in weekDays" :key="day">
                            {{ day }}
                        </RangeCalendarHeadCell>
                    </RangeCalendarGridRow>
                </RangeCalendarGridHead>
                <RangeCalendarGridBody>
                    <RangeCalendarGridRow
                        v-for="(weekDates, index) in month.rows"
                        :key="`weekDate-${index}`"
                        class="mt-2 w-full"
                    >
                        <RangeCalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
                            <RangeCalendarCellTrigger :day="weekDate" :month="month.value" />
                        </RangeCalendarCell>
                    </RangeCalendarGridRow>
                </RangeCalendarGridBody>
            </RangeCalendarGrid>
        </div>
    </RangeCalendarRoot>
</template>
