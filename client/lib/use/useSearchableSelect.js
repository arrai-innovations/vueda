import { deepUnref, loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useResolvedLookupObject } from "@vueda/use/useResolvedLookupObject.js";
import { EXPAND_PARAM, FIELDS_PARAM, ORDERING_PARAM, PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import debounce from "lodash-es/debounce.js";
import get from "lodash-es/get.js";
import IsEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * @typedef {object} WidgetSearchableSelectRawProps
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string[]} modelFields - The fields to include in the model.
 * @property {string[]} modelExpandFields - The fields to expand in the model.
 * @property {string[]} modelOrdering - The ordering of the model.
 * @property {object[]} options - The options to display in the select.
 * @property {string} optionValue - The value field for the options.
 * @property {string} optionLabel - The label field for the options.
 * @property {string} selectedOptionLabel - The label to display when the value is set.
 * @property {boolean} multiple - Whether to allow multiple selections.
 * @property {string} placeholder - The placeholder text for the select.
 * @property {boolean} readonly - Whether the select is readonly.
 * @property {object} extraParams - Extra parameters to pass to the API.
 * @property {function} getExtraParams - A function to get extra parameters.
 * @property {boolean} grouped - Whether to group the options.
 * @property {string} groupBy - The field to group the options by.
 * @property {boolean} isLazy - Whether to load the options lazily.
 */

/**
 * @typedef {import("vue").UnwrapNestedRefs<WidgetSearchableSelectRawProps>} WidgetSearchableSelectProps
 */

