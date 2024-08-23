<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
// don't shadow html element names
import PrimevueTextarea from "primevue/textarea";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetTextarea, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <widget-label :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <primevue-textarea
                    v-bind="$attrs"
                    v-model="widgetContext.state.combinedValue"
                    auto-resize
                    cols="30"
                    :name="widgetContext.state.combinedName"
                    rows="5"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
            </div>
        </widget-label>
    </div>
</template>
