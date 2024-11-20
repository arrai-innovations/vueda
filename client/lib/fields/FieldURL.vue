<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-url">
        <slot :field-attrs="$attrs" :field-props="props" />
    </div>
</template>
