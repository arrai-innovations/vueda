<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import PrimevueTextarea from "primevue/textarea";
// don't shadow html element names
import { useSlots } from "vue";

/**
 * Renders a multi-line text input (PrimeVue Textarea) with auto-resize, a label, and validation state.
 * Integrates with the vueda widget system for field state management.
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
const theme = useWidgetTheme("WidgetTextarea", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-textarea-inner">
                    <primevue-textarea
                        :id="widgetContext.state.widgetId"
                        v-bind="omit($attrs, 'value')"
                        v-model="widgetContext.state.combinedValue"
                        auto-resize
                        :disabled="widgetContext.state.disabled"
                        :invalid="widgetContext.state.validationState.invalid"
                        :name="widgetContext.state.combinedName"
                        :pt="effectivePt"
                        :aria-required="widgetContext.state.required"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
