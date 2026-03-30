<script setup>
import { WIDGET_PROPS } from "@vueda/use/useWidget.js";
import Message from "primevue/message";

/**
 * Renders an error message when a field's widget name is not mapped to any known widget component.
 * Useful as a development-time diagnostic to surface misconfigured field definitions.
 */
defineOptions({});

defineProps({
    ...WIDGET_PROPS,
});
</script>
<template>
    <Message severity="error">
        <strong>Unmapped Widget</strong> - The name "{{ name }}" is not mapped to a widget component.
    </Message>
</template>
