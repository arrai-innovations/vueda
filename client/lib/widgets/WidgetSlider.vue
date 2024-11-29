<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import Slider from "primevue/slider";
import { useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    minValue: {
        type: Number,
        default: 0,
    },
    maxValue: {
        type: Number,
        default: 100,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetSlider", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
// todo: click handler for the widget-label to focus the slider
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('input'), labelControlClass)">
                    <div class="card flex justify-center">
                        <div class="w-56">
                            <span v-if="widgetContext.state.combinedValue">{{
                                widgetContext.state.combinedValue
                            }}</span>
                            <span v-else>[{{ props.minValue }},{{ props.maxValue }}]</span>
                            <Slider
                                v-model="widgetContext.state.combinedValue"
                                v-bind="omit($attrs, 'value')"
                                :aria-labelledby="widgetContext.state.widgetId"
                                class="w-56"
                                :disabled="widgetContext.state.disabled"
                                :invalid="widgetContext.state.validationState.invalid"
                                :max="props.maxValue"
                                :min="props.minValue"
                                :name="widgetContext.state.combinedName"
                                :pt="effectivePt"
                                range
                                @change="widgetContext.focus"
                                @slideend="widgetContext.blur"
                            />
                        </div>
                    </div>
                </div>
            </template>
        </widget-label>
    </div>
</template>
