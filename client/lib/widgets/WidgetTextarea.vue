<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
// don't shadow html element names
import PrimevueTextarea from "primevue/textarea";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    innerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetTextarea", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <widget-label :label-class="combinedClasses.labelClass" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="combinedClasses.innerClass">
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
