<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
});
const fieldContext = useField(props);

watch(
    toRef(fieldContext, "fieldValue"),
    (newValue) => {
        const coercedValue = !!newValue;
        if (coercedValue !== fieldContext.value) {
            fieldContext.value = coercedValue;
        }
    },
    { immediate: true },
);
</script>
<template>
    <slot />
</template>
