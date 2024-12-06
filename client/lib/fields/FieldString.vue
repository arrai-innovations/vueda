<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { computed, toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
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
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const fieldValueRef = toRef(fieldContext.state, "value");
watch(
    [toRef(props, "trim"), fieldValueRef],
    ([trim, value]) => {
        if (trim && value !== undefined && value !== null) {
            const trimmed = value?.trim();
            if (trimmed !== value) {
                fieldContext.state.value = trimmed;
            }
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "maxLength"), fieldValueRef],
    ([maxLength, value]) => {
        if (maxLength && value?.length > maxLength) {
            fieldContext.updateError("maxLength", `Must be ${maxLength} characters or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minLength"), fieldValueRef],
    ([minLength, value]) => {
        if (minLength && value?.length < minLength) {
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
    [
        toRef(fieldContext.state, "touched"),
        patternRegex,
        toRef(fieldContext.state, "value"),
        toRef(props, "patternForMessage"),
    ],
    (
        [touched, currentPatternRegex, value, patternForMessage],
        [touchedOld, currentPatternRegexOld, valueOld, patternForMessageOld],
    ) => {
        if (
            touched === touchedOld &&
            currentPatternRegex === currentPatternRegexOld &&
            value === valueOld &&
            patternForMessage === patternForMessageOld
        ) {
            return;
        }
        if (touched && currentPatternRegex && isString(value) && !currentPatternRegex.test(value)) {
            fieldContext.updateError("pattern", `Must match "${patternForMessage || currentPatternRegex}".`);
        } else {
            fieldContext.deleteError("pattern");
        }
    },
    { immediate: true },
);
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === undefined || newValue === null) {
            return;
        }
        const coercedValue = newValue.toString();
        if (coercedValue !== newValue) {
            fieldContext.state.value = newValue;
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-string">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
