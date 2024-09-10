<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";

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

const emit = defineEmits([...FIELD_EMITS]);
useField(props, emit);
</script>
<template>
    <div data-qa="field-date">
        <slot />
    </div>
</template>
<!--# the value submitted right now is like due_Date [{date},{date}],-->
<!--we need the values to be due_date_before{date}, due_date_after {date}-->
