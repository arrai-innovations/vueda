<script setup>
import { useList, useObject } from "@arrai-innovations/reactive-helpers";
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import cloneDeep from "lodash-es/cloneDeep.js";
import debounce from "lodash-es/debounce.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { computed, reactive, ref, toRef, useSlots, watch } from "vue";
import { deepUnref } from "vue-deepunref";

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
    fieldApp: {
        type: String,
        required: true,
    },
    fieldModel: {
        type: String,
        required: true,
    },
    fieldName: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    modelExpandFields: {
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
    selectedOptionLabel: {
        type: String,
        default: undefined,
        description: "The label to display when the value is set.",
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
    pkKey: {
        type: String,
        default: "id",
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    extraListArgs: {
        type: Object,
        default: () => ({}),
    },
    getExtraListArgs: {
        type: Function,
        default: undefined,
    },
    grouped: {
        type: Boolean,
        default: false,
        description:
            "If true, the options will be grouped by the groupBy field. isLazy is assumed to be true when grouped is true.",
    },
    groupBy: {
        type: String,
        default: undefined,
    },
    isLazy: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), ref("list"));
const selectRef = ref(null);
const fetchedPages = ref(1);
const hasBeenFocused = ref(false);
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const listFilterValue = ref("");
const prePopulatedSearchText = computed(() => {
    return widgetContext.state.valueDetail?.[props.optionLabel] || "";
});
const listSearch = computed(() => {
    if (listFilterValue.value.length > 0 ? listFilterValue.value === prePopulatedSearchText.value : false) {
        return "";
    }
    return listFilterValue.value;
});
const intendToList = computed(() => {
    return (!widgetContext.state.combinedValue || listSearch.value.length > 0) && hasBeenFocused.value;
});
const intendToRetrieve = computed(() => {
    return widgetContext.state.combinedValue;
});
const theme = useWidgetTheme("WidgetSearchableSelect", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: toRef(props, "pkKey"),
    pk: computed(() => widgetContext.state.combinedValue),
    retrieveArgs: {
        f: toRef(props, "modelFields"),
        e: toRef(props, "modelExpandFields"),
    },
    intendToRetrieve,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const extraListArgs = computed(() => {
    let baseExtraListArgs = {};
    if (props.getExtraListArgs) {
        baseExtraListArgs = props.getExtraListArgs(widgetContext.state.dependencyValues);
    }
    return {
        ...baseExtraListArgs,
        ...props.extraListArgs,
    };
});
const listArgs = computed(() => ({
    [props.pageKey]: fetchedPages,
    [props.searchKey]: listSearch,
    f: [
        computed(() => modelConfig.info?.pk),
        "formatted_name",
        computed(() => (props.grouped ? props.groupBy : "")),
        computed(() => props.selectedOptionLabel ?? ""),
    ],
    ...extraListArgs.value,
}));

const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    pkKey: toRef(props, "pkKey"),
    listArgs,
    intendToList,
});

const callableOptionLabel = computed(() => {
    return typeof props.optionLabel === "function";
});

const modelListFunctions = reactive({
    list: computed(() => {
        return props.isLazy || !props.grouped ? singlePagePaginatedListCrudAdaptor : allPagePaginatedListCrudAdaptor;
    }),
});

const useListParams = reactive({
    props: modelListProps,
    functions: modelListFunctions,
    paged: true,
    keepOldPages: computed(() => !props.isLazy),
    clearListOnListIntentTriggered: computed(() => props.isLazy),
});
const modelList = useList({
    ...useListParams,
});

const recordsArray = ref([]);

const lastScrollerPageTracks = reactive({
    first: 0,
    last: 0,
});

watch(
    [extraListArgs, () => listArgs.value.f, listSearch],
    ([newExtraArgs, newArgs, newSearch], [oldExtraArgs, oldArgs, oldSearch]) => {
        const IsExtraArgsDiff = isEqual(newExtraArgs, oldExtraArgs);
        const IsArgsDiff = isEqual(deepUnref(newArgs), deepUnref(oldArgs));
        const IsSearchDiff = isEqual(newSearch, oldSearch);
        if (!IsExtraArgsDiff || !IsArgsDiff || !IsSearchDiff) {
            fetchedPages.value = 1;
            if (props.isLazy) {
                recordsArray.value = [];
                lastScrollerPageTracks.first = 0;
                lastScrollerPageTracks.last = 0;
            } else {
                modelList.clearList();
                if (intendToList.value) {
                    modelList.list();
                }
            }
            const virtualScrollerRef = selectRef.value?.virtualScroller;
            if (virtualScrollerRef) {
                virtualScrollerRef.scrollTo({ top: 0 });
            }
        }
    },
    { deep: true, immediate: true },
);

