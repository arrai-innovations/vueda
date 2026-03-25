<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";

/**
 * A field wrapper for array-typed values. Renders no UI of its own; instead it
 * exposes the field props and attrs through a default slot so the consumer can
 * compose an appropriate input for list data.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useDevTypeGuard(fieldContext, (value) =>
    !Array.isArray(value) ? "Expected value to be an array or null/undefined, got:" : null,
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-array">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
