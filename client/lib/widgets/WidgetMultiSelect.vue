<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import MultiSelect from "primevue/multiselect";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
    label: {
        type: String,
        default: "",
    },
    variant: {
        type: String,
        default: "default",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetAutoComplete, widgetContext.state);
</script>
<template>
    <div :class="theme('root')">
        <MultiSelect
            v-model="widgetContext.state.combinedValue"
            class="w-full md:w-80"
            display="chip"
            filter
            loading
            :max-selected-labels="3"
            option-label="label"
            :options="props.options"
        />
    </div>
</template>
