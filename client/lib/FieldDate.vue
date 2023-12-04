<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";
import FieldHelp from "@vueda/FieldHelp.vue";
import FieldMessages from "@vueda/FieldMessages.vue";
import FieldLabel from "@vueda/FieldLabel.vue";

const props = defineProps({
    ...fieldProps,
    max: {
        type: Date,
        default: undefined,
    },
    min: {
        type: Date,
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
    [toRef(props, "max"), valueAsDate],
    ([max, value]) => {
        if (max && value > max) {
            fieldContext.updateError(
                props.name,
                'max',
                `Must be ${max} or less.`
            )
        }
    },
    { immediate: true }
);
watch(
    [toRef(props, "min"), valueAsDate],
    ([min, value]) => {
        if (min && value < min) {
            fieldContext.updateError(
                props.name,
                'min',
                `Must be ${min} or more.`
            )
        }
    },
    { immediate: true }
);
</script>
<template>
    <div>
        <field-label
            v-if="label || $slots.label"
            :for="name" :label="label">
            <slot v-if="$slots.label" name="label" v-bind="combinedProps"/>
        </field-label>
        <slot v-bind="combinedProps"/>
        <field-help v-if="help || $slots.help" :help="help">
            <slot v-if="$slots.help" name="help" v-bind="combinedProps"/>
        </field-help>
        <field-messages
            :messages="fieldContext.errors">
            <slot v-if="$slots.errors" name="errors" v-bind="combinedProps"/>
        </field-messages>
        <field-messages
            :messages="fieldContext.messages">
            <slot v-if="$slots.messages" name="messages" v-bind="combinedProps"/>
        </field-messages>
    </div>
</template>
