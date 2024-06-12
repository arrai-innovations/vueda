<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { FormContextSymbol } from "@vueda/utils/index.js";
import { computed, inject, toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
    maxValue: {
        type: Number,
        default: undefined,
    },
    minValue: {
        type: Number,
        default: undefined,
    },
    step: {
        type: Number,
        default: undefined,
    },
});
const formContext = inject(FormContextSymbol);
const fieldContext = useField(props);
watch(
    [toRef(props, "maxValue"), toRef(fieldContext, "value")],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            formContext.updateError(props.name, "maxValue", `Must be ${maxValue} or less.`);
        } else {
            formContext.deleteError(props.name, "maxValue");
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), toRef(fieldContext, "value")],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            formContext.updateError(props.name, "minValue", `Must be ${minValue} or more.`);
        } else {
            formContext.deleteError(props.name, "minValue");
        }
    },
    { immediate: true },
);
const stepScaleFactor = computed(() => {
    const step = props.step;
    if (step) {
        const stepStr = step.toString();
        const decimalIndex = stepStr.indexOf(".");
        if (decimalIndex !== -1) {
            return Math.pow(10, stepStr.length - decimalIndex - 1);
        }
    }
    return 1;
});
watch(
    [toRef(props, "step"), toRef(fieldContext, "value")],
    ([step, value]) => {
        if (step) {
            const factor = stepScaleFactor.value;
            const stepScaled = step * factor;
            const valueScaled = value * factor;
            if (valueScaled % stepScaled !== 0) {
                formContext.updateError(props.name, "step", `Must be a multiple of ${step}.`);
            }
        } else {
            formContext.deleteError(props.name, "step");
        }
    },
    { immediate: true },
);
watch(
    toRef(fieldContext, "fieldValue"),
    (newValue) => {
        const coercedValue = +newValue;
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
