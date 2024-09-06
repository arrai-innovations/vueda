<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import MultiSelect from "primevue/multiselect";
import { useAttrs } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetAutoComplete, widgetContext.state);
const attrs = useAttrs();
const handleFocus = (e) => {
    widgetContext.focus();
    if (attrs.onFocus) {
        attrs.onFocus(e);
    }
};
const handleBlur = (e) => {
    widgetContext.blur();
    if (attrs.onBlur) {
        attrs.onBlur(e);
    }
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <MultiSelect
                v-model="widgetContext.state.combinedValue"
                class="w-full md:w-80"
                display="chip"
                filter
                loading
                :max-selected-labels="3"
                option-label="label"
                :options="props.options"
                @blur="handleBlur"
                @focus="handleFocus"
            />
        </widget-label>
    </div>
</template>
