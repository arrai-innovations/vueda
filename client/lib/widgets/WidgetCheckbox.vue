<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import ToggleSwitch from "primevue/toggleswitch";
import { useSlots } from "vue";

/**
 * A boolean toggle widget rendered as a toggle switch. Integrates with the widget context to
 * provide label, validation state, and disabled/read-only behavior.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetCheckbox", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-checkbox-root">
        <div :class="theme('inner')" data-qa="widget-checkbox-inner">
            <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
                <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
                <template #default="{ class: labelControlClass }">
                    <ToggleSwitch
                        v-model="widgetContext.state.combinedValue"
                        :class="combineClasses(theme('input'), labelControlClass)"
                        v-bind="omit($attrs, 'value')"
                        :disabled="widgetContext.state.disabled"
                        :input-id="widgetContext.state.widgetId"
                        :invalid="widgetContext.state.validationState.invalid"
                        :name="widgetContext.state.combinedName"
                        :pt="effectivePt"
                        type="checkbox"
                        :aria-required="widgetContext.state.required && widgetContext.state.value === null"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                    />
                </template>
            </widget-label>
        </div>
    </div>
</template>
