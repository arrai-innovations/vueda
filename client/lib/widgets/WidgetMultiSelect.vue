<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import MultiSelect from "primevue/multiselect";
import { ref, useAttrs, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    options: {
        type: Array,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetAutoComplete", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const attrs = useAttrs();
const handleFocus = (e) => {
    widgetContext.focus();
    if (typeof attrs["on-focus"] === "function") {
        attrs["on-focus"](e);
    }
};
const handleBlur = (e) => {
    widgetContext.blur();
    if (typeof attrs["on-blur"] === "function") {
        attrs["on-blur"](e);
    }
};
const selectRef = ref(null);
const handleLabelClick = (e) => {
    if (selectRef.value) {
        selectRef.value.onContainerClick(e);
    }
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            @click="handleLabelClick"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <MultiSelect
                ref="selectRef"
                v-model="widgetContext.state.combinedValue"
                :aria-labelledby="widgetContext.state.widgetId"
                class="w-full md:w-80"
                v-bind="$attrs"
                :disabled="widgetContext.state.disabled"
                display="chip"
                filter
                :invalid="widgetContext.state.validationState.invalid"
                :options="props.options"
                :pt="effectivePt"
                @blur="handleBlur"
                @focus="handleFocus"
            />
        </widget-label>
    </div>
</template>
