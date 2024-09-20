<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import AutoComplete from "primevue/autocomplete";
import { computed, reactive, ref, toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    app: {
        type: String,
        default: undefined,
    },
    model: {
        type: String,
        default: undefined,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    searchKey: {
        type: String,
        default: "s",
    },
    options: {
        type: Array,
        default: undefined,
    },
    optionValue: {
        type: String,
        default: "value",
    },
    optionLabel: {
        type: String,
        default: "formatted_name",
    },
    multiple: {
        type: Boolean,
        default: false,
    },
});
const autoCompleteShown = ref(false);
const autoCompleteModelValue = ref(null);
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetAutoComplete, widgetContext.state);
const listSearch = ref("");
const pkKey = computed(() => modelConfig.info?.pk ?? "id");
const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        list: allPagePaginatedListCrudAdaptor,
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    pkKey,
    listArgs: {
        [props.searchKey]: listSearch,
        [pkKey]: computed(() => {
            if (!listSearch.value) {
                return widgetContext.state.combinedValue ?? undefined;
            }
            return undefined;
        }),
    },
    intendToList: computed(
        () => !props.options && autoCompleteShown.value && (listSearch.value || widgetContext.state.combinedValue),
    ),
});
const callableOptionLabel = computed(() => {
    return typeof props.optionLabel === "function";
});
const modelList = useList({
    props: modelListProps,
});
watch(
    [toRef(props, "options")],
    ([options]) => {
        if (options) {
            modelList.managed.listInstance.clearList();
            modelList.managed.listInstance.pageCallback(props.options);
            if (!modelListProps.textSearchRules) {
                if (callableOptionLabel.value) {
                    throw new Error(
                        "Cannot use options with a function for optionLabel when" + " using hardcoded options.",
                    );
                }
                modelListProps.textSearchRules = [props.optionLabel];
                modelListProps.textSearchValue = listSearch;
            }
        } else {
            if (modelListProps.textSearchRules) {
                modelListProps.textSearchRules = undefined;
                modelListProps.textSearchValue = undefined;
            }
        }
    },
    {
        immediate: true,
    },
);

const handleComplete = (event) => {
    // complete = "Callback to invoke to search for suggestions."
    if (event.query.trim().length) {
        listSearch.value = event.query;
    }
};
const handleItemSelect = (event) => {
    // we don't want the form to submit when the user selects an item.
    if (event.originalEvent && event.originalEvent.type === "keydown") {
        event.originalEvent.preventDefault();
    }
    const value = event.value[pkKey.value];
    if (props.multiple) {
        if (!widgetContext.state.combinedValue) {
            widgetContext.state.combinedValue = [];
        }
        widgetContext.state.combinedValue.push(value);
    } else {
        widgetContext.state.combinedValue = value;
    }
};
const handleItemUnselect = (event) => {
    // we don't want the form to submit when the user selects an item.
    if (event.originalEvent && event.originalEvent.type === "keydown") {
        event.originalEvent.preventDefault();
    }
    // this should only happen if props.multiple is true.
    const value = event.value[pkKey.value];
    // noinspection EqualityComparisonWithCoercionJS
    widgetContext.state.combinedValue = widgetContext.state.combinedValue.filter((v) => v != value);
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
                    v-model="autoCompleteModelValue"
                    :data-key="props.optionValue"
                    force-selection
                    :loading="modelList.state.loading"
                    :multiple="props.multiple"
                    :name="widgetContext.state.combinedName"
                    :option-label="props.optionLabel"
                    :suggestions="modelList.state.objectsInOrder"
                    @blur="widgetContext.blur"
                    @complete="handleComplete"
                    @focus="widgetContext.focus"
                    @hide="autoCompleteShown = false"
                    @item-select="handleItemSelect"
                    @item-unselect="handleItemUnselect"
                    @show="autoCompleteShown = true"
                />
            </div>
        </widget-label>
    </div>
</template>
