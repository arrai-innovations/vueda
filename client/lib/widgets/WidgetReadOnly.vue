<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...WIDGET_PROPS,
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    wrapperClass: {
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
        <div :class="combinedClasses.wrapperClass">
            <span v-if="widgetContext.combinedName || $slots.label" :class="combinedClasses.labelClass">
                <slot name="label">{{ widgetContext.combinedName }}</slot>
            </span>
            <span :class="combinedClasses.innerClass">
                <span :class="combinedClasses.inputClass" v-bind="$attrs"
                    ><slot>{{ widgetContext.combinedValue }}</slot></span
                >
            </span>
        </div>
    </div>
</template>
