<script setup>
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
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

const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetReadonly.vue", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.wrapperClass">
            <span v-if="widget.combinedName || $slots.label" :class="combinedClasses.labelClass">
                <slot name="label">{{ widget.combinedName }}</slot>
            </span>
            <span :class="combinedClasses.innerClass">
                <span :class="combinedClasses.inputClass" v-bind="$attrs"
                    ><slot>{{ widget.combinedValue }}</slot></span
                >
            </span>
        </div>
    </div>
</template>
