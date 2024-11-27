<script setup>
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import get from "lodash-es/get.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import Select from "primevue/select";
import { computed, ref, useAttrs, useSlots } from "vue";

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
    optionLabel: {
        type: String,
        default: "label",
    },
    optionValue: {
        type: String,
        default: "value",
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetSelect", props, widgetContext.state);
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
const modelItem = computed(() => {
    let match = null;
    if (props.options && props.options.length > 0) {
        // noinspection EqualityComparisonWithCoercionJS
        match = props.options.find((option) => get(option, props.optionValue) == widgetContext.state.combinedValue);
    }
    return (
        (match ? get(match, props.optionValue) : widgetContext.state.combinedValue) ?? widgetContext.state.combinedValue
    );
});
const valueUpdated = (selected) => {
    widgetContext.state.combinedValue = selected;
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
            <div :class="theme('inner')">
                <Select
                    ref="selectRef"
                    v-bind="omit($attrs, 'value')"
                    :aria-labelledby="widgetContext.state.widgetId"
                    :disabled="widgetContext.state.disabled"
                    :invalid="widgetContext.state.validationState.invalid"
                    :model-value="modelItem"
                    :option-label="props.optionLabel"
                    :option-value="props.optionValue"
                    :options="props.options"
                    :pt="effectivePt"
                    show-clear
                    @blur="handleBlur"
                    @focus="handleFocus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
