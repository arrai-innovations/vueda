<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import isString from "lodash-es/isString.js";
import { toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (isString(newValue)) {
            fieldContext.ignore();
            return;
        }
        fieldContext.removeIgnore();
    },
    { immediate: true },
);
onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-image">
        <slot :field-attrs="$attrs" :field-props="props" />
    </div>
</template>
