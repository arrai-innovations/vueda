<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FileUpload from "@vueda/controls/file-upload/FileUpload.vue";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isString from "lodash-es/isString.js";
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
const theme = useWidgetTheme("WidgetImage", props, widgetContext.state);
const icon = useIcons("WidgetImage");

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

const onFileSelected = (file) => {
    widgetContext.state.combinedValue = file;
};

const onRemove = () => {
    widgetContext.state.combinedValue = null;
};
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')" data-qa="widget-image-inner">
            <div v-if="widgetContext.state.combinedValue" :class="theme('image')">
                <img alt="Image" :src="widgetContext.state.combinedValue" width="250" data-qa="image-preview" />
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
