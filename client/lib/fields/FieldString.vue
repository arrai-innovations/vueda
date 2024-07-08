<script setup>
import { FIELD_PROPS, useField } from "../use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
    trim: {
        type: Boolean,
        default: false,
    },
    maxLength: {
        type: Number,
        default: undefined,
    },
    minLength: {
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
watch(
    [toRef(props, "trim"), toRef(fieldContext, "value")],
    ([trim, value]) => {
        if (trim && value !== undefined && value !== null) {
            const trimmed = value.trim();
            if (trimmed !== value) {
                fieldContext.value = value.trim();
            }
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "maxLength"), toRef(fieldContext, "value")],
    ([maxLength, value]) => {
        if (maxLength && value.length > maxLength) {
            fieldContext.updateError("maxLength", `Must be ${maxLength} characters or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minLength"), toRef(fieldContext, "value")],
    ([minLength, value]) => {
        if (minLength && value.length < minLength) {
            fieldContext.updateError("minLength", `Must be ${minLength} characters or more.`);
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
            fieldContext.updateError("pattern", `Must match "${patternForMessage || patternRegex}".`);
        } else {
            fieldContext.deleteError("pattern");
        }
    },
    { immediate: true },
);
watch(
    toRef(fieldContext, "fieldValue"),
    (newValue) => {
        if (newValue === undefined || newValue === null) {
            return;
        }
        const coercedValue = newValue.toString();
        if (coercedValue !== fieldContext.value) {
            fieldContext.updateValue(coercedValue);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div data-qa="field-string">
        <slot />
    </div>
</template>
