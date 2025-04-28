<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import omit from "lodash-es/omit.js";
import { toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    nullable: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value === undefined) {
            return;
        }
        if (props.nullable && value === null) {
            return;
        }
        if (typeof value !== "boolean") {
            logger.warn(`Expected value to be a boolean${props.nullable ? " or null" : ""}, got:`, value);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-boolean">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
