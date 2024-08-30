<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import isArray from "lodash-es/isArray.js";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const preprocessGet = (value) => {
    if (value === undefined || value === null) {
        return value;
    }
    return isArray(value) ? value.join("\n") : value;
};
const preprocessSet = (value) => {
    if (value === undefined || value === null) {
        return value;
    }
    return isArray(value) ? value : value.split("\n");
};

const fieldContext = useField(props, emit, { preprocessGet, preprocessSet });
onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-array">
        <slot />
    </div>
</template>