watch(
    [
        () => modelList?.state?.loading,
        () => modelList?.state?.totalRecords,
        toRef(props, "isLazy"),
        toRef(props, "grouped"),
    ],
    ([newLoading, newTotalRecords, newIsLazy, newGrouped], [oldLoading, oldTotalRecords, oldIsLazy, oldGrouped]) => {
        const lazyChanged = !isEqual(newIsLazy, oldIsLazy);
        const groupedChanged = !isEqual(newGrouped, oldGrouped);
        const loadingChanged = !isEqual(newLoading, oldLoading);
        const totalRecordsChanged = !isEqual(newTotalRecords, oldTotalRecords);
        if (!lazyChanged && !groupedChanged && !loadingChanged && !totalRecordsChanged) {
            return;
        }

        if (loadingChanged && newLoading === false && modelList?.state?.objectsInOrder.length > 0) {
            if (!isEqual(newTotalRecords, recordsArray.value.length)) {
                recordsArray.value = Array(newTotalRecords).fill(undefined);
                lastScrollerPageTracks.first = 0;
                lastScrollerPageTracks.last = 0;
            }
            const startIndex = (fetchedPages.value - 1) * modelList?.state?.perPage;
            modelList?.state?.objectsInOrder.forEach((item, index) => {
                const targetIndex = startIndex + index;

                if (targetIndex < recordsArray.value.length) {
                    recordsArray.value[targetIndex] = cloneDeep(item);
                }
            });
        }
    },
    { deep: true, immediate: true },
);

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
                modelListProps.textSearchValue = listFilterValue;
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
const handleFilter = debounce((value) => {
    listFilterValue.value = value;
    fetchedPages.value = 1;
}, 500);

const placeHolderText = computed(() => {
    return props.placeholder || `Select a ${props.model}`;
});

const perPage = ref(100);

watch(
    [
        () => modelList.state?.totalPages,
        () => modelList.state?.perPage,
        () => modelList?.state?.loading,
        lastScrollerPageTracks,
    ],
    ([totalPages, numPerPage, loading, lastScrolled]) => {
        if (numPerPage && numPerPage > 0) {
            perPage.value = numPerPage;
        }
        if (loading && (totalPages === 0 || numPerPage === 0)) {
            return;
        }

        const newPage = Math.min(Math.ceil(lastScrolled.first / (numPerPage || 1)) + 1, totalPages ?? 1) || 1;
        const startIndex = (newPage - 1) * numPerPage;
        if (!recordsArray.value[startIndex]) {
            fetchedPages.value = newPage;
        }
    },
    { immediate: true, deep: true },
);
const onLazyLoad = (event) => {
    lastScrollerPageTracks.first = event.first;
    lastScrollerPageTracks.last = event.last;
};

const onValueChange = () => {
    if (!hasBeenFocused.value) {
        hasBeenFocused.value = true;
        widgetContext.blur();
    }
    recordsArray.value = [];

    fetchedPages.value = 1;
};
const computedLabel = computed(() => {
    return modelList.state.objectsInOrder.find((obj) => obj[props.optionValue] === widgetContext.state.combinedValue)?.[
        props.optionLabel
    ];
});
const handleLabelClick = (e) => {
    if (selectRef.value) {
        selectRef.value.onContainerClick(e);
    }
};

const listObjects = computed(() => {
    const objects = cloneDeep(modelList.state.objectsInOrder);
    if (props.grouped) {
        if (objects.length && modelList.state.totalRecords) {
            const grouped = objects.reduce((acc, item) => {
                const groupKey = item?.[props.groupBy];
                let group = acc.find((g) => g[props.groupBy] === groupKey);
                if (!group) {
                    group = { [props.groupBy]: groupKey, items: [] };
                    acc.push(group);
                }
                group.items.push({
                    [props.optionValue]: item?.[props.optionValue],
                    [props.optionLabel]: item?.[props.optionLabel],
                });
                return acc;
            }, []);

            return grouped;
        }
        return [];
    }

    return recordsArray.value;
});

