<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import ToggleSwitch from "primevue/toggleswitch";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetCheckbox", widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <ToggleSwitch
                v-model="widgetContext.state.combinedValue"
                :name="widgetContext.state.combinedName"
                type="checkbox"
                v-bind="$attrs"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <label v-if="!hidden" :class="theme('label')" :for="widgetContext.state.combinedName">
                <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </label>
        </div>
    </div>
</template>
