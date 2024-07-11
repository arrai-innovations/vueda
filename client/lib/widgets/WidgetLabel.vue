<script setup>
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import FloatLabel from "primevue/floatlabel";
import { inject } from "vue";

defineProps({
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
</script>
<template>
    <component :is="useFloatingLabel ? FloatLabel : EmptyComponent">
        <slot v-if="useFloatingLabel" />
        <label :class="labelClass" :for="widgetContext.state.combinedName">
            <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label">{{
                widgetContext.state.combinedLabel
            }}</slot>
        </label>
        <slot v-if="!useFloatingLabel" />
    </component>
</template>
