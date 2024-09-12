<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import TriStateCheckbox from "primevue/tristatecheckbox";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const theme = useComputedClasses(vuedaTailwind.WidgetTriStateCheckbox, widgetContext.state);
</script>

<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <TriStateCheckbox
                    v-model="widgetContext.state.combinedValue"
                    :name="widgetContext.state.combinedName"
                    type="checkbox"
                    v-bind="$attrs"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
                <label for="checkbox">{{
                    widgetContext.state.combinedValue == null ? "null" : widgetContext.state.combinedValue
                }}</label>
            </div>
        </widget-label>
    </div>
</template>
