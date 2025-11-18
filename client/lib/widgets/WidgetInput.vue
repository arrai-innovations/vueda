<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import InputGroup from "primevue/inputgroup";
import InputMask from "primevue/inputmask";
import InputNumber from "primevue/inputnumber";
import InputOtp from "primevue/inputotp";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import { computed, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    type: {
        type: String,
        default: "text",
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const inputComponent = computed(
    () =>
        ({
            password: Password,
            text: InputText,
            number: InputNumber,
            otp: InputOtp,
            mask: InputMask,
        })[props.type] || InputText,
);

const theme = useWidgetTheme("WidgetInput", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-input-root">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-input-inner">
                    <component :is="$slots.prefix || $slots.suffix ? InputGroup : EmptyComponent">
                        <slot v-if="$slots.prefix" name="prefix" />
                        <component
                            :is="inputComponent"
                            v-if="inputComponent"
                            v-bind="omit($attrs, 'value')"
                            :id="inputComponent === InputText ? widgetContext.state.widgetId : undefined"
                            v-model="widgetContext.state.combinedValue"
                            :disabled="widgetContext.state.disabled"
                            :input-id="inputComponent !== InputText ? widgetContext.state.widgetId : undefined"
                            :invalid="widgetContext.state.validationState.invalid"
                            :name="widgetContext.state.combinedName"
                            :pt="effectivePt"
                            :type="type"
                            :aria-required="widgetContext.state.required"
                            @blur="widgetContext.blur"
                            @focus="widgetContext.focus"
                        />
                        <slot v-if="$slots.suffix" name="suffix" />
                    </component>
                </div>
            </template>
        </widget-label>
    </div>
</template>
