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
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import Select from "primevue/select";
import { computed, reactive, ref, toRef, useSlots, watch } from "vue";

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
const listSearch = computed(() => {
    if (props.grouped || !props.isLazy) {
        return "";
    }
    return listFilterValue.value;
});
const listFilterValue = ref("");
const prePopulatedSearchText = computed(() => {
    return widgetContext.state.valueDetail?.[props.optionLabel] || "";
});
const isCurrentSearchSameAsValue = computed(() => {
    return listFilterValue.value.length > 0 ? listFilterValue.value === prePopulatedSearchText.value : false;
});
const intendToList = computed(() => {
    return (!widgetContext.state.combinedValue || !isCurrentSearchSameAsValue.value) && hasBeenFocused.value;
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
    return {
        ...props.extraListArgs,
    };
});
const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    pkKey: toRef(props, "pkKey"),
    listArgs: {
        [props.pageKey]: fetchedPages,
        [props.searchKey]: listSearch,
        f: [
            computed(() => modelConfig.info?.pk),
            "formatted_name",
            computed(() => (props.grouped ? props.groupBy : "")),
            computed(() => props.selectedOptionLabel ?? ""),
        ],
        ...extraListArgs.value,
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

const modelListFunctions = reactive({
    list: computed(() => {
        return props.isLazy || !props.grouped ? singlePagePaginatedListCrudAdaptor : allPagePaginatedListCrudAdaptor;
    }),
});
const modelList = useList({
    props: modelListProps,
    functions: modelListFunctions,
    paged: true,
    keepOldPages: true,
    clearListOnListIntentTriggered: false,
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
const handleFilter = (event) => {
    listFilterValue.value = event.value;
    if (props.grouped || !props.isLazy) {
        return;
    }
    fetchedPages.value = 1;
};
const placeHolderText = computed(() => {
    return props.placeholder || `Select a ${props.model}`;
});

const perPage = computed(() => {
    return modelList.state?.perPage ?? 100;
});
const lastScrollerPageTracks = reactive({
    first: 0,
    last: 0,
});
const onLazyLoad = (event) => {
    if (event.first === lastScrollerPageTracks.first && event.last === lastScrollerPageTracks.last) {
        return;
    }
    lastScrollerPageTracks.first = event.first;
    lastScrollerPageTracks.last = event.last;
    if (event.last >= fetchedPages.value * perPage.value && event.last < modelList.state.totalRecords) {
        fetchedPages.value += 1;
    }
};

const onValueChange = () => {
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
    if (props.grouped) {
        const objects = cloneDeep(modelList.state.objectsInOrder);
        const grouped = objects.reduce((acc, item) => {
            const groupKey = item[props.groupBy];
            let group = acc.find((g) => g[props.groupBy] === groupKey);
            if (!group) {
                group = { [props.groupBy]: groupKey, items: [] };
                acc.push(group);
            }
            group.items.push({
                [props.optionValue]: item[props.optionValue],
                [props.optionLabel]: item[props.optionLabel],
            });
            return acc;
        }, []);

        return grouped;
    }

    return modelList.state.objectsInOrder;
});

const computedOptions = computed(() => {
    if (intendToList.value && !modelList.state.loading) {
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
                const options = newOptions.length > 1 && props.grouped ? modelList.state.objectsInOrder : newOptions;
                const selected = options?.find((option) => isEqual(option[props.optionValue], newValue));
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
    if (intendToRetrieve.value) {
        selectRef.value.filterValue = prePopulatedSearchText.value;
        if (props.grouped || !props.isLazy) {
            return;
        }
        listFilterValue.value = prePopulatedSearchText.value;
    }
};
// const lastScrollTop = ref(0);
// const handleVirtualScroll = (event) => {
//     console.log("event",event.target.scrollTop);
//     const scrollTop = event.target.scrollTop;
//     const isScrollingUp = scrollTop < lastScrollTop.value;
//     if (isScrollingUp) {
//         console.log("scroll",event);
//
//         lastScrollTopBeforeLazyLoad.value = 0;
//     }
//     lastScrollTop.value = event.target.scrollTop;
//     if (!isScrollingUp && scrollTop < lastScrollTopBeforeLazyLoad.value && virtualScrollerRef.value) {
//         console.log("scrollTo: ",lastScrollTopBeforeLazyLoad.value)
//         virtualScrollerRef.value.scrollTo({ top: lastScrollTopBeforeLazyLoad.value });
//         lastScrollTop.value = lastScrollTopBeforeLazyLoad.value;
//     }
// };

const handleShow = () => {
    selectRef.value.filterValue = prePopulatedSearchText.value;
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            tag="div"
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
                        filter
                        :invalid="widgetContext.state.validationState.invalid"
                        :option-group-children="grouped && intendToList ? 'items' : undefined"
                        :option-group-label="grouped && intendToList ? groupBy : undefined"
                        :option-label="props.optionLabel"
                        :option-value="pkKey"
                        :options="computedOptions"
                        :placeholder="placeHolderText"
                        :pt="effectivePt"
                        reset-filter-on-clear
                        show-clear
                        :virtual-scroller-options="{
                            lazy: isLazy || !grouped,
                            onLazyLoad: onLazyLoad,
                            itemSize: 38,
                            showLoader: true,
                            loading: modelList.state.loading,
                            autoSize: true,
                            inline: true,
                        }"
                        @blur="widgetContext.blur"
                        @change="onValueChange"
                        @filter="handleFilter"
                        @focus="handleFocus"
                        @hide="handleHide"
                        @show="handleShow"
                    >
                        <template #value="slotProps">
                            <div v-if="slotProps.value">
                                {{
                                    widgetContext?.state?.valueDetail
                                        ? widgetContext.state.valueDetail[
                                              props.selectedOptionLabel ?? props.optionLabel
                                          ]
                                        : slotProps.value
                                }}
                            </div>
                            <span v-else>
                                {{ slotProps.placeholder }}
                            </span>
                        </template>
                    </Select>
                </div>
            </template>
        </widget-label>
    </div>
</template>
