<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";
import { computed, toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    maxValue: { type: Number, default: undefined },
    minValue: { type: Number, default: undefined },
    step: { type: Number, default: undefined },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const fieldValueRef = toRef(fieldContext.state, "value");

function toNumeric(value) {
    if (typeof value === "string" && !isNaN(Number(value))) {
        return Number(value);
    }
    return value;
}

watch(
    [toRef(props, "maxValue"), fieldValueRef],
    ([maxValue, value]) => {
        const numericValue = toNumeric(value);
        if (numericValue !== null && maxValue !== undefined && numericValue > maxValue) {
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
        const numericValue = toNumeric(value);
        if (numericValue !== null && minValue !== undefined && numericValue < minValue) {
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
        const numericValue = toNumeric(value);
        if (step && numericValue !== null) {
            const factor = stepScaleFactor.value;
            const stepScaled = step * factor;
            const valueScaled = numericValue * factor;
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
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value !== "number" && !(typeof value === "string" && !isNaN(Number(value)))) {
            logger.warn(`Expected value to be a number or numeric string, got:`, value);
        }
    },
    { immediate: true },
);
</script>

<template>
    <div :class="$attrs.class" data-qa="field-decimal">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
