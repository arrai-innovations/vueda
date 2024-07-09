<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    selectClass: {
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
const combinedClasses = useCombinedClasses("WidgetSelect", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <span v-if="$slots.prefix" :class="combinedClasses.prefixClass">
            <slot name="prefix" />
        </span>
        <select
            v-model="widget.combinedValue"
            :class="combinedClasses.selectClass"
            :name="widget.combinedName"
            v-bind="$attrs"
            @blur="widget.blur"
            @change="widget.makeDirty"
            @focus="widget.focus"
        >
            <option v-for="option in props.options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
        <span v-if="$slots.suffix" :class="combinedClasses.suffixClass">
            <slot name="suffix" />
        </span>
    </div>
</template>
