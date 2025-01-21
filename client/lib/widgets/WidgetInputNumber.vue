<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import InputGroup from "primevue/inputgroup";
import { computed, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
    min: {
        type: Number,
        default: undefined,
    },
    max: {
        type: Number,
        default: undefined,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const theme = useWidgetTheme("WidgetInputNumber", props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
const allowMinusSign = computed(() => {
    return props.min === undefined || props.min < 0;
});

const onInputKeyDown = (event) => {
    const char = event.key;
    const isMinusSign = char === "-";
    if (isMinusSign && !allowMinusSign.value) {
        event.preventDefault();
        return false;
    }
};

const onPaste = (event) => {
    const data = (event.clipboardData || window["clipboardData"]).getData("Text");
    if (data) {
        if (!allowMinusSign.value && data.includes("-")) {
            // This mimic the behavior of primevue inputnumber, but is this the best way to handle this?
            event.preventDefault();
        }
    }
};
</script>

<template>
    <div :class="theme('root')" data-qa="widget-label-root">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-input-inner">
                    <component :is="$slots.prefix || $slots.suffix ? InputGroup : EmptyComponent">
                        <slot v-if="$slots.prefix" name="prefix" />
                        <input
                            :id="widgetContext.state.widgetId"
                            v-model="widgetContext.state.combinedValue"
                            :aria-invalid="widgetContext.state.validationState.invalid"
                            :class="theme('input')"
                            :disabled="widgetContext.state.disabled"
                            :max="props.max"
                            :min="props.min"
                            :name="widgetContext.state.combinedName"
                            v-bind="omit($attrs, 'value')"
                            type="number"
                            @blur="widgetContext.blur"
                            @focus="widgetContext.focus"
                            @keydown="onInputKeyDown"
                            @paste="onPaste"
                        />
                        <slot v-if="$slots.suffix" name="suffix" />
                    </component>
                </div>
            </template>
        </widget-label>
    </div>
</template>
