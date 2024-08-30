<script setup>
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { inject } from "vue";

defineProps({
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    showLabel: {
        type: Boolean,
        default: true,
    },
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
</script>
<template>
    <label v-if="showLabel" :class="labelClass" :for="widgetContext.state.combinedName">
        <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label">{{
            widgetContext.state.combinedLabel
        }}</slot>
    </label>
    <slot></slot>
</template>
