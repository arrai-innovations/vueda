<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    type: {
        type: String,
        default: "date",
    },
    rangeSuffix: {
        type: Array,
        default: () => ["lower", "upper"],
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined) {
            if (!isObject(value)) {
                logger.warn(
                    `Expected value to be an object keyed by rangeSuffix (${props.rangeSuffix.join(", ")}), got:`,
                    value,
                );
                return;
            }
            const [lowerKey, upperKey] = props.rangeSuffix;
            if (!(lowerKey in value) || !(upperKey in value)) {
                logger.warn(`Object value is missing "${lowerKey}" or "${upperKey}" key:`, value);
            }
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-range">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
<!--# the value submitted right now is like due_Date [{date},{date}],-->
<!--we need the values to be due_date_before{date}, due_date_after {date}-->
