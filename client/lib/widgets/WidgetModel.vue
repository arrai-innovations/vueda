<script setup>
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import widgetMultiSelect from "@vueda/widgets/WidgetMultiSelect.vue";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
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
    multiSelect: widgetMultiSelect,
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
        v-bind="$attrs"
        :loading="modelChoices.loading"
        :on-focus="onFocus"
        :options="modelChoices.choices?.results || []"
    />
</template>
