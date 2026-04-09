<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { reactive, ref, toRef } from "vue";

/**
 * A file-upload control with a hidden native file input, a styled trigger button,
 * and an optional drag-and-drop zone. Emits the selected File via v-model.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The currently selected File, or null. */
    modelValue: { type: [File, Object], default: null },
    /** MIME type filter passed to the native file input (e.g. `"image/*"` or `".pdf"`). */
    accept: { type: String, default: "*" },
    /** Maximum allowed file size in bytes. Files exceeding this limit are silently rejected. */
    maxFileSize: { type: Number, default: 1000000 },
    /** When true, prevents interaction with the control. */
    disabled: { type: Boolean, default: false },
    /** When true, renders a drag-and-drop zone around the trigger. */
    dropzone: { type: Boolean, default: false },
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render the root as. */
    as: { type: [String, Object], default: "div" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const theme = useTheme(
    "ControlFileUpload",
    props,
    reactive({
        dropzone: toRef(props, "dropzone"),
        disabled: toRef(props, "disabled"),
        dragging: ref(false),
    }),
);

const inputRef = ref(null);
const dragging = ref(false);

/**
 * @param {File} file
 * @returns {boolean}
 */
const isValidFile = (file) => {
    if (!file) return false;
    if (file.size > props.maxFileSize) return false;
    return true;
};

/**
 * @param {File} file
 */
const selectFile = (file) => {
    if (props.disabled || !isValidFile(file)) return;
    emit("update:modelValue", file);
};

const onInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    // Reset so re-selecting the same file still triggers change
    event.target.value = "";
};

const openFilePicker = () => {
    if (!props.disabled) inputRef.value?.click();
};

const onDragOver = (event) => {
    if (props.disabled || !props.dropzone) return;
    event.preventDefault();
    dragging.value = true;
};

const onDragLeave = () => {
    dragging.value = false;
};

const onDrop = (event) => {
    if (props.disabled || !props.dropzone) return;
    event.preventDefault();
    dragging.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) selectFile(file);
};

defineExpose({ openFilePicker });
</script>

<template>
    <Primitive
        data-slot="file-upload"
        :as="as"
        :as-child="asChild"
        :class="[theme('root'), props.class]"
        :data-dropzone="dropzone || undefined"
        :data-dragging="dragging || undefined"
        :data-disabled="disabled || undefined"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
    >
        <input
            ref="inputRef"
            type="file"
            :accept="accept"
            :disabled="disabled"
            data-slot="file-input"
            class="sr-only"
            tabindex="-1"
            @change="onInputChange"
        />
        <slot :open="openFilePicker" :dragging="dragging">
            <button
                type="button"
                :class="theme('trigger')"
                :disabled="disabled"
                data-slot="file-upload-trigger"
                @click="openFilePicker"
            >
                <slot name="trigger-content">
                    <span aria-hidden="true" class="select-none">⇧</span>
                    Choose file
                </slot>
            </button>
            <p v-if="dropzone" :class="theme('dropMessage')" data-slot="file-upload-drop-message">
                <slot name="drop-message">or drag and drop here</slot>
            </p>
        </slot>
    </Primitive>
</template>
