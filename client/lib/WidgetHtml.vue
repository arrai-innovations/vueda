<script setup>
import useWidget, { widgetProps, widgetEmits } from "@vueda/use/useWidget.js";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
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
});
const emit = defineEmits([...widgetEmits]);
const {
    combinedName,
    combinedValue,
} = useWidget(props, emit);
const editor = useEditor({
    content: props.combinedValue,
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
        if (props.fieldValue !== html) {
            emit("update:field-value", unrefEditor.getHTML());
        }
    },
});
</script>
<template>
    <div>
        <component
            :is="menuComponent"
            :disabled="disabled"
            :editor="editor"
        />
        <editor-content
            v-bind="$attrs"
            :editor="editor"
        />
    </div>
</template>
