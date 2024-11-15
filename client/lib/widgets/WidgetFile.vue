<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import { computed, unref } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    accept: {
        type: String,
        default: "*",
    },
    maxFileSize: {
        type: Number,
        default: 1000000,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetFile", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);

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
// todo: click handler for the widget-label to focus the image
// todo: aria-labelledby? or use id to the hidden file input
</script>

<template>
    <div :class="theme('root')">
        <widget-label
            :hidden="hidden"
            :label-class="theme('label')"
            v-bind="unref(widgetContext.state.validationState)"
        >
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div v-if="widgetContext.state.combinedValue" :class="theme('file')">
                    <a :class="theme('link')" :href="fileURL">{{ fileName }}</a>
                    <div :class="theme('buttonGroup')">
                        <Button icon="pi pi-times" rounded @click="onRemoveFile" />
                        <Button icon="pi pi-download" rounded @click="onDownload" />
                    </div>
                </div>
                <div v-else>
                    <slot name="file-uploader">
                        <FileUpload
                            auto
                            custom-upload
                            v-bind="$attrs"
                            :disabled="widgetContext.state.disabled"
                            :invalid="widgetContext.state.validationState.invalid"
                            mode="basic"
                            name="files[]"
                            :pt="effectivePt"
                            @uploader="upload"
                        >
                        </FileUpload>
                    </slot>
                </div>
            </div>
        </widget-label>
    </div>
</template>
