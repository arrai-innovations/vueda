<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import ToggleSwitch from "primevue/toggleswitch";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetCheckbox", props, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <ToggleSwitch
                v-model="widgetContext.state.combinedValue"
                v-bind="$attrs"
                :disabled="widgetContext.state.disabled"
                :input-id="widgetContext.state.widgetId"
                :name="widgetContext.state.combinedName"
                type="checkbox"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <label v-if="!hidden" :class="theme('label')" :for="widgetContext.state.widgetId">
                <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label"
                    >{{ widgetContext.state.combinedLabel }}
                </slot>
            </label>
        </div>
    </div>
</template>
