<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import AutoComplete from "primevue/autocomplete";
import Select from "primevue/select";
import { computed, reactive, ref, toRef, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        required: true,
    },
    searchKey: {
        type: String,
        default: "s",
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetGenericAutoComplete", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const listSearch = ref("");
const selectedValue = ref(null);

// TODO: the app and model here should be matched from the selected content type
const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    listArgs: {
        [props.searchKey]: listSearch,
        id: computed(() => {
            if (!listSearch.value) {
                return selectedValue.value ?? undefined;
            }
            return undefined;
        }),
    },
    intendToList: computed(() => listSearch.value || widgetContext.state.combinedValue),
});
const modelListInstance = useList({
    props: modelListProps,
    functions: {
        list: allPagePaginatedListCrudAdaptor,
    },
    paged: true,
    keepOldPages: false,
    clearListOnListIntentTriggered: false,
});
const filteredOptions = computed(() => {
    if (modelListInstance.state.loading) {
        return [];
    }
    return Object.entries(modelListInstance.state.objects).map(([id, obj]) => ({
        value: id,
        label: obj.formatted_name,
    }));
});

/*
Assuming that the value will look like this:
{
    content_type: "id",
    object_id: "id",
}
 */
const selectedObject = reactive({
    content_type: null,
    object_id: null,
});
const contentObject = computed(() => {
    let match = null;
    if (filteredOptions.value && filteredOptions.value.length > 0) {
        match = filteredOptions.value?.find((option) => option.value == widgetContext.state.combinedValue?.object_id);
    }
    return match ?? widgetContext.state.combinedValue?.object_id;
});
const objectUpdated = (selected) => {
    if (selected && typeof selected === "object" && "value" in selected) {
        selectedObject.object_id = selected.value;
        selectedValue.value = selected.value;
    } else if (props.multiple && selected && selected.length) {
        const selectedIds = selected.flatMap((i) => i.value);
        selectedObject.object_id = selectedIds;
        selectedValue.value = null;
    } else {
        selectedObject.object_id = selected;
        selectedValue.value = null;
    }
    widgetContext.state.combinedValue = selectedObject;
};
const search = (event) => {
    setTimeout(() => {
        if (event.query.trim().length) {
            listSearch.value = event.query;
        }
    }, 250);
};

const selectedType = computed(() => {
    let match = null;
    if (dropdownOptions.value && dropdownOptions.value.length > 0) {
        match = dropdownOptions.value?.find(
            (option) => option.value == widgetContext.state.combinedValue?.content_type,
        );
    }
    return match?.value ?? widgetContext.state.combinedValue?.content_type;
});
const typeUpdate = (selected) => {
    selectedObject.content_type = selected;
    widgetContext.state.combinedValue = selectedObject;
};

//Should go fetch for a lit of model that has GenericRelations?
// const dropdownOptions = ref([
//     {
//         label: 'Store',
//         code: 'ST',
//         items: [
//             { label: 'Task', value: 'contentTypeID1' },
//             { label: 'Inventory', value: 'contentTypeID2' },
//             { label: 'WarehouseLocation', value: 'contentTypeID3' },
//             { label: 'OrderItem', value: 'contentTypeID4' }
//         ]
//     },
//     {
//         label: 'Hr',
//         code: 'HR',
//         items: [
//             { label: 'TimeSheet', value: 'contentTypeID5' },
//             { label: 'Project', value: 'contentTypeID6' },
//         ]
//     }
// ]);

const dropdownOptions = ref([
    { label: "Task", value: "contentTypeID1" },
    { label: "Inventory", value: "contentTypeID2" },
    { label: "WarehouseLocation", value: "contentTypeID3" },
    { label: "OrderItem", value: "contentTypeID4" },
    { label: "TimeSheet", value: "contentTypeID5" },
    { label: "Project", value: "contentTypeID6" },
]);
const hintText = computed(() => {
    return selectedType.value ? `Type to select a ${selectedType.value}` : "";
});
const selectRef = ref(null);
const handleLabelClick = (e) => {
    if (selectRef.value) {
        selectRef.value.onContainerClick(e);
    }
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            @click="handleLabelClick"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <div :class="theme('dropdownOuter')">
                    <Select
                        ref="selectRef"
                        :aria-labelledby="widgetContext.state.widgetId"
                        :invalid="widgetContext.state.validationState.invalid"
                        :model-value="selectedType"
                        option-label="label"
                        option-value="value"
                        :options="dropdownOptions"
                        v-bind="$attrs"
                        placeholder="Select a model"
                        :pt="effectivePt"
                        show-clear
                        @update:model-value="(selected) => typeUpdate(selected)"
                    />
                </div>
                <div :class="theme('autoCompleteOuter')">
                    <AutoComplete
                        v-bind="$attrs"
                        :disabled="widgetContext.state.disabled || !selectedType"
                        force-selection
                        :invalid="widgetContext.state.validationState.invalid"
                        :loading="modelListInstance.state.loading"
                        :model-value="contentObject"
                        :name="widgetContext.state.combinedName"
                        option-label="label"
                        :placeholder="hintText"
                        :pt="effectivePt"
                        :suggestions="filteredOptions"
                        @blur="widgetContext.blur"
                        @complete="search"
                        @focus="widgetContext.focus"
                        @update:model-value="(selected) => objectUpdated(selected)"
                    />
                </div>
            </div>
        </widget-label>
    </div>
</template>
