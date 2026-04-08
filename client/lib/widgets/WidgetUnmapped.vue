<script setup>
import { WIDGET_PROPS } from "@vueda/use/useWidget.js";

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
    <div
        role="alert"
        data-qa="unmapped-widget-message"
        class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
        <strong>Unmapped Widget</strong> &mdash; The name "{{ name }}" is not mapped to a widget component.
    </div>
</template>
