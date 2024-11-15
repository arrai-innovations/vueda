<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import ToggleSwitch from "primevue/toggleswitch";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetCheckbox", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <ToggleSwitch
                v-model="widgetContext.state.combinedValue"
                v-bind="$attrs"
                :disabled="widgetContext.state.disabled"
                :input-id="widgetContext.state.widgetId"
                :invalid="widgetContext.state.validationState.invalid"
                :name="widgetContext.state.combinedName"
                :pt="effectivePt"
                type="checkbox"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <widget-label
                v-if="!hidden"
                :for="widgetContext.state.widgetId"
                :invalid="widgetContext.state.validationState.invalid"
                :label-class="theme('label')"
                :warning="widgetContext.state.validationState.warning"
            >
                <template #label="slotProps">
                    <slot name="label" v-bind="slotProps" />
                </template>
            </widget-label>
        </div>
    </div>
</template>
