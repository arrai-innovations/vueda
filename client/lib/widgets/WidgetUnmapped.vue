<script setup>
import "@vueda/theme/vueda-tailwind/widgets/WidgetUnmapped.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_PROPS } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, unref } from "vue";

/**
 * Renders a diagnostic when a form model resolves no widget for a field, either
 * because the field's type pair has no entry in the field mappings or because a
 * configured widget name does not resolve. Surfaces a misconfigured field
 * definition in the form rather than dropping the field silently.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    ...WIDGET_PROPS,
});

/**
 * The field context is read directly rather than through `useWidget`, because
 * this widget renders no control and holds no value; registering one would add a
 * phantom entry to the form's state. Name resolution mirrors the `combinedName`
 * that `useWidget` computes: the field context wins, then the `name` prop.
 *
 * @type {import('@vueda/use/useField.js').FieldContext|null}
 */
const fieldContext = inject(FieldContextSymbol, null);

const fieldDescriptor = computed(() => {
    const name = unref(fieldContext)?.state.name || props.name;
    return name ? `the field "${name}"` : "this field";
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
        <strong>Unmapped widget</strong>: {{ fieldDescriptor }} has no widget component.
    </div>
</template>
