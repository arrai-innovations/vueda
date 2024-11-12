<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import MultiSelect from "primevue/multiselect";
import { ref, unref, useAttrs } from "vue";

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
const theme = useTheme("WidgetAutoComplete", props, widgetContext.state);
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
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            :hidden="hidden"
            :label-class="theme('label')"
            v-bind="unref(widgetContext.state.validationState)"
            @click="handleLabelClick"
        >
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <MultiSelect
                ref="selectRef"
                v-model="widgetContext.state.combinedValue"
                :aria-labelledby="widgetContext.state.widgetId"
                class="w-full md:w-80"
                v-bind="{
                    invalid: widgetContext.state.validationState.invalid,
                    class: {
                        'p-warning': widgetContext.state.validationState.warning,
                    },
                    ...$attrs,
                }"
                :disabled="widgetContext.state.disabled"
                display="chip"
                filter
                :max-selected-labels="3"
                :options="props.options"
                @blur="handleBlur"
                @focus="handleFocus"
            />
        </widget-label>
    </div>
</template>
