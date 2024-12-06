<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isArray from "lodash-es/isArray.js";
import omit from "lodash-es/omit.js";

defineOptions({
    inheritAttrs: false,
});
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

useField(props, emit, { preprocessGet, preprocessSet });
</script>
<template>
    <div :class="$attrs.class" data-qa="field-array">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
