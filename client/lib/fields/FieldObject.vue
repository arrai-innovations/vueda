<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";

const props = defineProps({
    ...FIELD_PROPS,
});
useField(props);
</script>
<template>
    <div data-qa="field-object">
        <slot />
    </div>
</template>
