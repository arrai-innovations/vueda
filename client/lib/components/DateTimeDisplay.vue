<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, ref, toRef, watch } from "vue";

const props = defineProps({
    value: {
        type: [String, Object, Date], // ISO string, luxon DateTime object or js Date
        default: "",
    },
    format: {
        type: String,
        validator(value) {
            return ["inline", "break", "relative", "absolute"].includes(value);
        },
        default: "inline",
    },
    showTime: {
        type: Boolean,
        default: true,
    },
    showTooltip: {
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
const absolute = computed(() =>
    parsedValue.value.isValid
        ? parsedValue.value.toLocaleString(
              props.showTime ? { ...DateTime.DATETIME_SHORT, timeZoneName: "short" } : DateTime.DATE_SHORT,
          )
        : "",
);
updateRelative();

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
</script>

<template>
    <div :class="theme('root')">
        <template v-if="props.value && parsedValue.isValid">
            <template v-if="format === 'inline'">
                <span :class="theme('inline')">{{ absolute }}</span>
                <span> ({{ relative }})</span>
            </template>
            <template v-else-if="format === 'break'">
                <span :class="theme('break.absolute')">{{ absolute }}</span>
                <br />
                <span :class="theme('break.relative')">{{ relative }}</span>
            </template>
            <template v-else-if="format === 'absolute'">
                <span :class="[theme('absolute'), tooltipTheme]" :title="showTooltip ? relative : undefined">{{
                    absolute
                }}</span>
            </template>
            <span v-else :class="[theme('relative'), tooltipTheme]" :title="showTooltip ? absolute : undefined">
                {{ relative }}
            </span>
        </template>
        <span v-else :class="theme('dash')">-</span>
    </div>
</template>
