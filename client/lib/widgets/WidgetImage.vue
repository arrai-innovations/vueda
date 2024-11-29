<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import Image from "primevue/image";
import { useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
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
const theme = useWidgetTheme("WidgetImage", props, widgetContext.state);
// todo: click handler for the widget-label to focus the image
// todo: aria-labelledby? or use id to the hidden file input
// todo: warning/invalid states?
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-image-inner">
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
            </template>
        </widget-label>
    </div>
</template>
