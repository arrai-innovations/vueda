<script setup>
import "@vueda/theme/vueda-tailwind/widgets/WidgetGenericAutoComplete.theme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetCombobox from "@vueda/widgets/WidgetCombobox.vue";
import omit from "lodash-es/omit.js";
import { computed, ref } from "vue";

/**
 * A generic foreign-key widget for Django content-type style relations. Renders a type selector
 * combobox paired with an object search combobox, storing a
 * `{ content_type, object_id }` value pair.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Django app label used to identify the target model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name within the app used to identify the target model. */
    model: {
        type: String,
        required: true,
    },
    /** List of field names to request from the API when searching for autocomplete suggestions. */
    modelFields: {
        type: Array,
        required: true,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

// TODO: dropdownOptions should be fetched from the API (models with GenericRelations)
const dropdownOptions = ref([
    { label: "Task", value: "contentTypeID1" },
    { label: "Inventory", value: "contentTypeID2" },
    { label: "WarehouseLocation", value: "contentTypeID3" },
    { label: "OrderItem", value: "contentTypeID4" },
    { label: "TimeSheet", value: "contentTypeID5" },
    { label: "Project", value: "contentTypeID6" },
]);

// TODO: app and model should be resolved from the selected content type
const typeValue = computed(() => widgetContext.state.combinedValue?.content_type ?? null);
const objectValue = computed(() => widgetContext.state.combinedValue?.object_id ?? null);

const typeUpdate = (selected) => {
    widgetContext.state.combinedValue = {
        ...widgetContext.state.combinedValue,
        content_type: selected,
    };
};

const objectUpdated = (selected) => {
    widgetContext.state.combinedValue = {
        ...widgetContext.state.combinedValue,
        object_id: selected,
    };
};

const objectPlaceholder = computed(() => {
    if (typeValue.value == null) {
        return "";
    }
    const opt = dropdownOptions.value.find((o) => o.value === typeValue.value);
    return opt ? `Search for a ${opt.label}...` : "";
});
</script>
<template>
    <div class="flex gap-2" v-bind="omit($attrs, 'value')">
        <WidgetCombobox
            contextless
            :model-value="typeValue"
            option-label="label"
            option-value="value"
            :options="dropdownOptions"
            placeholder="Select a model"
            @update:model-value="typeUpdate"
        />
        <WidgetCombobox
            :app="props.app"
            contextless
            :disabled="widgetContext.state.disabled || typeValue == null"
            :model="props.model"
            :model-fields="props.modelFields"
            :model-value="objectValue"
            :placeholder="objectPlaceholder"
            @update:model-value="objectUpdated"
        />
    </div>
</template>
