<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import { computed } from "vue";

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
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetFile, widgetContext.state);

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
        <widget-label :hidden="hidden" :label-class="theme('label')">
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
                        <FileUpload auto custom-upload mode="basic" name="files[]" v-bind="$attrs" @uploader="upload">
                        </FileUpload>
                    </slot>
                </div>
            </div>
        </widget-label>
    </div>
</template>
