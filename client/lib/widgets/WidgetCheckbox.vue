<script setup>
import FormLabel from "../components/FormLabel.vue";
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "../use/useWidget.js";

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
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetCheckbox", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <input
            v-model="widget.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widget.combinedName"
            type="checkbox"
            v-bind="$attrs"
            @blur="widget.blur"
            @change="widget.makeDirty"
            @focus="widget.focus"
        />
        <form-label :class="combinedClasses.labelClass" :for="widget.combinedName" :label="props.label">
            <template #default="{ label: widgetLabel, for: forName }">
                <slot :for="forName" :label="widgetLabel" name="default"></slot>
            </template>
        </form-label>
    </div>
</template>
