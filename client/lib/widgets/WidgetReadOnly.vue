<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...WIDGET_PROPS,
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
});

const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetReadonly", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.innerClass">
            <div :class="combinedClasses.labelClass">
                <slot :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </div>
            <div :class="combinedClasses.inputClass" v-bind="$attrs">
                <slot>{{ widgetContext.state.combinedValue }}</slot>
            </div>
        </div>
    </div>
</template>
