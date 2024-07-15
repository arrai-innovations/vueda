<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { toRef, watch } from "vue";

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
    rangeSuffix: {
        type: Array,
        default: undefined,
    },
});
const fieldContext = useField(props);
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === undefined || newValue === null) {
            return;
        }
        newValue = newValue.map((v) => {
            if (typeof v === "string") {
                return new Date(v);
            }
            return v;
        });
        fieldContext.updateValue(newValue);
    },
    { immediate: true },
);
</script>
<template>
    <div data-qa="field-date">
        <slot />
    </div>
</template>
<!--# the value submitted right now is like due_Date [{date},{date}],-->
<!--we need the values to be due_date_before{date}, due_date_after {date}-->
