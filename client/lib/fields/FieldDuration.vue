<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isObject from "lodash-es/isObject.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    minValue: {
        type: [Date, String],
        default: undefined,
    },
    step: {
        type: Number,
        default: 60,
        description: "The step in seconds.",
    },
    unit: {
        type: String,
        default: "minutes",
        description: "The unit of the duration.",
    },
});
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
watch(
    () => fieldContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value !== "object" || Array.isArray(value)) {
            logger.warn(`Expected value to be a plain object for duration, got:`, value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-duration">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
