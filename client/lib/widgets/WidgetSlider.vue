<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputText from "primevue/inputtext";
import Slider from "primevue/slider";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetDatePicker, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <widget-label :label-class="theme('label')" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div class="card flex justify-center">
                    <div class="w-56">
                        <InputText v-model.number="widgetContext.state.combinedValue" />
                        <Slider
                            v-model="widgetContext.state.combinedValue"
                            v-bind="$attrs"
                            class="w-56"
                            :name="widgetContext.state.combinedName"
                            range
                        />
                    </div>
                </div>
            </div>
        </widget-label>
    </div>
</template>
