<script setup>
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    hidden: {
        type: Boolean,
        default: false,
    },
    id: {
        type: String,
        default: undefined,
    },
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
// traditional id points to input
const computedFor = computed(() => (props.id ? props.id : widgetContext.state.widgetId));
// aria-labelledby points to label
const computedId = computed(() => (!props.id ? widgetContext.state.widgetId : undefined));
</script>
<template>
    <label :id="computedId" :class="labelClass" :for="computedFor" :hidden="hidden" v-bind="$attrs">
        <slot id="computedId" :for="computedFor" :label="widgetContext.state.combinedLabel" name="label">{{
            widgetContext.state.combinedLabel
        }}</slot>
    </label>
    <slot></slot>
</template>
