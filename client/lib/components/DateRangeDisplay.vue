<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DateTime } from "luxon";
import { computed } from "vue";

const props = defineProps({
    start: {
        type: [String, Object],
        required: true,
    },
    end: {
        type: [String, Object],
        required: true,
    },
    showTime: {
        type: Boolean,
        default: false,
    },
    locale: {
        type: String,
        default: "en-CA",
    },
    ...THEME_OVERRIDE_PROPS,
});

const theme = useTheme("DateRangeDisplay", props);

const startDate = computed(() => {
    if (DateTime.isDateTime(props.start)) {
        return props.start.setLocale(props.locale);
    } else {
        return DateTime.fromISO(props.start).setLocale(props.locale);
    }
});

const endDate = computed(() => {
    if (DateTime.isDateTime(props.end)) {
        return props.end.setLocale(props.locale);
    } else {
        return DateTime.fromISO(props.end).setLocale(props.locale);
    }
});

const formattedDateRange = computed(() => {
    if (!startDate.value.isValid || !endDate.value.isValid) {
        return [];
    }

    const sameYear = startDate.value.year === endDate.value.year;
    const sameMonth = startDate.value.month === endDate.value.month;
    const sameDay = startDate.value.day === endDate.value.day;

    if (startDate.value > endDate.value) {
        [startDate.value, endDate.value] = [endDate.value, startDate.value];
    }

    if (!sameYear) {
        return [startDate.value.toFormat("LLL d yyyy"), endDate.value.toFormat("LLL d yyyy")];
    } else if (!sameMonth) {
        return [startDate.value.toFormat("LLL d"), endDate.value.toFormat("LLL d yyyy")];
    } else if (!sameDay) {
        return [startDate.value.toFormat("LLL d"), endDate.value.toFormat("d yyyy")];
    } else {
        // same day...
        return [startDate.value.toFormat(props.showTime ? "LLL d yyyy, t" : "LLL d yyyy")];
    }
});
</script>

<template>
    <span :class="theme('root')">
        <span :class="theme('from')">{{ formattedDateRange?.[0] }}</span>
        <template v-if="formattedDateRange.length > 1">
            <span :class="theme('separator')"> &ndash; </span>
            <span :class="theme('to')">{{ formattedDateRange?.[1] }}</span>
        </template>
    </span>
</template>

<style scoped></style>
