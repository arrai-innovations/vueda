<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import get from "lodash-es/get.js";
import AutoComplete from "primevue/autocomplete";
import { computed, reactive, ref, toRef, unref } from "vue";

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
    optionLabel: {
        type: String,
        default: "formatted_name",
    },
    optionValue: {
        type: String,
        default: "USE_PK",
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetAutoComplete", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const listSearch = ref("");
const selectedValue = ref(null);

const computedPkKey = computed(() => modelConfig.info?.pk ?? "id");
const computedOptionValue = computed(() => {
    if (props.optionValue === "USE_PK") {
        return computedPkKey.value;
    }
    return props.optionValue;
});

const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {},
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    listArgs: {
        f: computed(() => props.modelFields ?? [unref(computedOptionValue), props.optionLabel]),
        [props.searchKey]: listSearch,
        id: computed(() => {
            if (!listSearch.value) {
                return selectedValue.value ?? undefined;
            }
            return undefined;
        }),
    },
    intendToList: computed(() => !!listSearch.value || !!widgetContext.state.combinedValue),
});
const modelListInstance = useList({
    props: modelListProps,
    functions: {
        list: allPagePaginatedListCrudAdaptor,
    },
    paged: true,
    keepOldPages: true,
    clearListOnListIntentTriggered: false,
});
const filteredOptions = computed(() => {
    if (modelListInstance.state.loading) {
        return [];
    }
    return Object.entries(modelListInstance.state.objects).map(([, obj]) => ({
        value: get(obj, unref(computedOptionValue)),
        label: get(obj, props.optionLabel),
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
        {{ modelListProps }}
        <widget-label
            :hidden="hidden"
            :label-class="theme('label')"
            v-bind="unref(widgetContext.state.validationState)"
        >
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                {{ modelListInstance.state.loading }}
                {{ modelListInstance.state.objectInOrder }}
                {{ filteredOptions }}
                <AutoComplete
                    :disabled="widgetContext.state.disabled"
                    force-selection
                    :input-id="widgetContext.state.widgetId"
                    :invalid="widgetContext.state.validationState.invalid"
                    :loading="modelListInstance.state.loading"
                    :model-value="modelItem"
                    :name="widgetContext.state.combinedName"
                    :option-label="optionLabel"
                    :option-value="computedOptionValue"
                    :pt="effectivePt"
                    :suggestions="filteredOptions"
                    v-bind="$attrs"
                    @blur="widgetContext.blur"
                    @complete="search"
                    @focus="widgetContext.focus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
