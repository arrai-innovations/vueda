<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
});
const fieldContext = useField(props);

watch(
    toRef(fieldContext, "fieldValue"),
    (newValue) => {
        const coercedValue = !!newValue;
        if (coercedValue !== fieldContext.value) {
            fieldContext.updateValue(coercedValue);
        }
    },
    { immediate: true },
);
</script>
<template>
    <div data-qa="field-boolean">
        <slot />
    </div>
</template>
