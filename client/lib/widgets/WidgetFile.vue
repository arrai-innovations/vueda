<script setup>
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
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
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const theme = useWidgetTheme("WidgetFile", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);

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

const upload = (e) => {
    widgetContext.state.combinedValue = e.files[0];
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
                    <Button icon="pi pi-times" rounded @click="onRemoveFile" />
                    <Button icon="pi pi-download" rounded @click="onDownload" />
                </div>
            </div>
            <div v-else>
                <!-- Replaces the default PrimeVue FileUpload component; receives `disabled`, `invalid`, `aria-labelledby`, and an `uploader` event handler. -->
                <slot
                    v-bind="omit($attrs, 'value')"
                    :aria-labelledby="fieldContext?.state.fieldId"
                    :disabled="widgetContext.state.disabled"
                    :invalid="widgetContext.state.validationState.invalid"
                    name="file-uploader"
                    @uploader="upload"
                >
                    <FileUpload
                        v-bind="omit($attrs, 'value')"
                        :aria-labelledby="fieldContext?.state.fieldId"
                        auto
                        custom-upload
                        :disabled="widgetContext.state.disabled"
                        :invalid="widgetContext.state.validationState.invalid"
                        mode="basic"
                        name="files[]"
                        :pt="effectivePt"
                        :aria-required="widgetContext.state.required"
                        @uploader="upload"
                    >
                    </FileUpload>
                </slot>
            </div>
        </div>
    </div>
</template>
