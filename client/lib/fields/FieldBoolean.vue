<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for boolean values. Provides a slot-based rendering surface
 * and warns in development if the value is not a boolean (or null when nullable).
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** When true, allows null as a valid value in addition to true and false. */
    nullable: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useDevTypeGuard(
    fieldContext,
    (value) => {
        if (props.nullable && value === null) {
            return null;
        }
        if (typeof value !== "boolean") {
            return `Expected value to be a boolean${props.nullable ? " or null" : ""}, got:`;
        }
        return null;
    },
    { includeNull: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-boolean">
        <!-- Renders the boolean input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
