<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...widgetProps,
    type: {
        type: String,
        default: "text",
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    inputClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    prefixClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    suffixClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetInput.vue", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <span v-if="$slots.prefix" :class="combinedClasses.prefixClass">
            <slot name="prefix" />
        </span>
        <input
            v-model="widget.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widget.combinedName"
            :type="type"
            v-bind="$attrs"
            @change="widget.makeDirty"
        />
        <span v-if="$slots.suffix" :class="combinedClasses.suffixClass">
            <slot name="suffix" />
        </span>
    </div>
</template>
