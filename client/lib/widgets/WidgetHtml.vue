<script setup>
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import Editor from "primevue/editor";
import { inject } from "vue";

/**
 * A rich-text editor widget backed by PrimeVue's Editor (Quill). Stores and emits HTML string
 * content, and accepts an optional `editorHeight` prop to control the editor's visible area.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** CSS height value applied to the Quill editor's content area (e.g. `"320px"`). */
    editorHeight: {
        type: String,
        default: "auto",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const theme = useWidgetTheme("WidgetHtml", props, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-html-inner">
            <Editor
                :id="fieldContext?.state.fieldId"
                v-model="widgetContext.state.combinedValue"
                :editor-style="`height: ${editorHeight};`"
                :aria-required="widgetContext.state.required"
                v-bind="$attrs"
            />
        </div>
    </div>
</template>
