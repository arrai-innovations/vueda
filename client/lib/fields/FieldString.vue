<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { computed, toRef, watch } from "vue";

/**
 * Field component for string values. Enforces optional minimum and maximum
 * length constraints and validates the value against an optional regex pattern.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    // trim: {
    //     type: Boolean,
    //     default: false,
    // },
    /** The maximum number of characters allowed. */
    maxLength: {
        type: Number,
        default: undefined,
    },
    /** The minimum number of characters required. */
    minLength: {
        type: Number,
        default: undefined,
    },
    /** A regex pattern string the value must match after the field is touched. */
    patternRegex: {
        type: String,
        default: undefined,
    },
    /** A human-readable description of the expected pattern shown in validation error messages. */
    patternForMessage: {
        type: String,
        default: undefined,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
const fieldValueRef = toRef(fieldContext.state, "value");
// todo: trim is a widget concern
// watch(
//     [toRef(props, "trim"), fieldValueRef],
//     ([trim, value]) => {
//         if (trim && value !== undefined && value !== null) {
//             const trimmed = value?.trim();
//             if (trimmed !== value) {
//                 fieldContext.state.value = trimmed;
//             }
//         }
//     },
//     { immediate: true },
// );
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
watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value !== "string") {
            logger.warn(`Expected value to be a string, got:`, value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-string">
        <!-- Renders the string input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
