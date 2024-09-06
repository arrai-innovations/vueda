<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { isObject } from "lodash-es";
import { toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (isObject(newValue)) {
            if (newValue instanceof File) {
                fieldContext.removeIgnore();
                return;
            }
            fieldContext.ignore();
        } else {
            fieldContext.removeIgnore();
        }
    },
    { immediate: true },
);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-file">
        <slot />
    </div>
</template>
