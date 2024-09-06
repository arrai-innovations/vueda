<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Slider from "primevue/slider";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    minValue: {
        type: Number,
        default: 0,
    },
    maxValue: {
        type: Number,
        default: 100,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetDatePicker, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div class="card flex justify-center">
                    <div class="w-56">
                        <span v-if="widgetContext.state.combinedValue">{{ widgetContext.state.combinedValue }}</span>
                        <span v-else>[{{ props.minValue }},{{ props.maxValue }}]</span>
                        <Slider
                            v-model="widgetContext.state.combinedValue"
                            v-bind="$attrs"
                            class="w-56"
                            :max="props.maxValue"
                            :min="props.minValue"
                            :name="widgetContext.state.combinedName"
                            range
                            @change="widgetContext.focus"
                            @slideend="widgetContext.blur"
                        />
                    </div>
                </div>
            </div>
        </widget-label>
    </div>
</template>
