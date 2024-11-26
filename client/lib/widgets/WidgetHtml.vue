<script setup>
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import { unref, useSlots } from "vue";

const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    menuComponent: {
        type: Object,
        default: () => import("@tiptap/vue-3").then((m) => m.MenuBar),
    },
    extensions: {
        type: Array,
        default: () => [
            StarterKit.configure({
                bulletList: {
                    HTMLAttributes: {
                        class: "list-disc list-inside ml-4 pl-3",
                        style: "list-style: revert",
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: "list-decimal list-inside ml-4 pl-3",
                        style: "list-style: revert",
                    },
                },
                heading: {
                    HTMLAttributes: {
                        style: "font-size: revert",
                    },
                },
            }),
            TextAlign.configure({ types: ["paragraph", "list"] }),
        ],
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const editor = useEditor({
    content: widgetContext.state.combinedValue,
    extensions: props.extensions,
    injectCSS: false,
    editable: !props.disabled,
    editorProps: {
        attributes: {
            class: ["editor-class"],
            "data-qa": "html-editor",
        },
    },
    onUpdate: () => {
        const unrefEditor = unref(editor);
        const html = unrefEditor.getHTML();
        if (widgetContext.state.combinedValue !== html) {
            // let useWidget emit the change. the computed ref has a set...
            // noinspection JSConstantReassignment
            widgetContext.state.combinedValue = html;
        }
    },
    onFocus: () => {
        widgetContext.focus();
    },
    onBlur: () => {
        widgetContext.blur();
    },
});
const theme = useWidgetTheme("WidgetHtml", props, widgetContext.state);
// todo: label click should focus the editor
// todo: aria attributes re: label / labbelledby
// todo: warning / invalid states?
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <component
                    :is="menuComponent"
                    v-if="menuComponent"
                    :class="theme('menu')"
                    :disabled="widgetContext.state.disabled"
                />
                <editor-content :class="theme('editor')" v-bind="$attrs" :editor="editor" />
            </div>
        </widget-label>
    </div>
</template>
