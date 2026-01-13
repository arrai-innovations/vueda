<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import omit from "lodash-es/omit.js";

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
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value !== "object" || Array.isArray(value)) {
            logger.warn(`Expected value to be a plain object, got:`, value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-object">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
