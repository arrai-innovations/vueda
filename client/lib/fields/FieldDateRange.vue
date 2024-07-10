<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isArray from "lodash-es/isArray.js";
import { watch } from "vue";

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
});
const fieldContext = useField(props);
// const valueAsDate = computed(() => {
//     const value = fieldContext.value;
//     console.log("fieldContext.value: ",fieldContext.value)
//     if (value) {
//         return new Date(value);
//     }
//     return null;
// });
// watch(
//     [toRef(props, "maxValue"), valueAsDate],
//     ([maxValue, value]) => {
//         if (maxValue && value > maxValue) {
//             fieldContext.updateError("maxValue", `Must be ${maxValue} or less.`);
//         } else {
//             fieldContext.deleteError("maxValue");
//         }
//     },
//     { immediate: true },
// );
// watch(
//     [toRef(props, "minValue"), valueAsDate],
//     ([minValue, value]) => {
//         if (minValue && value < minValue) {
//             fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
//         } else {
//             fieldContext.deleteError("minValue");
//         }
//     },
//     { immediate: true },
// );

watch(
    () => fieldContext.value,
    (value) => {
        console.log("fieldContext.value changed to:", value);
        // debugger
        if (isArray(value)) {
            for (const item of value) {
                console.log("item", item);
                // console.log(item.toString())
                // fieldContext.updateValue('2024-01-01')
                fieldContext.updateValueWithName("due_date_after", "2024-01-01");
                break;
            }
        }
        // Perform actions based on the current value
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
