<script setup>
import { WIDGET_PROPS } from "@vueda/use/useWidget.js";
import Message from "primevue/message";

defineProps({
    ...WIDGET_PROPS,
});
</script>
<template>
    <Message severity="error">
        <strong>Unmapped Widget</strong> - The name "{{ name }}" is not mapped to a widget component.
    </Message>
</template>
