<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import AutoComplete from "primevue/autocomplete";
import { computed, ref } from "vue";

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

const filteredOptions = ref();

const modelItem = computed(() => {
    if (props.options && props.options.length > 0) {
        const match = props.options.find((option) => option.value === widgetContext.state.combinedValue);
        return match ?? widgetContext.state.combinedValue;
    }
    return undefined;
});

const valueUpdated = (selected) => {
    if (selected && typeof selected === "object" && "value" in selected) {
        widgetContext.state.combinedValue = selected.value;
    } else if (props.multiple && selected && selected.length) {
        const selectedIds = selected.flatMap((i) => i.value);
        widgetContext.state.combinedValue = selectedIds;
    } else {
        widgetContext.state.combinedValue = selected;
    }
};

const search = (event) => {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredOptions.value = [...props.options];
        } else {
            filteredOptions.value = props.options.filter((v) => {
                return v.label.toLowerCase().startsWith(event.query.toLowerCase());
            });
        }
    }, 250);
};
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <label :class="theme('label')" :for="widgetContext.state.combinedName">
                <slot :for="widgetContext.state.combinedName" :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </label>
            <AutoComplete
                dropdown
                v-bind="$attrs"
                force-selection
                :model-value="modelItem"
                :name="widgetContext.state.combinedName"
                option-label="label"
                :suggestions="filteredOptions"
                @blur="widgetContext.blur"
                @complete="search"
                @focus="widgetContext.focus"
                @update:model-value="(selected) => valueUpdated(selected)"
            >
            </AutoComplete>
        </div>
    </div>
</template>
