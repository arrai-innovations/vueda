<script setup>
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import WidgetMultiSelect from "@vueda/widgets/WidgetMultiSelect.vue";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import omit from "lodash-es/omit.js";
import { computed, ref, toRef } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    fieldApp: {
        type: String,
        required: true,
    },
    fieldModel: {
        type: String,
        required: true,
    },
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    fieldName: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    modelValue: {
        type: [String, Number, Array],
        default: undefined,
    },
    isFilter: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const isActive = useIsActive();
const hasBeenFocused = ref(false);
const intendToFetch = computed(() => {
    return widgetContext.state.combinedValue || hasBeenFocused.value;
});
const modelChoices = useModelChoices(
    toRef(props, "fieldApp"),
    toRef(props, "fieldModel"),
    toRef(props, "fieldName"),
    isActive,
    intendToFetch,
    toRef(props, "isFilter"),
);
const widgetComponents = {
    select: WidgetSelect,
    multiSelect: WidgetMultiSelect,
    radio: WidgetRadio,
};
const onFocus = () => {
    hasBeenFocused.value = true;
};
const widgetComponent = computed(() => widgetComponents[props.type]);
</script>
<template>
    <component
        :is="widgetComponent"
        :loading="modelChoices.loading"
        :model-value="modelValue"
        :on-focus="onFocus"
        option-label="label"
        option-value="value"
        :options="modelChoices.choices?.results || []"
        v-bind="omit($attrs, 'value')"
        @update:model-value="emit('update:modelValue', $event)"
    />
</template>
