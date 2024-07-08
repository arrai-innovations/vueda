<script setup>
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "../use/useWidget.js";
import InputText from "primevue/inputtext";

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
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetInput", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <span v-if="$slots.prefix" :class="combinedClasses.prefixClass">
            <slot name="prefix" />
        </span>
        <InputText
            v-model="widget.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widget.combinedName"
            :type="type"
            v-bind="$attrs"
            @blur="widget.blur"
            @change="widget.makeDirty"
            @focus="widget.focus"
        />
        <span v-if="$slots.suffix" :class="combinedClasses.suffixClass">
            <slot name="suffix" />
        </span>
    </div>
</template>
