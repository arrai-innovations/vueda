<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";
import FieldHelp from "@vueda/fields/FieldHelp.vue";
import FieldMessages from "@vueda/fields/FieldMessages.vue";
import FieldLabel from "@vueda/fields/FieldLabel.vue";

const props = defineProps({
    ...fieldProps,
    max: {
        type: Number,
        default: undefined,
    },
    min: {
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
    [toRef(props, "max"), toRef(fieldContext, "value")],
    ([max, value]) => {
        if (max && value > max) {
            fieldContext.updateError(props.name, "max", `Must be ${max} or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "min"), toRef(fieldContext, "value")],
    ([min, value]) => {
        if (min && value < min) {
            fieldContext.updateError(props.name, "min", `Must be ${min} or more.`);
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
