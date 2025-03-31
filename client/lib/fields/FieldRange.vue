<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isArray from "lodash-es/isArray.js";
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
        default: () => ["lower", "upper"],
    },
});
const preprocessGet = (value) => {
    if (isObject(value)) {
        const newValue = [value[props.rangeSuffix[0]], value[props.rangeSuffix[1]]];

        if (props.type === "date") {
            return newValue.map((v) => {
                if (typeof v === "string") {
                    return new Date(v);
                }
                return v;
            });
        }
        return newValue;
    }
    return value;
};
const preprocessSet = (value) => {
    if (isArray(value) && props.rangeSuffix) {
        return {
            [props.rangeSuffix[0]]: value[0],
            [props.rangeSuffix[1]]: value[1],
        };
    }
    return value;
};
const emit = defineEmits([...FIELD_EMITS]);
useField(props, emit, { preprocessGet, preprocessSet });
</script>
<template>
    <div :class="$attrs.class" data-qa="field-date">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
<!--# the value submitted right now is like due_Date [{date},{date}],-->
<!--we need the values to be due_date_before{date}, due_date_after {date}-->
