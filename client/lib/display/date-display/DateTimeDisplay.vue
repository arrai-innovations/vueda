<script setup>
import EmptyComponent from "@vueda/support/EmptyComponent.vue";
import "@vueda/theme/vueda-tailwind/display/DateTimeDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, ref, toRef, watch } from "vue";

/**
 * Displays a datetime value (ISO string, JS Date, or Luxon DateTime) in absolute, relative,
 * inline, or break format, with an optional tooltip showing the complementary representation.
 * The relative label updates automatically every minute (and every second for very recent times).
 */
defineOptions({});

const props = defineProps({
    /** The datetime value to display, accepted as an ISO string, JS Date, or Luxon DateTime. */
    value: {
        type: [String, Object, Date], // ISO string, luxon DateTime object or js Date
        default: "",
    },
    /** Display layout: `"inline"`, `"break"`, `"absolute"`, `"relative"`, `"default"`, or a custom Luxon format string/object. */
    format: {
        type: [String, Object],
        default: "inline",
    },
    /** Luxon format string or options object used for the tooltip when a custom format is active. */
    tooltipFormat: {
        type: [String, Object],
        description: "When using a custom format, this format will be used for the tooltip.",
        default: "default",
    },
    /** Whether to include the time portion in absolute date output. */
    showTime: {
        type: Boolean,
        default: true,
    },
    /** Whether to show the complementary representation as a tooltip on hover. */
    showTooltip: {
        type: Boolean,
        default: true,
    },
    /** When true, renders without a wrapping div so the output is inline in the document flow. */
    inline: {
        type: Boolean,
        default: false,
    },
    /** Whether to display the relative time label alongside the absolute date. */
    showRelative: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});

const parsedValue = computed(() => {
    if (props.value instanceof DateTime) {
        // Already a Luxon DateTime object
        return props.value.setLocale("en-CA");
    } else if (props.value instanceof Date) {
        // Convert JavaScript Date to Luxon DateTime
        return DateTime.fromJSDate(props.value).setLocale("en-CA");
    } else if (typeof props.value === "string") {
        // Assume ISO string
        return DateTime.fromISO(props.value).setLocale("en-CA");
    }
    return DateTime.invalid("Invalid date format");
});

const relative = ref();
let quickUpdateRelativeInterval;
const updateRelative = () => {
    relative.value = parsedValue.value.isValid ? parsedValue.value.toRelative() : "-";
    if (relative.value === "0 seconds ago") {
        relative.value = "just now";
    }
    // if the value is under a minute, update every second
    if (parsedValue.value.isValid && parsedValue.value.diffNow().as("minutes") < 1) {
        quickUpdateRelativeInterval = setTimeout(updateRelative, 1000);
    } else if (quickUpdateRelativeInterval) {
        updateRelativeInterval = null;
    }
};
const absolute = computed(() => {
    if (!parsedValue.value.isValid) {
        return "";
    }
    if (["inline", "break", "relative", "absolute"].includes(props.format)) {
        return parsedValue.value.toLocaleString(
            props.showTime ? { ...DateTime.DATETIME_SHORT, timeZoneName: "short" } : DateTime.DATE_SHORT,
        );
    }
    if (props.format === "default") {
        const defaultFormat = props.showTime
            ? { ...DateTime.DATETIME_SHORT, timeZoneName: "short" }
            : DateTime.DATE_SHORT;
        return parsedValue.value.toLocaleString(defaultFormat);
    }
    return toLocaleStringORToFormat(parsedValue.value, props.format);
});

updateRelative();

/**
 * @param {DateTime} value
 * @param {string|Object} format
 * @returns {string}
 */
const toLocaleStringORToFormat = (value, format) => {
    if (format === "default") {
        return value.toLocaleString(props.showTime ? DateTime.DATETIME_FULL : DateTime.DATE_FULL);
    }
    if (typeof format === "string") {
        return value.toFormat(format);
    }
    return value.toLocaleString(format);
};

watch(parsedValue, updateRelative);

let updateRelativeInterval;
onMounted(
    () =>
        (updateRelativeInterval = setInterval(() => {
            updateRelative();
        }, 60000)),
);
onUnmounted(() => {
    if (quickUpdateRelativeInterval) {
        clearTimeout(quickUpdateRelativeInterval);
    }
    if (updateRelativeInterval) {
        clearInterval(updateRelativeInterval);
    }
});
defineExpose({ parsedValue, relative, absolute });
const theme = useTheme("DateTimeDisplay", props);
const tooltipTheme = computed(() => toRef(props, "showTooltip") && theme("tooltip"));
const tooltipContent = computed(() => {
    return parsedValue.value.isValid ? toLocaleStringORToFormat(parsedValue.value, props.tooltipFormat) : "";
});
</script>

<template>
    <component :is="inline ? EmptyComponent : 'div'" :class="theme('root')" :style="theme.hideStyle?.value">
        <template v-if="props.value && parsedValue.isValid">
            <template v-if="format === 'inline'">
                <span :class="theme('inline')">{{ absolute }}</span>
                <span v-if="showRelative"> ({{ relative }})</span>
            </template>
            <template v-else-if="format === 'break'">
                <span :class="theme('break.absolute')">{{ absolute }}</span>
                <br />
                <span v-if="showRelative" :class="theme('break.relative')">{{ relative }}</span>
            </template>
            <template v-else-if="format === 'absolute'">
                <span :class="[theme('absolute'), tooltipTheme]" :title="showTooltip ? relative : undefined">{{
                    absolute
                }}</span>
            </template>
            <span
                v-else-if="format === 'relative' && showRelative"
                :class="[theme('relative'), tooltipTheme]"
                :title="showTooltip ? absolute : undefined"
            >
                {{ relative }}
            </span>
            <span v-else :class="[tooltipTheme]" :title="showTooltip ? tooltipContent : undefined">{{ absolute }}</span>
        </template>
        <span v-else :class="theme('dash')">-</span>
    </component>
</template>
