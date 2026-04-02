<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import isString from "lodash-es/isString.js";
import pick from "lodash-es/pick.js";
import Button from "primevue/button";
import FileUpload from "primevue/fileupload";
import Image from "primevue/image";
import { inject, toRef, useSlots, watch } from "vue";

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
    ...WIDGET_LABEL_PROPS,
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
// todo: click handler for the widget-label to focus the image
// todo: aria-labelledby? or use id to the hidden file input
// todo: warning/invalid states?
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            label-tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
        >
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
                            :aria-labelledby="widgetContext.state.widgetId"
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
            </template>
        </widget-label>
    </div>
</template>
