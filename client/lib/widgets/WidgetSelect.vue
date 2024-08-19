<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Dropdown from "primevue/dropdown";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
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
    innerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
    onFocus: {
        type: Function,
        default: () => {},
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetSelect, widgetContext.state);
const handleFocus = () => {
    widgetContext.focus();
    props.onFocus();
};

const modelItem = computed(() => {
    let match = null;
    if (props.options && props.options.length > 0) {
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
        <widget-label :label-class="theme('label')" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <Dropdown
                    :model-value="modelItem"
                    option-label="label"
                    option-value="value"
                    :options="props.options"
                    show-clear
                    v-bind="$attrs"
                    @blur="widgetContext.blur"
                    @focus="handleFocus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
