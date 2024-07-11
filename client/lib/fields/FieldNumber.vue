<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
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
const fieldValueRef = toRef(fieldContext.state, "value");
watch(
    [toRef(props, "maxValue"), fieldValueRef],
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
    [toRef(props, "minValue"), fieldValueRef],
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
    [toRef(props, "step"), fieldValueRef],
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
    fieldValueRef,
    (newValue) => {
        let coercedValue = +newValue;
        if (isNaN(coercedValue)) {
            coercedValue = undefined;
        }
        if (coercedValue !== newValue) {
            fieldContext.state.value = coercedValue;
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
