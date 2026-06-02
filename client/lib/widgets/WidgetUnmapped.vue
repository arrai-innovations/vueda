<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_PROPS } from "@vueda/use/useWidget.js";

/**
 * Renders an error message when a field's widget name is not mapped to any known widget component.
 * Useful as a development-time diagnostic to surface misconfigured field definitions.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    ...WIDGET_PROPS,
});

const theme = useTheme("WidgetUnmapped", props);
</script>
<template>
    <div
        role="alert"
        data-qa="unmapped-widget-message"
        :class="theme('root')"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
    >
        <strong>Unmapped Widget</strong> &mdash; The name "{{ name }}" is not mapped to a widget component.
    </div>
</template>
