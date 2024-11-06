<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Select from "primevue/select";
import { computed, useAttrs } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetSelect", props, widgetContext.state);
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
        match = props.options.find((option) => option.value == widgetContext.state.combinedValue);
    }
    return match?.value ?? widgetContext.state.combinedValue;
});
const valueUpdated = (selected) => {
    widgetContext.state.combinedValue = selected;
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <Select
                    :model-value="modelItem"
                    :options="props.options"
                    show-clear
                    v-bind="$attrs"
                    @blur="handleBlur"
                    @focus="handleFocus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
