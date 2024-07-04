<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";

const props = defineProps({
    ...fieldProps,
});
useField(props);
</script>
<template>
    <div data-qa="field-object">
        <slot />
    </div>
</template>
