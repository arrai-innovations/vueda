<script setup>
import FieldHelp from "@vueda/fields/FieldHelp.vue";
import FieldLabel from "@vueda/fields/FieldLabel.vue";
import FieldMessages from "@vueda/fields/FieldMessages.vue";
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
    trim: {
        type: Boolean,
        default: false,
    },
    max: {
        type: Number,
        default: undefined,
    },
    min: {
        type: Number,
        default: undefined,
    },
    patternRegex: {
        type: String,
        default: undefined,
    },
    patternForMessage: {
        type: String,
        default: undefined,
    },
});
const fieldContext = useField(props);
const combinedProps = computed(() => ({
    ...fieldContext,
    ...props,
}));
watch(
    [toRef(props, "trim"), toRef(fieldContext, "value")],
    ([trim, value]) => {
        if (trim) {
            const trimmed = value.trim();
            if (trimmed !== value) {
                fieldContext.value = value.trim();
            }
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "max"), toRef(fieldContext, "value")],
    ([max, value]) => {
        if (max && value.length > max) {
            fieldContext.updateError(props.name, "max-length", `Must be ${max} characters or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "min"), toRef(fieldContext, "value")],
    ([min, value]) => {
        if (min && value.length < min) {
            fieldContext.updateError(props.name, "min-length", `Must be ${min} characters or more.`);
        }
    },
    { immediate: true },
);
const patternRegex = computed(() => {
    if (props.patternRegex) {
        return new RegExp(props.patternRegex);
    }
    return undefined;
});
watch(
    [toRef(fieldContext, "dirty"), patternRegex, toRef(fieldContext, "value"), toRef(props, "patternForMessage")],
    ([dirty, patternRegex, value, patternForMessage], [oldDirty, oldPatternRegex, oldValue, oldPatternForMessage]) => {
        if (
            (dirty !== oldDirty ||
                patternRegex !== oldPatternRegex ||
                value !== oldValue ||
                patternForMessage !== oldPatternForMessage) &&
            dirty &&
            patternRegex &&
            !patternRegex.test(value)
        ) {
            fieldContext.updateError(props.name, "pattern", `Must match "${patternForMessage || patternRegex}".`);
        } else {
            fieldContext.deleteError(props.name, "pattern");
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
