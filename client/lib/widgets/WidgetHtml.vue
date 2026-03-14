<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import Editor from "primevue/editor";
import { useSlots } from "vue";

/**
 * A rich-text editor widget backed by PrimeVue's Editor (Quill). Stores and emits HTML string
 * content, and accepts an optional `editorHeight` prop to control the editor's visible area.
 */
defineOptions({});

const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** CSS height value applied to the Quill editor's content area (e.g. `"320px"`). */
    editorHeight: {
        type: String,
        default: "auto",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetHtml", props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            label-tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-html-inner">
                    <Editor
                        v-model="widgetContext.state.combinedValue"
                        :editor-style="`height: ${editorHeight};`"
                        :aria-required="widgetContext.state.required"
                        v-bind="$attrs"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
