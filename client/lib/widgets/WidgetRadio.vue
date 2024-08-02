<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import RadioButton from "primevue/radiobutton";
import { computed } from "vue";

const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
    optionLabel: {
        type: String,
        default: "label",
    },
    optionValue: {
        type: String,
        default: "value",
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetRadio, widgetContext.state);
const computedOptions = computed(() => {
    return props.options.map((option) => {
        return {
            ...option,
            label: option[props.optionLabel],
            value: option[props.optionValue],
        };
    });
});
</script>

<template>
    <div :class="theme('root')">
        <widget-label :label-class="theme('optionLabel')" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <ul :class="theme('options')">
                    <li v-for="option in computedOptions" :key="option.value" :class="theme('option')">
                        <slot
                            :id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :class="theme('optionInput')"
                            :name="$slots[`radio(${option.value})`] ? `radio(${option.value})` : 'radio'"
                            :option="option"
                            :widget-context="widgetContext"
                        >
                            <radio-button
                                v-model="widgetContext.state.combinedValue"
                                :class="theme('optionInput')"
                                :input-id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                :name="widgetContext.state.combinedName"
                                :value="option.value"
                                @blur="widgetContext.blur"
                                @focus="widgetContext.focus"
                            />
                        </slot>
                        <slot
                            :class="theme('optionLabel')"
                            :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :label="option.label"
                            :name="$slots[`label(${option.value})`] ? `label(${option.value})` : 'label'"
                        >
                            <label
                                :class="theme('optionLabel')"
                                :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                >{{ option.label }}</label
                            >
                        </slot>
                    </li>
                </ul>
            </div>
        </widget-label>
    </div>
</template>
