<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
useField(props, emit);
</script>
<template>
    <div data-qa="field-object">
        <slot />
    </div>
</template>
