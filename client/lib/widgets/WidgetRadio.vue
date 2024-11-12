<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import RadioButton from "primevue/radiobutton";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
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
    onFocus: {
        type: Function,
        default: () => {},
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetRadio", props, widgetContext.state);
const computedOptions = computed(() => {
    return props.options.map((option) => {
        return {
            label: option[props.optionLabel],
            value: option[props.optionValue],
        };
    });
});
const handleFocus = () => {
    widgetContext.focus();
    props.onFocus();
};
</script>

<template>
    <div :class="theme('root')">
        <widget-label :id="`${widgetContext.state.widgetId}-label`" :label-class="theme('optionLabel')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <ul :aria-labelledby="`${widgetContext.state.widgetId}-label`" :class="theme('options')">
                    <li v-for="option in computedOptions" :key="option.value" :class="theme('option')">
                        <slot
                            :id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :class="theme('optionInput')"
                            :input-name="widgetContext.state.combinedName"
                            :model-value="widgetContext.state.combinedValue"
                            :name="$slots[`radio(${option.value})`] ? `radio(${option.value})` : 'radio'"
                            :value="option.value"
                            @update:model-value="widgetContext.state.combinedValue = $event"
                        >
                            <radio-button
                                v-model="widgetContext.state.combinedValue"
                                :class="theme('optionInput')"
                                :disabled="widgetContext.state.disabled"
                                :input-id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                :name="widgetContext.state.combinedName"
                                :value="option.value"
                                v-bind="{
                                    invalid: widgetContext.state.validationState.invalid,
                                    class: {
                                        'p-warning': widgetContext.state.validationState.warning,
                                    },
                                    ...$attrs,
                                }"
                                @blur="widgetContext.blur"
                                @focus="handleFocus"
                            />
                        </slot>
                        <slot
                            :class="theme('optionLabel')"
                            :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :label="option.label"
                            :name="$slots[`label(${option.value})`] ? `label(${option.value})` : 'label'"
                        >
                            <label
                                :class="[theme('optionLabel')]"
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
