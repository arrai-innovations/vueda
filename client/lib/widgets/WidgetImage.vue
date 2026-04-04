<script setup>
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isString from "lodash-es/isString.js";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import Image from "primevue/image";
import { inject, toRef, watch } from "vue";

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

if (fieldContext) {
    watch(
        toRef(fieldContext.state, "value"),
        (newValue) => {
            if (isString(newValue)) {
                fieldContext.ignore();
                return;
            }
            fieldContext.removeIgnore();
        },
        { immediate: true },
    );
}

const upload = (e) => {
    widgetContext.state.combinedValue = e.files[0];
};

const onRemove = () => {
    widgetContext.state.combinedValue = null;
};
const theme = useWidgetTheme("WidgetImage", props, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-image-inner">
            <div v-if="widgetContext.state.combinedValue" :class="theme('image')">
                <Image alt="Image" :src="widgetContext.state.combinedValue" width="250" />
                <Button icon="pi pi-times" rounded @click="onRemove" />
            </div>
            <div v-else>
                <FileUpload
                    accept="image/*"
                    :aria-labelledby="fieldContext?.state.fieldId"
                    auto
                    custom-upload
                    :disabled="widgetContext.state.disabled"
                    :max-file-size="1000000"
                    mode="basic"
                    name="demo[]"
                    :aria-required="widgetContext.state.required"
                    @uploader="upload"
                />
            </div>
        </div>
    </div>
</template>
