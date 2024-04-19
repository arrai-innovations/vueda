<script setup>
import FieldHelp from "@vueda/fields/FieldHelp.vue";
import FieldLabel from "@vueda/fields/FieldLabel.vue";
import FieldMessages from "@vueda/fields/FieldMessages.vue";
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    minValue: {
        type: [Date, String],
        default: undefined,
    },
});
const fieldContext = useField(props);
const combinedProps = computed(() => ({
    ...fieldContext,
    ...props,
}));
const valueAsDate = computed(() => {
    const value = fieldContext.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsDate],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            fieldContext.updateError(props.name, "maxValue", `Must be ${maxValue} or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), valueAsDate],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            fieldContext.updateError(props.name, "minValue", `Must be ${minValue} or more.`);
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
