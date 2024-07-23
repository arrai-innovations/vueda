<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isArray from "lodash-es/isArray.js";

const props = defineProps({
    ...FIELD_PROPS,
});
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
useField(props, { preprocessGet, preprocessSet });
</script>
<template>
    <div data-qa="field-object">
        <slot />
    </div>
</template>
