<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import InputSwitch from "primevue/inputswitch";
import { computed, inject } from "vue";

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
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetCheckbox", props);
const computedFor = computed(() => props.name || widgetContext.name);
const computedLabel = computed(() => (props.label?.length ? props.label : fieldContext.label));
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <InputSwitch
            v-model="widgetContext.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widgetContext.combinedName"
            type="checkbox"
            v-bind="$attrs"
            @blur="widgetContext.blur"
            @change="widgetContext.makeDirty"
            @focus="widgetContext.focus"
        />
        <label :class="combinedClasses.labelClass" :for="computedFor">
            <slot :for="computedFor" :label="computedLabel" name="label">{{ computedLabel }}</slot>
        </label>
    </div>
</template>
