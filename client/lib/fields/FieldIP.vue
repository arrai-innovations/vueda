<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === undefined || newValue === null) {
            return;
        }
        const coercedValue = newValue.toString();
        if (coercedValue !== newValue) {
            fieldContext.state.value = newValue;
        }
    },
    { immediate: true },
);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-string">
        <slot />
    </div>
</template>
