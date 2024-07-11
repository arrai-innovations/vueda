<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import InputSwitch from "primevue/inputswitch";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    label: {
        type: String,
        default: "",
    },
    variant: {
        type: String,
        default: "default",
    },
    inputClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetCheckbox", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.innerClass">
            <InputSwitch
                v-model="widgetContext.state.combinedValue"
                :name="widgetContext.state.combinedName"
                type="checkbox"
                v-bind="$attrs"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            />
            <label :class="combinedClasses.labelClass" :for="widgetContext.state.combinedName">
                <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </label>
        </div>
    </div>
</template>
