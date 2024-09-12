<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Calendar from "primevue/calendar";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    selectionMode: {
        type: String,
        default: undefined,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetDatePicker, widgetContext.state);
const valueIsArray = computed(() => Array.isArray(widgetContext.state.combinedValue));
const computedSelectionMode = computed(() =>
    props.selectionMode ? props.selectionMode : valueIsArray.value ? "range" : "single",
);
const modelValue = computed(() => {
    return widgetContext.state.combinedValue;
});
const valueUpdated = (value) => {
    widgetContext.state.combinedValue = value;
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <Calendar
                    :model-value="modelValue"
                    :name="widgetContext.state.combinedName"
                    :selection-mode="computedSelectionMode"
                    v-bind="$attrs"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                    @update:model-value="(value) => valueUpdated(value)"
                />
            </div>
        </widget-label>
    </div>
</template>
