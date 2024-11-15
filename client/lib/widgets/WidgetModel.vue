<script setup>
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import WidgetMultiSelect from "@vueda/widgets/WidgetMultiSelect.vue";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import { computed, ref, toRef } from "vue";

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
        :on-focus="onFocus"
        option-label="label"
        option-value="value"
        :options="modelChoices.choices?.results || []"
    />
</template>
