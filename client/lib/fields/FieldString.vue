<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import { useTextValidation } from "@vueda/use/validation/useTextValidation.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for string values. Enforces optional minimum and maximum
 * length constraints and validates the value against an optional regex pattern.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
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
useTextValidation(fieldContext, props);
useDevTypeGuard(fieldContext, (value) => (typeof value !== "string" ? `Expected value to be a string, got:` : null));
</script>
<template>
    <div :class="$attrs.class" data-qa="field-string">
        <!-- Renders the string input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
