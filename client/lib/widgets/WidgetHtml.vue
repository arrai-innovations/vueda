<script setup>
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";
import { unref } from "vue";

const props = defineProps({
    ...widgetProps,
    disabled: {
        type: Boolean,
        default: false,
    },
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
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    menuClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    editorClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const editor = useEditor({
    content: widget.combinedValue,
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
        if (widget.combinedValue !== html) {
            // let useWidget emit the change
            widget.combinedValue = html;
            widget.makeDirty();
        }
    },
});
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetHtml.vue", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <component :is="menuComponent" :class="combinedClasses.menuClass" :disabled="disabled" :editor="editor" />
        <editor-content :class="combinedClasses.editorClass" v-bind="$attrs" :editor="editor" />
    </div>
</template>
