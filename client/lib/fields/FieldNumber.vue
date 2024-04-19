<script setup>
import FieldHelp from "@vueda/fields/FieldHelp.vue";
import FieldLabel from "@vueda/fields/FieldLabel.vue";
import FieldMessages from "@vueda/fields/FieldMessages.vue";
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
const combinedProps = computed(() => ({
    ...fieldContext,
    ...props,
}));
watch(
    [toRef(props, "maxValue"), toRef(fieldContext, "value")],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            fieldContext.updateError(props.name, "maxValue", `Must be ${maxValue} or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), toRef(fieldContext, "value")],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            fieldContext.updateError(props.name, "minValue", `Must be ${minValue} or more.`);
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
                fieldContext.updateError(props.name, "step", `Must be a multiple of ${step}.`);
            }
        } else {
            fieldContext.deleteError(props.name, "step");
        }
    },
    { immediate: true },
);
</script>
<template>
    <div>
        <field-label v-if="label || $slots.label" :for="name" :label="label">
            <slot v-if="$slots.label" name="label" v-bind="combinedProps" />
        </field-label>
        <slot v-bind="combinedProps" />
        <field-help v-if="help || $slots.help" :help="help">
            <slot v-if="$slots.help" name="help" v-bind="combinedProps" />
        </field-help>
        <field-messages :messages="fieldContext.errors">
            <slot v-if="$slots.errors" name="errors" v-bind="combinedProps" />
        </field-messages>
        <field-messages :messages="fieldContext.messages">
            <slot v-if="$slots.messages" name="messages" v-bind="combinedProps" />
        </field-messages>
    </div>
</template>
