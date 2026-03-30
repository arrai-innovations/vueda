<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";
import { computed, toRef, watch } from "vue";

/**
 * Field component for integer or floating-point number values. Enforces
 * optional minimum, maximum, and step constraints.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The maximum numeric value allowed. */
    maxValue: {
        type: Number,
        default: undefined,
    },
    /** The minimum numeric value allowed. */
    minValue: {
        type: Number,
        default: undefined,
    },
    /** The value must be a multiple of this step. */
    step: {
        type: Number,
        default: undefined,
    },
    // todo: maxFractionDigits doesn't do anything anymore, do we need it?
    /** @deprecated No longer enforced; reserved for future use. */
    maxFractionDigits: {
        type: Number,
        default: undefined,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
const fieldValueRef = toRef(fieldContext.state, "value");
watch(
    [toRef(props, "maxValue"), fieldValueRef],
    ([maxValue, value]) => {
        if (fieldValueRef.value !== null && maxValue && value > maxValue) {
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
        if (fieldValueRef.value !== null && minValue !== undefined && value < minValue) {
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
        if (step && fieldValueRef.value !== null) {
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
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value !== "number") {
            logger.warn(`Expected value to be a number, got:`, value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-number">
        <!-- Renders the number input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
