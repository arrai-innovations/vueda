<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FileUpload from "@vueda/controls/file-upload/FileUpload.vue";
import "@vueda/theme/vueda-tailwind/widgets/WidgetImage.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { useObjectUrl } from "@vueuse/core";
import isObject from "lodash-es/isObject.js";
import { computed, inject, toRef, watch } from "vue";

/**
 * An image upload widget that shows a file picker when no image is selected and a preview with a
 * remove button once one has been chosen. The widget value is the raw File object selected by the
 * user.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const theme = useWidgetTheme("WidgetImage", props, widgetContext.state);
const icon = useIcons("WidgetImage");

if (fieldContext) {
    watch(
        toRef(fieldContext.state, "value"),
        (newValue) => {
            // A persisted image arrives as a {name, url} object: ignore it so the existing URL is
            // not re-submitted. A freshly picked File is a new upload: keep it in the submission.
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

const onRemove = () => {
    widgetContext.state.combinedValue = null;
};

// A freshly picked File has no URL yet, so mint a local object URL for the preview. useObjectUrl
// revokes it when the selection changes and on teardown. Only narrow to File values: a persisted
// {name, url} object would otherwise reach URL.createObjectURL and throw.
const previewUrl = useObjectUrl(() =>
    widgetContext.state.combinedValue instanceof File ? widgetContext.state.combinedValue : undefined,
);

// Preview source precedence: local object URL for a new File, the persisted {name, url} url, then a
// bare string (legacy or already-resolved url) as-is.
const imageSrc = computed(
    () => previewUrl.value ?? widgetContext.state.combinedValue?.url ?? widgetContext.state.combinedValue,
);
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-image-inner">
            <div v-if="widgetContext.state.combinedValue" :class="theme('image')">
                <img alt="Image" :src="imageSrc" width="250" data-qa="image-preview" />
                <Button variant="ghost" size="icon-sm" data-qa="image-remove" @click="onRemove">
                    <component
                        :is="icon('close').component"
                        v-if="icon('close')"
                        v-bind="icon('close').props"
                        aria-hidden="true"
                    />
                    <span class="sr-only">Remove image</span>
                </Button>
            </div>
            <div v-else>
                <FileUpload
                    accept="image/*"
                    :aria-labelledby="fieldContext?.state.fieldId"
                    :aria-required="widgetContext.state.required"
                    :disabled="widgetContext.state.disabled"
                    :max-file-size="1000000"
                    @update:model-value="onFileSelected"
                />
            </div>
        </div>
    </div>
</template>