const computedOptions = computed(() => {
    if (intendToList.value && (!modelList.state.loading || fetchedPages.value > 1)) {
        return listObjects.value;
    }
    if (intendToRetrieve.value && !instanceObject.state.loading) {
        return [instanceObject.state.object];
    }
    return [];
});
watch(
    [computedOptions, () => widgetContext.state.combinedValue],
    ([newOptions, newValue], [oldOption, oldValue]) => {
        if (!isEqual(newOptions, oldOption) || !isEqual(newValue, oldValue)) {
            if (newOptions.length && newValue) {
                const options = intendToList.value && props.grouped ? modelList.state.objectsInOrder : newOptions;
                const selected = options?.find((option) => isEqual(option?.[props.optionValue], newValue));
                if (selected) {
                    widgetContext.state.valueDetail = selected;
                }
            } else if (!widgetContext.state.combinedValue) {
                widgetContext.state.valueDetail = null;
            }
        }
    },
    { immediate: true, deep: true },
);

watch(
    prePopulatedSearchText,
    (value, oldValue) => {
        if (!isEqual(value, oldValue)) {
            listFilterValue.value = value;
        }
    },
    { immediate: true, deep: true },
);

const handleHide = () => {
    listFilterValue.value = "";
    if (intendToRetrieve.value) {
        listFilterValue.value = prePopulatedSearchText.value;
    }
};

const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);

const handleShow = () => {
    if (!hasBeenFocused.value) {
        hasBeenFocused.value = true;
    }
};
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            label-tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            @click="handleLabelClick"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)">
                    <LinkModelView
                        v-if="props.readonly"
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        :label="computedLabel"
                        :model="model"
                        :pk="widgetContext.state.combinedValue"
                        view="update"
                    />
                    <Select
                        v-else
                        v-bind="omit($attrs, 'value')"
                        ref="selectRef"
                        v-model="widgetContext.state.combinedValue"
                        :aria-labelledby="widgetContext.state.widgetId"
                        :disabled="widgetContext.state.disabled"
                        fluid
                        :invalid="widgetContext.state.validationState.invalid"
                        :option-group-children="grouped && intendToList ? 'items' : undefined"
                        :option-group-label="grouped && intendToList ? groupBy : undefined"
                        :option-label="props.optionLabel"
                        :option-value="pkKey"
                        :options="computedOptions"
                        :placeholder="placeHolderText"
                        :pt="effectivePt"
                        show-clear
                        :virtual-scroller-options="{
                            lazy: isLazy || !grouped,
                            onLazyLoad: onLazyLoad,
                            itemSize: 38,
                            showLoader: true,
                            loading: modelList.state.loading,
                            autoSize: true,
                            step: perPage,
                        }"
                        @before-show="handleShow"
                        @blur="widgetContext.blur"
                        @change="onValueChange"
                        @focus="widgetContext.focus"
                        @hide="handleHide"
                        :aria-required="widgetContext.state.required"
                    >
                        <template #optiongroup="slotProps">
                            <div class="flex items-center">
                                <div v-if="slotProps.option.items">{{ slotProps.option[props.groupBy] }}</div>
                            </div>
                        </template>
                        <template #value="slotProps">
                            <template v-if="slotProps.value">
                                {{
                                    widgetContext?.state?.valueDetail
                                        ? widgetContext.state.valueDetail[
                                              props.selectedOptionLabel ?? props.optionLabel
                                          ]
                                        : slotProps.value
                                }}
                            </template>
                            <span v-else>
                                {{ slotProps.placeholder }}
                            </span>
                        </template>
                        <template #header>
                            <div class="py-1.5 px-2 w-full flex">
                                <InputText
                                    :id="widgetContext.state.widgetId"
                                    class="w-full"
                                    :model-value="listFilterValue"
                                    placeholder="Type to Search"
                                    @update:model-value="handleFilter"
                                ></InputText>
                            </div>
                        </template>
                    </Select>
                </div>
            </template>
        </widget-label>
    </div>
</template>
