<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputNumber from "primevue/inputnumber";
import { computed, reactive } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    showSeconds: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetDuration, widgetContext.state);

const durationObject = reactive({
    hours: 0,
    minutes: 0,
    seconds: 0,
});
const valueHour = computed(() => {
    return widgetContext.state.combinedValue.hours;
});
const valueMinute = computed(() => {
    return widgetContext.state.combinedValue.minutes;
});
const valueSecond = computed(() => {
    return widgetContext.state.combinedValue.seconds;
});
const updateHour = (newValue) => {
    durationObject.hours = newValue;
    widgetContext.state.combinedValue = durationObject;
};

const updateMinute = (newValue) => {
    durationObject.minutes = newValue;
    widgetContext.state.combinedValue = durationObject;
};
const updateSecond = (newValue) => {
    durationObject.seconds = newValue;
    widgetContext.state.combinedValue = durationObject;
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueHour"
                        show-buttons
                        suffix=" hours"
                        @update:model-value="(newValue) => updateHour(newValue)"
                    >
                    </InputNumber>
                </div>
                <div :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueMinute"
                        show-buttons
                        suffix=" minutes"
                        @update:model-value="(newValue) => updateMinute(newValue)"
                    >
                    </InputNumber>
                </div>
                <div v-if="showSeconds" :class="theme('innerItem')">
                    <InputNumber
                        :max="60"
                        :min="0"
                        :model-value="valueSecond"
                        show-buttons
                        suffix=" seconds"
                        @update:model-value="(newValue) => updateSecond(newValue)"
                    >
                    </InputNumber>
                </div>
            </div>
        </widget-label>
    </div>
</template>
