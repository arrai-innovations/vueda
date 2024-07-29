<script setup>
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
    value: {
        type: [String, Object], // luxon DateTime object is fine too
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
});

const parsedValue = computed(() => DateTime.fromISO(props.value).setLocale("en-CA"));

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
</script>

<template>
    <template v-if="props.value && parsedValue.isValid">
        <template v-if="format === 'inline'">
            <span class="whitespace-nowrap">{{ absolute }}</span>
            <span> ({{ relative }})</span>
        </template>
        <template v-else-if="format === 'break'">
            <span class="whitespace-nowrap">{{ absolute }}</span>
            <br />
            <span class="whitespace-nowrap">{{ relative }}</span>
        </template>
        <template v-else-if="format === 'absolute'">
            <span class="whitespace-nowrap" :title="showTooltip ? relative : undefined">{{ absolute }}</span>
        </template>
        <span v-else :title="showTooltip ? absolute : undefined">
            <!-- relative -->
            {{ relative }}
        </span>
    </template>
    <span v-else>-</span>
</template>
