<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { ref, toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
});
const fieldContext = useField(props);

const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const parseDuration = (value) => {
    if (!value) {
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
        return;
    }
    const [h, m, s] = value.split(":").map(Number);
    hours.value = h || 0;
    minutes.value = m || 0;
    seconds.value = s || 0;
};

const formatDuration = () => {
    return `${String(hours.value).padStart(2, "0")}:${String(minutes.value).padStart(2, "0")}:${String(seconds.value).padStart(2, "0")}`;
};

watch(
    // fieldContext is reactive, not a ref. "value" could be misleading.
    () => toRef(fieldContext, "value"),
    (newValue) => {
        parseDuration(newValue);
    },
    { immediate: true },
);

watch([hours, minutes, seconds], () => {
    const coercedValue = formatDuration();
    // only you can prevent infinite reactivity loops
    if (fieldContext.value !== coercedValue) {
        fieldContext.updateValue(coercedValue);
    }
});
</script>

<template>
    <div data-qa="field-duration">
        <slot />
    </div>
</template>
