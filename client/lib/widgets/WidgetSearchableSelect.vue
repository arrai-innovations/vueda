<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Dropdown from "primevue/dropdown";
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
        default: "id",
    },
    optionLabel: {
        type: String,
        default: "formatted_name",
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    placeholder: {
        type: String,
        default: undefined,
    },
    pageKey: {
        type: String,
        default: "p",
    },
});
const fetchedPages = ref(1);
const hasBeenFocused = ref(false);
const intendToList = computed(() => {
    return widgetContext.state.combinedValue || hasBeenFocused.value;
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetSearchableSelect, widgetContext.state);
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
        [props.pageKey]: fetchedPages,
        [props.searchKey]: listSearch,
        [pkKey.value]: computed(() => {
            if (!listSearch.value?.length) {
                return widgetContext.state.combinedValue ?? undefined;
            }
            return undefined;
        }),
    },
    intendToList,
});
const handleFocus = () => {
    hasBeenFocused.value = true;
    widgetContext.focus();
};
const callableOptionLabel = computed(() => {
    return typeof props.optionLabel === "function";
});
const modelList = useList({
    props: modelListProps,
    paged: true,
    keepOldPages: true,
});
watch(
    [toRef(props, "options")],
    ([options]) => {
        if (options) {
            modelList.managed.listInstance.clearList(); // TODO
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
const handleFilter = (event) => {
    fetchedPages.value = 1;
    listSearch.value = event.value;
};
const placeHolderText = computed(() => {
    return props.placeholder || `Select a ${props.model}`;
});
const perPage = computed(() => {
    return modelList.state?.perPage ?? 100;
});
const onLazyLoad = (event) => {
    if (event.last >= fetchedPages.value * perPage.value && event.last < modelList.state.totalRecords) {
        fetchedPages.value += 1;
    }
};
const onValueChange = () => {
    listSearch.value = "";
    fetchedPages.value = 1;
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <Dropdown
                    v-model="widgetContext.state.combinedValue"
                    v-bind="$attrs"
                    filter
                    :option-label="props.optionLabel"
                    :option-value="pkKey"
                    :options="modelList.state.objectsInOrder"
                    :placeholder="placeHolderText"
                    reset-filter-on-clear
                    show-clear
                    :virtual-scroller-options="{
                        class: '[&_ul]:w-full',
                        showSpacer: false,
                        lazy: true,
                        onLazyLoad: onLazyLoad,
                        itemSize: 38,
                        showLoader: true,
                        loading: modelList.state.loading,
                    }"
                    @blur="widgetContext.blur"
                    @change="onValueChange"
                    @filter="handleFilter"
                    @focus="handleFocus"
                >
                </Dropdown>
            </div>
        </widget-label>
    </div>
</template>
