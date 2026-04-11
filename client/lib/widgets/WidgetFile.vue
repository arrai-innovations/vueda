<script setup>
import ControlButton from "@vueda/controls/button/ControlButton.vue";
import ControlFileUpload from "@vueda/controls/file-upload/ControlFileUpload.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isObject from "lodash-es/isObject.js";
import { computed, inject, toRef, watch } from "vue";

/**
 * A file-upload widget that displays an existing file as a labelled download link with remove and
 * download actions, and falls back to a file-uploader input when no file is selected.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** MIME type filter passed to the file input (e.g. `"image/*"` or `".pdf"`). */
    accept: {
        type: String,
        default: "*",
    },
    /** Maximum allowed file size in bytes. */
    maxFileSize: {
        type: Number,
        default: 1000000,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const theme = useWidgetTheme("WidgetFile", props, widgetContext.state);

if (fieldContext) {
    watch(
        toRef(fieldContext.state, "value"),
        (newValue) => {
            if (isObject(newValue)) {
                if (newValue instanceof File) {
                    fieldContext.removeIgnore();
                    return;
                }
                fieldContext.ignore();
            } else {
                fieldContext.removeIgnore();
            }
        },
        { immediate: true },
    );
}

const onFileSelected = (file) => {
    widgetContext.state.combinedValue = file;
};
const onRemoveFile = () => {
    widgetContext.state.combinedValue = null;
};
const onDownload = () => {
    console.log("download: ", widgetContext.state.combinedValue);
};

const fileName = computed(() => {
    if (widgetContext.state.combinedValue) {
        return widgetContext.state.combinedValue.name ?? widgetContext.state.combinedValue;
    }
    return null;
});

const fileURL = computed(() => {
    if (widgetContext.state.combinedValue) {
        return widgetContext.state.combinedValue.objectURL ?? widgetContext.state.combinedValue;
    }
    return null;
});
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-file-inner">
            <div
                v-if="widgetContext.state.combinedValue"
                :aria-labelledby="fieldContext?.state.fieldId"
                :class="theme('file')"
            >
                <a :class="theme('link')" :href="fileURL">{{ fileName }}</a>
                <div :class="theme('buttonGroup')">
                    <ControlButton variant="ghost" size="icon-sm" data-qa="file-remove" @click="onRemoveFile">
                        <span aria-hidden="true" class="select-none">✕</span>
                        <span class="sr-only">Remove file</span>
                    </ControlButton>
                    <ControlButton variant="ghost" size="icon-sm" data-qa="file-download" @click="onDownload">
                        <span aria-hidden="true" class="select-none">⇩</span>
                        <span class="sr-only">Download file</span>
                    </ControlButton>
                </div>
            </div>
            <div v-else>
                <!-- @slot [file-uploader] Replaces the default ControlFileUpload component; receives `disabled`, `invalid`, `aria-labelledby`, and an `update:modelValue` event handler. -->
                <slot
                    :aria-labelledby="fieldContext?.state.fieldId"
                    :disabled="widgetContext.state.disabled"
                    :invalid="widgetContext.state.validationState.invalid"
                    name="file-uploader"
                    @update:model-value="onFileSelected"
                >
                    <ControlFileUpload
                        :accept="accept"
                        :aria-labelledby="fieldContext?.state.fieldId"
                        :aria-required="widgetContext.state.required"
                        :disabled="widgetContext.state.disabled"
                        :max-file-size="maxFileSize"
                        @update:model-value="onFileSelected"
                    />
                </slot>
            </div>
        </div>
    </div>
</template>
