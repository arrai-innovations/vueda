<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { isArray } from "lodash-es";

const props = defineProps({
    ...FIELD_PROPS,
    type: {
        type: String,
        default: "date",
    },
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
const preprocessGet = (value) => {
    if (value === undefined || value === null || !isArray(value)) {
        return value;
    }
    if (props.type === "date") {
        return value.map((v) => {
            if (typeof v === "string") {
                return new Date(v);
            }
            return v;
        });
    }
    return value;
};
const emit = defineEmits([...FIELD_EMITS]);
useField(props, emit, { preprocessGet });
</script>
<template>
    <div data-qa="field-date">
        <slot />
    </div>
</template>
<!--# the value submitted right now is like due_Date [{date},{date}],-->
<!--we need the values to be due_date_before{date}, due_date_after {date}-->
