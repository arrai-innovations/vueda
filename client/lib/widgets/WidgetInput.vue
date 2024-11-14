<script setup>
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import { getPrimeVuePreset } from "@vueda/theme/register.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputGroup from "primevue/inputgroup";
import InputMask from "primevue/inputmask";
import InputOtp from "primevue/inputotp";
import InputText from "primevue/inputtext";
import { usePassThrough } from "primevue/passthrough";
import { computed, ref, unref, useAttrs, watchEffect } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    type: {
        type: String,
        default: "text",
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const inputComponent = computed(
    () =>
        ({
            text: InputText,
            number: InputText, // Not using InputNumber because it doesn't update the v-model on @input
            otp: InputOtp,
            mask: InputMask,
        })[props.type] || InputText,
);

const theme = useTheme("WidgetInput", props, widgetContext.state);
const widgetPt = usePassThrough(
    getPrimeVuePreset(),
    {
        root: {
            class: [
                {
                    "p-warning": computed(() => widgetContext.state.validationState.warning),
                },
                theme("inputRoot"),
            ],
        },
    },
    {
        mergeSections: true,
        mergeProps: true,
    },
);
const attrs = useAttrs();
const widgetEffectivePt = ref();
watchEffect(() => {
    if (attrs.pt) {
        widgetEffectivePt.value = usePassThrough(widgetPt, attrs.pt, {
            mergeSections: true,
            mergeProps: true,
        });
    } else {
        widgetEffectivePt.value = widgetPt;
    }
});
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :for="widgetContext.state.widgetId"
            :hidden="hidden"
            :label-class="theme('label')"
            v-bind="unref(widgetContext.state.validationState)"
        >
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <component :is="$slots.prefix || $slots.suffix ? InputGroup : EmptyComponent">
                    <slot v-if="$slots.prefix" name="prefix" />
                    <component
                        :is="inputComponent"
                        v-if="inputComponent"
                        v-bind="$attrs"
                        :id="widgetContext.state.widgetId"
                        v-model="widgetContext.state.combinedValue"
                        :disabled="widgetContext.state.disabled"
                        :invalid="widgetContext.state.validationState.invalid"
                        :name="widgetContext.state.combinedName"
                        :pt="widgetEffectivePt"
                        :type="type"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                    />
                    <slot v-if="$slots.suffix" name="suffix" />
                </component>
            </div>
        </widget-label>
    </div>
</template>
