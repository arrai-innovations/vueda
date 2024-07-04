<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

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
const fieldContext = useField(props);
watch(
    [toRef(props, "maxValue"), toRef(fieldContext, "value")],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            fieldContext.updateError("maxValue", `Must be ${maxValue} or less.`);
        } else {
            fieldContext.deleteError("maxValue");
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), toRef(fieldContext, "value")],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
        } else {
            fieldContext.deleteError("minValue");
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
                fieldContext.updateError("step", `Must be a multiple of ${step}.`);
            } else {
                fieldContext.deleteError("step");
            }
        } else {
            fieldContext.deleteError("step");
        }
    },
    { immediate: true },
);
watch(
    toRef(fieldContext, "fieldValue"),
    (newValue) => {
        const coercedValue = +newValue;
        if (coercedValue !== fieldContext.value) {
            fieldContext.updateValue(coercedValue);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div data-qa="field-number">
        <slot />
    </div>
</template>
