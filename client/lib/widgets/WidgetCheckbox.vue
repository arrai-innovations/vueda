<script setup>
import FormLabel from "@vueda/components/FormLabel.vue";
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...widgetProps,
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
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetCheckbox.vue", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <input
            v-model="widget.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widget.combinedName"
            type="checkbox"
            v-bind="$attrs"
            @change="widget.makeDirty"
        />
        <form-label :class="combinedClasses.labelClass" :for="widget.combinedName" :label="props.label">
            <template #default="{ label: widgetLabel, for: forName }">
                <slot :for="forName" :label="widgetLabel" name="default"></slot>
            </template>
        </form-label>
    </div>
</template>
