<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FileUpload from "@vueda/controls/file-upload/FileUpload.vue";
import "@vueda/theme/vueda-tailwind/widgets/WidgetFile.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { useObjectUrl } from "@vueuse/core";
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
    ...ICON_OVERRIDE_PROPS,
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
const icon = useIcons("WidgetFile", props);

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
const fileName = computed(() => {
    if (widgetContext.state.combinedValue) {
        return widgetContext.state.combinedValue.name ?? widgetContext.state.combinedValue;
    }
    return null;
});

/** True while the current value is an unsaved `File` selected in the browser. */
const isUnsavedFile = computed(() => widgetContext.state.combinedValue instanceof File);

// A freshly picked File has no URL yet, so mint a local object URL to link to. useObjectUrl revokes
// it when the selection changes and on teardown. Only narrow to File values: a persisted
// {name, url} object would otherwise reach URL.createObjectURL and throw.
const objectURL = useObjectUrl(() => (isUnsavedFile.value ? widgetContext.state.combinedValue : undefined));

// URL precedence: the local object URL for a new File, the persisted {name, url} url, then a bare
// string (legacy or already-resolved url) as-is. An object with no url has nothing to link to.
const fileURL = computed(() => {
    const value = widgetContext.state.combinedValue;
    if (isUnsavedFile.value) {
        return objectURL.value;
    }
    if (typeof value === "string") {
        return value || null;
    }
    return value?.url || null;
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
                <a
                    :class="theme('link')"
                    :href="fileURL"
                    :rel="isUnsavedFile ? 'noopener' : undefined"
                    :target="isUnsavedFile ? '_blank' : undefined"
                    >{{ fileName }}</a
                >
                <div :class="theme('buttonGroup')">
                    <Button emphasis="ghost" size="icon-sm" data-qa="file-remove" @click="onRemoveFile">
                        <component
                            :is="icon('close').component"
                            v-if="icon('close')"
                            v-bind="icon('close').props"
                            aria-hidden="true"
                        />
                        <span class="sr-only">Remove file</span>
                    </Button>
                    <!-- A new tab keeps the form open when the browser ignores `download`, as it does for a
                    cross-origin url. The empty `download` keeps the server's filename; a local File
                    passes its own name, because an object URL carries none. -->
                    <Button
                        v-if="fileURL"
                        as="a"
                        emphasis="ghost"
                        size="icon-sm"
                        data-qa="file-download"
                        :download="isUnsavedFile ? fileName : ''"
                        :href="fileURL"
                        rel="noopener"
                        target="_blank"
                    >
                        <component
                            :is="icon('download').component"
                            v-if="icon('download')"
                            v-bind="icon('download').props"
                            aria-hidden="true"
                        />
                        <span class="sr-only">Download file</span>
                    </Button>
                </div>
            </div>
            <div v-else>
                <!-- @slot [file-uploader] Replaces the default FileUpload component; receives `disabled`, `invalid`, `aria-labelledby`, and an `update:modelValue` event handler. -->
                <slot
                    :aria-labelledby="fieldContext?.state.fieldId"
                    :disabled="widgetContext.state.disabled"
                    :invalid="widgetContext.state.validationState.invalid"
                    name="file-uploader"
                    @update:model-value="onFileSelected"
                >
                    <FileUpload
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
