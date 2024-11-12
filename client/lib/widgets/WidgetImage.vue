<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import Image from "primevue/image";
import { unref } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const upload = (e) => {
    widgetContext.state.combinedValue = e.files[0];
};

const onRemove = () => {
    widgetContext.state.combinedValue = null;
};
const theme = useTheme("WidgetImage", props, widgetContext.state);
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
                <div v-if="widgetContext.state.combinedValue" :class="theme('image')">
                    <Image alt="Image" :src="widgetContext.state.combinedValue" width="250" />
                    <Button icon="pi pi-times" rounded @click="onRemove" />
                </div>
                <div v-else>
                    <FileUpload
                        accept="image/*"
                        auto
                        custom-upload
                        :disabled="widgetContext.state.disabled"
                        :max-file-size="1000000"
                        mode="basic"
                        name="demo[]"
                        @uploader="upload"
                    />
                </div>
            </div>
        </widget-label>
    </div>
</template>
