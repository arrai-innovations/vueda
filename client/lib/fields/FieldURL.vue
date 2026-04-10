<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for URL values. Warns in development when the bound value is not a string.
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
    typeof value !== "string" ? `Expected value to be a string (URL), got:` : null,
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-url">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
