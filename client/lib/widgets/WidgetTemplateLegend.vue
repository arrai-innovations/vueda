<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import ClickToCopyText from "@vueda/components/ClickToCopyText.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import { useSlots } from "vue";

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

const theme = useWidgetTheme("WidgetTemplateLegend", props);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-template-legend-root">
        <widget-label
            :for="widgetContext.state.widgetId"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            label-tag="div"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div
                    :class="combineClasses(theme('inner'), labelControlClass)"
                    data-qa="widget-template-legend-inner"
                    :id="widgetContext.state.widgetId"
                >
                    <slot name="default" :value="widgetContext.state.combinedValue">
                        <div v-if="widgetContext.state.combinedValue">
                            <p>These are the replacement tags available in text fields below:</p>
                            <ul data-qa="widget-template-legend-list">
                                <li
                                    v-for="(value, key) in widgetContext.state.combinedValue"
                                    :key="key"
                                    :class="theme('listItem')"
                                    data-qa="widget-template-legend-list-item"
                                >
                                    {{ value.description }}:
                                    <ClickToCopyText :text="`$${key}`" />
                                </li>
                            </ul>
                        </div>
                    </slot>
                </div>
            </template>
        </widget-label>
    </div>
</template>