export const SEARCHABLE_SELECT_PROPS = {
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
    modelExpandFields: {
        type: Array,
        default: () => [],
    },
    modelOrdering: {
        type: Array,
        default: () => [],
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
    readonly: {
        type: Boolean,
        default: false,
    },
    extraParams: {
        type: Object,
        default: () => ({}),
    },
    getExtraParams: {
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
};

function groupBy(objects, groupKey) {
    const grouped = [];
    for (const item of objects) {
        const key = get(item, groupKey);
        let group = grouped.find((g) => g[groupKey] === key);
        if (!group) {
            group = { [groupKey]: key, items: [] };
            grouped.push(group);
        }
        group.items.push(item);
    }
    return grouped;
}

/**
 * @typedef {object} WidgetSearchableRawState
 */
/**
 * @typedef {import('vue').Reactive<WidgetSearchableRawState>} WidgetSearchableState
 */
/**
 * @typedef {object} WidgetSearchableSelectRaw
 * @property {import('vue').ComputedRef<any>} computedLabel - The label to display when readonly.
 * @property {([options: object]) => [label: string] } lookupGroupBy - The function to get the group by value from an option.
 * @property {function} onBeforeShow - The before-show event for the select.
 * @property {function} onChange - The value-change event for the select.
 * @property {function} onHide - The hide event for the select.
 * @property {function} optionGroupChildren - The function to get the group by value from an option.
 * @property {import('vue').ComputedRef<any>} optionLabel - The label field for the options.
 * @property {import('vue').ComputedRef<any>} optionValue - The value field for the options.
 * @property {import('vue').ComputedRef<any>} options - The options to display in the select.
 * @property {import('vue').ComputedRef<any>} placeholder - The placeholder text for the select.
 * @property {import('vue').ComputedRef<any>} query - The search query.
 * @property {import('vue').ComputedRef<any>} selectedLabel - The label of the selected option, to display when closed but not readonly.
 * @property {object} virtualScrollerOptions - The options for the virtual scroller.
 */

/**
 * @typedef {import('vue').Reactive<WidgetSearchableSelectRaw>} WidgetSearchableSelect
 */
/**
 * @param {WidgetSearchableSelectProps} props - The props for the widget searchable select.
 * @param {import('../use/useWidget.js').WidgetContext} widgetContext - The widget context.
 * @param {object} selectRef - The ref for the primevue select component.
 * @returns {WidgetSearchableSelect} - The instance of the widget searchable select.
 */
export function useSearchableSelect(props, widgetContext, selectRef) {
    const fetchedPages = ref(1);
    const perPage = ref(100);
    const hasBeenFocused = ref(false);
    const query = ref("");
    const bouncedQuery = ref("");
    const recordsArray = ref([]);
    const lastScrollerPageTracksFirst = ref(0);
    const lastScrollerPageTracksLast = ref(0);

    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), "list");
    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    const defaultFields = computed(() => modelConfig.config?.fetchFields || []);
    const defaultExpand = computed(() => modelConfig.config?.expand || []);
    const defaultOrdering = computed(() => undefined); // replace when available

    const fieldsList = computed(() => {
        const label = props.selectedOptionLabel ?? props.optionLabel;
        const group = props.grouped ? props.groupBy : undefined;
        const explicit = props.modelFields?.length ? props.modelFields : undefined;
        const base = new Set([unref(pkKey), label, group].filter(Boolean));
        return Array.from(new Set([...(explicit || unref(defaultFields)), ...base]));
    });

    const expandList = computed(() =>
        props.modelExpandFields?.length ? props.modelExpandFields : unref(defaultExpand),
    );
    const orderingList = computed(() => (props.modelOrdering?.length ? props.modelOrdering : unref(defaultOrdering)));

    // power the selected option
    const selectedLookup = useResolvedLookupObject(
        toRef(props, "app"),
        toRef(props, "model"),
        toRef(widgetContext.state, "combinedValue"),
        toRef(fieldsList),
        toRef(expandList),
    );

    // Don't immediately search by the label of the current value, even though we put it in the search box for some reason.
    const effectiveSearch = computed(() =>
        bouncedQuery.value && bouncedQuery.value !== returnObject.readonlyLabel ? bouncedQuery.value : "",
    );

    const extraParams = computed(() => {
        const base = props.getExtraParams ? props.getExtraParams(widgetContext.state.dependencyValues) : {};
        return {
            ...base,
            ...props.extraParams,
        };
    });

    const searchParams = computed(() => ({
        [PAGE_PARAM]: fetchedPages.value,
        [SEARCH_PARAM]: effectiveSearch.value,
        [FIELDS_PARAM]: fieldsList.value,
        [EXPAND_PARAM]: expandList.value,
        [ORDERING_PARAM]: orderingList.value,
        ...extraParams.value,
    }));

    const intendToSearch = computed(
        () =>
            ((!!modelConfig.info?.pk && !widgetContext.state.combinedValue) || effectiveSearch.value.length) &&
            hasBeenFocused.value,
    );

    const searchList = useList({
        props: reactive({
            target: {
                app: toRef(props, "app"),
                model: toRef(props, "model"),
            },
            pkKey,
            params: searchParams,
            intendToList: intendToSearch,
        }),
        handlers: {
            list: props.isLazy || !props.grouped ? singlePagePaginatedListCrudAdaptor : allPagePaginatedListCrudAdaptor,
        },
        paged: true,
        keepOldPages: computed(() => !props.isLazy),
        clearListOnListIntentTriggered: false,
    });

    const listObjects = computed(() => {
        const objects = deepUnref(searchList.state.objectsInOrder);
        if (props.grouped) {
            return groupBy(objects, props.groupBy);
        }
        return objects;
    });

    const computedOptions = computed(() => {
        if (intendToSearch.value && (!searchList.state.loading || fetchedPages.value > 1)) {
            if (props.grouped || !props.isLazy) {
                return readonly(listObjects.value);
            }
            return readonly(recordsArray.value);
        }
        if (widgetContext.state.combinedValue && !selectedLookup.loading) {
            return readonly([selectedLookup.object].filter(IsEmpty));
        }
        return readonly([]);
    });

    const resetScroller = () => {
        fetchedPages.value = 1;
        if (props.isLazy) {
            recordsArray.value = [];
            lastScrollerPageTracksFirst.value = 0;
            lastScrollerPageTracksLast.value = 0;
        }
        const virtualScrollerRef = selectRef.value?.virtualScroller;
        if (virtualScrollerRef) {
            virtualScrollerRef.scrollTo({ top: 0 });
        }
    };

    watch(
        query,
        debounce((val) => {
            // don't send a search for every keystroke
            if (bouncedQuery.value !== val) {
                bouncedQuery.value = val;
            }
        }, 500),
    );

    watch(
        () => deepUnref(searchParams),
        (newParams, oldParams) => {
            // if the params change, reset the scroller
            if (!isEqual(newParams, oldParams)) {
                resetScroller();
            }
        },
        { deep: true },
    );

    watch(
        () => searchList.state.objectsInOrder,
        (items) => {
            // populate the virtual scroller array
            if (!Array.isArray(items)) {
                return;
            }
            const startIndex = (fetchedPages.value - 1) * (searchList.state.perPage || 100);
            const total = searchList.state.totalRecords || 0;

            if (recordsArray.value.length !== total) {
                recordsArray.value = Array(total).fill(undefined);
            }

            items.forEach((item, i) => {
                const target = startIndex + i;
                if (target < recordsArray.value.length) {
                    recordsArray.value[target] = deepUnref(item);
                }
            });
        },
        { immediate: true },
    );

    watch(
        [
            () => searchList.state.totalPages,
            () => searchList.state.perPage,
            () => searchList.state.loading,
            () => lastScrollerPageTracksFirst.value,
        ],
        ([totalPages, perPage, loading, first]) => {
            if (loading || !totalPages || !perPage) {
                return;
            }

            const page = Math.min(Math.ceil(first / perPage) + 1, totalPages);
            if (!recordsArray.value[(page - 1) * perPage]) {
                fetchedPages.value = page;
            }
        },
        { immediate: true },
    );

    const selectedOptionLabel = computed(() => get(selectedLookup.object, props.selectedOptionLabel));

    const returnObject = reactive({
        loading: computed(() => loadingCombine(selectedLookup.loading, searchList.state.loading)),
        lookupGroupBy: (option) => get(option, props.groupBy), // the label of the selected option, to display when closed but not readonly
        onBeforeShow: () => {
            if (!hasBeenFocused.value) {
                hasBeenFocused.value = true;
            }
        },
        onChange: () => {
            if (!hasBeenFocused.value) {
                hasBeenFocused.value = true;
                widgetContext.blur();
            }
            recordsArray.value = [];
            fetchedPages.value = 1;
        },
        onHide: () => {
            query.value = widgetContext.state.combinedValue ? returnObject.readonlyLabel : "";
        },
        optionGroupChildren: computed(() => (props.grouped && intendToSearch ? "items" : undefined)),
        optionLabel: computed(() => props.optionLabel),
        optionValue: computed(() => unref(pkKey)),
        options: computed(() => unref(computedOptions)),
        placeholder: computed(() => props.placeholder || `Select a ${props.model}`),
        query,
        selectedLabel: computed(() => {
            if (selectedLookup.loading === undefined || selectedLookup.loading === true) {
                return "\u00A0";
            }
            return selectedOptionLabel.value ?? widgetContext.state.combinedValue ?? "\u00A0";
        }),
        virtualScrollerOptions: {
            lazy: computed(() => props.isLazy || !props.grouped),
            onLazyLoad: (e) => {
                lastScrollerPageTracksFirst.value = e.first;
                lastScrollerPageTracksLast.value = e.last;
            },
            itemSize: 38,
            showLoader: true,
            loading: searchList.state.loading,
            autoSize: true,
            step: perPage,
        }, // Select's hide event
    });
    return returnObject;
}
