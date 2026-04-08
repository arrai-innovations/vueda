<script setup>
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { inject, watch } from "vue";

/**
 * A rich-text editor widget backed by Tiptap. Stores and emits HTML string
 * content, and accepts an optional `editorHeight` prop to control the editor's visible area.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** CSS height value applied to the editor's content area (e.g. `"320px"`). */
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

const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: widgetContext.state.combinedValue || "",
    editable: !widgetContext.state.disabled,
    onUpdate: ({ editor: ed }) => {
        widgetContext.state.combinedValue = ed.getHTML();
    },
});

watch(
    () => widgetContext.state.combinedValue,
    (value) => {
        if (editor.value && editor.value.getHTML() !== value) {
            editor.value.commands.setContent(value || "", false);
        }
    },
);

watch(
    () => widgetContext.state.disabled,
    (disabled) => {
        editor.value?.setEditable(!disabled);
    },
);

/**
 * @param {string} name
 * @param {object} [attrs]
 * @returns {boolean}
 */
const isActive = (name, attrs) => editor.value?.isActive(name, attrs) ?? false;
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-html-inner">
            <div
                v-if="editor"
                :class="theme('toolbar')"
                data-qa="widget-html-toolbar"
                role="toolbar"
                aria-label="Text formatting"
            >
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('bold') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('bold')"
                    title="Bold"
                    @click="editor.chain().focus().toggleBold().run()"
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('italic') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('italic')"
                    title="Italic"
                    @click="editor.chain().focus().toggleItalic().run()"
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('underline') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('underline')"
                    title="Underline"
                    @click="editor.chain().focus().toggleUnderline().run()"
                >
                    <u>U</u>
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('strike') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('strike')"
                    title="Strikethrough"
                    @click="editor.chain().focus().toggleStrike().run()"
                >
                    <s>S</s>
                </button>
                <span :class="theme('toolbarSeparator')" role="separator" aria-orientation="vertical" />
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('heading', { level: 1 }) && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('heading', { level: 1 })"
                    title="Heading 1"
                    @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                >
                    H1
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('heading', { level: 2 }) && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('heading', { level: 2 })"
                    title="Heading 2"
                    @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                >
                    H2
                </button>
                <span :class="theme('toolbarSeparator')" role="separator" aria-orientation="vertical" />
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('bulletList') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('bulletList')"
                    title="Bullet list"
                    @click="editor.chain().focus().toggleBulletList().run()"
                >
                    &bull;
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('orderedList') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('orderedList')"
                    title="Ordered list"
                    @click="editor.chain().focus().toggleOrderedList().run()"
                >
                    1.
                </button>
                <span :class="theme('toolbarSeparator')" role="separator" aria-orientation="vertical" />
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('blockquote') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('blockquote')"
                    title="Blockquote"
                    @click="editor.chain().focus().toggleBlockquote().run()"
                >
                    &ldquo;
                </button>
                <button
                    type="button"
                    :class="[theme('toolbarButton'), isActive('codeBlock') && theme('toolbarButtonActive')]"
                    :aria-pressed="isActive('codeBlock')"
                    title="Code block"
                    @click="editor.chain().focus().toggleCodeBlock().run()"
                >
                    &lt;/&gt;
                </button>
            </div>
            <EditorContent
                :id="fieldContext?.state.fieldId"
                :editor="editor"
                :style="{ height: editorHeight }"
                :aria-required="widgetContext.state.required"
                data-qa="widget-html-editor"
                v-bind="$attrs"
            />
        </div>
    </div>
</template>
