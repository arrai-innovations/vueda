<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import { useNumericValidation } from "@vueda/use/validation/useNumericValidation.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for decimal (numeric string or number) values. Enforces
 * optional minimum, maximum, and step constraints.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The maximum numeric value allowed. */
    maxValue: { type: Number, default: undefined },
    /** The minimum numeric value allowed. */
    minValue: { type: Number, default: undefined },
    /** The value must be a multiple of this step. */
    step: { type: Number, default: undefined },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useNumericValidation(fieldContext, props, { coerce: true });
useDevTypeGuard(fieldContext, (value) =>
    typeof value !== "number" && !(typeof value === "string" && !isNaN(Number(value)))
        ? `Expected value to be a number or numeric string, got:`
        : null,
);
</script>

<template>
    <div :class="$attrs.class" data-qa="field-decimal">
        <!-- Renders the decimal input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
