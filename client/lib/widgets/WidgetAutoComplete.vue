<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import AutoComplete from "primevue/autocomplete";
import { computed, reactive, ref, toRef } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
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
        default: () => [],
    },
    searchKey: {
        type: String,
        default: "s",
    },
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetAutoComplete", widgetContext.state);
const listSearch = ref("");
const selectedValue = ref(null);

const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        list: allPagePaginatedListCrudAdaptor,
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
const modelItem = computed(() => {
    let match = null;
    if (filteredOptions.value && filteredOptions.value.length > 0) {
        match = filteredOptions.value?.find((option) => option.value == widgetContext.state.combinedValue);
    }
    return match ?? widgetContext.state.combinedValue;
});
const valueUpdated = (selected) => {
    if (selected && typeof selected === "object" && "value" in selected) {
        widgetContext.state.combinedValue = selected.value;
        selectedValue.value = selected.value;
    } else if (props.multiple && selected && selected.length) {
        const selectedIds = selected.flatMap((i) => i.value);
        widgetContext.state.combinedValue = selectedIds;
        selectedValue.value = null;
    } else {
        widgetContext.state.combinedValue = selected;
        selectedValue.value = null;
    }
};
const search = (event) => {
    setTimeout(() => {
        if (event.query.trim().length) {
            listSearch.value = event.query;
        }
    }, 250);
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <AutoComplete
                    v-bind="$attrs"
                    force-selection
                    :loading="modelListInstance.state.loading"
                    :model-value="modelItem"
                    :name="widgetContext.state.combinedName"
                    option-label="label"
                    :suggestions="filteredOptions"
                    @blur="widgetContext.blur"
                    @complete="search"
                    @focus="widgetContext.focus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
