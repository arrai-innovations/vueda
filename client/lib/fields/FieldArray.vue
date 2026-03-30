<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
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
const logger = useDevLogger({ fieldContext });
watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        // if you are not an array, or null or undefined, throw an error
        if (!Array.isArray(value) && value !== null && value !== undefined) {
            logger.warn("Expected value to be an array or null/undefined, got:", value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-array">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
