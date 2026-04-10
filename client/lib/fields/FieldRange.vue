<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for range values stored as a plain object with lower and
 * upper boundary keys. Validates that the value contains the expected keys
 * defined by rangeSuffix.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The data type of the range boundaries (e.g. "date" or "number"). */
    type: {
        type: String,
        default: "date",
    },
    /**
     * A two-element array of key suffixes used to identify the lower and upper
     * boundaries in the value object.
     */
    rangeSuffix: {
        type: Array,
        default: () => ["lower", "upper"],
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useDevTypeGuard(fieldContext, (value) => {
    if (!isObject(value)) {
        return `Expected value to be an object keyed by rangeSuffix (${props.rangeSuffix.join(", ")}), got:`;
    }
    const [lowerKey, upperKey] = props.rangeSuffix;
    if (!(lowerKey in value) || !(upperKey in value)) {
        return `Object value is missing "${lowerKey}" or "${upperKey}" key:`;
    }
    return null;
});
</script>
<template>
    <div :class="$attrs.class" data-qa="field-range">
        <!-- Renders the range input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
