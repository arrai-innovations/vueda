<script setup>
import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { widgetJsonCmTheme, widgetJsonHighlightSpec } from "@vueda/theme/vueda-tailwind/widgets/WidgetJson.theme.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const JSON_ERROR_CODE = "invalidJson";
const JSON_ERROR_MESSAGE = "Enter valid JSON.";

/**
 * A JSON editor widget backed by CodeMirror. It edits real JSON values, not
 * stringified copies, so JSONField submissions keep their object/scalar shape.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Whether values should be serialized with indentation. */
    prettyPrint: {
        type: Boolean,
        default: true,
    },
    /** Number of spaces to use when prettyPrint is true. */
    indent: {
        type: Number,
        default: 2,
    },
    /** Whether valid JSON should be reformatted when the editor loses focus. */
    formatOnBlur: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetJson", props, widgetContext.state);

const editorRoot = ref(null);
const editorView = ref(null);
const editorText = ref(formatValue(widgetContext.state.combinedValue));
const jsonError = ref(false);
const editableCompartment = new Compartment();

const isInvalid = computed(() => jsonError.value || widgetContext.state.validationState.invalid);

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatValue(value) {
    if (value === undefined || value === null) {
        return "";
    }
    try {
        return JSON.stringify(value, null, props.prettyPrint ? props.indent : 0);
    } catch {
        return String(value);
    }
}

/**
 * @param {string} value
 * @returns {{ valid: true, value: unknown } | { valid: false }}
 */
function parseJsonText(value) {
    if (value.trim() === "") {
        return { valid: true, value: null };
    }
    try {
        return { valid: true, value: JSON.parse(value) };
    } catch {
        return { valid: false };
    }
}

/**
 * @param {string} value
 * @returns {void}
 */
function setEditorText(value) {
    editorText.value = value;
    const view = editorView.value;
    if (!view || view.state.doc.toString() === value) {
        return;
    }
    view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
    });
}

/**
 * @returns {void}
 */
function applyEditorAttributes() {
    const view = editorView.value;
    if (!view) {
        return;
    }

    view.contentDOM.id = fieldContext?.state.fieldId || "";
    view.contentDOM.setAttribute("role", "textbox");
    view.contentDOM.setAttribute("aria-multiline", "true");
    if (isInvalid.value) {
        view.contentDOM.setAttribute("aria-invalid", "true");
    } else {
        view.contentDOM.removeAttribute("aria-invalid");
    }
    if (widgetContext.state.required) {
        view.contentDOM.setAttribute("aria-required", "true");
    } else {
        view.contentDOM.removeAttribute("aria-required");
    }
}

/**
 * @param {boolean} invalid
 * @returns {void}
 */
function setJsonError(invalid) {
    jsonError.value = invalid;
    applyEditorAttributes();
    if (!fieldContext) {
        return;
    }
    if (invalid) {
        fieldContext.updateError(JSON_ERROR_CODE, JSON_ERROR_MESSAGE);
    } else {
        fieldContext.deleteError(JSON_ERROR_CODE);
    }
}

/**
 * @param {string} value
 * @returns {void}
 */
function handleEditorText(value) {
    editorText.value = value;
    const parsed = parseJsonText(value);
    if (!parsed.valid) {
        setJsonError(true);
        return;
    }
    setJsonError(false);
    widgetContext.state.combinedValue = parsed.value;
}

/**
 * @returns {void}
 */
function handleBlur() {
    widgetContext.blur();
    if (props.formatOnBlur && !jsonError.value) {
        setEditorText(formatValue(widgetContext.state.combinedValue));
    }
}

onMounted(() => {
    if (!editorRoot.value) {
        return;
    }
    editorView.value = new EditorView({
        parent: editorRoot.value,
        state: EditorState.create({
            doc: editorText.value,
            extensions: [
                json(),
                syntaxHighlighting(HighlightStyle.define(widgetJsonHighlightSpec)),
                EditorView.theme(widgetJsonCmTheme),
                editableCompartment.of(EditorView.editable.of(!widgetContext.state.disabled)),
                EditorView.lineWrapping,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        handleEditorText(update.state.doc.toString());
                    }
                    if (update.focusChanged) {
                        if (update.view.hasFocus) {
                            widgetContext.focus();
                        } else {
                            handleBlur();
                        }
                    }
                }),
            ],
        }),
    });
    applyEditorAttributes();
});

onBeforeUnmount(() => {
    setJsonError(false);
    editorView.value?.destroy();
    editorView.value = null;
});

watch(
    () => widgetContext.state.combinedValue,
    (value) => {
        if (jsonError.value) {
            return;
        }
        const parsed = parseJsonText(editorText.value);
        if (parsed.valid && isEqual(parsed.value, value)) {
            return;
        }
        setEditorText(formatValue(value));
    },
    { deep: true },
);

watch(
    () => widgetContext.state.disabled,
    (disabled) => {
        editorView.value?.dispatch({
            effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
        });
    },
);

watch(isInvalid, () => nextTick(applyEditorAttributes));
watch(
    () => widgetContext.state.required,
    () => nextTick(applyEditorAttributes),
);
watch(
    () => fieldContext?.state.fieldId,
    () => nextTick(applyEditorAttributes),
);
</script>

<template>
    <div
        :class="theme('root')"
        :data-invalid="isInvalid || undefined"
        :data-disabled="widgetContext.state.disabled || undefined"
        data-qa="widget-json"
        v-bind="$attrs"
    >
        <div ref="editorRoot" :class="theme('editor')" data-qa="widget-json-editor" />
    </div>
</template>
