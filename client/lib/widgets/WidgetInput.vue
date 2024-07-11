<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
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
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

// todo: there are more primevue inputs we could be using.
const inputComponent = computed(() => {
    return props.type === "number" ? InputNumber : InputText;
});

const combinedClasses = useCombinedClasses("WidgetInput", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <span v-if="$slots.prefix" :class="combinedClasses.prefixClass">
            <slot name="prefix" />
        </span>
        <component
            :is="inputComponent"
            v-model="widgetContext.state.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widgetContext.state.combinedName"
            :type="type"
            v-bind="$attrs"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        />
        <span v-if="$slots.suffix" :class="combinedClasses.suffixClass">
            <slot name="suffix" />
        </span>
    </div>
</template>
